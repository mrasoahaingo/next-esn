import { create } from 'zustand';
import type { TemplateConfig } from '@/lib/schema';
import { normalizeTemplateConfig } from '@/lib/utils/template';

interface TemplateState {
  templateConfig: Partial<TemplateConfig> | null;
  setTemplateConfig: (config: Partial<TemplateConfig> | null) => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templateConfig: null,
  setTemplateConfig: (config) => set({ templateConfig: config }),
}));

/**
 * Gabarit PDF : `templateId` explicite ; sinon résolution serveur (`organization_settings.default_template_id`, puis repli plateforme).
 * (Les CV n’associent plus de gabarit : passer `null`.)
 */
export async function fetchTemplateConfig(templateId?: string | null): Promise<Partial<TemplateConfig> | null> {
  try {
    const q =
      templateId !== undefined && templateId !== null && templateId !== ''
        ? `?templateId=${encodeURIComponent(templateId)}`
        : '';
    const res = await fetch(`/api/template-config${q}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.config ? normalizeTemplateConfig(data.config) : null;
  } catch {
    return null;
  }
}
