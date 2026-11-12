#!/usr/bin/env node
/**
 * GPT Image 2.6 via kie.ai — à lancer depuis la racine du dépôt. Mêmes options que `gw-image.mjs`
 * (AI Gateway), pour passer de l'un à l'autre sans réécrire les commandes.
 * La clé `KIE_API_KEY` est lue par Node dans `.env.local` (jamais affichée) :
 *
 *   node --env-file=.env.local docs/media/esneo/outils/kie-image.mjs --no-style \
 *     --prompt-file docs/media/esneo/propositions/flou/hero.txt --size 2048x1152 --n 2 \
 *     --out .media/esneo/propositions/flou/hero
 *
 * API « jobs » de kie.ai : POST /api/v1/jobs/createTask puis GET /api/v1/jobs/recordInfo?taskId=…
 * (une tâche = une image, donc `--n` lance n tâches en parallèle). Les URL de résultat expirent à 14 jours :
 * le PNG est téléchargé tout de suite, le prompt figé reste la source reproductible.
 * Modèles : gpt-image-2-6/sunburst-text-to-image (défaut), gpt-image-2-6/flare-text-to-image.
 * `--size LxH` est converti au rapport le plus proche accepté par kie.ai (16:9, 3:2, 2:3, 1:2, 9:21…) ;
 * `--aspect 1:2` le force. Résolution `--resolution 1K|2K|4K` (défaut 2K), qualité `--quality` (défaut high).
 * Sorties : <out>-1.png, <out>-2.png… ; prompt, tâches et crédits journalisés dans <dossier>/prompts.jsonl.
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, basename, resolve } from 'node:path';

const BASE = 'https://api.kie.ai/api/v1/jobs';
const RATIOS = ['1:1', '3:2', '2:3', '4:3', '3:4', '5:4', '4:5', '16:9', '9:16', '2:1', '1:2', '21:9', '9:21', '3:1', '1:3'];

const args = process.argv.slice(2);
const flag = (f, d) => {
  const i = args.indexOf(`--${f}`);
  return i >= 0 ? args[i + 1] : d;
};

const key = process.env.KIE_API_KEY?.replace(/^["']|["']$/g, '');
if (!key) throw new Error('KIE_API_KEY absent : l’ajouter à .env.local et lancer avec node --env-file=.env.local');
const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

const styleFile = resolve('docs/media/esneo/prompts/_style.txt');
const style = existsSync(styleFile) ? readFileSync(styleFile, 'utf8').trim() : '';
const body = flag('prompt-file') ? readFileSync(flag('prompt-file'), 'utf8').trim() : flag('prompt');
const out = flag('out');
if (!body || !out) throw new Error('--prompt (ou --prompt-file) et --out requis');
const prompt = style && !args.includes('--no-style') ? `${body}\n\n${style}` : body;
const model = flag('model', 'gpt-image-2-6/sunburst-text-to-image');
const n = Number(flag('n', '1'));
const resolution = flag('resolution', '2K');
const quality = flag('quality', 'high');

/** Rapport kie.ai le plus proche de `--size` (comparaison des logarithmes, pour traiter 2:1 et 1:2 pareil). */
function nearestRatio(size) {
  const [w, h] = size.split('x').map(Number);
  const gap = (r) => {
    const [a, b] = r.split(':').map(Number);
    return Math.abs(Math.log(a / b) - Math.log(w / h));
  };
  return RATIOS.reduce((best, r) => (gap(r) < gap(best) ? r : best));
}
const aspect = flag('aspect', nearestRatio(flag('size', '1536x1024')));
if (!RATIOS.includes(aspect)) throw new Error(`--aspect ${aspect} non accepté par kie.ai (${RATIOS.join(', ')})`);

async function createTask() {
  const r = await fetch(`${BASE}/createTask`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      input: { prompt, aspect_ratio: aspect, resolution, quality, output_format: 'png' },
    }),
  });
  const j = await r.json();
  if (j.code !== 200 || !j.data?.taskId) throw new Error(`createTask ${j.code} : ${j.msg}`);
  return j.data.taskId;
}

async function waitFor(taskId) {
  let delay = 3000;
  for (let i = 0; i < 80; i++) {
    await new Promise((res) => setTimeout(res, delay));
    delay = Math.min(delay * 1.3, 10000);
    const r = await fetch(`${BASE}/recordInfo?taskId=${taskId}`, { headers });
    const j = await r.json();
    if (j.code !== 200) throw new Error(`recordInfo ${j.code} : ${j.msg}`);
    const d = j.data ?? {};
    if (d.state === 'success') {
      const urls = JSON.parse(d.resultJson || '{}').resultUrls ?? [];
      if (!urls[0]) throw new Error(`tâche ${taskId} : succès sans URL`);
      return { url: urls[0], credits: d.creditsConsumed ?? null };
    }
    if (d.state === 'fail') throw new Error(`tâche ${taskId} échouée : ${d.failMsg || d.failCode}`);
  }
  throw new Error(`tâche ${taskId} : délai dépassé`);
}

const t0 = Date.now();
mkdirSync(dirname(out), { recursive: true });
const taskIds = await Promise.all(Array.from({ length: n }, createTask));
const results = await Promise.all(
  taskIds.map(async (id, i) => {
    const { url, credits } = await waitFor(id);
    const img = await fetch(url);
    if (!img.ok) throw new Error(`téléchargement ${img.status} (${id})`);
    const f = `${out}-${i + 1}.png`;
    writeFileSync(f, Buffer.from(await img.arrayBuffer()));
    return { f, id, credits };
  }),
);
appendFileSync(
  `${dirname(out)}/prompts.jsonl`,
  JSON.stringify({
    out: basename(out),
    model,
    via: 'kie.ai',
    aspect,
    resolution,
    quality,
    tasks: results.map(({ id, credits }) => ({ id, credits })),
    prompt,
  }) + '\n',
);
console.log(`✓ ${results.map((r) => r.f).join('  ')}  (${model}, ${aspect} ${resolution}, ${Math.round((Date.now() - t0) / 1000)} s)`);
