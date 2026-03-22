'use client'

import { useState } from 'react'
import {
  useLlmModels,
  useLlmTasks,
  useOrgLlmOverrides,
  useCreateLlmModel,
  useCreateLlmTask,
  useUpdateLlmModel,
  useUpdateLlmTask,
  type LlmModelRow,
  type LlmTaskRow,
} from '@/lib/queries'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { TASK_KEY } from '@/lib/llm/task-keys'

const TASK_KEY_OPTIONS = Object.values(TASK_KEY)

const MODEL_SELECT_NONE = '__none__'

export function LlmSettingsTabs() {
  return (
    <Tabs defaultValue="models" className="w-full">
      <TabsList variant="segmented" className="mb-4 grid w-full max-w-lg grid-cols-3">
        <TabsTrigger value="models">Modèles</TabsTrigger>
        <TabsTrigger value="tasks">Tâches</TabsTrigger>
        <TabsTrigger value="overrides">Surcharges org</TabsTrigger>
      </TabsList>
      <TabsContent value="models">
        <ModelsPanel />
      </TabsContent>
      <TabsContent value="tasks">
        <TasksPanel />
      </TabsContent>
      <TabsContent value="overrides">
        <OverridesPanel />
      </TabsContent>
    </Tabs>
  )
}

function ModelsPanel() {
  const { data: models, isLoading } = useLlmModels()
  const create = useCreateLlmModel()
  const update = useUpdateLlmModel()
  const [editing, setEditing] = useState<LlmModelRow | null>(null)

  const [form, setForm] = useState({
    gatewayModelId: '',
    displayName: '',
    inputUsdPer1m: '0.075',
    outputUsdPer1m: '0.3',
    cacheReadUsdPer1m: '0.01875',
    notes: '',
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl glass-panel p-4">
        <h3 className="mb-3 text-sm font-medium text-foreground">Ajouter un modèle</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="gw">ID gateway</FieldLabel>
            <Input
              id="gw"
              className="font-mono text-xs"
              value={form.gatewayModelId}
              onChange={(e) => setForm((f) => ({ ...f, gatewayModelId: e.target.value }))}
              placeholder="google/gemini-2.5-flash"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="dn">Nom affiché</FieldLabel>
            <Input
              id="dn"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="in">USD / 1M entrée</FieldLabel>
            <Input
              id="in"
              value={form.inputUsdPer1m}
              onChange={(e) => setForm((f) => ({ ...f, inputUsdPer1m: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="out">USD / 1M sortie</FieldLabel>
            <Input
              id="out"
              value={form.outputUsdPer1m}
              onChange={(e) => setForm((f) => ({ ...f, outputUsdPer1m: e.target.value }))}
            />
          </Field>
        </div>
        <Button
          className="mt-3"
          size="sm"
          disabled={create.isPending}
          onClick={() => {
            create.mutate(
              {
                gatewayModelId: form.gatewayModelId.trim(),
                displayName: form.displayName.trim(),
                inputUsdPer1m: Number(form.inputUsdPer1m),
                outputUsdPer1m: Number(form.outputUsdPer1m),
                cacheReadUsdPer1m: form.cacheReadUsdPer1m ? Number(form.cacheReadUsdPer1m) : null,
                notes: form.notes || null,
              },
              {
                onSuccess: () => {
                  toast.success('Modèle créé')
                  setForm({
                    gatewayModelId: '',
                    displayName: '',
                    inputUsdPer1m: '0.075',
                    outputUsdPer1m: '0.3',
                    cacheReadUsdPer1m: '0.01875',
                    notes: '',
                  })
                },
                onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
              },
            )
          }}
        >
          Créer
        </Button>
      </div>

      <div className="rounded-xl glass-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gateway</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead className="text-right">In / Out $/1M</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(models ?? []).map((m) => (
              <TableRow key={m.id}>
                <TableCell className="max-w-[200px] truncate font-mono text-[11px]">
                  {m.gateway_model_id}
                </TableCell>
                <TableCell className="text-sm">{m.display_name}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {Number(m.input_usd_per_1m)} / {Number(m.output_usd_per_1m)}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(m)}>
                    Éditer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <EditModelDialog
          model={editing}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            update.mutate(
              { id: editing.id, ...patch },
              {
                onSuccess: () => {
                  toast.success('Mis à jour')
                  setEditing(null)
                },
                onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
              },
            )
          }}
          isPending={update.isPending}
        />
      )}
    </div>
  )
}

