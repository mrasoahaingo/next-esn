import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';
import { adminKeys } from './admin';
import { queryKeys } from './keys';
import type { TemplateConfig } from '@/lib/schema';
import { useSuperAdmin } from '@/lib/hooks/useSuperAdmin';
import { normalizeTemplateConfig } from '@/lib/utils/template';

const TEMPLATES_LIST_SCOPE = 'global' as const;

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
  const { orgId } = useAuth();
  const { isSuperAdmin, isLoaded: isRoleLoaded } = useSuperAdmin();

  return useQuery<TemplateListItem[]>({
    queryKey: queryKeys.templates.list(TEMPLATES_LIST_SCOPE),
    queryFn: async () => {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!orgId && isRoleLoaded && isSuperAdmin,
  });
}

interface TemplateData {
  id: string;
  name: string;
  config: TemplateConfig;
  is_default: boolean;
}

export function useTemplate(id: string) {
  const { orgId } = useAuth();
  const { isSuperAdmin, isLoaded: isRoleLoaded } = useSuperAdmin();

  return useQuery<TemplateData>({
    queryKey: queryKeys.templates.detail(TEMPLATES_LIST_SCOPE, id),
    queryFn: async () => {
      const res = await fetch(`/api/templates/${id}`);
      if (!res.ok) throw new Error('Failed to fetch template');
      const data = await res.json();
      return {
        ...data,
        config: normalizeTemplateConfig(data.config),
      };
    },
    enabled: !!id && !!orgId && isRoleLoaded && isSuperAdmin,
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const { orgId } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      name?: string;
      config?: TemplateConfig;
      /** Repli PDF plateforme si aucun `default_template_id` org ; une seule ligne globale à `true`. */
      is_default?: boolean;
    }) => {
      const res = await fetch(`/api/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update template');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.detail(TEMPLATES_LIST_SCOPE, variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.list(TEMPLATES_LIST_SCOPE) });
      queryClient.invalidateQueries({ queryKey: adminKeys.stats() });
    },
  });
}
