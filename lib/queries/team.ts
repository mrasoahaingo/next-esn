import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/nextjs'
import { queryKeys } from './keys'

export interface OrgMember {
  id: string
  userId: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  identifier: string
  role: 'org:admin' | 'org:member'
  /** Plateforme (Clerk publicMetadata.role), distinct du rôle org */
  isSuperAdmin: boolean
  createdAt: number
}

export interface OrgInvitation {
  id: string
  emailAddress: string
  role: 'org:admin' | 'org:member'
  status: 'pending'
  url: string | null
  createdAt: number
}

export function useMembers() {
  const { orgId } = useAuth()

  return useQuery<OrgMember[]>({
    queryKey: queryKeys.team.members(orgId ?? ''),
    queryFn: async () => {
      const res = await fetch('/api/members')
      if (!res.ok) throw new Error('Impossible de charger les membres')
      return res.json()
    },
    enabled: !!orgId,
  })
}

export function useInvitations() {
  const { orgId } = useAuth()

  return useQuery<OrgInvitation[]>({
    queryKey: queryKeys.team.invitations(orgId ?? ''),
    queryFn: async () => {
      const res = await fetch('/api/invitations')
      if (!res.ok) throw new Error('Impossible de charger les invitations')
      return res.json()
    },
    enabled: !!orgId,
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
  const { orgId } = useAuth()

  return useMutation({
    mutationFn: async ({
      emailAddress,
      role,
    }: {
      emailAddress: string
      role: 'org:admin' | 'org:member'
    }) => {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailAddress, role }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? "Erreur lors de l'envoi de l'invitation")
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.team.invitations(orgId ?? '') }),
  })
}

export function useRevokeInvitation() {
  const qc = useQueryClient()
  const { orgId } = useAuth()

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error("Erreur lors de la révocation de l'invitation")
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.team.invitations(orgId ?? '') }),
  })
}

export function useUpdateMemberRole() {
  const qc = useQueryClient()
  const { orgId } = useAuth()

  return useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: string
      role: 'org:admin' | 'org:member'
    }) => {
      const res = await fetch(`/api/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error('Erreur lors du changement de rôle')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.team.members(orgId ?? '') }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  const { orgId } = useAuth()

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/members/${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erreur lors de la suppression du membre')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.team.members(orgId ?? '') }),
  })
}
