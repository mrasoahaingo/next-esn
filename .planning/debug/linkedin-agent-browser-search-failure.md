---
status: awaiting_human_verify
trigger: "linkedin-agent-browser-search-failure"
created: 2026-04-11T00:00:00Z
updated: 2026-04-11T00:02:00Z
---

## Current Focus

hypothesis: CONFIRMED — Deux bugs distincts dans runAgentBrowser
test: Vérifié par exécution directe de npx agent-browser batch avec le même quoting
expecting: Fix = (1) filtrer npm_config_* du spawn env, (2) augmenter la limite errorMsg
next_action: Appliquer le fix dans lib/radar/collectors/linkedin-agent-browser.ts

## Symptoms

expected: Le workflow collecte des signaux LinkedIn (freelances Paris) via agent-browser + Browserbase
actual: searchResult.ok = false, le workflow s'arrête à la première étape "ouverture page recherche"
errors: |
  npm warn Unknown env config "_nodejs-tools-registry". This will stop working in the next major version of npm.
  npm warn Unknown env config "_-europe-west1-npm-pkg-dev-lefigaro-exploitation-npm-repo--username". This will stop working in the next major version of npm.
  npm warn Unknown env config "_-europe-west1-npm-pkg-dev-lefigaro-exploitation-npm-repo--email". This will stop working in the next major version of npm.
reproduction: POST /api/radar/cron/linkedin-agent-browser → déclenche collectLinkedInAgentBrowserWorkflow → collectAgentBrowserSignals → collectFreelanceParisAgentBrowser → runAgentBrowser(['batch', 'open "..."', 'snapshot --json'])
timeline: Nouveau collector, n'a jamais fonctionné

## Eliminated

- hypothesis: Les npm warnings causent directement le exit code non-zero
  evidence: |
    npm warn va sur stderr mais ne change pas le exit code de npx. Testé en local:
    npx --yes agent-browser@latest ... exit 1 vient de agent-browser lui-même (batch exits 1 quand une sous-commande échoue)
  timestamp: 2026-04-11T00:01:00Z

- hypothesis: Le quoting de l'URL dans 'open "URL"' est incorrect
  evidence: |
    Testé en local: batch 'open "https://example.com"' 'snapshot --json' → agent-browser
    parse correctement 'open "URL"' comme cmd=open, arg="URL" (sans guillemets).
    Le quoting embedded est géré par le parser de batch.
  timestamp: 2026-04-11T00:01:00Z

- hypothesis: 'snapshot --json' comme sous-commande batch est incorrect
  evidence: |
    La doc de snapshot montre --json comme Global Option applicable à snapshot.
    En batch mode, 'snapshot --json' est parsé correctement comme snapshot avec flag --json.
  timestamp: 2026-04-11T00:01:00Z

## Evidence

- timestamp: 2026-04-11T00:00:00Z
  checked: agent-browser batch help + exit codes
  found: |
    `agent-browser batch` exits 1 quand au moins une sous-commande échoue (Browserbase error).
    `agent-browser open` (individuel) exits 0 même en cas d'échec de session.
    La commande batch dans le code est syntaxiquement correcte.
  implication: L'exit code 1 vient bien d'un échec agent-browser, pas des npm warnings.

- timestamp: 2026-04-11T00:00:00Z
  checked: errorMsg tronqué à 500 chars vs longueur réelle des warnings
  found: |
    3 warnings npm = ~420 chars. Limite = 500 chars → seulement 80 chars pour l'erreur réelle.
    L'erreur réelle (ex: "Browserbase API error: ...") est complètement tronquée ou coupée.
  implication: |
    BUG 1: Impossible de diagnostiquer l'erreur réelle. La limite 500 doit être augmentée
    ou les warnings npm filtrés du stderr.

- timestamp: 2026-04-11T00:00:00Z
  checked: Source des npm_config_* env vars dans le spawn env
  found: |
    spawn({ env: { ...process.env, ... } }) → toutes les vars du process Node.js sont héritées.
    Sur Vercel, le process Next.js hérite de vars npm_config_* (du build ou de l'env CI).
    npm interprète ces vars comme config et warn sur les noms qu'il ne reconnaît pas.
    Les noms "_nodejs-tools-registry" et "_-europe-west1-..." sont des clés npm config inconnues
    correspondant à des env vars comme npm_config__nodejs-tools-registry.
  implication: |
    BUG 2: Les npm_config_* vars polluent stderr et cachent la vraie erreur.
    Fix: filtrer les clés commençant par npm_config_ du spawn env.

- timestamp: 2026-04-11T00:01:00Z
  checked: Comportement réel du batch avec Browserbase sans compte valide
  found: |
    exit 1 + stderr: "Auto-launch failed: Browserbase API error (402): Payment Required"
    Ce message viendrait APRÈS les warnings npm dans le stderr réel.
    Avec les 420 chars de warnings, il resterait 80 chars pour capturer "Auto-launch failed..."
    ce qui COUPERAIT le message Browserbase après quelques mots.
  implication: |
    L'erreur rapportée par le user ("composée de warnings npm") est exactement ce comportement:
    les 500 chars = 420 warnings + 80 chars début de l'erreur Browserbase (possiblement coupée).
    La VRAIE erreur agent-browser est là mais invisible.

## Resolution

root_cause: |
  Double problème dans runAgentBrowser():
  1. spawn hérite de process.env qui contient des npm_config_* vars invalides sur Vercel,
     causant des npm warnings sur stderr qui remplissent les 80% des 500 chars disponibles.
  2. La limite errorMsg de 500 chars est trop courte — les warnings npm cachent le vrai message
     d'erreur d'agent-browser qui suit dans stderr.
  Ces deux bugs combinés rendent l'erreur réelle invisible dans les logs.

fix: |
  Dans runAgentBrowser():
  1. Filtrer les clés npm_config_* du spawn env pour supprimer les warnings npm
  2. Augmenter la limite errorMsg de 500 à 2000 chars (ou supprimer la limite)
  3. Logger aussi l'intégralité de stderr en console.error pour le debugging futur

verification: TypeScript compile check passes. Fix applied to runAgentBrowser() in linkedin-agent-browser.ts.
files_changed:
  - lib/radar/collectors/linkedin-agent-browser.ts
