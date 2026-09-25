import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { checkA11y } from '@tests/setup/a11y';
import { Separator } from './separator';

// The wobble is a GSAP tween on a plain object; collapsing it keeps the
// assertions about the resting path deterministic.
vi.mock('gsap', () => {
  const to = vi.fn(() => ({ kill: vi.fn() }));
  return { default: { to }, gsap: { to } };
});

const pathOf = (container: HTMLElement) =>
  container.querySelector('path') as SVGPathElement;

/** The element the component attaches its pointer listeners to. */
const zoneOf = (container: HTMLElement) =>
  container.querySelector('svg')!.parentElement as HTMLElement;

describe('Separator', () => {
  it('renders a flat quadratic curve at rest', () => {
    const { container } = render(<Separator baseY={50} />);
    // Control point sits on the baseline, so the line starts straight.
    expect(pathOf(container).getAttribute('d')).toBe('M 0 50 Q 500 50 1000 50');
  });

  it('respects baseY', () => {
    const { container } = render(<Separator baseY={20} />);
    expect(pathOf(container).getAttribute('d')).toBe('M 0 20 Q 500 20 1000 20');
  });

  it('respects strokeWidth', () => {
    const { container } = render(<Separator strokeWidth={5} />);
    expect(pathOf(container)).toHaveAttribute('stroke-width', '5');
  });

  it('inherits its colour from the surrounding text colour', () => {
    const { container } = render(<Separator />);
    expect(pathOf(container)).toHaveAttribute('stroke', 'currentColor');
    expect(pathOf(container)).toHaveAttribute('fill', 'none');
  });

  it('sizes the hover zone in pixels', () => {
    const { container } = render(<Separator hoverZoneHeight={120} />);
    const zone = container.querySelector('svg')?.parentElement;
    expect(zone).toHaveStyle({ height: '120px' });
  });

  it('uses a fixed viewBox so it scales with its container', () => {
    const { container } = render(<Separator />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 1000 100');
    expect(svg).toHaveAttribute('preserveAspectRatio', 'none');
  });

  it('forwards className to the outer wrapper', () => {
    const { container } = render(<Separator className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('bends the line toward the pointer', () => {
    // The stubbed rect is 200x100, so a baseY of 50 puts the line at y=50.
    // A pointer 30px below it displaces by 30 * (40 / 50) = 24.
    const { container } = render(<Separator baseY={50} maxDisplacement={40} />);

    fireEvent.mouseMove(zoneOf(container), { clientX: 100, clientY: 80 });

    expect(pathOf(container).getAttribute('d')).toBe('M 0 50 Q 500 74 1000 50');
  });

  it('tracks the pointer horizontally', () => {
    const { container } = render(<Separator baseY={50} />);

    fireEvent.mouseMove(zoneOf(container), { clientX: 50, clientY: 80 });
    // 50 of 200px maps to a quarter of the 1000-unit viewBox.
    expect(pathOf(container).getAttribute('d')).toMatch(/^M 0 50 Q 250 /);
  });

  it('bends the other way above the line', () => {
    const { container } = render(<Separator baseY={50} maxDisplacement={40} />);

    fireEvent.mouseMove(zoneOf(container), { clientX: 100, clientY: 20 });
    expect(pathOf(container).getAttribute('d')).toBe('M 0 50 Q 500 26 1000 50');
  });

  it('clamps the displacement to maxDisplacement', () => {
    const { container } = render(<Separator baseY={50} maxDisplacement={10} />);

    fireEvent.mouseMove(zoneOf(container), { clientX: 100, clientY: 100 });
    expect(pathOf(container).getAttribute('d')).toBe('M 0 50 Q 500 60 1000 50');
  });

  it('starts a wobble when the pointer leaves', async () => {
    const { gsap } = await import('gsap');
    const { container } = render(<Separator baseY={50} duration={2} />);

    fireEvent.mouseMove(zoneOf(container), { clientX: 100, clientY: 80 });
    vi.mocked(gsap.to).mockClear();

    fireEvent.mouseLeave(zoneOf(container));

    expect(gsap.to).toHaveBeenCalledTimes(1);
    expect(vi.mocked(gsap.to).mock.calls[0][1]).toMatchObject({ duration: 2 });
  });

  it('does not wobble when the line was never displaced', async () => {
    const { gsap } = await import('gsap');
    const { container } = render(<Separator />);
    vi.mocked(gsap.to).mockClear();

    fireEvent.mouseLeave(zoneOf(container));

    expect(gsap.to).not.toHaveBeenCalled();
  });

  it('cleans up its listeners on unmount', () => {
    const { container, unmount } = render(<Separator />);
    const zone = container.querySelector('svg')?.parentElement as HTMLElement;
    expect(() => {
      unmount();
      zone.dispatchEvent(new MouseEvent('mousemove'));
    }).not.toThrow();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Separator />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('exposes no separator semantics to assistive tech', () => {
    // Pinned, not endorsed: despite the name, the rendered SVG carries neither
    // role="separator" nor aria-hidden, so screen readers meet an unlabelled
    // graphic. Changing that should be a deliberate edit to this expectation.
    const { container } = render(<Separator />);
    const svg = container.querySelector('svg');
    expect(svg).not.toHaveAttribute('role');
    expect(svg).not.toHaveAttribute('aria-hidden');
  });
});
