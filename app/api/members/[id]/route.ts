import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireOrgAdmin } from '@/lib/utils/auth'

// PATCH /api/members/[id] — changer le rôle d'un membre (id = userId)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx
  try {
    ctx = await requireOrgAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const { id: userId } = await params
  const { role } = await req.json()

  if (!['org:admin', 'org:member'].includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  const clerk = await clerkClient()
  const updated = await clerk.organizations.updateOrganizationMembership({
    organizationId: ctx.orgId,
    userId,
    role,
  })

  return NextResponse.json(updated)
}

// DELETE /api/members/[id] — retirer un membre (id = userId)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let ctx
  try {
    ctx = await requireOrgAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const { id: userId } = await params

  if (userId === ctx.userId) {
    return NextResponse.json(
      { error: 'Vous ne pouvez pas vous retirer vous-même' },
      { status: 400 }
    )
  }

  const clerk = await clerkClient()
  await clerk.organizations.deleteOrganizationMembership({
    organizationId: ctx.orgId,
    userId,
  })

  return new NextResponse(null, { status: 204 })
}
