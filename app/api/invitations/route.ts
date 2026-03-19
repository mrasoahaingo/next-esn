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
  const result = await clerk.organizations.getOrganizationInvitationList({
    organizationId: ctx.orgId,
    status: ['pending'],
  })

  const invitations = result.data.map((inv) => ({
    id: inv.id,
    emailAddress: inv.emailAddress,
    role: inv.role,
    status: inv.status,
    url: inv.url ?? null,
    createdAt: inv.createdAt,
  }))

  return NextResponse.json(invitations)
}

export async function POST(req: Request) {
  let ctx
  try {
    ctx = await requireOrgAdmin()
  } catch (res) {
    return res as NextResponse
  }

  const { emailAddress, role } = await req.json()

  if (!emailAddress || !role) {
    return NextResponse.json(
      { error: 'emailAddress et role sont requis' },
      { status: 400 }
    )
  }

  if (!['org:admin', 'org:member'].includes(role)) {
    return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const clerk = await clerkClient()
  try {
    const invitation = await clerk.organizations.createOrganizationInvitation({
      organizationId: ctx.orgId,
      inviterUserId: ctx.userId!,
      emailAddress,
      role,
      redirectUrl: appUrl,
    })
    return NextResponse.json(invitation, { status: 201 })
  } catch (error) {
    console.error(JSON.stringify(error))
    return NextResponse.json({ error: 'Erreur lors de la création de l\'invitation' }, { status: 500 })
  }
}
