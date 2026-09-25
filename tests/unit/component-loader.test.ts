import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getRegistryPath,
  isComponentFileRefArray,
  loadComponentFiles,
  resolveComponentCode,
} from '@/lib/component-loader';
import type { ComponentFile, ComponentFileRef } from '@/config/types';

const refs: ComponentFileRef[] = [
  {
    filename: 'hold-button.tsx',
    targetPath: 'ui/hold-button.tsx',
    sourcePath: './hold-button.tsx',
  },
];

const files: ComponentFile[] = [
  {
    filename: 'hold-button.tsx',
    targetPath: 'ui/hold-button.tsx',
    code: '// already loaded',
  },
];

describe('isComponentFileRefArray', () => {
  it('recognises a ref array', () => {
    expect(isComponentFileRefArray(refs)).toBe(true);
  });

  it('rejects an already-loaded file array', () => {
    expect(isComponentFileRefArray(files)).toBe(false);
  });

  it('rejects a raw code string', () => {
    expect(isComponentFileRefArray('const a = 1;')).toBe(false);
  });

  it('rejects an empty array, which carries no type information', () => {
    expect(isComponentFileRefArray([])).toBe(false);
  });

  it('only inspects the first element', () => {
    // Documented limitation: a mixed array is classified by its head. The
    // cast is the point - the guard cannot see past index 0.
    const refFirst = [...refs, ...files] as ComponentFileRef[];
    const fileFirst = [...files, ...refs] as ComponentFile[];

    expect(isComponentFileRefArray(refFirst)).toBe(true);
    expect(isComponentFileRefArray(fileFirst)).toBe(false);
  });
});

describe('getRegistryPath', () => {
  it('points into registry/new-york', () => {
    expect(getRegistryPath('hold-button')).toBe(
      path.join(process.cwd(), 'registry', 'new-york', 'hold-button')
    );
  });
});

describe('loadComponentFiles', () => {
  it('reads each referenced file off disk', () => {
    const loaded = loadComponentFiles(getRegistryPath('hold-button'), refs);

    expect(loaded).toHaveLength(1);
    expect(loaded[0].filename).toBe('hold-button.tsx');
    expect(loaded[0].targetPath).toBe('ui/hold-button.tsx');
    expect(loaded[0].code).toContain('const HoldButton');
  });

  it('throws a useful error when a sourcePath is wrong', () => {
    expect(() =>
      loadComponentFiles(getRegistryPath('hold-button'), [
        { ...refs[0], sourcePath: './missing.tsx' },
      ])
    ).toThrow(/ENOENT|no such file/i);
  });

  it('returns an empty array for no refs', () => {
    expect(loadComponentFiles(getRegistryPath('hold-button'), [])).toEqual([]);
  });
});

describe('resolveComponentCode', () => {
  it('passes a code string straight through', () => {
    expect(resolveComponentCode('hold-button', 'const a = 1;')).toBe(
      'const a = 1;'
    );
  });

  it('loads refs into files', () => {
    const resolved = resolveComponentCode('hold-button', refs);
    expect(Array.isArray(resolved)).toBe(true);
    expect((resolved as ComponentFile[])[0].code).toContain('HoldButton');
  });

  it('leaves already-loaded files untouched', () => {
    expect(resolveComponentCode('hold-button', files)).toBe(files);
  });

  it('leaves an empty array untouched', () => {
    const empty: ComponentFile[] = [];
    expect(resolveComponentCode('hold-button', empty)).toBe(empty);
  });
});
