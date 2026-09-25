import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { checkA11y } from '@tests/setup/a11y';
import type { PropDefinition } from '@/config/types';
import PropsTable from './props-table';

const props: PropDefinition[] = [
  {
    name: 'label',
    type: 'string',
    default: '"Click me"',
    description: 'Text on the button',
  },
  {
    name: 'onConfirm',
    type: '() => void',
    default: 'undefined',
    description: 'Fires when the hold completes',
  },
];

describe('PropsTable', () => {
  it('explains itself when there are no props', () => {
    render(<PropsTable props={[]} />);
    expect(
      screen.getByText('This component has no configurable props.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders the four documentation columns', () => {
    render(<PropsTable props={props} />);
    const headers = screen
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(headers).toEqual(['Prop', 'Type', 'Default', 'Description']);
  });

  it('renders one row per prop', () => {
    render(<PropsTable props={props} />);
    // +1 for the header row.
    expect(screen.getAllByRole('row')).toHaveLength(props.length + 1);
  });

  it('shows the name, type, default and description of each prop', () => {
    render(<PropsTable props={props} />);
    const row = screen.getByRole('row', { name: /label/ });

    expect(within(row).getByText('label')).toBeInTheDocument();
    expect(within(row).getByText('string')).toBeInTheDocument();
    expect(within(row).getByText('"Click me"')).toBeInTheDocument();
    expect(within(row).getByText('Text on the button')).toBeInTheDocument();
  });

  it('documents callback props, which the playground hides', () => {
    // The playground filters `=>` types out of its controls; the reference
    // table must still list them or they would be undiscoverable.
    render(<PropsTable props={props} />);
    expect(screen.getByText('onConfirm')).toBeInTheDocument();
    expect(screen.getByText('() => void')).toBeInTheDocument();
  });

  it('renders rich links inside descriptions', () => {
    render(
      <PropsTable
        props={[
          {
            name: 'variant',
            type: 'string',
            default: '"default"',
            description: 'See [[hold-button|Hold Button]] for an example',
          },
        ]}
      />
    );
    expect(screen.getByRole('link', { name: 'Hold Button' })).toHaveAttribute(
      'href',
      '/components/hold-button'
    );
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PropsTable props={props} />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
