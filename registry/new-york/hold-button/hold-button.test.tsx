import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { checkA11y } from '@tests/setup/a11y';
import HoldButton from './hold-button';

const hold = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('HoldButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the idle label by default', () => {
    render(<HoldButton label="Hold to Delete" />);
    expect(
      screen.getByRole('button', { name: /hold to delete/i })
    ).toBeInTheDocument();
  });

  it('fires onConfirm only after the full hold duration', () => {
    const onConfirm = vi.fn();
    render(<HoldButton holdDuration={1000} onConfirm={onConfirm} />);

    const button = screen.getByRole('button');
    fireEvent.mouseDown(button);

    hold(992);
    expect(onConfirm).not.toHaveBeenCalled();

    // The progress interval ticks every 16ms, so completion lands on the
    // first tick at or past holdDuration rather than exactly on it.
    hold(32);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not fire when the press is released early', () => {
    const onConfirm = vi.fn();
    render(<HoldButton holdDuration={1000} onConfirm={onConfirm} />);

    const button = screen.getByRole('button');
    fireEvent.mouseDown(button);
    hold(500);
    fireEvent.mouseUp(button);
    hold(2000);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancels when the pointer leaves the button mid-hold', () => {
    const onConfirm = vi.fn();
    render(<HoldButton holdDuration={1000} onConfirm={onConfirm} />);

    const button = screen.getByRole('button');
    fireEvent.mouseDown(button);
    hold(500);
    fireEvent.mouseLeave(button);
    hold(2000);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cycles the label through holding and completed states', () => {
    render(
      <HoldButton
        label="Hold to Delete"
        holdingLabel="Keep holding..."
        completedLabel="Deleted!"
        holdDuration={1000}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Hold to Delete');

    fireEvent.mouseDown(button);
    hold(100);
    expect(button).toHaveTextContent('Keep holding...');

    hold(1000);
    expect(button).toHaveTextContent('Deleted!');
  });

  it('returns to the idle label after the completed state times out', () => {
    render(
      <HoldButton label="Hold" completedLabel="Done" holdDuration={100} />
    );

    const button = screen.getByRole('button');
    fireEvent.mouseDown(button);
    hold(150);
    expect(button).toHaveTextContent('Done');

    hold(1600);
    expect(button).toHaveTextContent('Hold');
  });

  it('supports touch as well as mouse', () => {
    const onConfirm = vi.fn();
    render(<HoldButton holdDuration={500} onConfirm={onConfirm} />);

    const button = screen.getByRole('button');
    fireEvent.touchStart(button);
    hold(600);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('ignores holds while disabled', () => {
    const onConfirm = vi.fn();
    render(<HoldButton holdDuration={100} onConfirm={onConfirm} disabled />);

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();

    fireEvent.mouseDown(button);
    hold(500);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('fires once per hold, not once per tick past completion', () => {
    const onConfirm = vi.fn();
    render(<HoldButton holdDuration={100} onConfirm={onConfirm} />);

    fireEvent.mouseDown(screen.getByRole('button'));
    hold(1000);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('applies the size and variant it is given', () => {
    const { rerender } = render(<HoldButton size="sm" variant="warning" />);
    expect(screen.getByRole('button').className).toMatch(/h-9/);
    expect(screen.getByRole('button').className).toMatch(/amber/);

    rerender(<HoldButton size="lg" variant="default" />);
    expect(screen.getByRole('button').className).toMatch(/h-14/);
  });

  it('forwards className', () => {
    render(<HoldButton className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('clears its interval on unmount', () => {
    const onConfirm = vi.fn();
    const { unmount } = render(
      <HoldButton holdDuration={1000} onConfirm={onConfirm} />
    );

    fireEvent.mouseDown(screen.getByRole('button'));
    hold(100);
    unmount();
    hold(5000);

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('has no accessibility violations', async () => {
    vi.useRealTimers();
    const { container } = render(<HoldButton />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('is a real button element, so it is focusable and in the a11y tree', () => {
    render(<HoldButton />);
    const button = screen.getByRole('button');
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('cannot currently be completed with the keyboard', () => {
    // Documented gap, not an endorsement: the component binds only mouse and
    // touch handlers, so a keyboard user cannot trigger a destructive confirm
    // at all. Pinned so that adding key handling is a deliberate, visible
    // change rather than an accident.
    const onConfirm = vi.fn();
    render(<HoldButton holdDuration={100} onConfirm={onConfirm} />);

    const button = screen.getByRole('button');
    button.focus();
    fireEvent.keyDown(button, { key: ' ' });
    hold(500);
    fireEvent.keyUp(button, { key: ' ' });

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
