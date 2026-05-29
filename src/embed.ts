// Shared LangChain embeddings instance. The SAME instance MUST be used at
// indexing time and query time, or vectors are not comparable.
//
// Xenova/all-MiniLM-L6-v2 -> 384-dim, L2-normalized.
// Column type in Postgres: VECTOR(384).

import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/hf_transformers';

export const embeddings = new HuggingFaceTransformersEmbeddings({
  model: 'Xenova/all-MiniLM-L6-v2',
});
