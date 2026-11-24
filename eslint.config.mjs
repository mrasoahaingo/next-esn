import nextConfig from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  // Kit stageshow copié tel quel (scènes animées de la landing, voir
  // components/landing/stage/REHEARSAL.md) : code tiers, hors des règles du projet.
  { ignores: ["components/stageshow/kit/**"] },
  ...nextConfig,
  ...nextTypescript,
];

export default eslintConfig;
