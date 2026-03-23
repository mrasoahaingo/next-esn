import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';
import type { TemplateConfig } from '@/lib/schema';
import { DEFAULT_TEMPLATE_CONFIG } from '@/lib/schema';

export interface TemplateListItem {
  id: string;
  name: string;
  is_default: boolean;
  config: {
    colors?: { primary?: string; secondary?: string };
  };
  created_at: string;
}

export function useTemplatesList() {
  return useQuery<TemplateListItem[]>({
    queryKey: queryKeys.templates.list(),
    queryFn: async () => {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

interface TemplateData {
  id: string;
  name: string;
  config: TemplateConfig;
  is_default: boolean;
}

export function useTemplate(id: string) {
  return useQuery<TemplateData>({
    queryKey: queryKeys.templates.detail(id),
    queryFn: async () => {
      const res = await fetch(`/api/templates/${id}`);
      if (!res.ok) throw new Error('Failed to fetch template');
      const data = await res.json();
      return {
        ...data,
        config: {
          ...DEFAULT_TEMPLATE_CONFIG,
          ...data.config,
          colors: { ...DEFAULT_TEMPLATE_CONFIG.colors, ...data.config?.colors },
          logo: { ...DEFAULT_TEMPLATE_CONFIG.logo, ...data.config?.logo },
          footer: { ...DEFAULT_TEMPLATE_CONFIG.footer, ...data.config?.footer },
          sections: data.config?.sections ?? DEFAULT_TEMPLATE_CONFIG.sections,
        },
      };
    },
    enabled: !!id,
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; config?: TemplateConfig; is_default?: boolean }) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update template');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.list() });
    },
  });
}
