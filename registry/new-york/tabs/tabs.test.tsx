import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from './tabs';

const Example = () => (
  <Tabs defaultValue="one">
    <TabsList>
      <TabsTrigger value="one">One</TabsTrigger>
      <TabsTrigger value="two">Two</TabsTrigger>
      <TabsTrigger value="three" disabled>
        Three
      </TabsTrigger>
      <TabsIndicator />
    </TabsList>
    <TabsContent value="one">First panel</TabsContent>
    <TabsContent value="two">Second panel</TabsContent>
    <TabsContent value="three">Third panel</TabsContent>
  </Tabs>
);

describe('Tabs', () => {
  it('shows the default panel on mount', () => {
    render(<Example />);
    expect(screen.getByText('First panel')).toBeVisible();
  });

  it('switches panels on click', async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole('tab', { name: 'Two' }));
    expect(screen.getByText('Second panel')).toBeVisible();
  });

  it('marks exactly one tab as selected at a time', async () => {
    const user = userEvent.setup();
    render(<Example />);

    const selected = () =>
      screen
        .getAllByRole('tab')
        .filter((tab) => tab.getAttribute('aria-selected') === 'true');

    expect(selected()).toHaveLength(1);
    expect(selected()[0]).toHaveAccessibleName('One');

    await user.click(screen.getByRole('tab', { name: 'Two' }));
    expect(selected()).toHaveLength(1);
    expect(selected()[0]).toHaveAccessibleName('Two');
  });

  it('wires each tab to its panel with aria-controls', () => {
    render(<Example />);
    const tab = screen.getByRole('tab', { name: 'One' });
    const panelId = tab.getAttribute('aria-controls');

    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).toHaveTextContent('First panel');
  });

  it('moves between tabs with the arrow keys', async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole('tab', { name: 'One' }));
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Two' })).toHaveFocus();
  });

  it('marks a disabled tab with aria-disabled, not the native attribute', () => {
    // Base UI keeps the button focusable and sets aria-disabled, which is why
    // the trigger also carries aria-disabled: Tailwind variants - the plain
    // `disabled:` ones alone would never match.
    render(<Example />);
    const tab = screen.getByRole('tab', { name: 'Three' });

    expect(tab).toHaveAttribute('aria-disabled', 'true');
    expect(tab).toHaveAttribute('data-disabled');
    expect(tab.className).toMatch(/aria-disabled:opacity-50/);
  });

  it('does not activate a disabled tab', async () => {
    const user = userEvent.setup();
    render(<Example />);

    await user.click(screen.getByRole('tab', { name: 'Two' }));
    await user.click(screen.getByRole('tab', { name: 'Three' }));

    expect(screen.getByText('Second panel')).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Three' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
  });

  it('exposes a tablist', () => {
    render(<Example />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('tags each part with its data-slot for styling hooks', () => {
    const { container } = render(<Example />);
    for (const slot of [
      'tabs',
      'tabs-list',
      'tabs-trigger',
      'tabs-indicator',
      'tabs-content',
    ]) {
      expect(
        container.querySelector(`[data-slot="${slot}"]`),
        `missing [data-slot="${slot}"]`
      ).not.toBeNull();
    }
  });

  it('merges a custom className rather than replacing the base styles', () => {
    const { container } = render(
      <Tabs defaultValue="a" className="custom-class">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
        <TabsContent value="a">A panel</TabsContent>
      </Tabs>
    );
    const root = container.querySelector('[data-slot="tabs"]');
    expect(root).toHaveClass('custom-class');
    expect(root).toHaveClass('flex');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<Example />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
