import { create } from 'zustand';
import type { TemplateConfig } from '@/lib/schema';

interface TemplateState {
  templateConfig: Partial<TemplateConfig> | null;
  setTemplateConfig: (config: Partial<TemplateConfig> | null) => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templateConfig: null,
  setTemplateConfig: (config) => set({ templateConfig: config }),
}));

/**
 * Fetches the template config for a candidate.
 * Falls back to the default template, then to null (uses DEFAULT_TEMPLATE_CONFIG).
 */
export async function fetchTemplateConfig(candidateTemplateId?: string | null): Promise<Partial<TemplateConfig> | null> {
  try {
    const q = candidateTemplateId ? `?templateId=${encodeURIComponent(candidateTemplateId)}` : '';
    const res = await fetch(`/api/template-config${q}`);
    if (!res.ok) return null;
    const data = await res.json();
    return (data.config as Partial<TemplateConfig>) ?? null;
  } catch {
    return null;
  }
}
