import { describe, expect, it } from 'vitest';
import type { PropDefinition } from '@/config/types';
import {
  formatPropValue,
  generateUsageCode,
  parseDefaultValue,
  parseEnumOptions,
} from '@/components/docs/interactive-props-playground/utils';

const prop = (over: Partial<PropDefinition> = {}): PropDefinition => ({
  name: 'label',
  type: 'string',
  default: '"Click me"',
  description: '',
  ...over,
});

describe('parseDefaultValue', () => {
  it('parses booleans strictly against the literal "true"', () => {
    expect(parseDefaultValue('true', 'boolean')).toBe(true);
    expect(parseDefaultValue('false', 'boolean')).toBe(false);
    // Anything else is false, including casings a human might write.
    expect(parseDefaultValue('TRUE', 'boolean')).toBe(false);
    expect(parseDefaultValue('1', 'boolean')).toBe(false);
  });

  it('parses numbers, collapsing unparseable input to 0', () => {
    expect(parseDefaultValue('42', 'number')).toBe(42);
    expect(parseDefaultValue('1.5', 'number')).toBe(1.5);
    expect(parseDefaultValue('-3', 'number')).toBe(-3);
    // `parseFloat(x) || 0` means a real 0 and junk are indistinguishable.
    expect(parseDefaultValue('0', 'number')).toBe(0);
    expect(parseDefaultValue('abc', 'number')).toBe(0);
    expect(parseDefaultValue('', 'number')).toBe(0);
  });

  it('parses array types as JSON and falls back to an empty array', () => {
    expect(parseDefaultValue('[1,2,3]', 'number[]')).toEqual([1, 2, 3]);
    expect(parseDefaultValue('not json', 'string[]')).toEqual([]);
  });

  it('strips one layer of surrounding quotes from strings', () => {
    expect(parseDefaultValue('"hello"', 'string')).toBe('hello');
    expect(parseDefaultValue("'hello'", 'string')).toBe('hello');
    expect(parseDefaultValue('hello', 'string')).toBe('hello');
  });

  it('strips a lone quote on either side, even when unbalanced', () => {
    // The regex is anchored per side, not paired - documented, not ideal.
    expect(parseDefaultValue('"hello', 'string')).toBe('hello');
    expect(parseDefaultValue('hello"', 'string')).toBe('hello');
  });

  it('treats a union type as a string', () => {
    expect(parseDefaultValue('"md"', '"sm" | "md" | "lg"')).toBe('md');
  });
});

describe('formatPropValue', () => {
  it('wraps booleans and numbers in braces', () => {
    expect(formatPropValue(true, prop({ type: 'boolean' }))).toBe('{true}');
    expect(formatPropValue(0, prop({ type: 'number' }))).toBe('{0}');
  });

  it('JSON-encodes arrays and object-array controls', () => {
    expect(formatPropValue([1, 2], prop({ type: 'number[]' }))).toBe(
      '{[\n  1,\n  2\n]}'
    );
    expect(
      formatPropValue([{ a: 1 }], prop({ control: 'object-array' }))
    ).toContain('"a": 1');
  });

  it('quotes plain strings', () => {
    expect(formatPropValue('hi', prop())).toBe('"hi"');
  });

  it('produces valid JSX for strings that contain a double quote', () => {
    // A naive `"${value}"` would emit `label="say "hi""`, which does not parse.
    const result = formatPropValue('say "hi"', prop());
    expect(result).toBe('{"say \\"hi\\""}');
  });
});

describe('generateUsageCode', () => {
  const defs: PropDefinition[] = [
    prop({ name: 'label', type: 'string', default: '"Click me"' }),
    prop({ name: 'count', type: 'number', default: '5' }),
    prop({ name: 'disabled', type: 'boolean', default: 'false' }),
    prop({ name: 'onConfirm', type: '() => void', default: 'undefined' }),
  ];

  it('renders a self-closing tag when nothing differs from the defaults', () => {
    expect(
      generateUsageCode(
        'HoldButton',
        { label: 'Click me', count: 5, disabled: false },
        defs
      )
    ).toBe('<HoldButton />');
  });

  it('includes only the props that differ from their default', () => {
    expect(
      generateUsageCode(
        'HoldButton',
        { label: 'Delete', count: 5, disabled: true },
        defs
      )
    ).toBe('<HoldButton\n  label="Delete"\n  disabled={true}\n/>');
  });

  it('never emits callback props', () => {
    const code = generateUsageCode(
      'HoldButton',
      { label: 'Click me', count: 5, disabled: false, onConfirm: () => {} },
      defs
    );
    expect(code).not.toContain('onConfirm');
  });

  it('always emits array props, because defaults are compared by reference', () => {
    // parseDefaultValue builds a fresh array each call, so `!==` is always
    // true for arrays and objects. Pinned so a future fix is deliberate.
    const arrayDefs = [
      prop({ name: 'items', type: 'string[]', default: '["a"]' }),
    ];
    expect(generateUsageCode('Menu', { items: ['a'] }, arrayDefs)).toContain(
      'items='
    );
  });
});

describe('parseEnumOptions', () => {
  it('splits a quoted union into bare options', () => {
    expect(parseEnumOptions('"sm" | "md" | "lg"')).toEqual(['sm', 'md', 'lg']);
    expect(parseEnumOptions("'top' | 'bottom'")).toEqual(['top', 'bottom']);
  });

  it('trims whitespace and drops empty segments', () => {
    expect(parseEnumOptions('  "a"  |  | "b" ')).toEqual(['a', 'b']);
  });

  it('returns a single option for a non-union type', () => {
    expect(parseEnumOptions('string')).toEqual(['string']);
  });
});
