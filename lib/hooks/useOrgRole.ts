'use client'

import { useOrganization } from '@clerk/nextjs'

export function useOrgRole() {
  const { membership, isLoaded } = useOrganization()

  const role = membership?.role as string | undefined
  const isOrgAdmin = role === 'org:admin'
  const isOrgMember = role === 'org:member'

  return { role, isOrgAdmin, isOrgMember, isLoaded }
}
