/**
 * Typographie française : espace insécable avant « : ; ? ! », à l'intérieur des
 * guillemets, et dans quelques groupes qui ne doivent jamais se couper.
 */
const NBSP = ' ';
const NNBSP = ' ';

export function fr(text: string): string {
  return text
    .replace(/« /g, `«${NNBSP}`)
    .replace(/ »/g, `${NNBSP}»`)
    .replace(/ ([;?!])/g, `${NNBSP}$1`)
    .replace(/ :/g, `${NBSP}:`)
    .replace(/La Défense/g, `La${NBSP}Défense`)
    .replace(/par l’IA/g, `par${NBSP}l’IA`)
    .replace(/e-mail/g, 'e\u2011mail')
    .replace(/en-tête/g, 'en\u2011tête')
    .replace(/au cas où/g, `au${NBSP}cas${NBSP}où`)
    .replace(/proposé par/g, `proposé${NBSP}par`)
    .replace(/au client/g, `au${NBSP}client`)
    .replace(/(\d) (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)/g, `$1${NBSP}$2`)
    .replace(/\b(le|du|un|les|vos|chaque|son|leur|ce) CV\b/g, `$1${NBSP}CV`)
    .replace(/(\d) (ans|postes|développeurs|jours|semaines|dernières)/g, `$1${NBSP}$2`);
}