function EditModelDialog({
  model,
  onClose,
  onSave,
  isPending,
}: {
  model: LlmModelRow
  onClose: () => void
  onSave: (p: {
    gatewayModelId: string
    displayName: string
    inputUsdPer1m: number
    outputUsdPer1m: number
    cacheReadUsdPer1m: number | null
    notes: string | null
  }) => void
  isPending: boolean
}) {
  const [gatewayModelId, setGw] = useState(model.gateway_model_id)
  const [displayName, setDn] = useState(model.display_name)
  const [inP, setIn] = useState(String(model.input_usd_per_1m))
  const [outP, setOut] = useState(String(model.output_usd_per_1m))
  const [cacheP, setCache] = useState(
    model.cache_read_usd_per_1m != null ? String(model.cache_read_usd_per_1m) : '',
  )
  const [notes, setNotes] = useState(model.notes ?? '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-panel p-4 shadow-xl">
        <h3 className="mb-3 text-sm font-medium">Modifier le modèle</h3>
        <FieldGroup className="gap-2">
          <Field>
            <FieldLabel htmlFor="edit-gw">Gateway ID</FieldLabel>
            <Input id="edit-gw" className="font-mono text-xs" value={gatewayModelId} onChange={(e) => setGw(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-dn">Nom</FieldLabel>
            <Input id="edit-dn" value={displayName} onChange={(e) => setDn(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-in">USD / 1M entrée</FieldLabel>
            <Input id="edit-in" value={inP} onChange={(e) => setIn(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-out">USD / 1M sortie</FieldLabel>
            <Input id="edit-out" value={outP} onChange={(e) => setOut(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-cache">USD / 1M cache read (optionnel)</FieldLabel>
            <Input id="edit-cache" value={cacheP} onChange={(e) => setCache(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-notes">Notes</FieldLabel>
            <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </Field>
        </FieldGroup>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              onSave({
                gatewayModelId: gatewayModelId.trim(),
                displayName: displayName.trim(),
                inputUsdPer1m: Number(inP),
                outputUsdPer1m: Number(outP),
                cacheReadUsdPer1m: cacheP.trim() ? Number(cacheP) : null,
                notes: notes.trim() || null,
              })
            }
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  )
}

function TasksPanel() {
  const { data: models } = useLlmModels()
  const { data: tasks, isLoading } = useLlmTasks()
  const create = useCreateLlmTask()
  const update = useUpdateLlmTask()
  const [editing, setEditing] = useState<LlmTaskRow | null>(null)

  const [form, setForm] = useState<{
    taskKey: string
    label: string
    modelId: string
    systemPromptTemplate: string
    useExtractJsonMiddleware: boolean
  }>({
    taskKey: TASK_KEY.CV_TRANSCRIPTION,
    label: '',
    modelId: '',
    systemPromptTemplate: '',
    useExtractJsonMiddleware: true,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const defaultModelId = models?.[0]?.id ?? ''

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl glass-panel p-4">
        <h3 className="mb-3 text-sm font-medium">Nouvelle tâche (clé unique)</h3>
        <FieldGroup className="gap-2">
          <Field>
            <FieldLabel htmlFor="new-task-key">task_key</FieldLabel>
            <Select
              value={form.taskKey}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, taskKey: v != null ? v : f.taskKey }))
              }
            >
              <SelectTrigger id="new-task-key" className="h-9 w-full text-xs font-mono">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TASK_KEY_OPTIONS.map((k) => (
                  <SelectItem key={k} value={k} className="font-mono text-xs">
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="new-task-label">Libellé</FieldLabel>
            <Input id="new-task-label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          </Field>
          <Field>
            <FieldLabel htmlFor="new-task-model">Modèle</FieldLabel>
            <Select
              value={form.modelId || defaultModelId}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, modelId: v != null ? v : f.modelId }))
              }
            >
              <SelectTrigger id="new-task-model" className="h-9 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(models ?? []).map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.display_name} ({m.gateway_model_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="new-task-prompt">Prompt système (ex. {'{{displayName}}'}, {'{{brandContextBlock}}'})</FieldLabel>
            <Textarea
              id="new-task-prompt"
              rows={8}
              className="font-mono text-xs"
              value={form.systemPromptTemplate}
              onChange={(e) => setForm((f) => ({ ...f, systemPromptTemplate: e.target.value }))}
            />
          </Field>
          <Field orientation="horizontal" className="items-center gap-2">
            <Checkbox
              id="new-task-json-middleware"
              checked={form.useExtractJsonMiddleware}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, useExtractJsonMiddleware: v === true }))
              }
            />
            <FieldLabel
              htmlFor="new-task-json-middleware"
              className="cursor-pointer text-xs font-normal"
            >
              Middleware extract JSON (streamText + Output.object)
            </FieldLabel>
          </Field>
        </FieldGroup>
        <Button
          className="mt-3"
          size="sm"
          disabled={create.isPending || !form.label.trim() || !form.systemPromptTemplate.trim()}
          onClick={() => {
            const mid = form.modelId || defaultModelId
            if (!mid) {
              toast.error('Aucun modèle en base — créez un modèle d’abord.')
              return
            }
            create.mutate(
              {
                taskKey: form.taskKey,
                label: form.label.trim(),
                modelId: mid,
                systemPromptTemplate: form.systemPromptTemplate,
                useExtractJsonMiddleware: form.useExtractJsonMiddleware,
              },
              {
                onSuccess: () => {
                  toast.success('Tâche créée')
                  setForm({
                    taskKey: TASK_KEY.CV_TRANSCRIPTION,
                    label: '',
                    modelId: '',
                    systemPromptTemplate: '',
                    useExtractJsonMiddleware: true,
                  })
                },
                onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
              },
            )
          }}
        >
          Créer la tâche
        </Button>
      </div>

      <div className="rounded-xl glass-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>task_key</TableHead>
              <TableHead>Libellé</TableHead>
              <TableHead>Modèle</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(tasks ?? []).map((t) => (
              <TableRow key={t.id}>
                <TableCell className="max-w-[180px] truncate font-mono text-[10px]">{t.task_key}</TableCell>
                <TableCell className="text-sm">{t.label}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {t.llm_models?.gateway_model_id ?? '—'}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>
                    Éditer
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editing && (
        <EditTaskDialog
          task={editing}
          models={models ?? []}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            update.mutate(
              { id: editing.id, ...patch },
              {
                onSuccess: () => {
                  toast.success('Mis à jour')
                  setEditing(null)
                },
                onError: (e) => toast.error(e instanceof Error ? e.message : 'Erreur'),
              },
            )
          }}
          isPending={update.isPending}
        />
      )}
    </div>
  )
}

