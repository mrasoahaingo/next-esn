import { NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { requireOrgAdmin } from '@/lib/utils/auth'

export async function GET() {
  let ctx
  try {
    ctx = await requireOrgAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const clerk = await clerkClient()
  const result = await clerk.organizations.getOrganizationMembershipList({
    organizationId: ctx.orgId,
    limit: 100,
  })

  const members = result.data.map((m) => ({
    id: m.id,
    userId: m.publicUserData?.userId,
    firstName: m.publicUserData?.firstName,
    lastName: m.publicUserData?.lastName,
    imageUrl: m.publicUserData?.imageUrl,
    identifier: m.publicUserData?.identifier,
    role: m.role,
    createdAt: m.createdAt,
  }))

  return NextResponse.json(members)
}
