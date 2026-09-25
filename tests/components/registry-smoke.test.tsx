import { Suspense } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { checkA11y } from '@tests/setup/a11y';
import {
  components,
  getComponentBySlug,
  getComponentsByCategory,
  categories,
} from '@/config/components';
import { parseDefaultValue } from '@/components/docs/interactive-props-playground/utils';

/**
 * Every component the docs advertise has to mount. The per-component suites
 * cover behaviour; this one guards the wiring in src/config/components.ts -
 * the lazy import factories, the meta merge, and the default props each
 * component page feeds its preview.
 */

const defaultPropsFor = (slug: string) => {
  const component = getComponentBySlug(slug)!;
  const props: Record<string, unknown> = {};

  for (const prop of component.props) {
    if (prop.type.includes('=>')) continue;
    props[prop.name] = parseDefaultValue(prop.default, prop.type);
  }

  return props;
};

describe('every registered component', () => {
  it.each(components.map((c) => [c.slug] as const))(
    '%s mounts with its documented default props',
    async (slug) => {
      const Component = getComponentBySlug(slug)!.component;

      const { container } = render(
        <Suspense fallback={<div data-testid="loading" />}>
          <Component {...defaultPropsFor(slug)} />
        </Suspense>
      );

      await waitFor(() =>
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
      );
      expect(container).not.toBeEmptyDOMElement();
    }
  );

  it.each(components.map((c) => [c.slug] as const))(
    '%s renders without accessibility violations',
    async (slug) => {
      const Component = getComponentBySlug(slug)!.component;

      const { container } = render(
        <Suspense fallback={<div data-testid="loading" />}>
          <Component {...defaultPropsFor(slug)} />
        </Suspense>
      );

      await waitFor(() =>
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
      );
      expect(await checkA11y(container)).toHaveNoViolations();
    }
  );
});

describe('config wiring', () => {
  it('merges meta, component, usage and code into every config', () => {
    for (const component of components) {
      expect(component.component, component.slug).toBeDefined();
      expect(component.usageCode, component.slug).toContain('import');
      expect(component.componentCode, component.slug).toBeDefined();
    }
  });

  it('groups every component under exactly one category', () => {
    const grouped = categories.flatMap((c) => getComponentsByCategory(c));
    expect(grouped.map((c) => c.slug).sort()).toEqual(
      components.map((c) => c.slug).sort()
    );
  });
});
