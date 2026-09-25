import { describe, expect, it } from 'vitest';
import { plainText } from '@/lib/text';
import { categoryPath, toCategorySlug } from '@/lib/category';

describe('plainText', () => {
  it('reduces a markdown link to its label', () => {
    expect(plainText('See [the docs](https://example.com) for more')).toBe(
      'See the docs for more'
    );
  });

  it('reduces a wiki link to its target when no label is given', () => {
    expect(plainText('Pairs well with [[hold-button]]')).toBe(
      'Pairs well with hold-button'
    );
  });

  it('prefers the label over the target in a piped wiki link', () => {
    expect(plainText('Pairs well with [[hold-button|Hold Button]]')).toBe(
      'Pairs well with Hold Button'
    );
  });

  it('handles several links in one string', () => {
    expect(plainText('[[a|A]] and [b](/b) and [[c]]')).toBe('A and b and c');
  });

  it('collapses whitespace and trims', () => {
    expect(plainText('  spaced   out \n text  ')).toBe('spaced out text');
  });

  it('leaves text with no link syntax untouched', () => {
    expect(plainText('A plain description.')).toBe('A plain description.');
  });

  it('leaves unbalanced brackets alone rather than mangling them', () => {
    expect(plainText('an [unclosed link')).toBe('an [unclosed link');
    expect(plainText('array[] syntax')).toBe('array[] syntax');
  });

  it('is idempotent', () => {
    const once = plainText('See [the docs](https://example.com)');
    expect(plainText(once)).toBe(once);
  });
});

describe('toCategorySlug', () => {
  it('lowercases and hyphenates', () => {
    expect(toCategorySlug('Form Controls')).toBe('form-controls');
    expect(toCategorySlug('Animations')).toBe('animations');
  });

  it('collapses runs of non-alphanumerics into a single hyphen', () => {
    expect(toCategorySlug('Buttons  &  Links')).toBe('buttons-links');
  });

  it('trims leading and trailing hyphens', () => {
    expect(toCategorySlug('  Layout  ')).toBe('layout');
    expect(toCategorySlug('!Layout!')).toBe('layout');
  });

  it('keeps digits', () => {
    expect(toCategorySlug('3D')).toBe('3d');
  });

  it('is idempotent', () => {
    expect(toCategorySlug(toCategorySlug('Form Controls'))).toBe(
      'form-controls'
    );
  });
});

describe('categoryPath', () => {
  it('builds the canonical category URL', () => {
    expect(categoryPath('Form Controls')).toBe(
      '/components/category/form-controls'
    );
  });
});
