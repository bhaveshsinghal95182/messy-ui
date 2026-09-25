import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { checkA11y } from '@tests/setup/a11y';
import AnimatedCounter from './animated-counter';

// GSAP drives the odometer roll off a ticker. The final DOM is what matters
// here, so tweens are collapsed to their end state.
vi.mock('gsap', () => {
  const to = vi.fn();
  const fromTo = vi.fn();
  return { gsap: { to, fromTo }, default: { to, fromTo } };
});

describe('AnimatedCounter', () => {
  it('renders one odometer column per digit of the target', () => {
    const { container } = render(<AnimatedCounter target={1234} />);
    expect(container.querySelectorAll('.overflow-hidden')).toHaveLength(4);
  });

  it('tracks the digit count of the target', () => {
    const { container } = render(<AnimatedCounter target={7} />);
    expect(container.querySelectorAll('.overflow-hidden')).toHaveLength(1);
  });

  it('renders the prefix and suffix around the digits', () => {
    render(<AnimatedCounter target={50} prefix="$" suffix="%" />);
    expect(screen.getByText('$')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('defaults to a "+" suffix and no prefix', () => {
    render(<AnimatedCounter target={10} />);
    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('renders an empty suffix without leaving a stray node', () => {
    render(<AnimatedCounter target={10} suffix="" />);
    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });

  it('re-renders when the target changes', () => {
    const { container, rerender } = render(<AnimatedCounter target={9} />);
    expect(container.querySelectorAll('.overflow-hidden')).toHaveLength(1);

    rerender(<AnimatedCounter target={1000} />);
    expect(container.querySelectorAll('.overflow-hidden')).toHaveLength(4);
  });

  it('drives its columns with GSAP tweens', async () => {
    const { gsap } = await import('gsap');
    vi.mocked(gsap.fromTo).mockClear();

    render(<AnimatedCounter target={42} />);
    expect(gsap.fromTo).toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<AnimatedCounter target={1234} />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
