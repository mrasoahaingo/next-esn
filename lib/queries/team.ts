import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export const teamKeys = {
  all: ['team'] as const,
  members: () => [...teamKeys.all, 'members'] as const,
  invitations: () => [...teamKeys.all, 'invitations'] as const,
}

export interface OrgMember {
  id: string
  userId: string
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  identifier: string
  role: 'org:admin' | 'org:member'
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
  return useQuery<OrgMember[]>({
    queryKey: teamKeys.members(),
    queryFn: async () => {
      const res = await fetch('/api/members')
      if (!res.ok) throw new Error('Impossible de charger les membres')
      return res.json()
    },
  })
}

export function useInvitations() {
  return useQuery<OrgInvitation[]>({
    queryKey: teamKeys.invitations(),
    queryFn: async () => {
      const res = await fetch('/api/invitations')
      if (!res.ok) throw new Error('Impossible de charger les invitations')
      return res.json()
    },
  })
}

export function useInviteMember() {
  const qc = useQueryClient()
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
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.invitations() }),
  })
}

export function useRevokeInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (invitationId: string) => {
      const res = await fetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error("Erreur lors de la révocation de l'invitation")
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.invitations() }),
  })
}

export function useUpdateMemberRole() {
  const qc = useQueryClient()
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
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.members() }),
  })
}

export function useRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/members/${userId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erreur lors de la suppression du membre')
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: teamKeys.members() }),
  })
}
