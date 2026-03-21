import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/utils/auth'
import { getSupabase } from '@/lib/utils/supabase'

const createBody = z.object({
  taskKey: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional().nullable(),
  modelId: z.string().uuid(),
  systemPromptTemplate: z.string().min(1),
  useExtractJsonMiddleware: z.boolean(),
})

export async function GET() {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('llm_tasks')
    .select('*, llm_models(*)')
    .order('task_key', { ascending: true })

  if (error) {
    console.error('llm_tasks GET', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  let body: z.infer<typeof createBody>
  try {
    body = createBody.parse(await req.json())
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('llm_tasks')
    .insert({
      task_key: body.taskKey,
      label: body.label,
      description: body.description ?? null,
      model_id: body.modelId,
      system_prompt_template: body.systemPromptTemplate,
      use_extract_json_middleware: body.useExtractJsonMiddleware,
    })
    .select('*, llm_models(*)')
    .single()

  if (error) {
    console.error('llm_tasks POST', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ task: data })
}
