import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { checkA11y } from '@tests/setup/a11y';
import ProgressBar from './progress-bar';

/**
 * Scroll-linked behaviour needs a real viewport, so it is covered in
 * e2e/preview-iframe.spec.ts. What is worth asserting here is the prop ->
 * style mapping, which is pure and easy to break.
 */
const barOf = (container: HTMLElement) => container.firstElementChild!;

describe('ProgressBar', () => {
  it('pins to the top by default', () => {
    const { container } = render(<ProgressBar origin="left" />);
    expect(barOf(container)).toHaveClass('fixed', 'top-0');
  });

  it('pins to the bottom when asked', () => {
    const { container } = render(
      <ProgressBar origin="left" position="bottom" />
    );
    const bar = barOf(container);
    expect(bar).toHaveClass('bottom-0');
    expect(bar).not.toHaveClass('top-0');
  });

  it.each([
    ['left', '0%'],
    ['right', '100%'],
    ['center', '50%'],
  ] as const)('maps origin "%s" to %s', (origin, expected) => {
    const { container } = render(<ProgressBar origin={origin} />);
    expect(barOf(container)).toHaveStyle({ transformOrigin: expected });
  });

  it('treats a numeric origin as a percentage', () => {
    const { container } = render(<ProgressBar origin={25} />);
    expect(barOf(container)).toHaveStyle({ transformOrigin: '25%' });
  });

  it('converts height from the Tailwind scale to rem', () => {
    const { container } = render(<ProgressBar origin="left" height={4} />);
    expect((barOf(container) as HTMLElement).style.height).toBe('1rem');
  });

  it('supports fractional heights', () => {
    const { container } = render(<ProgressBar origin="left" height={0.5} />);
    expect((barOf(container) as HTMLElement).style.height).toBe('0.125rem');
  });

  it('leaves the height class alone when no height is given', () => {
    const { container } = render(<ProgressBar origin="left" />);
    const bar = barOf(container);
    expect(bar).toHaveClass('h-2');
    expect((bar as HTMLElement).style.height).toBe('');
  });

  it('applies a custom colour', () => {
    const { container } = render(<ProgressBar origin="left" color="#ff0000" />);
    expect(barOf(container)).toHaveStyle({ backgroundColor: '#ff0000' });
  });

  it('forwards className and arbitrary props', () => {
    const { container } = render(
      <ProgressBar origin="left" className="custom-class" data-testid="bar" />
    );
    const bar = barOf(container);
    expect(bar).toHaveClass('custom-class');
    expect(bar).toHaveAttribute('data-testid', 'bar');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ProgressBar origin="left" />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
