import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import InstallCommand from './install-command';
import CommandBlock from './command-block';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

/**
 * The syntax highlighter splits commands across many <span> tokens, so text
 * has to be matched against the flattened textContent rather than one node.
 */
const visibleText = (container: HTMLElement) =>
  container.textContent?.replace(/\s+/g, ' ') ?? '';

describe('InstallCommand', () => {
  it('offers all four package managers', () => {
    render(<InstallCommand packageName="motion" />);
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'npm',
      'pnpm',
      'yarn',
      'bun',
    ]);
  });

  it('shows the npm command first', () => {
    const { container } = render(<InstallCommand packageName="motion" />);
    expect(visibleText(container)).toContain('npm install motion');
  });

  it.each([
    ['pnpm', 'pnpm add motion'],
    ['yarn', 'yarn add motion'],
    ['bun', 'bun add motion'],
  ])('shows the %s command when its tab is selected', async (tab, expected) => {
    const user = userEvent.setup();
    const { container } = render(<InstallCommand packageName="motion" />);

    await user.click(screen.getByRole('tab', { name: tab }));
    expect(visibleText(container)).toContain(expected);
  });

  it('copies the visible command to the clipboard', async () => {
    const user = userEvent.setup();
    render(<InstallCommand packageName="motion" />);

    await user.click(
      screen.getAllByRole('button', { name: /copy command/i })[0]
    );
    expect(await navigator.clipboard.readText()).toBe('npm install motion');
  });

  it('forwards className', () => {
    const { container } = render(
      <InstallCommand packageName="motion" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<InstallCommand packageName="motion" />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});

describe('InstallCommand copy feedback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resets the copied state after two seconds', async () => {
    render(<InstallCommand packageName="motion" />);
    const copyButton = screen.getAllByRole('button')[0];

    expect(copyButton).toHaveAccessibleName('Copy command');

    await act(async () => {
      fireEvent.click(copyButton);
    });
    expect(screen.getAllByRole('button')[0]).toHaveAccessibleName(
      'Command copied'
    );

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getAllByRole('button')[0]).toHaveAccessibleName(
      'Copy command'
    );
  });
});

describe('CommandBlock', () => {
  it('renders the command it is given', () => {
    const { container } = render(
      <CommandBlock command="npx shadcn@latest add x" />
    );
    expect(visibleText(container)).toContain('npx shadcn@latest add x');
  });

  it('omits the copy button when there is no handler', () => {
    render(<CommandBlock command="ls" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('calls onCopy when the copy button is used', async () => {
    const user = userEvent.setup();
    const onCopy = vi.fn();
    render(<CommandBlock command="ls" onCopy={onCopy} />);

    await user.click(screen.getByRole('button'));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('names the copy button in both states', () => {
    const { rerender } = render(
      <CommandBlock command="ls" onCopy={vi.fn()} copied={false} />
    );
    expect(screen.getByRole('button')).toHaveAccessibleName('Copy command');

    rerender(<CommandBlock command="ls" onCopy={vi.fn()} copied />);
    expect(screen.getByRole('button')).toHaveAccessibleName('Command copied');
  });

  it('swaps the icon once copied', () => {
    const { container, rerender } = render(
      <CommandBlock command="ls" onCopy={vi.fn()} copied={false} />
    );
    expect(container.querySelector('.text-green-500')).toBeNull();

    rerender(<CommandBlock command="ls" onCopy={vi.fn()} copied />);
    expect(container.querySelector('.text-green-500')).not.toBeNull();
  });

  it('forwards className', () => {
    const { container } = render(
      <CommandBlock command="ls" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
