import { StrictMode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import type { ComponentConfig, ComponentFile } from '@/config/types';
import InstallationSection from './installation-section';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

const file: ComponentFile = {
  filename: 'hold-button.tsx',
  targetPath: 'ui/hold-button.tsx',
  code: 'export const HoldButton = () => null;',
};

const config = (over: Partial<ComponentConfig> = {}): ComponentConfig =>
  ({
    slug: 'hold-button',
    name: 'Hold Button',
    category: 'Buttons',
    description: 'A hold button',
    seoTitle: 'Hold Button',
    seoDescription: 'A hold button',
    keywords: ['hold'],
    aliases: [],
    sandbox: 'inline',
    registryUrl: 'https://messyui.dev/r/hold-button.json',
    dependencies: [],
    props: [],
    component: () => null,
    usageCode: '<HoldButton />',
    componentCode: [file],
    ...over,
  }) as ComponentConfig;

const visibleText = (container: HTMLElement) =>
  container.textContent?.replace(/\s+/g, ' ') ?? '';

describe('InstallationSection - CLI tab', () => {
  it('offers the three shadcn runners', () => {
    render(<InstallationSection component={config()} />);
    const runners = screen
      .getAllByRole('tab')
      .map((t) => t.textContent)
      .filter((label) => ['npx', 'pnpm', 'bun'].includes(label ?? ''));
    expect(runners).toEqual(['npx', 'pnpm', 'bun']);
  });

  it('builds the npx command from the registry URL', () => {
    const { container } = render(<InstallationSection component={config()} />);
    expect(visibleText(container)).toContain(
      'npx shadcn@latest add https://messyui.dev/r/hold-button.json'
    );
  });

  it.each([
    ['pnpm', 'pnpm dlx shadcn@latest add'],
    ['bun', 'bunx shadcn@latest add'],
  ])('builds the %s command', async (runner, expected) => {
    const user = userEvent.setup();
    const { container } = render(<InstallationSection component={config()} />);

    await user.click(screen.getByRole('tab', { name: runner }));
    expect(visibleText(container)).toContain(
      `${expected} https://messyui.dev/r/hold-button.json`
    );
  });

  it('copies the CLI command', async () => {
    const user = userEvent.setup();
    render(<InstallationSection component={config()} />);

    await user.click(
      screen.getAllByRole('button', { name: /copy command/i })[0]
    );
    expect(await navigator.clipboard.readText()).toBe(
      'npx shadcn@latest add https://messyui.dev/r/hold-button.json'
    );
  });
});

describe('InstallationSection - manual tab', () => {
  const openManual = async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /manual/i }));
    return user;
  };

  it('shows the component source', async () => {
    const { container } = render(<InstallationSection component={config()} />);
    await openManual();
    expect(visibleText(container)).toContain('export const HoldButton');
  });

  it('lists npm dependencies when there are any', async () => {
    const { container } = render(
      <InstallationSection component={config({ dependencies: ['motion'] })} />
    );
    await openManual();
    expect(visibleText(container)).toContain('Install dependencies');
    expect(visibleText(container)).toContain('motion');
  });

  it('omits the dependency step when there are none', async () => {
    render(<InstallationSection component={config()} />);
    await openManual();
    expect(screen.queryByText('Install dependencies')).not.toBeInTheDocument();
  });

  it('numbers the steps consecutively from one', async () => {
    render(
      <InstallationSection
        component={config({
          dependencies: ['motion'],
          cliDependencies: [
            {
              label: 'Install cn',
              commands: {
                npx: 'npx shadcn@latest add lib/utils',
                pnpm: 'pnpm dlx shadcn@latest add lib/utils',
                bun: 'bunx shadcn@latest add lib/utils',
              },
            },
          ],
        })}
      />
    );
    await openManual();

    const badges = [...document.querySelectorAll('.rounded-full')]
      .map((el) => el.textContent)
      .filter((text) => /^\d+$/.test(text ?? ''));

    expect(badges).toEqual(badges.map((_, i) => String(i + 1)));
  });

  it('numbers the steps correctly under StrictMode double-rendering', async () => {
    // The component increments a `let stepNumber` during render. StrictMode
    // renders twice, which is exactly where that pattern goes wrong.
    render(
      <StrictMode>
        <InstallationSection component={config({ dependencies: ['motion'] })} />
      </StrictMode>
    );
    await openManual();

    const badges = [...document.querySelectorAll('.rounded-full')]
      .map((el) => el.textContent)
      .filter((text) => /^\d+$/.test(text ?? ''));

    expect(badges).toEqual(badges.map((_, i) => String(i + 1)));
  });

  it('hides the TS/JS switch when no JS version exists', async () => {
    render(<InstallationSection component={config()} />);
    await openManual();
    expect(
      screen.queryByRole('button', { name: 'JavaScript' })
    ).not.toBeInTheDocument();
  });

  it('offers a JS version when one is provided', async () => {
    const { container } = render(
      <InstallationSection
        component={config({
          componentCode: [{ ...file, jsCode: 'export const HoldButton = 1;' }],
        })}
      />
    );
    const user = await openManual();

    await user.click(screen.getByRole('button', { name: 'JavaScript' }));
    expect(visibleText(container)).toContain('export const HoldButton = 1;');
  });

  it('renders a raw code string as a single synthetic file', async () => {
    const { container } = render(
      <InstallationSection
        component={config({ componentCode: 'export const X = 1;' })}
      />
    );
    await openManual();
    expect(visibleText(container)).toContain('export const X = 1;');
    expect(visibleText(container)).toContain('hold-button.tsx');
  });

  it('does not crash on an unresolved file-ref array', async () => {
    // resolveComponentCode should have run server-side; if it did not, the
    // manual tab must degrade rather than throw on files[0].
    expect(() =>
      render(
        <InstallationSection
          component={config({
            componentCode: [
              {
                filename: 'x.tsx',
                targetPath: 'ui/x.tsx',
                sourcePath: './x.tsx',
              },
            ],
          })}
        />
      )
    ).not.toThrow();
  });

  it('does not crash on an empty file list', () => {
    expect(() =>
      render(<InstallationSection component={config({ componentCode: [] })} />)
    ).not.toThrow();
  });

  it('falls back to a message when no source could be resolved', async () => {
    const { container } = render(
      <InstallationSection component={config({ componentCode: [] })} />
    );
    await openManual();
    expect(visibleText(container)).toContain(
      'Source for this component is not available here'
    );
  });
});

describe('InstallationSection accessibility', () => {
  it('has no violations on the CLI tab', async () => {
    const { container } = render(<InstallationSection component={config()} />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('has no violations on the manual tab', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <InstallationSection component={config({ dependencies: ['motion'] })} />
    );

    await user.click(screen.getByRole('tab', { name: /manual/i }));
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('forwards className', () => {
    const { container } = render(
      <InstallationSection component={config()} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

describe('InstallationSection dependency commands', () => {
  it('shows the right install command per package manager', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <InstallationSection component={config({ dependencies: ['motion'] })} />
    );

    await user.click(screen.getByRole('tab', { name: /manual/i }));

    const managers: [string, string][] = [
      ['pnpm', 'pnpm add motion'],
      ['yarn', 'yarn add motion'],
      ['bun', 'bun add motion'],
    ];

    for (const [tab, expected] of managers) {
      const tabs = screen.getAllByRole('tab', { name: tab });
      await user.click(tabs[tabs.length - 1]);
      expect(visibleText(container)).toContain(expected);
    }
  });
});
