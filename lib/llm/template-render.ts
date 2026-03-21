/**
 * Remplace `{{variable}}` dans le template par les valeurs de `context`.
 * Les clés manquantes laissent le placeholder tel quel (comportement explicite).
 */
export function renderTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(context, key) && context[key] !== undefined) {
      return context[key]!;
    }
    return match;
  });
}
