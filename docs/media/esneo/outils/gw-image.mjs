#!/usr/bin/env node
/**
 * GPT Image 2.6 via l'AI Gateway Vercel — à lancer depuis la racine du dépôt.
 * Repris de l'outil de la refonte legal-advisor (docs/media/marine/outils/gw-image.mjs).
 * La clé `AI_GATEWAY_API_KEY` est lue par Node dans `.env.local` (jamais affichée) :
 *
 *   node --env-file=.env.local docs/media/esneo/outils/gw-image.mjs \
 *     --prompt-file docs/media/esneo/prompts/hero.txt --size 2048x1152 --out .media/esneo/hero [--n 2]
 *
 * Le bloc de style commun (`prompts/_style.txt`) est ajouté à la fin de chaque prompt.
 * Sorties : <out>-1.png, <out>-2.png… ; prompt et usage journalisés dans <dossier>/prompts.jsonl.
 * Tailles : 1024x1024, 1536x1024 (3:2), 1024x1536 (2:3), 2048x1152 (16:9).
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { dirname, basename, resolve } from 'node:path';
import { generateImage } from 'ai';

const args = process.argv.slice(2);
const flag = (f, d) => {
  const i = args.indexOf(`--${f}`);
  return i >= 0 ? args[i + 1] : d;
};

if (!process.env.AI_GATEWAY_API_KEY) {
  throw new Error('AI_GATEWAY_API_KEY absent : lancer avec node --env-file=.env.local');
}

const styleFile = resolve('docs/media/esneo/prompts/_style.txt');
const style = existsSync(styleFile) ? readFileSync(styleFile, 'utf8').trim() : '';
const body = flag('prompt-file') ? readFileSync(flag('prompt-file'), 'utf8').trim() : flag('prompt');
const out = flag('out');
if (!body || !out) throw new Error('--prompt (ou --prompt-file) et --out requis');
const prompt = style && !args.includes('--no-style') ? `${body}\n\n${style}` : body;
const model = flag('model', 'openai/gpt-image-2.6-flare');
const size = flag('size', '1536x1024');
const n = Number(flag('n', '1'));
const quality = flag('quality', 'high');

const t0 = Date.now();
const res = await generateImage({
  model,
  prompt,
  size,
  n,
  maxImagesPerCall: 1,
  providerOptions: { openai: { quality } },
});
mkdirSync(dirname(out), { recursive: true });
const files = res.images.map((img, i) => {
  const f = `${out}-${i + 1}.png`;
  writeFileSync(f, Buffer.from(img.uint8Array));
  return f;
});
appendFileSync(
  `${dirname(out)}/prompts.jsonl`,
  JSON.stringify({ out: basename(out), model, via: 'ai-gateway', size, quality, usage: res.usage ?? null, prompt }) + '\n',
);
console.log(`✓ ${files.join('  ')}  (${model}, ${size}, ${Math.round((Date.now() - t0) / 1000)} s)`);
