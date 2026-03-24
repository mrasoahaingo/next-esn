/** Plafond ~150 ko par chaîne pour limiter la taille des JSONB en base. */
export const LLM_LOG_MAX_STRING_CHARS = 150 * 1024;

export type LlmLogPayloadMeta = {
  truncated: boolean;
  /** Détails si des chaînes ont été coupées. */
  truncatedFields?: { path: string; originalLength: number }[];
};

function truncateString(s: string, maxLen: number, path: string, meta: LlmLogPayloadMeta): string {
  if (s.length <= maxLen) return s;
  meta.truncated = true;
  meta.truncatedFields = meta.truncatedFields ?? [];
  meta.truncatedFields.push({ path, originalLength: s.length });
  return s.slice(0, maxLen);
}

function deepTruncate(
  value: unknown,
  path: string,
  maxLen: number,
  meta: LlmLogPayloadMeta,
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    return truncateString(value, maxLen, path, meta);
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    return value.map((item, i) => deepTruncate(item, `${path}[${i}]`, maxLen, meta));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const p = path ? `${path}.${k}` : k;
      out[k] = deepTruncate(v, p, maxLen, meta);
    }
    return out;
  }
  return value;
}

/**
 * Prépare un objet pour insertion JSONB : tronque les chaînes longues et ajoute `_truncation` à la racine si besoin.
 */
export function serializeLlmLogPayload(payload: unknown, maxStringChars = LLM_LOG_MAX_STRING_CHARS): unknown {
  if (payload === undefined) return undefined;
  const meta: LlmLogPayloadMeta = { truncated: false };
  const data = deepTruncate(payload, '', maxStringChars, meta);
  if (!meta.truncated) return data;
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return {
      ...(data as Record<string, unknown>),
      _truncation: {
        truncated: true,
        fields: meta.truncatedFields ?? [],
      },
    };
  }
  return {
    data,
    _truncation: {
      truncated: true,
      fields: meta.truncatedFields ?? [],
    },
  };
}
