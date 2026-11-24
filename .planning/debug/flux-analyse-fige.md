---
status: awaiting_human_verify
trigger: "Analyse de positionnement : affichage live figé pendant que le serveur travaille ; échec silencieux (retour au formulaire sans erreur) ; CV régénéré affiché « terminé » avec ancien contenu"
created: 2026-11-24T00:00:00Z
updated: 2026-11-24T17:30:00Z
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "(1) The browser leg of the NDJSON stream is cut/stalls on long runs (function lifetime, network) and useWorkflowStream never resumes because reconnectedRunIdRef already equals the run id; (2) a failed analysis without prior result has no error UI (step list rendered only when busy/complete) and its persisted error has stepKey 'unknown' + technical message because the runtime rethrows FatalError(message) and drops custom props; (3) 'finished with old content' comes from isLoading flipping false before the persisted row is re-read (stale cache reloads old tailored_cv) and from reconcile mapping a transient run lookup error to 'dead run' -> status error mid-run."
  confirming_evidence:
    - "useWorkflowStream: reconnect effect returns early when reconnectedRunIdRef === runId, which the pendingRunId branch sets during the POST stream once polling returns workflow_run_id"
    - "page.tsx: WorkflowStepList only inside `analysisBusy` / `analysisComplete` branches; re-analyze PATCH sets analysis=null so status=error + no analysis renders only JobInput"
    - "@workflow/core step.js: step_failed -> new FatalError(errorMessage); step-handler.js builds 'Step \"x\" failed after N retries: msg'"
    - "workflow-reconcile.ts snapshotRun catch -> { exists: false } -> fail"
    - "hook finally: setIsLoading(false) precedes onFinish refetch"
  falsification_test: "A unit test feeding a stream that EOFs mid-run must show the follower re-opening /api/workflow/{id}/stream?startIndex=<lines received> and finishing only on the terminal JSON; if line count != chunk index the replay would duplicate/skip (checked: every workflow write is one '\\n'-terminated line)."
  fix_rationale: "Resume-until-terminal on the client removes dependence on a single HTTP response lifetime; awaiting persisted re-read before leaving loading removes stale-cache flashes; an always-rendered error panel + stepKey marker in the error message makes failures visible and attributable; reconcile no longer fails rows on lookup errors."
  blind_spots: "Cannot observe the exact production cut mechanism (Vercel maxDuration vs proxy vs client network) nor confirm reconcile lookup errors in prod logs without production access; real LLM runs not executed."
next_action: vérification en production (voir « Non vérifié » ci-dessous)

## Symptoms

expected: live progress until terminal state; visible error with step + retry on failure; "finished" only when server run is done
actual: (1) stream freezes after 1-2 min while server continues (LLM branches 107-305 s); reload shows progress. (2) all branches fail (FatalError / AI_NoOutputGeneratedError, fetchAndAnalyze max retries) -> page reverts to input form, no error. (3) generateMode 'cv' regeneration shows finished with old content while server still running.
errors: FatalError, AI_NoOutputGeneratedError, "fetchAndAnalyze" max retries reached (server side only)
reproduction: production esneo.io /review/[id]/positioning/[positioningId], click « Relancer l'analyse »
started: observed 2026-11-24 with slow gpt-6-luna

## Eliminated

## Evidence

- timestamp: 2026-11-24T00:10:00Z
  checked: knowledge-base.md
  found: no entry with 2+ keyword overlap (stream, figé, reconnect, silent error). Related quick tasks in git log: 420227e (terminal runs on reconnect), 566bfb2 (reconnecting rows), c5acef5 (toasts from persisted state).
  implication: new pattern.

- timestamp: 2026-11-24T00:15:00Z
  checked: lib/hooks/useWorkflowStream.ts (submit + reconnect effect)
  found: consumeNdjsonStream reads until `done` or a thrown error; no idle watchdog, no resume. On any end of the HTTP body (clean EOF or network error) `finally` sets isLoading=false and calls onFinish once. The reconnect effect is guarded by `reconnectedRunIdRef.current === runId`; while the POST stream runs, the 3 s poll (usePositioning refetchInterval while status active) brings `workflow_run_id`, and the `pendingRunId === runId` branch sets reconnectedRunIdRef = runId. When the POST body then ends early, pendingRunId is cleared, the effect re-runs and returns because the ref already equals runId -> no reconnection ever for that run.
  implication: any premature end of the browser<->Next.js response leaves the UI frozen on the last partial while the run continues (symptom 1).

