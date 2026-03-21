import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/utils/auth'
import { getSupabase } from '@/lib/utils/supabase'

const patchBody = z.object({
  taskKey: z.string().min(1).optional(),
  label: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  modelId: z.string().uuid().optional(),
  systemPromptTemplate: z.string().min(1).optional(),
  useExtractJsonMiddleware: z.boolean().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const { id } = await params
  let body: z.infer<typeof patchBody>
  try {
    body = patchBody.parse(await req.json())
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.taskKey !== undefined) patch.task_key = body.taskKey
  if (body.label !== undefined) patch.label = body.label
  if (body.description !== undefined) patch.description = body.description
  if (body.modelId !== undefined) patch.model_id = body.modelId
  if (body.systemPromptTemplate !== undefined) patch.system_prompt_template = body.systemPromptTemplate
  if (body.useExtractJsonMiddleware !== undefined)
    patch.use_extract_json_middleware = body.useExtractJsonMiddleware

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('llm_tasks')
    .update(patch)
    .eq('id', id)
    .select('*, llm_models(*)')
    .single()

  if (error) {
    console.error('llm_tasks PATCH', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task: data })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const { id } = await params
  const supabase = getSupabase()
  const { error } = await supabase.from('llm_tasks').delete().eq('id', id)

  if (error) {
    console.error('llm_tasks DELETE', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
