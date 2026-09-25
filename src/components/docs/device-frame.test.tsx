import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { checkA11y } from '@tests/setup/a11y';
import DeviceFrame from './device-frame';

const Child = () => <div data-testid="child">preview</div>;

const frameOf = (container: HTMLElement) =>
  container.querySelector('.relative') as HTMLElement;

const handlesOf = (container: HTMLElement) =>
  [...container.querySelectorAll('.cursor-ew-resize')] as HTMLElement[];

describe('DeviceFrame', () => {
  it('renders its children in every mode', () => {
    for (const device of ['desktop', 'tablet', 'mobile'] as const) {
      const { getByTestId, unmount } = render(
        <DeviceFrame device={device}>
          <Child />
        </DeviceFrame>
      );
      expect(getByTestId('child')).toBeInTheDocument();
      unmount();
    }
  });

  it('renders desktop as a plain full-width container with no chrome', () => {
    const { container } = render(
      <DeviceFrame device="desktop">
        <Child />
      </DeviceFrame>
    );
    expect(container.firstChild).toHaveClass('w-full');
    expect(handlesOf(container)).toHaveLength(0);
  });

  it.each([
    ['tablet', '768px'],
    ['mobile', '375px'],
  ] as const)('sizes %s to %s', (device, width) => {
    const { container } = render(
      <DeviceFrame device={device}>
        <Child />
      </DeviceFrame>
    );
    expect(frameOf(container).style.width).toBe(width);
  });

  it('offers a resize handle on each side below desktop', () => {
    const { container } = render(
      <DeviceFrame device="mobile">
        <Child />
      </DeviceFrame>
    );
    expect(handlesOf(container)).toHaveLength(2);
  });

  it('reports the width while dragging', () => {
    const onWidthChange = vi.fn();
    const { container } = render(
      <DeviceFrame device="mobile" onWidthChange={onWidthChange}>
        <Child />
      </DeviceFrame>
    );

    fireEvent.mouseDown(handlesOf(container)[0], { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 20 });

    // Dragging is from the centre, so the delta counts double.
    expect(onWidthChange).toHaveBeenCalledWith(375 + 40);
    fireEvent.mouseUp(document);
  });

  it('clamps the drag to the device min and max', () => {
    const onWidthChange = vi.fn();
    const { container } = render(
      <DeviceFrame device="mobile" onWidthChange={onWidthChange}>
        <Child />
      </DeviceFrame>
    );

    fireEvent.mouseDown(handlesOf(container)[0], { clientX: 0 });

    fireEvent.mouseMove(document, { clientX: -10_000 });
    expect(onWidthChange).toHaveBeenLastCalledWith(280);

    fireEvent.mouseMove(document, { clientX: 10_000 });
    expect(onWidthChange).toHaveBeenLastCalledWith(480);

    fireEvent.mouseUp(document);
  });

  it('stops tracking the pointer once the drag ends', () => {
    const onWidthChange = vi.fn();
    const { container } = render(
      <DeviceFrame device="mobile" onWidthChange={onWidthChange}>
        <Child />
      </DeviceFrame>
    );

    fireEvent.mouseDown(handlesOf(container)[0], { clientX: 0 });
    fireEvent.mouseUp(document);
    onWidthChange.mockClear();

    fireEvent.mouseMove(document, { clientX: 100 });
    expect(onWidthChange).not.toHaveBeenCalled();
  });

  it('shows the pixel readout once a custom width is set', async () => {
    const { container } = render(
      <DeviceFrame device="mobile">
        <Child />
      </DeviceFrame>
    );

    fireEvent.mouseDown(handlesOf(container)[0], { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 10 });

    expect(await screen.findByText('395px')).toBeInTheDocument();
    fireEvent.mouseUp(document);
  });

  it('drops the custom width when the device changes', async () => {
    const { container, rerender } = render(
      <DeviceFrame device="mobile">
        <Child />
      </DeviceFrame>
    );

    fireEvent.mouseDown(handlesOf(container)[0], { clientX: 0 });
    fireEvent.mouseMove(document, { clientX: 10 });
    fireEvent.mouseUp(document);
    expect(await screen.findByText('395px')).toBeInTheDocument();

    rerender(
      <DeviceFrame device="tablet">
        <Child />
      </DeviceFrame>
    );

    await waitFor(() =>
      expect(screen.queryByText('395px')).not.toBeInTheDocument()
    );
  });

  it('forwards className', () => {
    const { container } = render(
      <DeviceFrame device="mobile" className="custom-class">
        <Child />
      </DeviceFrame>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <DeviceFrame device="mobile">
        <Child />
      </DeviceFrame>
    );
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
