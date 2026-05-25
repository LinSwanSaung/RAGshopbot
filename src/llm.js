// Provider-agnostic LLM client (any OpenAI-compatible endpoint).
// Configure via .env: LLM_API_KEY, LLM_BASE_URL, LLM_MODEL.
//
// Exports:
//   chat            — main chat model for grounded replies
//   askLLM(q, ps)   — runs the customer reply prompt
//   extractFilters  — Step-4 polish: LLM-driven {maxPrice, inStockOnly} extraction
//   withRateRetry   — one-shot delayed retry on 429 (rate-limit) errors

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ChatOpenAI } from '@langchain/openai';

// Load shop info from about_shop.md at startup. Edit that file + restart the
// bot to change shop policies, hours, shipping, etc.
const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOP_INFO = readFileSync(join(__dirname, '..', 'about_shop.md'), 'utf-8').trim();

const apiKey  = process.env.LLM_API_KEY;
const baseURL = process.env.LLM_BASE_URL;
const model   = process.env.LLM_MODEL;

if (!apiKey || !baseURL || !model) {
  throw new Error('LLM_API_KEY, LLM_BASE_URL and LLM_MODEL must all be set in .env');
}

const providerConfig = {
  baseURL,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost',
    'X-Title': 'shop-bot',
  },
};

// Google AI Studio's OpenAI-compatible endpoint 400s on `frequency_penalty: 0`
// (and a few other fields LangChain sends as defaults). modelKwargs spreads
// last in invocationParams, so setting them to undefined drops them from the
// JSON body. Safe on OpenRouter/OpenAI too — they ignore unset fields.
const compatKwargs = {
  frequency_penalty: undefined,
  presence_penalty: undefined,
};

// maxRetries:0 -> no internal LangChain retries (each fails fast in seconds,
// not the ~30s LangChain spends on its own backoff). withRateRetry() is our
// single, controlled retry layer above this.
export const chat = new ChatOpenAI({
  apiKey, model,
  temperature: 0.3,
  maxRetries: 0,
  configuration: providerConfig,
  modelKwargs: compatKwargs,
  streamUsage: false,
});

// Separate instance for filter extraction: deterministic (temp=0).
const extractor = new ChatOpenAI({
  apiKey, model,
  temperature: 0,
  maxRetries: 0,
  configuration: providerConfig,
  modelKwargs: compatKwargs,
});

// Some models (Gemma 4, certain reasoning models) prefix replies with
// <thought>...</thought> blocks. Strip them so users / parsers don't see them.
function cleanReply(text) {
  return String(text).replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
}

// Remove thinking block tags from text, including incomplete/unclosed ones during streaming
export function cleanStreamingReply(text) {
  let cleaned = String(text).replace(/<thought>[\s\S]*?<\/thought>/gi, '');
  const openTagIndex = cleaned.lastIndexOf('<thought>');
  if (openTagIndex !== -1) {
    cleaned = cleaned.substring(0, openTagIndex);
  }
  return cleaned.trim();
}

// --- Reply generation -------------------------------------------------------

const SYSTEM_PROMPT = `You are a warm, helpful assistant for the online clothing shop described below.

==== ABOUT THE SHOP ====
${SHOP_INFO}
==== END SHOP INFO ====

You can answer two kinds of questions:

A) PRODUCT questions ("do you have running shoes?", "anything warm for winter?", "in blue?").
   Use ONLY the items listed under "Relevant products" further down in the user's message.
   Never invent products or prices.
   Use the prior conversation to understand follow-ups like "anything cheaper?" or "those in blue?".

B) SHOP questions (hours, shipping, returns, payment, location, contact, sizing, etc.).
   Answer briefly from the ABOUT THE SHOP section above.
   Never invent shop policies — if it isn't in the shop info, say you'll have to check and suggest contacting support.

If the question is unrelated (e.g. weather, jokes, other shops), politely say it's outside what you can help with.

IMPORTANT — Relevance check (product questions only):
The "Relevant products" list comes from a fuzzy semantic search, so some items may NOT actually fit the customer's stated need (e.g. a wool beanie surfaced for "summer wear"). Use your judgment:
- List ONLY items that genuinely match the customer's intent (season, occasion, style, use-case). Quietly skip the rest.
- If NONE of the retrieved items truly fit, briefly say we don't have a great match and skip the bullets.

When answering a PRODUCT question, format the reply like this:
1. A short friendly opening line that acknowledges what the customer asked.
2. A bulleted list of IN-STOCK items that pass the relevance check, one per
   line, in this exact format:   - **#ID Product Name** — $price
3. End with a friendly question like "Would any of these work for you?"

When answering a SHOP question, just give a short conversational reply — no bullets needed unless you're listing several things (e.g. payment methods).

Never display stock numbers. Skip out-of-stock products entirely. If NONE of the retrieved items are in stock, briefly say so and skip the bullets.

Keep replies short. Use markdown **bold** for product IDs and names.`;

