import { describe, it, expect } from 'vitest';
import { mergeExtractedPartial } from './extraction-merge';

describe('mergeExtractedPartial - language field', () => {
  it('sets acc.language when patch has language', () => {
    const acc = {};
    mergeExtractedPartial(acc, { language: 'en' });
    expect(acc).toHaveProperty('language', 'en');
  });

  it('overwrites acc.language when patch has a different language', () => {
    const acc = { language: 'en' as const };
    mergeExtractedPartial(acc, { language: 'fr' });
    expect(acc).toHaveProperty('language', 'fr');
  });

  it('leaves acc.language unchanged when patch has no language', () => {
    const acc = { language: 'en' as const };
    mergeExtractedPartial(acc, { summary: 'test' });
    expect(acc).toHaveProperty('language', 'en');
  });

  it('leaves acc.language undefined when patch has no language and acc was empty', () => {
    const acc = {};
    mergeExtractedPartial(acc, { summary: 'test' });
    expect(acc).not.toHaveProperty('language');
  });
});