function EditTaskDialog({
  task,
  models,
  onClose,
  onSave,
  isPending,
}: {
  task: LlmTaskRow
  models: LlmModelRow[]
  onClose: () => void
  onSave: (p: {
    label: string
    modelId: string
    systemPromptTemplate: string
    useExtractJsonMiddleware: boolean
  }) => void
  isPending: boolean
}) {
  const [label, setLabel] = useState(task.label)
  const [modelId, setModelId] = useState(task.model_id)
  const [tpl, setTpl] = useState(task.system_prompt_template)
  const [useJ, setUseJ] = useState(task.use_extract_json_middleware)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-panel p-4 shadow-xl">
        <h3 className="mb-3 font-mono text-xs text-muted-foreground">{task.task_key}</h3>
        <FieldGroup className="gap-2">
          <Field>
            <FieldLabel htmlFor="edit-task-label">Libellé</FieldLabel>
            <Input id="edit-task-label" value={label} onChange={(e) => setLabel(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-task-model">Modèle</FieldLabel>
            <Select value={modelId} onValueChange={(v) => setModelId(v ?? '')}>
              <SelectTrigger id="edit-task-model" className="h-9 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-task-prompt">Prompt</FieldLabel>
            <Textarea id="edit-task-prompt" className="font-mono text-xs" rows={14} value={tpl} onChange={(e) => setTpl(e.target.value)} />
          </Field>
          <Field orientation="horizontal" className="items-center gap-2">
            <Checkbox
              id="edit-task-json-middleware"
              checked={useJ}
              onCheckedChange={(v) => setUseJ(v === true)}
            />
            <FieldLabel htmlFor="edit-task-json-middleware" className="cursor-pointer text-xs font-normal">
              Middleware extract JSON
            </FieldLabel>
          </Field>
        </FieldGroup>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            Annuler
          </Button>
          <Button
            size="sm"
            disabled={isPending}
            onClick={() =>
              onSave({
                label: label.trim(),
                modelId,
                systemPromptTemplate: tpl,
                useExtractJsonMiddleware: useJ,
              })
            }
          >
            Enregistrer
          </Button>
        </div>
      </div>
    </div>
  )
}

function OverridesPanel() {
  const [orgId, setOrgId] = useState('')
  const { data: overrides, isLoading, refetch } = useOrgLlmOverrides(orgId.trim() || null)
  const { data: models } = useLlmModels()

  const [form, setForm] = useState<{
    taskKey: string
    modelId: string
    systemPromptTemplate: string
    useExtractJsonMiddleware: boolean | null
  }>({
    taskKey: TASK_KEY.CV_TRANSCRIPTION,
    modelId: '',
    systemPromptTemplate: '',
    useExtractJsonMiddleware: null,
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <Field className="min-w-[200px] flex-1">
          <FieldLabel htmlFor="override-org-id">org_id (Clerk)</FieldLabel>
          <Input
            id="override-org-id"
            className="font-mono text-xs"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            placeholder="org_..."
          />
        </Field>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => void refetch()}
          disabled={!orgId.trim()}
        >
          Charger
        </Button>
      </div>

      {isLoading && orgId.trim() ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : null}

      {orgId.trim() ? (
        <div className="rounded-xl glass-panel p-4">
          <h4 className="mb-2 text-xs font-medium text-muted-foreground">Ajouter / remplacer une surcharge</h4>
          <FieldGroup className="gap-2">
            <Field>
              <FieldLabel htmlFor="override-task-key" className="sr-only">
                task_key
              </FieldLabel>
              <Select
                value={form.taskKey}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, taskKey: v != null ? v : f.taskKey }))
                }
              >
                <SelectTrigger id="override-task-key" className="h-9 w-full font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_KEY_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k} className="font-mono text-xs">
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="override-model">Modèle (vide = défaut global)</FieldLabel>
              <Select
                value={form.modelId ? form.modelId : MODEL_SELECT_NONE}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    modelId:
                      v == null || v === MODEL_SELECT_NONE ? '' : v,
                  }))
                }
              >
                <SelectTrigger id="override-model" className="h-9 w-full font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MODEL_SELECT_NONE} className="text-xs">
                    —
                  </SelectItem>
                  {(models ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id} className="font-mono text-xs">
                      {m.gateway_model_id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="override-prompt">Prompt (vide = défaut global)</FieldLabel>
              <Textarea
                id="override-prompt"
                rows={6}
                className="font-mono text-xs"
                value={form.systemPromptTemplate}
                onChange={(e) => setForm((f) => ({ ...f, systemPromptTemplate: e.target.value }))}
              />
            </Field>
          </FieldGroup>
          <Button
            className="mt-3"
            size="sm"
            onClick={async () => {
              try {
                const res = await fetch('/api/admin/org-llm-overrides', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    orgId: orgId.trim(),
                    taskKey: form.taskKey,
                    modelId: form.modelId || null,
                    systemPromptTemplate: form.systemPromptTemplate.trim() || null,
                    useExtractJsonMiddleware: form.useExtractJsonMiddleware,
                  }),
                })
                if (!res.ok) {
                  const e = await res.json().catch(() => ({}))
                  throw new Error(typeof e.error === 'string' ? e.error : 'Erreur')
                }
                toast.success('Surcharge enregistrée')
                void refetch()
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Erreur')
              }
            }}
          >
            Enregistrer la surcharge
          </Button>
        </div>
      ) : null}

      <div className="rounded-xl glass-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>task_key</TableHead>
              <TableHead>Modèle override</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(overrides as { task_key: string; llm_models?: { gateway_model_id: string } | null }[])?.map(
              (o) => (
                <TableRow key={o.task_key}>
                  <TableCell className="font-mono text-[10px]">{o.task_key}</TableCell>
                  <TableCell className="text-xs">{o.llm_models?.gateway_model_id ?? '—'}</TableCell>
                </TableRow>
              ),
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
