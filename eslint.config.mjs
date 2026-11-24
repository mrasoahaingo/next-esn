import nextConfig from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * `supabase-js` ne lève pas : il renvoie `{ error }`. Une chaîne supabase consommée comme simple
 * instruction (`await supabase.from(...).update(...)`) perd donc son échec en silence — la classe
 * de bug traitée par le quick 260921-seo.
 *
 * Un appel dont le retour est destructuré (`const { error } = await supabase.from(...)`) est une
 * `VariableDeclaration`, pas une `ExpressionStatement` : il n'est pas signalé. C'est exactement
 * la discrimination voulue.
 *
 * Règle core d'ESLint 9 — aucune dépendance ni analyse de types ajoutée.
 */
const supabaseWriteResultRule = {
  files: ["app/**/*.ts", "lib/**/*.ts", "workflows/**/*.ts"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "ExpressionStatement > AwaitExpression CallExpression > MemberExpression[property.name='from']",
        message:
          "supabase-js ne lève pas : le { error } de cette chaîne n'est jamais lu, l'échec passerait inaperçu. Destructurez `const { error } = await …` puis levez (API confirmant un succès) ou appelez logSupabaseWriteError (écriture best-effort).",
      },
    ],
  },
};

/**
 * Tout appel LLM passe par `createGatewayLanguageModel` de `lib/ai.ts`, seul chemin qui impose
 * ZDR (zero data retention) + inférence UE (quick 261124-mk0). On interdit donc d'instancier le
 * Gateway ailleurs. Doublé par `lib/ai-guard.test.ts` (scan statique exécuté par vitest).
 * Objet de config distinct : réutiliser `no-restricted-syntax` écraserait supabaseWriteResultRule.
 */
const gatewayGuardMessage =
  "Passer par createGatewayLanguageModel de @/lib/ai : seul chemin qui impose ZDR + inférence UE";
const gatewayGuardRule = {
  files: ["**/*.{ts,tsx,mts,cts,js,mjs}"],
  ignores: ["lib/ai.ts", "docs/**", ".claude/**", ".cursor/**", ".agents/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        paths: [
          { name: "ai", importNames: ["createGateway", "gateway"], message: gatewayGuardMessage },
        ],
        patterns: [{ group: ["@ai-sdk/*", "!@ai-sdk/react"], message: gatewayGuardMessage }],
      },
    ],
  },
};

const eslintConfig = [
  // Kit stageshow copié tel quel (scènes animées de la landing, voir
  // components/landing/stage/REHEARSAL.md) : code tiers, hors des règles du projet.
  { ignores: ["components/stageshow/kit/**"] },
  ...nextConfig,
  ...nextTypescript,
  supabaseWriteResultRule,
  gatewayGuardRule,
];

export default eslintConfig;
