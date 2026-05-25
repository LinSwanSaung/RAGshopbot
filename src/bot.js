// Telegram bot entry point.
// Flow per message:
//   1. interpretMessage (LLM) rewrites the query using chat memory and
//      extracts {maxPrice, inStockOnly}.
//   2. Hybrid search runs against Supabase with those filters.
//   3. askLLM (LLM) writes a grounded reply using retrieved products
//      AND the shop info loaded from about_shop.md.
// Both LLM calls are wrapped in withRateRetry (one delayed retry on
// transient errors / rate limits).
//
//   npm run bot

import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { hybridSearch } from './search.js';
import { askLLMStream, cleanStreamingReply, interpretMessage, withRateRetry } from './llm.js';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set in .env');

const bot = new Telegraf(token);

const histories = new Map();
const MAX_HISTORY = 6; // 3 user/assistant turn pairs

// Formats standard Markdown (like **bold**) to Telegram legacy Markdown (*)
// and dynamically closes unmatched tags to prevent rendering/parsing errors.
function toTelegramMarkdown(text) {
  // Convert standard markdown bold (**) to Telegram legacy markdown bold (*)
  let formatted = String(text).replace(/\*\*/g, '*');
  
  // Count single asterisks to ensure they are balanced
  const asteriskCount = (formatted.match(/\*/g) || []).length;
  if (asteriskCount % 2 !== 0) {
    formatted += '*';
  }
  
  // Count underscores to ensure they are balanced
  const underscoreCount = (formatted.match(/_/g) || []).length;
  if (underscoreCount % 2 !== 0) {
    formatted += '_';
  }
  
  // Count backticks to ensure they are balanced
  const backtickCount = (formatted.match(/`/g) || []).length;
  if (backtickCount % 2 !== 0) {
    formatted += '`';
  }
  
  return formatted;
}

bot.start((ctx) => {
  histories.delete(ctx.chat.id); // fresh start clears memory
  return ctx.reply(
    "Hey there! Welcome to the shop. I'd love to help you find something — " +
    "clothing, shoes, accessories, whatever you're after. " +
    "Or if you'd like to know about shipping, returns, sizing, or our policies, " +
    "just ask. What can I help you with today?"
  );
});

bot.help((ctx) =>
  ctx.reply("Just send me a message describing what you're looking for.")
);

bot.on('text', async (ctx) => {
  const question = ctx.message.text?.trim();
  if (!question) return;

  let botMsg;
  try {
    botMsg = await ctx.reply('Thinking...');

    // Fetch this user's recent conversation (last 3 turns) once.
    const history = histories.get(ctx.chat.id) ?? [];

    // 1. Interpret — rewrites follow-ups like "cheaper ones" using prior
    //    turns so the search query is self-contained, AND extracts maxPrice
    //    / inStockOnly. Returns {searchQuery, maxPrice?, inStockOnly?}.
    const { searchQuery, ...opts } = await withRateRetry(() =>
      interpretMessage(question, history)
    );

    // 2. Hybrid search runs on the REWRITTEN searchQuery — not the raw user
    //    text — so embeddings benefit from context too.
    const products = await hybridSearch(searchQuery, opts);
    console.log(
      `[bot] q="${question}" -> search="${searchQuery}" filters=${JSON.stringify(opts)} ` +
      `retrieved=${products.length}: ${
        products.map((p) => `#${p.id}(s=${p.score.toFixed(2)})`).join(', ') || 'none'
      }`
    );

    // (No empty-results short-circuit anymore — shop-info questions
    // legitimately return 0 products and still need an LLM reply using
    // the SHOP INFO baked into the system prompt.)

    // 3. Generate the grounded reply using a stream, with conversation memory.
    const stream = await withRateRetry(() => askLLMStream(question, products, history));

    let accumulated = '';
    let lastSentText = '';
    let lastUpdateTime = Date.now();

    for await (const chunk of stream) {
      accumulated += chunk.content ?? '';
      const cleaned = cleanStreamingReply(accumulated);

      // Throttle updates to Telegram to avoid rate limits
      const now = Date.now();
      if (cleaned && cleaned !== lastSentText && now - lastUpdateTime > 1000) {
        const telegramText = toTelegramMarkdown(cleaned) + ' ▌';
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            botMsg.message_id,
            undefined,
            telegramText,
            { parse_mode: 'Markdown' }
          );
          lastSentText = cleaned;
          lastUpdateTime = now;
        } catch {
          try {
            await ctx.telegram.editMessageText(
              ctx.chat.id,
              botMsg.message_id,
              undefined,
              telegramText
            );
            lastSentText = cleaned;
            lastUpdateTime = now;
          } catch (err) {
            // Ignore edit error if any (e.g. same text)
          }
        }
      }
    }

    const finalCleaned = cleanStreamingReply(accumulated) || "Sorry, I couldn't generate a response.";
    const finalTelegramText = toTelegramMarkdown(finalCleaned);

    // Final edit to remove the cursor and format with markdown
    if (finalCleaned !== lastSentText) {
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          botMsg.message_id,
          undefined,
          finalTelegramText,
          { parse_mode: 'Markdown' }
        );
      } catch {
        try {
          await ctx.telegram.editMessageText(
            ctx.chat.id,
            botMsg.message_id,
            undefined,
            finalTelegramText
          );
        } catch (err) {
          console.error('Final edit failed:', err);
        }
      }
    }

    // Append this turn and trim to the most recent MAX_HISTORY messages.
    history.push({ role: 'user', content: question });
    history.push({ role: 'assistant', content: finalCleaned });
    while (history.length > MAX_HISTORY) history.shift();
    histories.set(ctx.chat.id, history);

  } catch (err) {
    console.error('handler error:', err?.message ?? err);
    const msg = err?.status === 429
      ? "I'm getting too many requests right now. Try again in a few seconds?"
      : "Sorry, something went wrong on my end. Please try again.";
    if (botMsg) {
      try {
        await ctx.telegram.editMessageText(ctx.chat.id, botMsg.message_id, undefined, msg);
      } catch {
        await ctx.reply(msg);
      }
    } else {
      await ctx.reply(msg);
    }
  }
});

bot.catch((err, ctx) => {
  console.error(`[bot.catch] ${ctx?.updateType ?? 'unknown'}:`, err?.message ?? err);
  ctx?.reply("Sorry, something went wrong. Please try again.").catch(() => {});
});

const me = await bot.telegram.getMe();
console.log(`Bot launched as @${me.username} (id=${me.id}). Press Ctrl+C to stop.`);

bot.launch();
process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
