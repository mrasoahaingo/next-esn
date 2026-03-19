import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireOrgAdmin } from '@/lib/utils/auth'

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

  const { id } = await params

  const clerk = await clerkClient()
  await clerk.organizations.revokeOrganizationInvitation({
    organizationId: ctx.orgId,
    invitationId: id,
    requestingUserId: ctx.userId!,
  })

  return new NextResponse(null, { status: 204 })
}
