// One-time indexer — seeds Supabase from src/products.ts.
//   Step A: write the catalog into the products table (source of truth).
//   Step B: embed name+description and write into product_embeddings.
// Idempotent: wipes both tables (FK cascade) and reinserts on every run.
//
//   bun run index
//
// In production these become two separate scripts:
//   - sync catalog (price/stock updates) -> Step A only, NEVER re-embeds.
//   - reindex description changes        -> Step B only.

import { products } from './products';
import { embeddings } from './embed';
import { supabase } from './db';

// --- Step A: products table -------------------------------------------------
console.log('Wiping existing rows (cascades to embeddings)...');
const { error: delErr } = await supabase.from('products').delete().gte('id', 0);
if (delErr) throw delErr;

console.log(`Inserting ${products.length} products into products table...`);
const productRows = products.map((p) => ({
  id: p.id,
  name: p.name,
  description: p.text,
  price: p.price,
  stock: p.stock,
}));
const { error: insErr } = await supabase.from('products').insert(productRows);
if (insErr) throw insErr;

// --- Step B: embeddings -----------------------------------------------------
console.log(`Embedding ${products.length} products via Xenova/all-MiniLM-L6-v2...`);
const contents = products.map((p) => `${p.name}. ${p.text}`);
const vectors = await embeddings.embedDocuments(contents);
console.log(`Got ${vectors.length} vectors of dim=${vectors[0].length}.`);

console.log('Inserting into product_embeddings...');
const embeddingRows = products.map((p, i) => ({
  product_id: p.id,
  content: contents[i],
  embedding: vectors[i],
}));
const { error: embErr } = await supabase
  .from('product_embeddings')
  .insert(embeddingRows);
if (embErr) throw embErr;

console.log(`Indexed ${products.length} products + ${vectors.length} embeddings.`);
