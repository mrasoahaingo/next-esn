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

  const members = await Promise.all(
    result.data.map(async (m) => {
      const userId = m.publicUserData?.userId
      let isSuperAdmin = false
      if (userId) {
        try {
          const user = await clerk.users.getUser(userId)
          isSuperAdmin =
            (user.publicMetadata as { role?: string } | undefined)?.role ===
            'super_admin'
        } catch {
          // ignore — badge sans flag super admin
        }
      }

      return {
        id: m.id,
        userId,
        firstName: m.publicUserData?.firstName,
        lastName: m.publicUserData?.lastName,
        imageUrl: m.publicUserData?.imageUrl,
        identifier: m.publicUserData?.identifier,
        role: m.role,
        isSuperAdmin,
        createdAt: m.createdAt,
      }
    }),
  )

  return NextResponse.json(members)
}