function formatProducts(products) {
  if (products.length === 0) return '(none)';
  return products
    .map(
      (p) =>
        `- #${p.id} ${p.name} — ${p.text}. Price: $${p.price}. Stock: ${p.stock}.`
    )
    .join('\n');
}

export async function askLLM(question, products, history = []) {
  const userMessage = `Customer question: ${question}

Relevant products:
${formatProducts(products)}`;

  const response = await chat.invoke([
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ]);

  return cleanReply(response.content);
}

export async function askLLMStream(question, products, history = []) {
  const userMessage = `Customer question: ${question}

Relevant products:
${formatProducts(products)}`;

  return await chat.stream([
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: userMessage },
  ]);
}

// --- Query interpretation (Step 4 #1 + context-aware) ----------------------

const INTERPRET_SYSTEM = `You are a query parser. Read the customer's most recent message AND the prior conversation, then output ONE JSON object with these fields:

  - searchQuery (string, REQUIRED): a SELF-CONTAINED product search query.
    If the message already names what the customer wants, copy it as-is (light cleanup ok).
    If the message is a follow-up ("cheaper ones", "those in blue", "any smaller?", "what else?"), REWRITE it using the prior conversation so the product/topic is explicit.
  - maxPrice (number, OPTIONAL): max budget in dollars. For relative phrases like "cheaper", pick a sensible number from prior conversation (e.g. just under the lowest price shown).
  - inStockOnly (boolean, OPTIONAL): true if the customer requires currently-available items.

Output ONLY the JSON object on one line. No prose, no markdown, no code fences.

Examples:
  Input: "running shoes under $50"
  Output: {"searchQuery": "running shoes", "maxPrice": 50}

  Prior assistant turn listed running shoes priced $89, $112, $178.
  Input: "anything cheaper?"
  Output: {"searchQuery": "cheaper running shoes", "maxPrice": 89}

  Prior assistant turn listed a blue wool sweater.
  Input: "do you have red ones?"
  Output: {"searchQuery": "red wool sweater"}

  Input: "show me dresses available right now"
  Output: {"searchQuery": "dresses", "inStockOnly": true}

  Input: "show me dresses"
  Output: {"searchQuery": "dresses"}`;

export async function interpretMessage(question, history = []) {
  const response = await extractor.invoke([
    { role: 'system', content: INTERPRET_SYSTEM },
    ...history,
    { role: 'user', content: question },
  ]);

  let raw = cleanReply(response.content);
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const match = raw.match(/\{[\s\S]*\}/);

  // Sensible default: if the LLM call fails or returns garbage, fall back to
  // the raw user message as the search query with no filters.
  const fallback = { searchQuery: question };
  if (!match) return fallback;

  let parsed;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    return fallback;
  }

  const out = {
    searchQuery:
      typeof parsed.searchQuery === 'string' && parsed.searchQuery.trim()
        ? parsed.searchQuery.trim()
        : question,
  };
  if (typeof parsed.maxPrice === 'number' && parsed.maxPrice > 0) {
    out.maxPrice = parsed.maxPrice;
  }
  if (parsed.inStockOnly === true) {
    out.inStockOnly = true;
  }
  return out;
}

// --- Transient-error retry helper (Step 4 #3) ------------------------------
// Retries once on 429 (rate limit) AND on network blips like "fetch failed",
// ECONNRESET, ETIMEDOUT — anything that's likely transient.

function isTransient(err) {
  if (err?.status === 429) return true;
  const code = err?.code ?? err?.cause?.code;
  if (code === 'ECONNRESET' || code === 'ETIMEDOUT' || code === 'ENOTFOUND') return true;
  if (/fetch failed|socket hang up|network/i.test(String(err?.message ?? ''))) return true;
  return false;
}

export async function withRateRetry(fn, { delayMs = 2000 } = {}) {
  try {
    return await fn();
  } catch (err) {
    if (!isTransient(err)) throw err;
    console.log(`[retry] transient (${err?.status ?? err?.code ?? err?.message?.split('\n')[0]}) — waiting ${delayMs}ms then retrying once`);
    await new Promise((r) => setTimeout(r, delayMs));
    return await fn();
  }
}
