// Connects to the shared Postgres DB (may_core_network) to fetch per-user
// business info. This is separate from Supabase which holds product vectors.

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.SHOP_DB_URL,
  max: 10,
});

export interface ShopConfig {
  businessInfo: string; // markdown_content from business_info table
}

// Cache so we don't query DB on every message.
const cache = new Map<string, ShopConfig>();

export async function getShopConfig(userId: string): Promise<ShopConfig | null> {
  if (cache.has(userId)) return cache.get(userId)!;

  const result = await pool.query(
    `SELECT bi.markdown_content
     FROM business_info bi
     WHERE bi.user_id = $1 AND bi.processing_status = 'completed'
     LIMIT 1`,
    [userId]
  );

  if (result.rows.length === 0) return null;

  const config: ShopConfig = {
    businessInfo: result.rows[0].markdown_content ?? '',
  };

  cache.set(userId, config);
  return config;
}

// Call this to bust the cache when business info is updated.
export function invalidateShopCache(userId: string) {
  cache.delete(userId);
}
