'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useOrgRole } from '@/lib/hooks/useOrgRole'
import { useSuperAdmin } from '@/lib/hooks/useSuperAdmin'
import {
  useMembers,
  useInvitations,
  useInviteMember,
  useRevokeInvitation,
  useUpdateMemberRole,
  useRemoveMember,
} from '@/lib/queries'
import type { OrgMember, OrgInvitation } from '@/lib/queries'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Users,
  UserPlus,
  Mail,
  Loader2,
  Trash2,
  Clock,
  ShieldCheck,
  User,
  Crown,
  Link2,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'
import { redirect } from 'next/navigation'

function RoleBadge({
  role,
  isSuperAdmin = false,
}: {
  role: string
  isSuperAdmin?: boolean
}) {
  if (isSuperAdmin) {
    return (
      <Badge className="gap-1 bg-neon/10 text-neon border-neon/25 hover:bg-neon/10">
        <ShieldCheck className="h-2.5 w-2.5" />
        Support
      </Badge>
    )
  }
  if (role === 'org:admin') {
    return (
      <Badge className="gap-1 bg-violet/15 text-violet border-violet/20 hover:bg-violet/15">
        <Crown className="h-2.5 w-2.5" />
        Admin
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="gap-1 text-muted-foreground">
      <User className="h-2.5 w-2.5" />
      Membre
    </Badge>
  )
}

function MemberAvatar({
  member,
}: {
  member: Pick<OrgMember, 'firstName' | 'lastName' | 'imageUrl' | 'identifier'>
}) {
  const initials =
    [member.firstName?.[0], member.lastName?.[0]].filter(Boolean).join('') ||
    member.identifier[0].toUpperCase()

  if (member.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- External Clerk avatar URL, not optimizable via next/image
      <img
        src={member.imageUrl}
        alt={initials}
        className="h-8 w-8 rounded-full object-cover"
      />
    )
  }
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet/15 text-xs font-semibold text-violet">
      {initials}
    </div>
  )
}

