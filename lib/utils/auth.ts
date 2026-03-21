import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export type AppRole = 'super_admin' | 'org:admin' | 'org:member'

export async function getAuthContext() {
  const session = await auth()
  const { userId, orgId, orgRole, sessionClaims } = session

  const platformRole = sessionClaims?.metadata?.role as string | undefined
  const isSuperAdmin = platformRole === 'super_admin'

  return {
    userId,
    orgId,
    orgRole: orgRole as AppRole | undefined,
    isSuperAdmin,
    has: session.has,
  }
}

export async function requireAuth() {
  const ctx = await getAuthContext()

  if (!ctx.userId) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return ctx
}

/**
 * Throws 401 if not authenticated, 403 if no active organization.
 */
export async function requireOrgId(): Promise<string> {
  const ctx = await requireAuth()

  if (!ctx.orgId) {
    throw NextResponse.json({ error: 'No active organization' }, { status: 403 })
  }

  return ctx.orgId
}

/** Contexte auth + org (pour routes qui ont besoin de userId + orgId). */
export async function requireOrgContext(): Promise<{ orgId: string; userId: string }> {
  const ctx = await requireAuth()

  if (!ctx.orgId) {
    throw NextResponse.json({ error: 'No active organization' }, { status: 403 })
  }

  if (!ctx.userId) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { orgId: ctx.orgId, userId: ctx.userId }
}

export async function requireSuperAdmin() {
  const ctx = await requireAuth()

  if (!ctx.isSuperAdmin) {
    throw NextResponse.json({ error: 'Forbidden – super admin only' }, { status: 403 })
  }

  return ctx
}

export async function requireOrgAdmin() {
  const ctx = await requireAuth()

  if (!ctx.orgId) {
    throw NextResponse.json({ error: 'No active organization' }, { status: 403 })
  }

  if (!ctx.isSuperAdmin && !ctx.has({ role: 'org:admin' })) {
    throw NextResponse.json({ error: 'Forbidden – admin only' }, { status: 403 })
  }

  return { ...ctx, orgId: ctx.orgId }
}
