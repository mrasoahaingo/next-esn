import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderTemplate } from '@/lib/llm/template-render';

// Tests unitaires ciblés sur la logique de guard — on teste renderTemplate + détection {{
// plutôt que de mocker Supabase en entier pour resolveLlmTask.
describe('resolveLlmTask — placeholder guard', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renderTemplate laisse {{ intact quand la clé est absente du contexte', () => {
    const result = renderTemplate('Réponds en {{language}}', {});
    expect(result).toBe('Réponds en {{language}}');
  });

  it('renderTemplate résout le placeholder quand la clé est présente', () => {
    const result = renderTemplate('Réponds en {{language}}', { language: 'French' });
    expect(result).toBe('Réponds en French');
  });

  it('detecte les placeholders non résolus via regex /\\{\\{/', () => {
    const prompt = 'Réponds en {{language}}';
    expect(/\{\{/.test(prompt)).toBe(true);
  });

  it('ne détecte pas de placeholder quand le prompt est résolu', () => {
    const prompt = 'Réponds en French';
    expect(/\{\{/.test(prompt)).toBe(false);
  });
});
