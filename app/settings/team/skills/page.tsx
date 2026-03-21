'use client';

import { useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BarChart3, Loader2, Users } from 'lucide-react';
import { useOrgRole } from '@/lib/hooks/useOrgRole';
import { useSuperAdmin } from '@/lib/hooks/useSuperAdmin';
import { useMembers, useOrgRecruiterSkills } from '@/lib/queries';
import { formatSkillKeyLabel } from '@/lib/utils/skill-key';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function memberName(members: { userId: string; firstName: string | null; lastName: string | null; identifier: string }[], userId: string) {
  const m = members.find((x) => x.userId === userId);
  if (!m) return userId.slice(0, 8) + '…';
  const n = [m.firstName, m.lastName].filter(Boolean).join(' ').trim();
  return n || m.identifier;
}

export default function TeamRecruiterSkillsPage() {
  const { userId, isLoaded } = useAuth();
  const { isOrgAdmin, isLoaded: roleLoaded } = useOrgRole();
  const { isSuperAdmin } = useSuperAdmin();
  const canManage = isOrgAdmin || isSuperAdmin;
  const { data: members = [] } = useMembers();
  const { data: aggregates, isLoading } = useOrgRecruiterSkills(canManage && roleLoaded);

  const byUserWithNames = useMemo(() => {
    if (!aggregates?.byUser) return [];
    return aggregates.byUser.map((row) => ({
      ...row,
      name: memberName(members, row.user_id),
    }));
  }, [aggregates?.byUser, members]);

  if (!isLoaded || !roleLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userId) {
    redirect('/sign-in');
  }

  if (!canManage) {
    redirect('/settings/team');
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet/15 text-violet">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold title-gradient">Technos assimilées — équipe</h1>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Vue agrégée : combien de membres ont marqué chaque techno comme « comprise », et volume
                par collaborateur. Données issues des fiches de poste analysées.
              </p>
            </div>
          </div>
          <Link
            href="/settings/team"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium hover:bg-muted/50"
          >
            <Users className="h-3.5 w-3.5" />
            Membres
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-8">
            <section className="glass-panel rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Par technologie</h2>
              {!aggregates?.bySkill?.length ? (
                <p className="text-sm text-muted-foreground">Aucune donnée pour l&apos;instant.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Technologie</TableHead>
                      <TableHead className="text-xs text-right">Membres</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregates.bySkill.map((row) => (
                      <TableRow key={row.skill_key}>
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {formatSkillKeyLabel(row.skill_key)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{row.member_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>

            <section className="glass-panel rounded-2xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-4">Par membre</h2>
              {!byUserWithNames.length ? (
                <p className="text-sm text-muted-foreground">Aucune donnée pour l&apos;instant.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Membre</TableHead>
                      <TableHead className="text-xs text-right">Technos assimilées</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byUserWithNames.map((row) => (
                      <TableRow key={row.user_id}>
                        <TableCell className="text-sm">{row.name}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{row.skill_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
