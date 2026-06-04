// Multi-tenant webhook server.
// Listens on port 4000, path /bot/:userId/webhook.
// nginx proxies https://13.229.238.234:8443/bot/* → http://localhost:4000/bot/*
//
// No bot token needed — replies are sent inline in the HTTP response body.
// Telegram delivers inline replies back to the customer automatically.
//
//   bun src/server.ts

import 'dotenv/config';
import { Hono } from 'hono';
import { hybridSearch } from './search';
import { interpretMessage, askLLM, withRateRetry, type ChatMessage } from './llm';
import { getShopConfig } from './shopDb';

const app = new Hono();

// Per-chat conversation history keyed by "userId:chatId".
const histories = new Map<string, ChatMessage[]>();
const MAX_HISTORY = 6;

// Health check — your friend's monitoring can hit this.
app.get('/bot/health', (c) => c.json({ status: 'ok' }));

// Telegram webhook — one endpoint per shop owner (userId = users.id UUID).
app.post('/bot/:userId/webhook', async (c) => {
  const userId = c.req.param('userId');

  let update: any;
  try {
    update = await c.req.json();
  } catch {
    return c.json({ ok: false }, 400);
  }

  // Only handle text messages.
  const message = update?.message;
  if (!message?.text) return c.json({ ok: true });

  const chatId = message.chat.id;
  const question = message.text.trim();

  // /start command — clear memory and greet.
  if (question === '/start') {
    histories.delete(`${userId}:${chatId}`);
    return c.json({
      method: 'sendMessage',
      chat_id: chatId,
      text:
        "Hey there! Welcome to the shop. Ask me about our products, " +
        "shipping, returns, or anything else. What can I help you with today?",
    });
  }

  try {
    // Load this shop's business info from Postgres.
    const shopConfig = await getShopConfig(userId);
    if (!shopConfig) {
      return c.json({
        method: 'sendMessage',
        chat_id: chatId,
        text: "Sorry, this shop hasn't been set up yet. Please try again later.",
      });
    }

    const historyKey = `${userId}:${chatId}`;
    const history = histories.get(historyKey) ?? [];

    // 1. Interpret — rewrite follow-ups using history, extract filters.
    const { searchQuery, ...opts } = await withRateRetry(() =>
      interpretMessage(question, history)
    );

    // 2. Hybrid search against Supabase (scoped to this shop's user_id).
    const products = await hybridSearch(searchQuery, { ...opts, userId });

    console.log(
      `[${userId.slice(0, 8)}] q="${question}" -> search="${searchQuery}" ` +
      `filters=${JSON.stringify(opts)} retrieved=${products.length}`
    );

    // 3. Generate grounded reply using this shop's business info.
    const reply = await withRateRetry(() =>
      askLLM(question, products, history, shopConfig.businessInfo)
    );

    // Update history.
    history.push({ role: 'user', content: question });
    history.push({ role: 'assistant', content: reply });
    while (history.length > MAX_HISTORY) history.shift();
    histories.set(historyKey, history);

    // Inline reply — no token needed, Telegram reads this from the 200 response.
    return c.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: reply,
      parse_mode: 'Markdown',
    });
  } catch (err: any) {
    console.error(`[${userId.slice(0, 8)}] error:`, err?.message ?? err);
    return c.json({
      method: 'sendMessage',
      chat_id: chatId,
      text: "Sorry, something went wrong on my end. Please try again.",
    });
  }
});

export default {
  port: 4000,
  fetch: app.fetch,
};
