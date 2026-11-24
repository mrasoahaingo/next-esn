'use client';

import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChartEmpty } from './chart-empty';
import { plural } from './dashboard-format';
import type { DashboardData, SkillCoverage, SkillDemand } from './dashboard-stats';
import { SectionHeading } from './section-heading';

const LEGEND = [
  { key: 'strong', label: 'Fort', swatch: 'bg-primary' },
  { key: 'partial', label: 'Partiel', swatch: 'bg-primary/50' },
  { key: 'missing', label: 'Manquant', swatch: 'bg-border' },
] as const;

/**
 * Compétences demandées : une barre à trois segments par compétence, triées par
 * fréquence, et la couverture globale en méta. En pied, la ligne des technologies
 * assimilées sur le profil du recruteur.
 */
export function SkillsDemand({
  skills,
  coverage,
  analyzedCount,
  recruiterSkills,
}: {
  skills: SkillDemand[];
  coverage: SkillCoverage;
  analyzedCount: number;
  recruiterSkills: DashboardData['recruiter_skills'];
}): React.JSX.Element {
  const meta =
    coverage.rate == null
      ? undefined
      : `Couverture ${coverage.rate} % · ${analyzedCount} ${plural(analyzedCount, 'analyse')}`;

  return (
    <section aria-labelledby="skills-demand-title">
      <SectionHeading id="skills-demand-title" title="Compétences demandées" meta={meta} />

      {skills.length === 0 ? (
        <ChartEmpty
          title="Aucune compétence évaluée."
          description="Les compétences demandées apparaissent après la première analyse de positionnement."
        />
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Légende">
            {LEGEND.map((l) => (
              <li key={l.key} className="flex items-center gap-1.5">
                <span className={`inline-block size-2 rounded-sm ${l.swatch}`} aria-hidden="true" />
                {l.label}
              </li>
            ))}
          </ul>
          <ul className="mt-4 grid gap-x-10 gap-y-3 md:grid-cols-2">
            {skills.map((s) => (
              <li key={s.skill} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm text-foreground sm:w-36" title={s.skill}>
                  {s.skill}
                </span>
                <span className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full" aria-hidden="true">
                  {s.strong > 0 ? (
                    <span className="h-full bg-primary" style={{ width: `${(s.strong / s.total) * 100}%` }} />
                  ) : null}
                  {s.partial > 0 ? (
                    <span className="h-full bg-primary/50" style={{ width: `${(s.partial / s.total) * 100}%` }} />
                  ) : null}
                  {s.missing > 0 ? (
                    <span className="h-full bg-border" style={{ width: `${(s.missing / s.total) * 100}%` }} />
                  ) : null}
                </span>
                <Tooltip>
                  <TooltipTrigger className="w-12 shrink-0 cursor-help rounded-sm text-right font-mono text-xs font-medium tabular-nums text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                    {s.matchRate}&nbsp;%
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>
                      {s.strong} fort · {s.partial} partiel · {s.missing} manquant. Évalué dans {s.total}{' '}
                      {plural(s.total, 'positionnement')}.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        </>
      )}

      {recruiterSkills ? (
        <p className="mt-6 border-t border-border pt-3 text-sm text-muted-foreground">
          {recruiterSkills.total > 0 ? (
            <>
              <span className="font-mono tabular-nums text-foreground">{recruiterSkills.total}</span>{' '}
              {plural(recruiterSkills.total, 'technologie assimilée')} sur votre profil ·{' '}
              <Link
                href="/settings/profile"
                className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Voir tout
              </Link>
            </>
          ) : (
            <>
              Aucune technologie assimilée pour l&rsquo;instant. Marquez-les comme comprises depuis l&rsquo;analyse
              d&rsquo;une fiche de poste ·{' '}
              <Link
                href="/settings/profile"
                className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                Voir le profil
              </Link>
            </>
          )}
        </p>
      ) : null}
    </section>
  );
}
