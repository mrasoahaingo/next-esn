import type { SupabaseClient } from '@supabase/supabase-js';
import { renderTemplate } from '@/lib/llm/template-render';
import { DEFAULT_GATEWAY_MODEL_ID } from '@/lib/llm/constants';

export type ResolvedLlmTask = {
  gatewayModelId: string;
  systemPrompt: string;
  useExtractJson: boolean;
  taskKey: string;
};

async function getGatewayIdForModelUuid(
  supabase: SupabaseClient,
  modelUuid: string | null,
): Promise<string> {
  if (!modelUuid) return DEFAULT_GATEWAY_MODEL_ID;
  const { data, error } = await supabase
    .from('llm_models')
    .select('gateway_model_id')
    .eq('id', modelUuid)
    .maybeSingle();
  if (error) throw error;
  if (!data?.gateway_model_id) return DEFAULT_GATEWAY_MODEL_ID;
  return data.gateway_model_id;
}

/**
 * Résout modèle + prompt pour une tâche : défaut `llm_tasks`, fusion avec `llm_task_org_overrides`.
 */
export async function resolveLlmTask(
  supabase: SupabaseClient,
  options: {
    taskKey: string;
    orgId: string | null;
    context: Record<string, string>;
  },
): Promise<ResolvedLlmTask> {
  const { taskKey, orgId, context } = options;

  const { data: taskRow } = await supabase
    .from('llm_tasks')
    .select('system_prompt_template, use_extract_json_middleware, model_id')
    .eq('task_key', taskKey)
    .maybeSingle();

  const { data: overrideRow } = orgId
    ? await supabase
        .from('llm_task_org_overrides')
        .select('model_id, system_prompt_template, use_extract_json_middleware')
        .eq('org_id', orgId)
        .eq('task_key', taskKey)
        .maybeSingle()
    : { data: null };

  let template: string | null = taskRow?.system_prompt_template ?? null;
  let modelUuid: string | null = taskRow?.model_id ?? null;
  let useJson: boolean | null = taskRow?.use_extract_json_middleware ?? null;

  if (overrideRow) {
    if (overrideRow.model_id != null) modelUuid = overrideRow.model_id;
    if (overrideRow.system_prompt_template != null) template = overrideRow.system_prompt_template;
    if (overrideRow.use_extract_json_middleware != null) useJson = overrideRow.use_extract_json_middleware;
  }

  if (template == null || template.trim() === '') {
    throw new Error(
      `Tâche LLM non configurée : task_key="${taskKey}". Ajouter une ligne dans llm_tasks (migration seed) ou un override org.`,
    );
  }

  const gatewayModelId = await getGatewayIdForModelUuid(supabase, modelUuid);
  const systemPrompt = template.includes('{{') ? renderTemplate(template, context) : template;

  if (/\{\{/.test(systemPrompt)) {
    const unresolved = systemPrompt.match(/\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g) ?? [];
    console.warn(
      `[resolveLlmTask] Placeholders non résolus dans task_key="${taskKey}" : ${unresolved.join(', ')}. ` +
        `Vérifier que le contexte contient les clés attendues.`,
    );
  }

  return {
    gatewayModelId,
    systemPrompt,
    useExtractJson: useJson ?? false,
    taskKey,
  };
}

/** À appeler après modification des tables `llm_tasks` / `llm_task_org_overrides` via l’admin. */
export function invalidateLlmTaskCache(): void {
  // résolution sans cache persistant ; réservé pour futures optimisations
}
