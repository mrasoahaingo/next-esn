import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/utils/auth'
import { getSupabase } from '@/lib/utils/supabase'

const patchBody = z.object({
  gatewayModelId: z.string().min(1).optional(),
  displayName: z.string().min(1).optional(),
  inputUsdPer1m: z.number().nonnegative().optional(),
  outputUsdPer1m: z.number().nonnegative().optional(),
  cacheReadUsdPer1m: z.number().nonnegative().nullable().optional(),
  notes: z.string().nullable().optional(),
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
  if (body.gatewayModelId !== undefined) patch.gateway_model_id = body.gatewayModelId
  if (body.displayName !== undefined) patch.display_name = body.displayName
  if (body.inputUsdPer1m !== undefined) patch.input_usd_per_1m = body.inputUsdPer1m
  if (body.outputUsdPer1m !== undefined) patch.output_usd_per_1m = body.outputUsdPer1m
  if (body.cacheReadUsdPer1m !== undefined) patch.cache_read_usd_per_1m = body.cacheReadUsdPer1m
  if (body.notes !== undefined) patch.notes = body.notes

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('llm_models')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('llm_models PATCH', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ model: data })
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
  const { error } = await supabase.from('llm_models').delete().eq('id', id)

  if (error) {
    console.error('llm_models DELETE', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
