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
    // If candidate has a specific template, use it
    if (candidateTemplateId) {
      const res = await fetch(`/api/templates/${candidateTemplateId}`);
      if (res.ok) {
        const data = await res.json();
        return data.config ?? null;
      }
    }

    // Otherwise try the default template
    const res = await fetch('/api/templates?default=true');
    if (res.ok) {
      const templates = await res.json();
      if (Array.isArray(templates)) {
        const defaultTpl = templates.find((t: { is_default: boolean }) => t.is_default);
        if (defaultTpl) return defaultTpl.config ?? null;
      }
    }

    return null;
  } catch {
    return null;
  }
}
