import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import CTAButton from './cta-button';

describe('CTAButton', () => {
  it('renders the label and the highlighted portion together', () => {
    render(<CTAButton label="Browse" highlightLabel="Components" />);
    expect(
      screen.getByRole('button', { name: /browse components/i })
    ).toBeInTheDocument();
  });

  it('falls back to its default copy', () => {
    render(<CTAButton />);
    expect(
      screen.getByRole('button', { name: /browse components/i })
    ).toBeInTheDocument();
  });

  it('omits the highlight span when no highlightLabel is given', () => {
    render(<CTAButton label="Browse" highlightLabel="" />);
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Browse');
    expect(button.querySelector('.font-serif')).toBeNull();
  });

  it('prefers children over label and highlightLabel', () => {
    render(
      <CTAButton label="Browse" highlightLabel="Components">
        Custom content
      </CTAButton>
    );
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Custom content');
    expect(button).not.toHaveTextContent('Browse');
  });

  it('calls onClick when activated', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CTAButton onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is keyboard operable', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<CTAButton onClick={onClick} />);

    await user.tab();
    expect(screen.getByRole('button')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders a custom icon in place of the default arrow', () => {
    render(<CTAButton icon={<span data-testid="custom-icon">→</span>} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('forwards className', () => {
    render(<CTAButton className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<CTAButton />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
