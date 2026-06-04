// Hybrid search against Supabase + pgvector.
//   - Vector layer: embeddings.embedQuery() + pgvector cosine ordering.
//   - Structured layer: max_price / in_stock_only / user_id filtered inside
//     the match_products() SQL function (see sql/schema.sql).

import { embeddings } from './embed';
import { supabase } from './db';

export interface SearchOpts {
  maxPrice?: number;
  inStockOnly?: boolean;
  threshold?: number;
  k?: number;
  userId?: string; // scope to this shop's products (multi-tenant)
}

export interface SearchResult {
  id: number;
  name: string;
  text: string;
  price: number;
  stock: number;
  score: number;
}

interface MatchRow {
  id: number;
  name: string;
  description: string;
  price: number | string;
  stock: number;
  similarity: number;
}

export async function hybridSearch(
  query: string,
  { maxPrice = 1e9, inStockOnly = false, threshold = 0.35, k = 5, userId }: SearchOpts = {}
): Promise<SearchResult[]> {
  const queryEmbedding = await embeddings.embedQuery(query);

  const { data, error } = await supabase.rpc('match_products', {
    query_embedding: queryEmbedding,
    match_count: k,
    max_price: maxPrice,
    in_stock_only: inStockOnly,
    p_user_id: userId ?? null,
  });

  if (error) throw error;

  return (data as MatchRow[])
    .filter((row) => row.similarity >= threshold)
    .map((row) => ({
      id: row.id,
      name: row.name,
      text: row.description,
      price: Number(row.price),
      stock: row.stock,
      score: row.similarity,
    }));
}
