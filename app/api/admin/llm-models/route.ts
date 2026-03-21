import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireSuperAdmin } from '@/lib/utils/auth'
import { getSupabase } from '@/lib/utils/supabase'

const createBody = z.object({
  gatewayModelId: z.string().min(1),
  displayName: z.string().min(1),
  inputUsdPer1m: z.number().nonnegative(),
  outputUsdPer1m: z.number().nonnegative(),
  cacheReadUsdPer1m: z.number().nonnegative().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function GET() {
  try {
    await requireSuperAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('llm_models')
    .select('*')
    .order('display_name', { ascending: true })

  if (error) {
    console.error('llm_models GET', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ models: data ?? [] })
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
    .from('llm_models')
    .insert({
      gateway_model_id: body.gatewayModelId,
      display_name: body.displayName,
      input_usd_per_1m: body.inputUsdPer1m,
      output_usd_per_1m: body.outputUsdPer1m,
      cache_read_usd_per_1m: body.cacheReadUsdPer1m ?? null,
      notes: body.notes ?? null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('llm_models POST', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ model: data })
}
