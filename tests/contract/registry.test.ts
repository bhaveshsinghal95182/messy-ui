import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { components } from '@/config/components';
import { getRegistryPath } from '@/lib/component-loader';
import { siteConfig } from '@/lib/seo';
import type { ComponentFileRef } from '@/config/types';

/**
 * The registry is the product: `npx shadcn add https://messyui.dev/r/x.json`
 * has to work for every component the docs advertise. Four things have to stay
 * in step for that - the source on disk, registry.json, the generated
 * public/r/*.json, and each meta.ts componentFiles list - and nothing but
 * these tests checks that they do.
 */

const ROOT = process.cwd();
const REGISTRY_DIR = path.join(ROOT, 'registry', 'new-york');
const PUBLIC_R = path.join(ROOT, 'public', 'r');

interface RegistryItem {
  name: string;
  type: string;
  title: string;
  description: string;
  dependencies?: string[];
  registryDependencies?: string[];
  files: { path: string; type: string }[];
}

const registryJson = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'registry.json'), 'utf-8')
) as { name: string; homepage: string; items: RegistryItem[] };

const componentDirs = fs
  .readdirSync(REGISTRY_DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const itemsByName = new Map(registryJson.items.map((i) => [i.name, i]));

/** Relative specifiers only - bare imports are npm deps, not registry files. */
const relativeImportsOf = (filePath: string): string[] => {
  const source = fs.readFileSync(filePath, 'utf-8');
  const pattern = /(?:from|import)\s+['"](\.[^'"]+)['"]/g;
  return [...source.matchAll(pattern)].map((m) => m[1]);
};

describe('registry.json covers the source tree', () => {
  it.each(componentDirs)('%s has a registry.json item', (dir) => {
    expect(
      itemsByName.has(dir),
      `registry/new-york/${dir}/ exists but registry.json has no "${dir}" item, so ` +
        `pnpm registry:build will never emit public/r/${dir}.json`
    ).toBe(true);
  });

  it('has no registry.json item without a source directory', () => {
    for (const item of registryJson.items) {
      expect(
        componentDirs,
        `orphan registry.json item "${item.name}"`
      ).toContain(item.name);
    }
  });

  it('gives every item a unique name', () => {
    const names = registryJson.items.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('gives every item a title and description', () => {
    for (const item of registryJson.items) {
      expect(item.title, item.name).toBeTruthy();
      expect(item.description, item.name).toBeTruthy();
      expect(item.files.length, item.name).toBeGreaterThan(0);
    }
  });
});

describe('registry.json file lists resolve and are complete', () => {
  it.each(registryJson.items.map((i) => [i.name, i] as const))(
    '%s lists only files that exist',
    (_name, item) => {
      for (const file of item.files) {
        expect(
          fs.existsSync(path.join(ROOT, file.path)),
          `missing file: ${file.path}`
        ).toBe(true);
      }
    }
  );

  it.each(registryJson.items.map((i) => [i.name, i] as const))(
    '%s lists every file its own sources import',
    (name, item) => {
      const listed = new Set(item.files.map((f) => path.resolve(ROOT, f.path)));

      for (const file of item.files) {
        const abs = path.resolve(ROOT, file.path);
        if (!fs.existsSync(abs)) continue;

        for (const spec of relativeImportsOf(abs)) {
          const resolved = path.resolve(path.dirname(abs), spec);
          const candidates = [
            resolved,
            `${resolved}.ts`,
            `${resolved}.tsx`,
            `${resolved}.css`,
            path.join(resolved, 'index.ts'),
            path.join(resolved, 'index.tsx'),
          ];
          const hit = candidates.find((c) => fs.existsSync(c));

          // A relative import that resolves to nothing is a broken source
          // file; one that resolves outside the listed set means the shadcn
          // CLI installs a component that will not compile.
          expect(
            hit,
            `${file.path} imports "${spec}" which does not exist`
          ).toBeTruthy();
          expect(
            listed.has(hit!),
            `${name}: ${file.path} imports "${spec}", but ` +
              `${path.relative(ROOT, hit!)} is not in that item's files[]`
          ).toBe(true);
        }
      }
    }
  );

  it('has no source file that nothing imports and nothing lists', () => {
    const orphans: string[] = [];

    for (const dir of componentDirs) {
      const item = itemsByName.get(dir);
      if (!item) continue;

      const listed = new Set(item.files.map((f) => path.resolve(ROOT, f.path)));
      const imported = new Set<string>();

      for (const file of item.files) {
        const abs = path.resolve(ROOT, file.path);
        if (!fs.existsSync(abs)) continue;
        for (const spec of relativeImportsOf(abs)) {
          const resolved = path.resolve(path.dirname(abs), spec);
          for (const ext of ['', '.ts', '.tsx', '.css']) {
            if (fs.existsSync(resolved + ext)) imported.add(resolved + ext);
          }
        }
      }

      // index.ts, meta.ts and example.tsx are docs-site wiring, not shipped;
      // colocated tests are not shipped either.
      const infrastructure = new Set(['index.ts', 'meta.ts', 'example.tsx']);
      const isTest = (name: string) => /\.test\.tsx?$/.test(name);

      for (const entry of fs.readdirSync(path.join(REGISTRY_DIR, dir))) {
        if (infrastructure.has(entry) || isTest(entry)) continue;
        const abs = path.join(REGISTRY_DIR, dir, entry);
        if (!listed.has(abs) && !imported.has(abs)) {
          orphans.push(path.relative(ROOT, abs));
        }
      }
    }

    expect(orphans, 'unreferenced files in the registry').toEqual([]);
  });
});

describe('generated public/r output', () => {
  const built = fs.existsSync(PUBLIC_R)
    ? fs
        .readdirSync(PUBLIC_R)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/\.json$/, ''))
        .sort()
    : [];

  it('has exactly one JSON per registry.json item', () => {
    expect(built).toEqual(registryJson.items.map((i) => i.name).sort());
  });

  it.each(built)('%s.json is valid and non-empty', (name) => {
    const json = JSON.parse(
      fs.readFileSync(path.join(PUBLIC_R, `${name}.json`), 'utf-8')
    );
    expect(json.name).toBe(name);
    expect(Array.isArray(json.files)).toBe(true);
    expect(json.files.length).toBeGreaterThan(0);
    for (const file of json.files) {
      expect(file.content, `${name}: ${file.path} has no content`).toBeTruthy();
    }
  });
});

describe('meta.ts agrees with registry.json', () => {
  it.each(components.map((c) => [c.slug, c] as const))(
    '%s componentFiles all resolve on disk',
    (slug, component) => {
      const refs = component.componentCode as ComponentFileRef[];
      expect(
        Array.isArray(refs),
        `${slug} componentCode is not a ref array`
      ).toBe(true);

      for (const ref of refs) {
        const abs = path.join(getRegistryPath(slug), ref.sourcePath);
        expect(
          fs.existsSync(abs),
          `${slug}: sourcePath "${ref.sourcePath}" does not resolve - the ` +
            `docs Manual install tab would throw at build time`
        ).toBe(true);
      }
    }
  );

  it.each(components.map((c) => [c.slug, c] as const))(
    '%s componentFiles cover every file the CLI installs',
    (slug, component) => {
      const item = itemsByName.get(slug);
      if (!item) return; // covered by the coverage test above

      const refs = component.componentCode as ComponentFileRef[];
      const shownFiles = new Set(refs.map((r) => path.basename(r.sourcePath)));

      for (const file of item.files) {
        const base = path.basename(file.path);
        expect(
          shownFiles.has(base),
          `${slug}: the CLI installs "${base}" but meta.ts componentFiles ` +
            `omits it, so the Manual install tab hands users an incomplete set`
        ).toBe(true);
      }
    }
  );

  it.each(components.map((c) => [c.slug, c] as const))(
    '%s registryUrl points at its own generated JSON',
    (slug, component) => {
      expect(component.registryUrl).toBe(`${siteConfig.url}/r/${slug}.json`);
    }
  );
});
