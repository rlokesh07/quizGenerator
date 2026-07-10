import OpenAI from "openai";

const DEFAULT_MODEL = "text-embedding-3-small";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY");
  }
  client = new OpenAI({ apiKey });
  return client;
}

/**
 * Returns the embedding vector for a single piece of text.
 * Used both when storing questions and when running search queries,
 * so the same model must be used on both sides.
 */
export async function embedText(text: string): Promise<number[]> {
  const model = DEFAULT_MODEL;
  const response = await getClient().embeddings.create({
    model,
    input: text,
  });
  return response.data[0].embedding;
}

/** Dimension of text-embedding-3-small; used for the Firestore vector index. */
export const EMBEDDING_DIMENSIONS = 1536;
