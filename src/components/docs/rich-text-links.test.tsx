import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { plainText } from '@/lib/text';
import RichTextLinks from './rich-text-links';

/**
 * RichTextLinks and plainText parse the same syntax for different outputs -
 * one renders anchors, the other strips them for meta tags. The shared fixture
 * below is what keeps the two implementations honest about the same inputs.
 */
const FIXTURES = [
  { input: 'plain text', labels: [] },
  { input: 'See [the docs](https://example.com)', labels: ['the docs'] },
  { input: 'Pairs with [[hold-button]]', labels: ['hold-button'] },
  { input: 'Pairs with [[hold-button|Hold Button]]', labels: ['Hold Button'] },
  { input: '[[a|A]] and [b](/b) and [[c]]', labels: ['A', 'b', 'c'] },
];

describe('RichTextLinks', () => {
  it('renders plain text untouched', () => {
    render(<RichTextLinks>Just a description.</RichTextLinks>);
    expect(screen.getByText('Just a description.')).toBeInTheDocument();
  });

  it('renders a wiki link as an internal component link', () => {
    render(<RichTextLinks>Pairs with [[hold-button]]</RichTextLinks>);
    expect(screen.getByRole('link', { name: 'hold-button' })).toHaveAttribute(
      'href',
      '/components/hold-button'
    );
  });

  it('slugifies a wiki target', () => {
    render(<RichTextLinks>[[Hold Button]]</RichTextLinks>);
    expect(screen.getByRole('link', { name: 'Hold Button' })).toHaveAttribute(
      'href',
      '/components/hold-button'
    );
  });

  it('uses the label from a piped wiki link', () => {
    render(<RichTextLinks>[[hold-button|Hold Button]]</RichTextLinks>);
    const link = screen.getByRole('link', { name: 'Hold Button' });
    expect(link).toHaveAttribute('href', '/components/hold-button');
  });

  it('passes through an absolute path target', () => {
    render(<RichTextLinks>[[/timer|Timer]]</RichTextLinks>);
    expect(screen.getByRole('link', { name: 'Timer' })).toHaveAttribute(
      'href',
      '/timer'
    );
  });

  it('passes through a hash target', () => {
    render(<RichTextLinks>[[#install|Install]]</RichTextLinks>);
    expect(screen.getByRole('link', { name: 'Install' })).toHaveAttribute(
      'href',
      '#install'
    );
  });

  it('opens a non-http scheme in a new tab', () => {
    render(<RichTextLinks>[[mailto:a@b.com|Email]]</RichTextLinks>);
    const link = screen.getByRole('link', { name: 'Email' });
    expect(link).toHaveAttribute('href', 'mailto:a@b.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });

  it('renders a markdown link with its own href', () => {
    render(<RichTextLinks>See [the docs](/docs)</RichTextLinks>);
    expect(screen.getByRole('link', { name: 'the docs' })).toHaveAttribute(
      'href',
      '/docs'
    );
  });

  it('keeps the surrounding text around a link', () => {
    const { container } = render(
      <RichTextLinks>before [[a|A]] after</RichTextLinks>
    );
    expect(container.textContent).toBe('before A after');
  });

  it('renders several links in one string', () => {
    render(<RichTextLinks>[[a|A]] and [b](/b) and [[c]]</RichTextLinks>);
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('forwards className to the wrapper', () => {
    const { container } = render(
      <RichTextLinks className="custom-class">text</RichTextLinks>
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders an empty string without crashing', () => {
    const { container } = render(<RichTextLinks>{''}</RichTextLinks>);
    expect(container.textContent).toBe('');
  });

  it.each(FIXTURES)(
    'agrees with plainText on the visible text of "$input"',
    ({ input }) => {
      const { container } = render(<RichTextLinks>{input}</RichTextLinks>);
      expect(container.textContent).toBe(plainText(input));
    }
  );

  it.each(FIXTURES)(
    'renders the expected links for "$input"',
    ({ input, labels }) => {
      render(<RichTextLinks>{input}</RichTextLinks>);
      expect(screen.queryAllByRole('link').map((l) => l.textContent)).toEqual(
        labels
      );
    }
  );
});
