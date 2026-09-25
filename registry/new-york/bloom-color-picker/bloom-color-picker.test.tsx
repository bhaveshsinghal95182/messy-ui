import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import BloomColorPicker from './bloom-color-picker';

const petalsOf = (container: HTMLElement) =>
  [...container.querySelectorAll('.petal')] as HTMLElement[];

/** The centre swatch is the last child of the root, after the petal layer. */
const swatchOf = (container: HTMLElement) =>
  container.firstElementChild!.lastElementChild as HTMLElement;

describe('BloomColorPicker', () => {
  it('renders a full ring of 16 petals', () => {
    const { container } = render(<BloomColorPicker />);
    expect(petalsOf(container)).toHaveLength(16);
  });

  it('spreads the petals evenly around the hue circle', () => {
    const { container } = render(<BloomColorPicker />);
    const colors = petalsOf(container).map((p) => p.style.backgroundColor);

    // 16 distinct hues, none repeated.
    expect(new Set(colors).size).toBe(16);
  });

  it('starts on pure red', () => {
    const { container } = render(<BloomColorPicker />);
    expect(swatchOf(container).style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('adopts the hue of a petal that is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<BloomColorPicker />);

    const before = swatchOf(container).style.backgroundColor;
    // The 5th petal is 90 degrees round the circle - a clearly different hue.
    await user.click(petalsOf(container)[4]);

    expect(swatchOf(container).style.backgroundColor).not.toBe(before);
  });

  it('gives each instance its own gradient ids', () => {
    const { container: a } = render(<BloomColorPicker />);
    const { container: b } = render(<BloomColorPicker />);

    const idOf = (c: HTMLElement) =>
      c.querySelector('linearGradient')!.getAttribute('id');

    // Two pickers on one page must not share a <defs> id, or the second one
    // silently repaints the first.
    expect(idOf(a)).not.toBe(idOf(b));
  });

  it('renders both the saturation and brightness arcs', () => {
    const { container } = render(<BloomColorPicker />);
    expect(container.querySelectorAll('svg')).toHaveLength(2);
  });

  it('accepts the stagger prop without changing the rendered set', () => {
    const { container } = render(<BloomColorPicker stagger />);
    expect(petalsOf(container)).toHaveLength(16);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<BloomColorPicker />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('exposes no keyboard path to any of its controls', () => {
    // Pinned, not endorsed: the centre swatch and every petal are plain divs
    // with onClick, so none of them are focusable or reachable by keyboard,
    // and axe cannot see the problem because it does not inspect handlers.
    // Changing this should mean deliberately editing this expectation.
    const { container } = render(<BloomColorPicker />);

    expect(container.querySelectorAll('button')).toHaveLength(0);
    for (const el of [swatchOf(container), ...petalsOf(container)]) {
      expect(el.tagName).toBe('DIV');
      expect(el).not.toHaveAttribute('tabindex');
      expect(el).not.toHaveAttribute('role');
    }
  });
});
