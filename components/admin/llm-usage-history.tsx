'use client'

import { useCallback, useMemo, useState } from 'react'
import { useAdminLlmUsage, type AdminLlmUsageQueryParams } from '@/lib/queries/admin'
import type { AdminLlmUsageRow } from '@/lib/types/admin-llm-usage'
import { TASK_KEY } from '@/lib/llm/task-keys'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Switch } from '@/components/ui/switch'
import { LlmPayloadJsonView } from '@/components/admin/llm-payload-json-view'
import { ChevronLeft, ChevronRight, History, Loader2 } from 'lucide-react'

const PAGE_SIZE = 40
const AUTO_REFRESH_MS = 5000

const TASK_KEY_OPTIONS = Object.entries(TASK_KEY).map(([label, value]) => ({
  label,
  value,
}))

function PayloadDialog({ row }: { row: AdminLlmUsageRow }) {
  return (
    <Dialog>
      <DialogTrigger>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs">
          Détails
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] sm:max-w-[90vw] sm:w-200 overflow-hidden flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-2 shrink-0">
          <DialogTitle className="text-sm font-medium">Entrées / sorties</DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-4">
          <LlmPayloadJsonView label="Entrée (input_payload)" value={row.input_payload} />
          <LlmPayloadJsonView label="Sortie (output_payload)" value={row.output_payload} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

type OrgOption = { orgId: string; name: string }

export function LlmUsageHistoryTab({
  orgs,
  enabled,
}: {
  orgs: OrgOption[]
  enabled: boolean
}) {
  const [operation, setOperation] = useState<string>('all')
  const [taskKey, setTaskKey] = useState<string>('all')
  const [orgFilter, setOrgFilter] = useState<string>('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [offset, setOffset] = useState(0)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const queryParams: AdminLlmUsageQueryParams = useMemo(() => {
    const p: AdminLlmUsageQueryParams = {
      limit: PAGE_SIZE,
      offset,
    }
    if (operation !== 'all') p.operation = operation
    if (taskKey !== 'all') p.task_key = taskKey
    if (orgFilter !== 'all') p.org_id = orgFilter
    if (from.trim()) p.from = new Date(from).toISOString()
    if (to.trim()) p.to = new Date(to).toISOString()
    return p
  }, [offset, operation, taskKey, orgFilter, from, to])

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminLlmUsage(queryParams, {
    enabled,
    refetchInterval: enabled && autoRefresh ? AUTO_REFRESH_MS : false,
  })

  const total = data?.total ?? 0
  const hasNext = data != null && offset + PAGE_SIZE < total
  const hasPrev = offset > 0

  const resetFilters = useCallback(() => {
    setOperation('all')
    setTaskKey('all')
    setOrgFilter('all')
    setFrom('')
    setTo('')
    setOffset(0)
  }, [])

  return (
    <Card className="glass-panel border-0">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-neon" />
          Historique des appels LLM
        </CardTitle>
        <CardDescription className="space-y-1">
          <span>
            Une ligne par appel modèle — entrées / sorties tronquées au-delà du plafond technique.
          </span>
          <span className="block text-[10px] text-muted-foreground leading-snug">
            Le statut <span className="font-mono">completed</span> correspond à une seule branche
            LLM terminée (ex. fiche mission : <span className="font-mono">executive</span> et{' '}
            <span className="font-mono">keyPoints</span> en parallèle). L’interface peut encore indiquer un
            chargement tant que l’autre branche ou l’enregistrement n’est pas fini — regroupez par{' '}
            <span className="font-mono">workflow_run_id</span> pour voir tout le run.
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Opération</Label>
            <Select
              value={operation}
              onValueChange={(v) => {
                setOffset(0)
                setOperation(v ?? 'all')
              }}
            >
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="extraction">extraction</SelectItem>
                <SelectItem value="analysis">analysis</SelectItem>
                <SelectItem value="generation">generation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Tâche (task_key)</Label>
            <Select
              value={taskKey}
              onValueChange={(v) => {
                setOffset(0)
                setTaskKey(v ?? 'all')
              }}
            >
              <SelectTrigger className="h-8 w-[min(100vw-2rem,280px)] text-xs font-mono">
                <SelectValue placeholder="Toutes" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">Toutes</SelectItem>
                {TASK_KEY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="font-mono text-[11px]">
                    {o.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Organisation</Label>
            <Select
              value={orgFilter}
              onValueChange={(v) => {
                setOffset(0)
                setOrgFilter(v ?? 'all')
              }}
            >
              <SelectTrigger className="h-8 w-[min(100vw-2rem,220px)] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                {orgs.map((o) => (
                  <SelectItem key={o.orgId} value={o.orgId}>
                    {o.name || o.orgId.slice(0, 12)}…
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Du (ISO local)</Label>
            <Input
              type="datetime-local"
              className="h-8 w-[180px] text-xs"
              value={from}
              onChange={(e) => { setOffset(0); setFrom(e.target.value) }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Au</Label>
            <Input
              type="datetime-local"
              className="h-8 w-[180px] text-xs"
              value={to}
              onChange={(e) => { setOffset(0); setTo(e.target.value) }}
            />
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-8 text-xs" onClick={resetFilters}>
            Réinitialiser
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              {isLoading ? '…' : `${total} ligne(s)`}
              {isFetching && !isLoading ? ' (actualisation…)' : null}
            </span>
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-2 py-1">
              <Label htmlFor="llm-usage-auto-refresh" className="cursor-pointer text-[11px] text-foreground">
                Actualisation auto (5&nbsp;s)
              </Label>
              <Switch
                id="llm-usage-auto-refresh"
                size="sm"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                className="scale-90"
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!hasPrev || isLoading}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="tabular-nums px-2">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total) || 0}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={!hasNext || isLoading}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isError ? (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Erreur'}
            <Button type="button" variant="link" className="ml-2 h-auto p-0 text-xs" onClick={() => refetch()}>
              Réessayer
            </Button>
          </p>
        ) : null}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead>Org</TableHead>
                  <TableHead>Op.</TableHead>
                  <TableHead className="min-w-[140px]">task_key</TableHead>
                  <TableHead className="whitespace-nowrap">Statut</TableHead>
                  <TableHead className="whitespace-nowrap">Branche</TableHead>
                  <TableHead className="max-w-[100px] truncate">Run</TableHead>
                  <TableHead>Modèle</TableHead>
                  <TableHead className="text-right">ms</TableHead>
                  <TableHead className="text-right">in</TableHead>
                  <TableHead className="text-right">out</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                      {new Date(row.created_at).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell className="max-w-[100px] truncate font-mono text-[10px]" title={row.org_id ?? ''}>
                      {row.org_id ? `${row.org_id.slice(0, 10)}…` : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{row.operation}</TableCell>
                    <TableCell className="font-mono text-[10px] leading-tight" title={row.task_key ?? ''}>
                      {row.task_key ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs capitalize" title={row.call_status ?? ''}>
                      {row.call_status ?? '—'}
                    </TableCell>
                    <TableCell className="font-mono text-[10px]" title={row.branch ?? ''}>
                      {row.branch ?? '—'}
                    </TableCell>
                    <TableCell
                      className="max-w-[100px] truncate font-mono text-[10px] text-muted-foreground"
                      title={row.workflow_run_id ?? ''}
                    >
                      {row.workflow_run_id ? `${row.workflow_run_id.slice(0, 10)}…` : '—'}
                    </TableCell>
                    <TableCell className="max-w-[120px] truncate font-mono text-[10px]" title={row.ai_model}>
                      {row.ai_model}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.duration_ms}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                      {row.input_tokens ?? '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                      {row.output_tokens ?? '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <PayloadDialog row={row} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {!isLoading && (data?.rows?.length ?? 0) === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun enregistrement</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
