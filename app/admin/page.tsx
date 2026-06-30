'use client'

import { useState } from 'react'
import { useAdminStats, useSetOrgDefaultTemplate } from '@/lib/queries'
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
  History,
  LayoutTemplate,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LlmSettingsTabs } from '@/components/admin/llm-settings-tabs'
import { LlmUsageHistoryTab } from '@/components/admin/llm-usage-history'

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
  const [adminTab, setAdminTab] = useState('overview')
  const { isSuperAdmin, isLoaded } = useSuperAdmin()
  const { data, isLoading } = useAdminStats()
  const setOrgDefaultTemplate = useSetOrgDefaultTemplate()

  if (isLoaded && !isSuperAdmin) {
    redirect('/dashboard')
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) return null

  const { totals, organizations, globalTemplates = [] } = data
  const sortedOrgs = [...organizations].sort(
    (a, b) => b.candidates + b.positionings - (a.candidates + a.positionings)
  )

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
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

        <Tabs value={adminTab} onValueChange={setAdminTab} className="w-full">
          <TabsList variant="segmented" className="mb-6 grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
            <TabsTrigger value="llm">Modèles &amp; tâches LLM</TabsTrigger>
            <TabsTrigger value="llm-history" className="gap-1.5">
              <History className="h-3.5 w-3.5 opacity-80" />
              Historique LLM
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex flex-col gap-6">
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
            Modèles sans tarif en base <span className="font-mono">llm_models</span> ni dans{' '}
            <span className="font-mono">lib/pricing.ts</span> (coût non compté) :{' '}
            {totals.pricingUnknownModels.join(', ')}
          </p>
        ) : (
          <p className="mb-6 text-[11px] text-muted-foreground">
            Coût estimé : table <span className="font-mono">llm_models</span> puis repli sur{' '}
            <span className="font-mono">lib/pricing.ts</span>.
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
              <div className="overflow-x-auto -mx-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organisation</TableHead>
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
                    <TableHead className="min-w-[220px]">Gabarit PDF par défaut</TableHead>
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
                      <TableCell>
                        {globalTemplates.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Aucun gabarit</span>
                        ) : (
                          <Select
                            value={
                              org.defaultTemplateId ??
                              (globalTemplates.length === 1 ? globalTemplates[0].id : null) ??
                              '__choose__'
                            }
                            onValueChange={(templateId) => {
                              if (!templateId || templateId === '__choose__') return
                              setOrgDefaultTemplate.mutate(
                                { orgId: org.orgId, templateId },
                                {
                                  onSuccess: () =>
                                    toast.success('Gabarit par défaut mis à jour'),
                                  onError: (e) =>
                                    toast.error(
                                      e instanceof Error ? e.message : 'Erreur',
                                    ),
                                },
                              )
                            }}
                            disabled={setOrgDefaultTemplate.isPending}
                          >
                            <SelectTrigger className="h-8 max-w-[260px] text-xs">
                              <LayoutTemplate className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                              <SelectValue placeholder="Choisir" />
                            </SelectTrigger>
                            <SelectContent>
                              {globalTemplates.length > 1 && !org.defaultTemplateId ? (
                                <SelectItem value="__choose__" disabled>
                                  Choisir le gabarit par défaut
                                </SelectItem>
                              ) : null}
                              {globalTemplates.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Building2 className="mb-2 h-8 w-8" />
                <p className="text-xs">Aucune organisation</p>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="llm">
            <LlmSettingsTabs />
          </TabsContent>

          <TabsContent value="llm-history">
            <LlmUsageHistoryTab
              enabled={adminTab === 'llm-history'}
              orgs={sortedOrgs.map((o) => ({ orgId: o.orgId, name: o.name ?? '' }))}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
