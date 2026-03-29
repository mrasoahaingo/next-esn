import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Match } from '@/lib/radar/schemas';
import { getCompanyInitials } from '@/lib/radar/ui';

export function ConsultantMatches({ matches }: { matches: Match[] }) {
  return (
    <Card className="border-border/70 bg-card/80 shadow-sm backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">
          Consultants proposes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {matches.map((match) => (
          <div
            key={match.consultantId}
            className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-200">
              {getCompanyInitials(match.consultantName)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{match.consultantName}</p>
              <p className="text-xs text-muted-foreground">
                {match.skills.slice(0, 3).join(' · ') || 'Competences non renseignees'}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${
                    match.availability.toLowerCase().includes('available')
                      ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-200'
                    : match.availability.toLowerCase().includes('mission')
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200'
                  }`}
                >
                  {match.availability}
                </span>
                <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                  TJM {match.tjm ?? 'n/a'}€
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-base font-semibold text-emerald-700 dark:text-emerald-400">
                {Math.round(match.matchScore * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">Best match</div>
            </div>
          </div>
        ))}
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun consultant disponible au-dessus du seuil de matching.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
