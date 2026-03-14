import { getSupabase } from './supabase';
import type { TemplateConfig } from '@/lib/schema';

/**
 * Server-side: fetch template config by candidate's template_id or fall back to default template.
 */
export async function getTemplateConfig(templateId?: string | null): Promise<Partial<TemplateConfig> | undefined> {
  const supabase = getSupabase();

  // If candidate has a specific template
  if (templateId) {
    const { data } = await supabase
      .from('templates')
      .select('config')
      .eq('id', templateId)
      .single();
    if (data?.config) return data.config;
  }

  // Fall back to default template
  const { data: defaults } = await supabase
    .from('templates')
    .select('config')
    .eq('is_default', true)
    .limit(1)
    .single();

  return defaults?.config ?? undefined;
}
