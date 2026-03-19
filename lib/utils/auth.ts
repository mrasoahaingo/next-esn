import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Returns the authenticated orgId from Clerk's session.
 * Throws a NextResponse with 401/403 if the user is not authenticated
 * or has no active organization.
 */
export async function requireOrgId(): Promise<string> {
  const { userId, orgId } = await auth()

  if (!userId) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!orgId) {
    throw NextResponse.json({ error: 'No active organization' }, { status: 403 })
  }

  return orgId
}
