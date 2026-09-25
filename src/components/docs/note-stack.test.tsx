import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import type { InstallationNote } from '@/config/types';
import NoteStack from './note-stack';

const reduceMotion = { current: false };
vi.mock('motion/react', () => ({
  useReducedMotion: () => reduceMotion.current,
}));

const notes: InstallationNote[] = [
  { type: 'info', message: 'Requires next-themes.' },
  { type: 'warning', message: 'Needs the shimmer keyframes.' },
  { type: 'tip', message: 'Customise the duration.' },
];

const deckOf = () => screen.getByRole('button');

describe('NoteStack', () => {
  it('renders a single note as a plain card, not a deck', () => {
    render(<NoteStack notes={[notes[0]]} />);
    expect(screen.getByText('Requires next-themes.')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders every note in a deck', () => {
    render(<NoteStack notes={notes} />);
    for (const note of notes) {
      expect(screen.getByText(note.message)).toBeInTheDocument();
    }
  });

  it('labels each note by its type', () => {
    render(<NoteStack notes={notes} />);
    expect(screen.getByText('Note')).toBeInTheDocument();
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Tip')).toBeInTheDocument();
  });

  it('shows how many notes are hidden behind the top card', () => {
    render(<NoteStack notes={notes} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('announces itself as a collapsed expandable region', () => {
    render(<NoteStack notes={notes} />);
    const deck = deckOf();
    expect(deck).toHaveAttribute('aria-expanded', 'false');
    expect(deck).toHaveAccessibleName('3 notes about this component. Expand.');
  });

  it('expands on hover and collapses on leave', () => {
    render(<NoteStack notes={notes} />);
    const deck = deckOf();

    fireEvent.pointerEnter(deck);
    expect(deck).toHaveAttribute('aria-expanded', 'true');

    fireEvent.pointerLeave(deck);
    expect(deck).toHaveAttribute('aria-expanded', 'false');
  });

  it('pins open on click, so it survives the pointer leaving', () => {
    render(<NoteStack notes={notes} />);
    const deck = deckOf();

    fireEvent.click(deck);
    fireEvent.pointerLeave(deck);
    expect(deck).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(deck);
    expect(deck).toHaveAttribute('aria-expanded', 'false');
  });

  it('is reachable and operable by keyboard', async () => {
    const user = userEvent.setup();
    render(<NoteStack notes={notes} />);

    await user.tab();
    const deck = deckOf();
    expect(deck).toHaveFocus();
    // Focus alone fans the deck out.
    expect(deck).toHaveAttribute('aria-expanded', 'true');

    fireEvent.blur(deck);
    expect(deck).toHaveAttribute('aria-expanded', 'false');

    fireEvent.keyDown(deck, { key: 'Enter' });
    expect(deck).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles on Space as well as Enter', () => {
    render(<NoteStack notes={notes} />);
    const deck = deckOf();

    fireEvent.keyDown(deck, { key: ' ' });
    expect(deck).toHaveAttribute('aria-expanded', 'true');
  });

  it('ignores other keys', () => {
    render(<NoteStack notes={notes} />);
    const deck = deckOf();

    fireEvent.keyDown(deck, { key: 'a' });
    expect(deck).toHaveAttribute('aria-expanded', 'false');
  });

  it('starts open when the user prefers reduced motion', () => {
    // A deck that only resolves itself through movement is not much use
    // without the movement.
    reduceMotion.current = true;
    render(<NoteStack notes={notes} />);
    expect(deckOf()).toHaveAttribute('aria-expanded', 'true');
    reduceMotion.current = false;
  });

  it('forwards className', () => {
    const { container } = render(
      <NoteStack notes={notes} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has no accessibility violations collapsed', async () => {
    const { container } = render(<NoteStack notes={notes} />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });

  it('has no accessibility violations expanded', async () => {
    const { container } = render(<NoteStack notes={notes} />);
    fireEvent.click(deckOf());
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
