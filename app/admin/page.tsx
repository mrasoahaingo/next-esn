'use client'

import { useAdminStats, useUpdateOrgCvCodeTemplate } from '@/lib/queries'
import { useSuperAdmin } from '@/lib/hooks/useSuperAdmin'
import { redirect } from 'next/navigation'
import {
  Building2,
  FileText,
  Target,
  Cpu,
  DollarSign,
  Loader2,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CV_CODE_TEMPLATE_IDS, CV_CODE_TEMPLATE_LABELS } from '@/templates/registry'
import { toast } from 'sonner'

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

export default function AdminPage() {
  const { isSuperAdmin, isLoaded } = useSuperAdmin()
  const { data, isLoading } = useAdminStats()
  const updateCvTemplate = useUpdateOrgCvCodeTemplate()

  if (isLoaded && !isSuperAdmin) {
    redirect('/')
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const { totals, organizations } = data
  const sortedOrgs = [...organizations].sort(
    (a, b) => b.candidates + b.positionings - (a.candidates + a.positionings)
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold title-gradient inline-block">
              Administration
            </h1>
            <p className="text-sm text-muted-foreground">
              Vue plateforme — toutes les organisations
            </p>
          </div>
        </div>

        {/* Global stats */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              icon: Building2,
              label: 'Organisations',
              value: totals.organizations,
              accent: 'text-violet bg-violet/15',
            },
            {
              icon: FileText,
              label: 'CVs totaux',
              value: totals.candidates,
              accent: 'text-accent bg-accent/15',
            },
            {
              icon: Target,
              label: 'Positionnements',
              value: totals.positionings,
              accent: 'text-neon bg-neon/15',
            },
            {
              icon: TrendingUp,
              label: 'Tokens entrée',
              value: formatTokens(totals.inputTokens),
              accent: 'text-amber-400 bg-amber-400/15',
            },
            {
              icon: Cpu,
              label: 'Tokens sortie',
              value: formatTokens(totals.outputTokens),
              accent: 'text-primary bg-primary/15',
            },
            {
              icon: DollarSign,
              label: 'Coût estimé (USD)',
              value: formatUsd(totals.estimatedCostUsd),
              accent: 'text-emerald-400 bg-emerald-400/15',
            },
          ].map((card) => {
            const Icon = card.icon
            return (
              <div key={card.label} className="rounded-xl glass-panel px-4 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.accent}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground">
                      {card.value}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {card.label}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {totals.pricingUnknownModels.length > 0 ? (
          <p className="mb-6 text-xs text-amber-400/90">
            Modèles sans entrée dans{' '}
            <span className="font-mono">lib/pricing.ts</span> (coût non compté) :{' '}
            {totals.pricingUnknownModels.join(', ')}
          </p>
        ) : (
          <p className="mb-6 text-[11px] text-muted-foreground">
            Coût basé sur le barème <span className="font-mono">lib/pricing.ts</span> (à
            aligner sur la grille fournisseur).
          </p>
        )}

        {/* Organizations table */}
        <Card className="glass-panel border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Building2 className="h-4 w-4 text-violet" />
              Organisations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedOrgs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Template CV (code)</TableHead>
                    <TableHead className="text-right">CVs</TableHead>
                    <TableHead className="text-right">
                      Positionnements
                    </TableHead>
                    <TableHead className="text-right">
                      Tokens entrée
                    </TableHead>
                    <TableHead className="text-right">
                      Tokens sortie
                    </TableHead>
                    <TableHead className="text-right">Coût estimé</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrgs.map((org) => (
                    <TableRow key={org.orgId}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {org.name ?? '—'}
                          </p>
                          <p className="font-mono text-[10px] text-muted-foreground">
                            {org.orgId?.slice(0, 20) ?? '—'}…
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={org.cvCodeTemplate ?? 'himeo'}
                          onValueChange={(v) => {
                            if (v == null || v === '') return
                            const oid = org.orgId
                            if (typeof oid !== 'string' || !oid) return
                            updateCvTemplate.mutate(
                              { orgId: oid, cvCodeTemplate: v },
                              {
                                onSuccess: () =>
                                  toast.success('Template CV mis à jour'),
                                onError: (e) =>
                                  toast.error(
                                    e instanceof Error ? e.message : 'Erreur',
                                  ),
                              },
                            )
                          }}
                          disabled={updateCvTemplate.isPending}
                        >
                          <SelectTrigger className="h-8 w-[min(100%,220px)] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CV_CODE_TEMPLATE_IDS.map((id) => (
                              <SelectItem key={id} value={id}>
                                {CV_CODE_TEMPLATE_LABELS[id]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {org.candidates}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {org.positionings}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatTokens(org.inputTokens)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatTokens(org.outputTokens)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-400/90">
                        {formatUsd(org.estimatedCostUsd)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Building2 className="mb-2 h-8 w-8" />
                <p className="text-xs">Aucune organisation</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
