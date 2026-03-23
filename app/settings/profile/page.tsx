'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { GraduationCap, Loader2, Search } from 'lucide-react';
import { useRecruiterSkills } from '@/lib/queries';
import { formatSkillKeyLabel } from '@/lib/utils/skill-key';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function RecruiterProfilePage() {
  const { userId, isLoaded } = useAuth();
  const { data, isLoading } = useRecruiterSkills();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const skills = data?.skills ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(
      (s) =>
        s.skill_key.toLowerCase().includes(q) ||
        formatSkillKeyLabel(s.skill_key).toLowerCase().includes(q),
    );
  }, [data?.skills, query]);

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-8 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-neon/15 text-neon">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold title-gradient">Mes technos assimilées</h1>
            <p className="mt-1 text-sm text-muted-foreground max-w-xl">
              Liste des technologies que vous avez marquées « comprises » sur les analyses de fiches de
              poste. Ces repères sont partagés entre toutes les missions de l&apos;organisation pour
              éviter de redemander une explication sur la même techno.
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {isLoading ? (
                'Chargement…'
              ) : (
                <>
                  <span className="font-semibold text-foreground">{data?.skills?.length ?? 0}</span>{' '}
                  technologie{(data?.skills?.length ?? 0) > 1 ? 's' : ''} enregistrée
                  {(data?.skills?.length ?? 0) > 1 ? 's' : ''}
                </>
              )}
            </p>
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filtrer…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !data?.skills?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aucune techno assimilée pour l&apos;instant. Ouvrez une mission et lancez l&apos;analyse de
              la fiche de poste pour marquer des points « compris ».
            </p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucun résultat pour ce filtre.</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Technologie</TableHead>
                  <TableHead className="text-xs text-right">Depuis le</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.skill_key}>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {formatSkillKeyLabel(s.skill_key)}
                      </Badge>
                      <span className="ml-2 text-[10px] text-muted-foreground font-mono">{s.skill_key}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {new Date(s.understood_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