export default function TeamSettingsPage() {
  const { userId } = useAuth()
  const { isOrgAdmin, isLoaded: roleLoaded } = useOrgRole()
  const { isSuperAdmin } = useSuperAdmin()
  const canManage = isOrgAdmin || isSuperAdmin

  const { data: members = [], isLoading: membersLoading } = useMembers()
  const { data: invitations = [], isLoading: invitationsLoading } =
    useInvitations()

  const inviteMember = useInviteMember()
  const revokeInvitation = useRevokeInvitation()
  const updateRole = useUpdateMemberRole()
  const removeMember = useRemoveMember()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'org:admin' | 'org:member'>('org:member')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)
  const [lastInviteEmail, setLastInviteEmail] = useState<string | null>(null)

  function copyInviteLink(inv: OrgInvitation) {
    if (!inv.url) return
    navigator.clipboard.writeText(inv.url).then(() => {
      setCopiedId(inv.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function copyLastInviteUrl() {
    if (!lastInviteUrl) return
    navigator.clipboard.writeText(lastInviteUrl).then(() => {
      setCopiedId('last')
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  if (roleLoaded && !canManage) {
    redirect('/')
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    try {
      const result = await inviteMember.mutateAsync({ emailAddress: email.trim(), role })
      toast.success(`Invitation envoyée à ${email.trim()}`)
      if (result?.url) {
        setLastInviteUrl(result.url)
        setLastInviteEmail(email.trim())
      }
      setEmail('')
      setRole('org:member')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleRevoke(invitation: OrgInvitation) {
    try {
      await revokeInvitation.mutateAsync(invitation.id)
      toast.success(`Invitation révoquée pour ${invitation.emailAddress}`)
    } catch {
      toast.error("Impossible de révoquer l'invitation")
    }
  }

  async function handleRoleChange(
    member: OrgMember,
    newRole: 'org:admin' | 'org:member'
  ) {
    try {
      await updateRole.mutateAsync({ userId: member.userId, role: newRole })
      toast.success(`Rôle mis à jour pour ${member.identifier}`)
    } catch {
      toast.error('Impossible de changer le rôle')
    }
  }

  async function handleRemove(member: OrgMember) {
    try {
      await removeMember.mutateAsync(member.userId)
      toast.success(`${member.identifier} a été retiré de l'organisation`)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const isLoading = membersLoading || invitationsLoading

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/15 text-violet">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold title-gradient inline-block">
              Équipe
            </h1>
            <p className="text-sm text-muted-foreground">
              Gérez les membres et invitations de votre organisation
            </p>
          </div>
        </div>

        {/* Invite form */}
        <div className="rounded-xl glass-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-neon" />
            <h2 className="text-sm font-semibold text-foreground">
              Inviter un membre
            </h2>
          </div>
          {lastInviteUrl && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-neon/20 bg-neon/5 px-3 py-2.5">
              <Link2 className="h-3.5 w-3.5 shrink-0 text-neon" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground">
                  Lien pour <span className="text-foreground font-medium">{lastInviteEmail}</span>
                </p>
                <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                  {lastInviteUrl}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 shrink-0 gap-1.5 text-xs"
                onClick={copyLastInviteUrl}
              >
                {copiedId === 'last' ? (
                  <>
                    <Check className="h-3 w-3 text-neon" />
                    Copié
                  </>
                ) : (
                  <>
                    <Link2 className="h-3 w-3" />
                    Copier
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="ml-1 shrink-0 text-muted-foreground"
                onClick={() => { setLastInviteUrl(null); setLastInviteEmail(null) }}
                aria-label="Fermer"
              >
                ✕
              </Button>
            </div>
          )}
          <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field className="min-w-0 flex-1">
              <FieldLabel htmlFor="invite-email" className="text-xs text-muted-foreground">
                Adresse email
              </FieldLabel>
              <Input
                id="invite-email"
                type="email"
                placeholder="prenom.nom@esneo.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </Field>
            <Field className="w-full sm:w-36">
              <FieldLabel htmlFor="invite-role" className="text-xs text-muted-foreground">Rôle</FieldLabel>
              <Select
                value={role}
                onValueChange={(v: string | null) => {
                  if (v) setRole(v as 'org:admin' | 'org:member')
                }}
              >
                <SelectTrigger id="invite-role" className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org:member">Membre</SelectItem>
                  <SelectItem value="org:admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button
              type="submit"
              disabled={inviteMember.isPending || !email.trim()}
              className="h-9 bg-neon text-neutral-950 hover:bg-neon/90"
            >
              {inviteMember.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="mr-1.5 h-3.5 w-3.5" />
                  Inviter
                </>
              )}
            </Button>
          </form>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Members list */}
            <div className="rounded-xl glass-panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-white/5 px-5 py-3.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">
                  Membres
                </h2>
                <span className="ml-auto text-xs text-muted-foreground">
                  {members.length} membre{members.length !== 1 ? 's' : ''}
                </span>
              </div>

              {members.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Users className="mb-2 h-6 w-6" />
                  <p className="text-xs">Aucun membre</p>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {members.map((member) => {
                    const isCurrentUser = member.userId === userId
                    return (
                      <li
                        key={member.id}
                        className="flex items-center gap-3 px-5 py-3.5"
                      >
                        <MemberAvatar member={member} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {member.firstName && member.lastName
                              ? `${member.firstName} ${member.lastName}`
                              : member.identifier}
                          </p>
                          {(member.firstName || member.lastName) && (
                            <p className="truncate text-xs text-muted-foreground">
                              {member.identifier}
                            </p>
                          )}
                        </div>
                        {isCurrentUser ? (
                          <div className="flex items-center gap-2">
                            <RoleBadge
                              role={member.role}
                              isSuperAdmin={member.isSuperAdmin}
                            />
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Vous
                            </Badge>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {member.isSuperAdmin ? (
                              <RoleBadge
                                role={member.role}
                                isSuperAdmin
                              />
                            ) : (
              <Select
                value={member.role}
                onValueChange={(v: string | null) => {
                  if (v) handleRoleChange(member, v as 'org:admin' | 'org:member')
                }}
                disabled={updateRole.isPending}
              >
                              <SelectTrigger className="h-7 w-28 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="org:member">Membre</SelectItem>
                                <SelectItem value="org:admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                }
                              />
                              <AlertDialogContent className="bg-panel border-overlay/10">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Retirer ce membre ?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <strong>{member.identifier}</strong> n&apos;aura
                                    plus accès à l&apos;organisation. Cette action
                                    est réversible via une nouvelle invitation.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleRemove(member)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Retirer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* Pending invitations */}
            {invitations.length > 0 && (
              <div className="rounded-xl glass-panel overflow-hidden">
                <div className="flex items-center gap-2 border-b border-white/5 px-5 py-3.5">
                  <Clock className="h-4 w-4 text-amber-400" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Invitations en attente
                  </h2>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {invitations.length}
                  </span>
                </div>
                <ul className="divide-y divide-white/5">
                  {invitations.map((inv) => (
                    <li
                      key={inv.id}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/10">
                        <Mail className="h-3.5 w-3.5 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {inv.emailAddress}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Invité le{' '}
                          {new Date(inv.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <RoleBadge role={inv.role} />
                        {inv.url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => copyInviteLink(inv)}
                            title="Copier le lien d'invitation"
                          >
                            {copiedId === inv.id ? (
                              <Check className="h-3.5 w-3.5 text-neon" />
                            ) : (
                              <Link2 className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                disabled={revokeInvitation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                          <AlertDialogContent className="bg-panel border-overlay/10">
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Révoquer cette invitation ?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                L&apos;invitation envoyée à{' '}
                                <strong>{inv.emailAddress}</strong> sera
                                annulée. Le lien reçu par email ne fonctionnera
                                plus.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevoke(inv)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Révoquer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Info banner */}
            <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-card/30 px-4 py-3.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-neon" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                Les membres invités recevront un email avec un lien pour
                rejoindre l&apos;organisation. Ils devront créer un compte s&apos;ils
                n&apos;en ont pas encore. Seuls les <strong className="text-foreground">admins</strong> peuvent inviter, changer les rôles ou retirer des membres.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