- timestamp: 2026-11-24T00:20:00Z
  checked: @workflow/world-vercel dist/streamer.js readFromStream + @workflow/core serialization createReconnectingFramedStream
  found: the server-side readable auto-reconnects to workflow-server (resume at startIndex+consumedFrames; one writer.write = one frame = one chunk index). But the browser leg is a plain Next.js route response (POST /api/positioning/analyze returns run.readable; GET /api/workflow/[runId]/stream returns getReadable) with no maxDuration export and no keep-alive; its lifetime is bounded by the Vercel function invocation. LLM branches take 107-305 s each + synthesis, so a full analysis outlives a single invocation.
  implication: the browser stream WILL be cut on long runs; the client must resume. Since every workflow write is exactly one NDJSON line, `lines received` == chunk index -> resume with startIndex=linesReceived is exact.

- timestamp: 2026-11-24T00:25:00Z
  checked: page.tsx layout effect (line ~504) + `analysisBusy`/`analysisComplete` render branches (lines ~1179-1277)
  found: while isAnalysisLoading is true the layout effect returns early, so polled persisted state (status analyzed/error) is ignored as long as a stalled-but-open stream keeps the hook loading. The workflow step list (which carries the error row) is only rendered inside `analysisBusy` or `analysisComplete`. On « Relancer » the PATCH clears `analysis` -> a failed run ends with status=error and analysis=null -> neither branch renders -> only the JobInput editor + « Relancer l'analyse » is shown.
  implication: symptom 2 is structural: there is no error UI at all for a failed analysis without prior result. Toasts only fire from the stream error line or from onFinish; if the stream was already cut (symptom 1) neither fires.

- timestamp: 2026-11-24T00:30:00Z
  checked: @workflow/core step-handler.js (max retries) + step.js (step_failed consumer)
  found: after retries are exhausted the runtime records `error: 'Step "<name>" failed after N retries: <message>'` and the workflow receives `new FatalError(errorMessage)`. Custom properties are lost, so `attachWorkflowStepKey(e, branch)` -> `readWorkflowStepKey(error)` returns undefined in handleWorkflowError -> persisted workflow_last_error = { stepKey: 'unknown', message: 'Step "step//./workflows/positioning-analyze//fetchAndAnalyze" failed after 1 retry: No output generated...' }.
  implication: even when rendered, no step is marked as failed and the message is technical English (not user safe).

- timestamp: 2026-11-24T00:35:00Z
  checked: lib/services/workflow-reconcile.ts snapshotRun, called by GET /api/positioning/[id] on every 3 s poll while analyzing/generating
  found: any exception while looking up the run (network blip, 5xx from workflow-server) is caught and mapped to `{ exists: false }` -> decideWorkflowReconciliation -> fail -> row set to status=error, workflow_run_id=null while the run keeps going. The workflow later overwrites with analyzed/generated.
  implication: plausible cause of symptom 3 (generation shown as finished/old content while still running) and of spurious errors; a lookup failure must not be treated as a dead run.

- timestamp: 2026-11-24T00:40:00Z
  checked: hook finally ordering (setIsLoading(false) then onFinish) + generate flow (handleGenerateCv -> setTailoredCv(null) -> submitGenerate)
  found: when the stream ends, isLoading flips to false BEFORE onFinish refetches. If the cache still holds the pre-run row (status generated, old tailored_cv — no polling since status not active), the layout effect immediately reloads the OLD tailored_cv and the page renders the finished state. Also, an aborted follower's finally can clobber isLoading of the new submit (no ownership check).
  implication: second mechanism for symptom 3; fix = keep loading until persisted state was re-read (await onFinish) and guard state updates by controller ownership.

## Resolution

