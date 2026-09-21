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

const eslintConfig = [
  ...nextConfig,
  ...nextTypescript,
  supabaseWriteResultRule,
];

export default eslintConfig;
