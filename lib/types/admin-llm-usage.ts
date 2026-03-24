/** Ligne renvoyée par GET /api/admin/llm-usage (super_admin). */
export type AdminLlmUsageRow = {
  id: string
  created_at: string
  operation: string
  task_key: string | null
  ai_model: string
  duration_ms: number
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  candidate_id: string | null
  positioning_id: string | null
  mission_id: string | null
  org_id: string | null
  workflow_run_id: string | null
  input_payload: unknown
  output_payload: unknown
}
