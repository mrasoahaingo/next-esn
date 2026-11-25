'use client';

import Link from 'next/link';
import { Tags } from 'lucide-react';
import { Panel, PanelBody, PanelFooter, PanelHeader } from '@/components/app/panel';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { plural } from './dashboard-format';
import type { DashboardData, SkillCoverage, SkillDemand } from './dashboard-stats';
import { PanelEmpty } from './panel-empty';

const LEGEND = [
  { key: 'strong', label: 'Fort', swatch: 'bg-primary' },
  { key: 'partial', label: 'Partiel', swatch: 'bg-primary/50' },
  { key: 'missing', label: 'Manquant', swatch: 'bg-border' },
] as const;

const FOOTER_LINK =
  'rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

/**
 * Compétences demandées, dans un panneau : une barre à trois segments par
 * compétence, triées par fréquence, la couverture globale en compteur et la
 * légende dans l'en-tête. En pied, les technologies assimilées sur le profil.
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
  return (
    <Panel aria-labelledby="skills-demand-title">
      <PanelHeader
        id="skills-demand-title"
        icon={Tags}
        title="Compétences demandées"
        count={coverage.rate == null ? undefined : `Couverture ${coverage.rate} %`}
        description={
          skills.length > 0 ? `Sur ${analyzedCount} ${plural(analyzedCount, 'analyse')} de positionnement` : undefined
        }
        actions={
          skills.length > 0 ? (
            <ul className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex" aria-label="Légende">
              {LEGEND.map((l) => (
                <li key={l.key} className="flex items-center gap-1.5">
                  <span className={`inline-block size-2 rounded-sm ${l.swatch}`} aria-hidden="true" />
                  {l.label}
                </li>
              ))}
            </ul>
          ) : undefined
        }
      />
      <PanelBody padded={skills.length > 0}>
        {skills.length === 0 ? (
          <PanelEmpty
            icon={Tags}
            title="Aucune compétence évaluée."
            description="Les compétences demandées apparaissent après la première analyse de positionnement."
            action={{ label: 'Créer un positionnement', href: '/cvs' }}
          />
        ) : (
          <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {skills.map((s) => (
              <li key={s.skill} className="flex items-center gap-3">
                <span className="w-28 shrink-0 truncate text-sm text-foreground sm:w-36" title={s.skill}>
                  {s.skill}
                </span>
                <span className="flex h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
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
        )}
      </PanelBody>
      {recruiterSkills ? (
        <PanelFooter>
          {recruiterSkills.total > 0 ? (
            <p>
              <span className="font-mono tabular-nums text-foreground">{recruiterSkills.total}</span>{' '}
              {plural(recruiterSkills.total, 'technologie assimilée')} sur votre profil
            </p>
          ) : (
            <p>Aucune technologie assimilée pour l&rsquo;instant : marquez-les depuis l&rsquo;analyse d&rsquo;une fiche de poste.</p>
          )}
          <Link href="/settings/profile" className={FOOTER_LINK}>
            {recruiterSkills.total > 0 ? 'Voir tout' : 'Voir le profil'}
          </Link>
        </PanelFooter>
      ) : null}
    </Panel>
  );
}