root_cause: |
  1. Affichage figé — le flux NDJSON navigateur <-> route Next (POST /api/positioning/analyze|generate,
     GET /api/workflow/[runId]/stream) ne vit que le temps d'une invocation de fonction, sans keep-alive ;
     les runs (branches LLM 107-305 s + synthèse) la dépassent. useWorkflowStream ne reprenait jamais le
     flux : reconnectedRunIdRef valait déjà le runId (posé pendant le POST dès que le polling 3 s
     ramenait workflow_run_id). Avec un flux muet mais non fermé, isLoading restait vrai et la page
     ignorait même l'état persisté (early return du layout effect) -> gel jusqu'au rechargement.
  2. Échec silencieux — (a) l'état d'erreur n'était rendu que pendant l'analyse ou avec une analyse
     complète ; une relance vide `analysis`, donc status=error + analysis=null => seulement le formulaire.
     (b) toasts uniquement via le flux (déjà coupé). (c) le runtime workflow relance FatalError(message)
     après les retries : stepKey perdu -> 'unknown', message technique anglais.
  3. « Terminé » avec ancien contenu — isLoading repassait à false AVANT la relecture de l'état persisté :
     le cache (status generated, ancien tailored_cv, sans polling) rechargeait l'ancien CV. Aggravant :
     la réconciliation (à chaque polling) traitait toute erreur de lecture du run comme un run mort
     -> status=error, workflow_run_id=null en plein run.
fix: |
  - lib/workflow/ndjson-stream.ts + follow-workflow-run.ts : lecture comptant les lignes (= index de
    chunk), détection d'inactivité 45 s, reprise à startIndex=<lignes reçues> jusqu'à réponse terminale
    (JSON/404), backoff plafonné 15 s, abandon après 20 échecs consécutifs (le polling prend le relais).
  - lib/hooks/useWorkflowStream.ts : suit jusqu'au terminal, attend onFinish (relecture persistée) avant
    isLoading=false, état réservé au suiveur courant, revérification immédiate quand le statut persisté
    devient terminal puis règlement sur l'état persisté après 10 s (run zombie), StrictMode sûr.
  - lib/services/workflow-reconcile.ts : lookupFailed = état inconnu (seul le timeout zombie tranche).
  - lib/utils/workflow-step-error.ts : marqueur [stepKey=…] dans le message (survit à FatalError).
  - lib/workflow/workflow-error-message.ts : message présentable FR ; branché dans compute-step-status
    (lignes + « Échec à l'étape i/n ») et workflow-outcome (toast).
  - page positionnement + components/workflow/WorkflowFailureAlert.tsx + positioning-failure-state.ts :
    état d'échec persistant (étape, message, « Relancer l'analyse »).
verification: |
  vitest 185/185 (37 nouveaux tests : reprise après coupure/erreur réseau/inactivité, offsets exacts,
  ligne tronquée, 404, backoff/abandon, nudge, attribution après FatalError, messages, état d'échec,
  réconciliation sur erreur de lecture) ; red vérifié pour l'attribution et la réconciliation sur le
  code d'origine. tsc --noEmit OK ; eslint fichiers touchés : 0 erreur (4 warnings préexistants dans
  page.tsx) ; next build --webpack OK.
  Non vérifié (nécessite la prod) :
  - mécanisme exact de coupure en prod (maxDuration Vercel, proxy ou réseau client) — la reprise couvre
    fin propre, erreur réseau et connexion muette ;
  - occurrences de « Workflow reconcile run lookup error » dans les logs Vercel (preuve directe du
    mécanisme 3b) ;
  - run réel long avec gpt-6-luna (aucun appel LLM réel lancé) ; comportement de readFromStream du
    world Vercel avec startIndex > 0 en conditions réelles (documenté par @workflow/core, non observé).
  - Les toasts restent doublés en cas d'échec reçu par le flux (comportement préexistant).
files_changed:
  - lib/workflow/ndjson-stream.ts
  - lib/workflow/follow-workflow-run.ts
  - lib/hooks/useWorkflowStream.ts
  - lib/services/workflow-reconcile.ts
  - lib/utils/workflow-step-error.ts
  - lib/workflow/workflow-error-message.ts
  - lib/workflow/compute-step-status.ts
  - lib/workflow/workflow-outcome.ts
  - lib/workflow/positioning-failure-state.ts
  - components/workflow/WorkflowFailureAlert.tsx
  - app/review/[id]/positioning/[positioningId]/page.tsx
