import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/utils/auth'
import { getSupabase } from '@/lib/utils/supabase'

const putBody = z.object({
  orgId: z.string().min(1),
  taskKey: z.string().min(1),
  modelId: z.string().uuid().nullable().optional(),
  systemPromptTemplate: z.string().nullable().optional(),
  useExtractJsonMiddleware: z.boolean().nullable().optional(),
})

export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  if (!orgId) {
    return NextResponse.json({ error: 'orgId requis' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('llm_task_org_overrides')
    .select('*, llm_models(*)')
    .eq('org_id', orgId)
    .order('task_key', { ascending: true })

  if (error) {
    console.error('org overrides GET', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ overrides: data ?? [] })
}

export async function PUT(req: Request) {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  let body: z.infer<typeof putBody>
  try {
    body = putBody.parse(await req.json())
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }

  const supabase = getSupabase()
  const row = {
    org_id: body.orgId,
    task_key: body.taskKey,
    model_id: body.modelId === undefined ? null : body.modelId,
    system_prompt_template:
      body.systemPromptTemplate === undefined ? null : body.systemPromptTemplate,
    use_extract_json_middleware:
      body.useExtractJsonMiddleware === undefined ? null : body.useExtractJsonMiddleware,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('llm_task_org_overrides')
    .upsert(row, { onConflict: 'org_id,task_key' })
    .select('*, llm_models(*)')
    .single()

  if (error) {
    console.error('org overrides PUT', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ override: data })
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const orgId = req.nextUrl.searchParams.get('orgId')
  const taskKey = req.nextUrl.searchParams.get('taskKey')
  if (!orgId || !taskKey) {
    return NextResponse.json({ error: 'orgId et taskKey requis' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { error } = await supabase
    .from('llm_task_org_overrides')
    .delete()
    .eq('org_id', orgId)
    .eq('task_key', taskKey)

  if (error) {
    console.error('org overrides DELETE', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
