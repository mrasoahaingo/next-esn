import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireOrgId } from '@/lib/utils/auth';
import { getProspectDetailCached } from '@/lib/radar/queries';
import { SignalTimeline } from '@/app/(dashboard)/radar/components/signal-timeline';
import { ConsultantMatches } from '@/app/(dashboard)/radar/components/consultant-matches';
import { DecisionMakers } from '@/app/(dashboard)/radar/components/decision-makers';
import { ScoreBreakdown } from '@/app/(dashboard)/radar/components/score-breakdown';
import { AiBrief } from '@/app/(dashboard)/radar/components/ai-brief';
import { RadarPageLinks } from '@/app/(dashboard)/radar/components/radar-page-links';
import { cn } from '@/lib/utils';
import { formatRelativeTime, getCompanyInitials, HEAT_LABELS, HEAT_STYLES } from '@/lib/radar/ui';

export default async function RadarProspectPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const orgId = await requireOrgId();
  const { companyId } = await params;
  const prospect = await getProspectDetailCached(orgId, companyId);

  if (!prospect) notFound();

  const technologies = Array.from(
    new Set(
      prospect.signals.flatMap((signal) =>
        Array.isArray(signal.metadata?.technologies)
          ? signal.metadata.technologies.map(String)
          : [],
      ),
    ),
  );
  const externalSignal = prospect.signals.find((signal) => signal.source === 'linkedin');
  const latestSignalAt = prospect.signals[0]?.detectedAt;

  return (
    <div className="space-y-6 p-6">
      <RadarPageLinks
        current="detail"
        companyId={prospect.company.id}
        companyName={prospect.company.name}
      />

      <div className="flex items-start gap-4 rounded-lg border border-border/70 bg-card/85 p-5 shadow-sm backdrop-blur-sm">
        <div
          className={cn(
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-semibold',
            prospect.score ? HEAT_STYLES[prospect.score.heat] : HEAT_STYLES.cold,
          )}
        >
          {getCompanyInitials(prospect.company.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{prospect.company.name}</h1>
            {prospect.score ? (
              <span className={cn('inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium', HEAT_STYLES[prospect.score.heat])}>
                {HEAT_LABELS[prospect.score.heat].toLowerCase()}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {[prospect.company.sector, prospect.company.city, prospect.company.headcount ? `${prospect.company.headcount.toLocaleString('fr-FR')} employes` : null, prospect.company.siren ? `SIREN ${prospect.company.siren}` : null]
              .filter(Boolean)
              .join(' · ') || 'Informations de societe partielles'}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {technologies.slice(0, 5).map((technology) => (
              <span key={technology} className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-900">
                {technology}
              </span>
            ))}
          </div>
        </div>
        {prospect.score ? (
          <div className="shrink-0 text-center">
            <div className="font-mono text-4xl font-semibold leading-none tabular-nums text-red-700 dark:text-red-400">
              {prospect.score.score}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">/ 100</div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm"><CardContent className="p-4"><div className="text-sm text-muted-foreground">Signaux</div><div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{prospect.signals.length}</div></CardContent></Card>
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm"><CardContent className="p-4"><div className="text-sm text-muted-foreground">Externes</div><div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{externalSignal ? String(externalSignal.metadata?.externalCount ?? 0) : '0'}</div></CardContent></Card>
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm"><CardContent className="p-4"><div className="text-sm text-muted-foreground">Matchs</div><div className="mt-1 font-mono text-2xl font-semibold tabular-nums">{prospect.matches.length}</div></CardContent></Card>
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm"><CardContent className="p-4"><div className="text-sm text-muted-foreground">Dernier</div><div className="mt-1 text-sm font-semibold">{latestSignalAt ? formatRelativeTime(latestSignalAt) : 'Aucun'}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <SignalTimeline signals={prospect.signals} />
          <DecisionMakers companyId={prospect.company.id} contacts={prospect.contacts} />
          <ConsultantMatches matches={prospect.matches} />
        </div>
        <div className="space-y-6">
          {prospect.score ? (
            <ScoreBreakdown
              breakdown={prospect.score.breakdown}
              convergenceBonus={prospect.score.convergenceBonus}
            />
          ) : null}
          <AiBrief companyId={prospect.company.id} />
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Historique actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {prospect.actions.map((action) => (
                <div key={action.id} className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 text-sm last:border-0">
                  <div>
                    <div className="font-medium">{action.action}</div>
                    {action.notes ? <p className="mt-1 text-muted-foreground">{action.notes}</p> : null}
                  </div>
                  <div className="shrink-0 text-right text-xs text-muted-foreground">
                    {new Date(action.performedAt).toLocaleString('fr-FR')}
                  </div>
                </div>
              ))}
              <p className="text-sm italic text-muted-foreground/80">— En attente de votre action...</p>
            </CardContent>
          </Card>
          <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline">Generer email</Button>
              <Button variant="outline">Message LinkedIn</Button>
              <Button variant="outline">Fiche consultant</Button>
              <Button variant="outline">Marquer comme contacte</Button>
              <Button variant="ghost" className="text-muted-foreground">Ignorer</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
