import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import ThemeToggle from './theme-toggle';

const setTheme = vi.fn();
let currentTheme = 'light';

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: currentTheme, setTheme }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    currentTheme = 'light';
    setTheme.mockClear();
  });

  it('labels itself with the theme it will switch to', () => {
    render(<ThemeToggle />);
    expect(
      screen.getByRole('button', { name: 'Switch to dark mode' })
    ).toBeInTheDocument();
  });

  it('flips the label once the theme is dark', () => {
    currentTheme = 'dark';
    render(<ThemeToggle />);
    expect(
      screen.getByRole('button', { name: 'Switch to light mode' })
    ).toBeInTheDocument();
  });

  it('switches light to dark on click', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button'));
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('switches dark to light on click', async () => {
    currentTheme = 'dark';
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(screen.getByRole('button'));
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('is keyboard operable', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('falls back to a plain theme swap without the View Transitions API', async () => {
    // jsdom has no document.startViewTransition, which is exactly the
    // unsupported-browser path the component guards for.
    expect(document.startViewTransition).toBeUndefined();

    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button'));

    expect(setTheme).toHaveBeenCalledTimes(1);
  });

  it('drives the view transition when the API is available', async () => {
    const animate = vi.fn();
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { ready: Promise.resolve() };
    });

    vi.stubGlobal('document', document);
    Object.defineProperty(document, 'startViewTransition', {
      value: startViewTransition,
      configurable: true,
      writable: true,
    });
    document.documentElement.animate = animate as unknown as Element['animate'];

    const user = userEvent.setup();
    render(<ThemeToggle />);
    await user.click(screen.getByRole('button'));

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(setTheme).toHaveBeenCalledWith('dark');
    expect(animate).toHaveBeenCalledWith(
      expect.objectContaining({
        clipPath: [expect.stringContaining('circle(0px'), expect.any(String)],
      }),
      expect.objectContaining({
        pseudoElement: '::view-transition-new(root)',
      })
    );

    delete (document as { startViewTransition?: unknown }).startViewTransition;
  });

  it('hides both icons from assistive tech, since the label carries the meaning', () => {
    const { container } = render(<ThemeToggle />);
    const icons = container.querySelectorAll('.theme-toggle__icon > span');
    expect(icons).toHaveLength(2);
    for (const icon of icons) {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('forwards className alongside its own base class', () => {
    render(<ThemeToggle className="custom-class" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('theme-toggle', 'custom-class');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ThemeToggle />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
