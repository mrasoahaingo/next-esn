import { embed } from 'ai';

const RADAR_EMBEDDING_MODEL = 'openai/text-embedding-3-small';

export async function generateEmbedding(input: string): Promise<number[] | null> {
  if (!process.env.AI_GATEWAY_API_KEY || !input.trim()) return null;

  try {
    const { embedding } = await embed({
      model: RADAR_EMBEDDING_MODEL,
      value: input,
    });

    return embedding ?? null;
  } catch (error) {
    console.error('generateEmbedding:', error);
    return null;
  }
}

export function averageEmbeddings(vectors: number[][]): number[] | null {
  if (vectors.length === 0) return null;

  const dimension = vectors[0]?.length ?? 0;
  if (!dimension || vectors.some((vector) => vector.length !== dimension)) return null;

  const sum = new Array<number>(dimension).fill(0);
  for (const vector of vectors) {
    for (let index = 0; index < dimension; index += 1) {
      sum[index] += vector[index] ?? 0;
    }
  }

  return sum.map((value) => value / vectors.length);
}
