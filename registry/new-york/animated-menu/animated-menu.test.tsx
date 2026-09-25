import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import AnimatedMenu from './animated-menu';

const items = [
  { title: 'Home', href: '/' },
  { title: 'Work', href: '/work' },
];

describe('AnimatedMenu', () => {
  it('starts closed', () => {
    render(<AnimatedMenu menuItems={items} />);
    expect(
      screen.queryByRole('link', { name: 'Home' })
    ).not.toBeInTheDocument();
  });

  it('names the trigger and reports its state', async () => {
    const user = userEvent.setup();
    render(<AnimatedMenu menuItems={items} />);

    const trigger = screen.getByRole('button', { name: 'Open menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('reveals the links when opened', async () => {
    const user = userEvent.setup();
    render(<AnimatedMenu menuItems={items} />);

    await user.click(screen.getByRole('button'));

    for (const item of items) {
      expect(
        await screen.findByRole('link', { name: item.title })
      ).toHaveAttribute('href', item.href);
    }
  });

  it('closes again on a second click', async () => {
    const user = userEvent.setup();
    render(<AnimatedMenu menuItems={items} />);

    await user.click(screen.getByRole('button'));
    expect(await screen.findByRole('link', { name: 'Home' })).toBeVisible();

    await user.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: 'Home' })
      ).not.toBeInTheDocument()
    );
  });

  it('falls back to its default links', async () => {
    const user = userEvent.setup();
    render(<AnimatedMenu />);

    await user.click(screen.getByRole('button'));

    for (const name of ['Home', 'Work', 'About']) {
      expect(await screen.findByRole('link', { name })).toBeInTheDocument();
    }
  });

  it('renders nothing for an empty item list', async () => {
    const user = userEvent.setup();
    render(<AnimatedMenu menuItems={[]} />);

    await user.click(screen.getByRole('button'));
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('is keyboard operable', async () => {
    const user = userEvent.setup();
    render(<AnimatedMenu menuItems={items} />);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(await screen.findByRole('link', { name: 'Home' })).toBeVisible();
  });

  it('has no accessibility violations when closed', async () => {
    const { container } = render(<AnimatedMenu menuItems={items} />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('has no accessibility violations when open', async () => {
    const user = userEvent.setup();
    const { container } = render(<AnimatedMenu menuItems={items} />);

    await user.click(screen.getByRole('button'));
    await screen.findByRole('link', { name: 'Home' });

    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
