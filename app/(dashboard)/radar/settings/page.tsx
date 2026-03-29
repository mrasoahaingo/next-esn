import { requireOrgId } from '@/lib/utils/auth';
import { getRadarSourceStatuses } from '@/lib/radar/queries';
import { CONVERGENCE_BONUS, SOURCE_WEIGHTS } from '@/lib/radar/scoring';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadarSettingsForm } from '@/app/(dashboard)/radar/components/radar-settings-form';
import { RadarPageLinks } from '@/app/(dashboard)/radar/components/radar-page-links';

export default async function RadarSettingsPage() {
  await requireOrgId();
  const sources = getRadarSourceStatuses();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Parametres Radar</h1>
        <p className="text-sm text-muted-foreground">
          Etat des integrations et bareme de scoring utilises par le module.
        </p>
      </div>

      <RadarPageLinks current="settings" />

      <div className="space-y-3">
        {sources.map((source) => (
          <Card key={source.key} className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="text-sm font-medium">{source.label}</div>
                <div className="text-xs text-muted-foreground">{source.detail}</div>
              </div>
              <Badge variant={source.enabled ? 'default' : 'outline'}>
                {source.enabled ? 'Configure' : 'Non configure'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <RadarSettingsForm />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Poids par source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(SOURCE_WEIGHTS).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{key}</span>
                <span>{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Bonus de convergence</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {Object.entries(CONVERGENCE_BONUS).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-4">
                <span className="text-muted-foreground">{key} sources distinctes</span>
                <span>+{value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
