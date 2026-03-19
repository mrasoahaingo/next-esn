'use client'

import { useUser } from '@clerk/nextjs'

export function useSuperAdmin() {
  const { user, isLoaded } = useUser()
  console.log(user)
  const isSuperAdmin =
    isLoaded && user?.publicMetadata?.role === 'super_admin'

  return { isSuperAdmin, isLoaded }
}
