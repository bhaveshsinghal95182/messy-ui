import { describe, expect, it } from 'vitest';
import { decodePreviewProps, encodePreviewProps } from '@/lib/preview-props';

/** Mirrors what Next hands a page as resolved searchParams. */
const asSearchParams = (query: string) =>
  Object.fromEntries(new URLSearchParams(query).entries());

const roundTrip = (props: Record<string, unknown>) =>
  decodePreviewProps(asSearchParams(encodePreviewProps(props)));

describe('encode/decode round trip', () => {
  it('preserves primitives', () => {
    const props = { label: 'Click me', count: 5, disabled: true };
    expect(roundTrip(props)).toEqual(props);
  });

  it('preserves arrays and objects', () => {
    const props = {
      items: [
        { title: 'Home', href: '/' },
        { title: 'Work', href: '/work' },
      ],
      config: { nested: { deep: true } },
    };
    expect(roundTrip(props)).toEqual(props);
  });

  it('preserves strings that look like other types', () => {
    // The previous heuristic decoder turned each of these into the wrong type.
    const props = {
      a: 'true',
      b: 'false',
      c: '007',
      d: '1e5',
      e: 'null',
      f: '[not json]',
      g: '',
    };
    expect(roundTrip(props)).toEqual(props);
  });

  it('preserves numeric edge cases', () => {
    const props = { zero: 0, negative: -3, float: 1.5 };
    expect(roundTrip(props)).toEqual(props);
  });

  it('preserves strings with characters that need URL escaping', () => {
    const props = {
      amp: 'a & b',
      hash: 'a#b',
      plus: 'a + b',
      unicode: 'café 🍅',
      quote: 'say "hi"',
    };
    expect(roundTrip(props)).toEqual(props);
  });

  it('preserves null', () => {
    expect(roundTrip({ value: null })).toEqual({ value: null });
  });
});

describe('encodePreviewProps', () => {
  it('omits undefined values entirely', () => {
    expect(encodePreviewProps({ a: 1, b: undefined })).toBe('a=1');
  });

  it('returns an empty string for no props', () => {
    expect(encodePreviewProps({})).toBe('');
  });
});

describe('decodePreviewProps', () => {
  it('returns an empty object for no params', () => {
    expect(decodePreviewProps({})).toEqual({});
  });

  it('skips undefined params', () => {
    expect(decodePreviewProps({ a: undefined })).toEqual({});
  });

  it('takes the first value when a key is repeated', () => {
    expect(decodePreviewProps({ a: ['1', '2'] })).toEqual({ a: 1 });
  });

  it('falls back to a plain string for hand-typed values', () => {
    // /preview/progress-bar?position=top is a URL a human might type; it is
    // not valid JSON, and it should still work.
    expect(decodePreviewProps({ position: 'top' })).toEqual({
      position: 'top',
    });
  });

  it('tolerates an empty repeated param', () => {
    expect(decodePreviewProps({ a: [] })).toEqual({});
  });
});
