import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import CodeBlock from './code-blocks';

const resolvedTheme = { current: 'light' };
vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: resolvedTheme.current }),
}));

const CODE = 'const answer = 42;';

const visibleText = (container: HTMLElement) =>
  container.textContent?.replace(/\s+/g, ' ') ?? '';

describe('CodeBlock', () => {
  it('renders the code it is given', () => {
    const { container } = render(<CodeBlock code={CODE} />);
    expect(visibleText(container)).toContain('const answer = 42;');
  });

  it('trims surrounding whitespace before rendering', () => {
    const { container } = render(<CodeBlock code={`\n\n${CODE}\n\n`} />);
    expect(container.querySelector('pre')?.textContent?.startsWith('\n')).toBe(
      false
    );
  });

  it('labels itself with the language', () => {
    render(<CodeBlock code={CODE} language="bash" />);
    expect(screen.getByText('bash')).toBeInTheDocument();
  });

  it('defaults to tsx', () => {
    render(<CodeBlock code={CODE} />);
    expect(screen.getByText('tsx')).toBeInTheDocument();
  });

  it('copies the code to the clipboard', async () => {
    const user = userEvent.setup();
    render(<CodeBlock code={CODE} />);

    await user.click(screen.getByRole('button', { name: /copy code/i }));
    expect(await navigator.clipboard.readText()).toBe(CODE);
  });

  it('shows no collapse control unless collapsible', () => {
    render(<CodeBlock code={CODE} />);
    expect(screen.queryByRole('button', { name: /collapse/i })).toBeNull();
  });

  it('collapses and expands, keeping the code mounted', async () => {
    const user = userEvent.setup();
    const { container } = render(<CodeBlock code={CODE} collapsible />);

    const scroller = container.querySelector('.overflow-auto') as HTMLElement;
    expect(scroller.style.maxHeight).toBe('400px');

    await user.click(screen.getByRole('button', { name: 'Collapse' }));
    expect(scroller.style.maxHeight).toBe('0px');
    // Collapsing is purely visual - the code stays in the DOM.
    expect(visibleText(container)).toContain('42');

    await user.click(screen.getByRole('button', { name: 'Expand' }));
    expect(scroller.style.maxHeight).toBe('400px');
  });

  it('respects a custom maxHeight', () => {
    const { container } = render(
      <CodeBlock code={CODE} collapsible maxHeight="200px" />
    );
    expect(
      (container.querySelector('.overflow-auto') as HTMLElement).style.maxHeight
    ).toBe('200px');
  });

  it('forwards className', () => {
    const { container } = render(
      <CodeBlock code={CODE} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<CodeBlock code={CODE} collapsible />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});

describe('CodeBlock copy feedback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resets the copied state after two seconds', async () => {
    render(<CodeBlock code={CODE} />);
    const button = () => screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button());
    });
    expect(button()).toHaveAccessibleName('Code copied');

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(button()).toHaveAccessibleName('Copy code');
  });
});
