import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import type { PropDefinition } from '@/config/types';
import InteractivePropsPlayground from './index';
import { PropControl } from './controls';

const prop = (over: Partial<PropDefinition> = {}): PropDefinition => ({
  name: 'label',
  type: 'string',
  default: '"Click me"',
  description: 'The label',
  ...over,
});

const renderPlayground = (
  props: PropDefinition[],
  currentProps: Record<string, unknown> = {}
) => {
  const onPropsChange = vi.fn();
  const result = render(
    <InteractivePropsPlayground
      props={props}
      currentProps={currentProps}
      onPropsChange={onPropsChange}
      componentName="HoldButton"
    />
  );
  return { ...result, onPropsChange };
};

describe('InteractivePropsPlayground', () => {
  it('explains itself when every prop is a callback', () => {
    renderPlayground([prop({ name: 'onConfirm', type: '() => void' })]);
    expect(
      screen.getByText('This component has no configurable props.')
    ).toBeInTheDocument();
  });

  it('explains itself when there are no props at all', () => {
    renderPlayground([]);
    expect(
      screen.getByText('This component has no configurable props.')
    ).toBeInTheDocument();
  });

  it('renders a control per configurable prop and hides callbacks', () => {
    renderPlayground([
      prop({ name: 'label' }),
      prop({ name: 'disabled', type: 'boolean', default: 'false' }),
      prop({ name: 'onConfirm', type: '() => void' }),
    ]);

    expect(screen.getByText('label')).toBeInTheDocument();
    expect(screen.getByText('disabled')).toBeInTheDocument();
    expect(screen.queryByText('onConfirm')).not.toBeInTheDocument();
  });

  it('shows each prop description', () => {
    renderPlayground([prop({ description: 'Text on the button' })]);
    expect(screen.getByText('Text on the button')).toBeInTheDocument();
  });

  it('renders rich links inside a description', () => {
    renderPlayground([prop({ description: 'See [[tabs|Tabs]]' })]);
    expect(screen.getByRole('link', { name: 'Tabs' })).toHaveAttribute(
      'href',
      '/components/tabs'
    );
  });

  it('falls back to the parsed default when a prop has no current value', () => {
    renderPlayground([prop()]);
    expect(screen.getByDisplayValue('Click me')).toBeInTheDocument();
  });

  it('reports a change while preserving the other props', async () => {
    const user = userEvent.setup();
    const { onPropsChange } = renderPlayground([prop()], {
      label: 'Click me',
      count: 5,
    });

    await user.type(screen.getByDisplayValue('Click me'), '!');

    expect(onPropsChange).toHaveBeenLastCalledWith({
      label: 'Click me!',
      count: 5,
    });
  });

  it('copies the generated usage code', async () => {
    const user = userEvent.setup();
    renderPlayground([prop()], { label: 'Delete' });

    await user.click(screen.getByRole('button', { name: /copy code/i }));
    expect(await navigator.clipboard.readText()).toBe(
      '<HoldButton\n  label="Delete"\n/>'
    );
  });

  it('survives a clipboard failure without crashing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const write = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValueOnce(new Error('denied'));

    const user = userEvent.setup();
    renderPlayground([prop()], { label: 'Delete' });

    await user.click(screen.getByRole('button', { name: /copy code/i }));

    expect(write).toHaveBeenCalled();
    // The message comes from useCopyToClipboard, which owns the failure path
    // for every copy button in the docs.
    expect(error).toHaveBeenCalledWith(
      'Failed to copy to clipboard:',
      expect.any(Error)
    );
    // The button stays in its idle state rather than falsely claiming success.
    expect(screen.getByRole('button', { name: /copy code/i })).toBeVisible();

    error.mockRestore();
    write.mockRestore();
  });

  it('has no accessibility violations', async () => {
    const { container } = renderPlayground([
      prop(),
      prop({ name: 'disabled', type: 'boolean', default: 'false' }),
    ]);
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});

describe('playground copy feedback', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('resets after two seconds', async () => {
    renderPlayground([prop()], { label: 'Delete' });
    const button = () => screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button());
    });
    expect(button()).toHaveTextContent('Copied!');

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });
    expect(button()).toHaveTextContent('Copy Code');
  });
});

describe('PropControl dispatch', () => {
  const renderControl = (definition: PropDefinition, value: unknown) =>
    render(<PropControl prop={definition} value={value} onChange={vi.fn()} />);

  it('renders a switch for a boolean, whatever the control hint says', () => {
    renderControl(
      prop({ name: 'disabled', type: 'boolean', control: 'select' }),
      false
    );
    // Type wins over control: the boolean branch is checked first.
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders a slider for a number', () => {
    renderControl(
      prop({ name: 'count', type: 'number', default: '5', control: 'slider' }),
      5
    );
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('renders a listbox trigger for an explicit select', () => {
    renderControl(
      prop({
        name: 'variant',
        type: '"a" | "b"',
        default: '"a"',
        control: 'select',
        options: ['a', 'b'],
      }),
      'a'
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders an editor for an object-array', () => {
    renderControl(
      prop({
        name: 'items',
        type: 'MenuItem[]',
        default: '[]',
        control: 'object-array',
      }),
      []
    );
    expect(
      screen.getByText('No items yet. Add one to configure the menu.')
    ).toBeInTheDocument();
  });

  it('falls back to a text input for a plain string', () => {
    renderControl(prop(), 'Click me');
    expect(screen.getByDisplayValue('Click me')).toBeInTheDocument();
  });
});
