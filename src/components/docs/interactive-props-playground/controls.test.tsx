import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import type { PropDefinition } from '@/config/types';
import {
  BooleanControl,
  EnumControl,
  NumberControl,
  ObjectArrayControl,
  SelectControl,
  StringControl,
} from './controls';
import { CustomSelectControl } from './custom-select-control';

const prop = (over: Partial<PropDefinition> = {}): PropDefinition => ({
  name: 'label',
  type: 'string',
  default: '"Click me"',
  description: '',
  ...over,
});

describe('BooleanControl', () => {
  it('reflects and toggles the value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const definition = prop({ name: 'disabled', type: 'boolean' });

    render(
      <BooleanControl prop={definition} value={false} onChange={onChange} />
    );

    const toggle = screen.getByRole('switch');
    expect(toggle).not.toBeChecked();

    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith('disabled', true);
  });

  it('is labelled by its prop name', () => {
    render(
      <BooleanControl
        prop={prop({ name: 'disabled', type: 'boolean' })}
        value
        onChange={vi.fn()}
      />
    );
    expect(screen.getByRole('switch')).toBeChecked();
    expect(screen.getByText('disabled')).toBeInTheDocument();
  });
});

describe('NumberControl', () => {
  const numeric = prop({ name: 'count', type: 'number', default: '5' });

  it('renders a number input by default and reports edits', () => {
    const onChange = vi.fn();
    render(<NumberControl prop={numeric} value={5} onChange={onChange} />);

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '12' } });
    expect(onChange).toHaveBeenCalledWith('count', 12);
  });

  it('coerces an unparseable entry to 0 rather than NaN', () => {
    const onChange = vi.fn();
    render(<NumberControl prop={numeric} value={5} onChange={onChange} />);

    fireEvent.change(screen.getByRole('spinbutton'), {
      target: { value: 'abc' },
    });
    expect(onChange).toHaveBeenCalledWith('count', 0);
  });

  it('renders a slider when asked, with the declared bounds', () => {
    render(
      <NumberControl
        prop={prop({
          name: 'count',
          type: 'number',
          default: '5',
          control: 'slider',
          min: 1,
          max: 10,
          step: 0.5,
        })}
        value={5}
        onChange={vi.fn()}
      />
    );

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '1');
    expect(slider).toHaveAttribute('aria-valuemax', '10');
    expect(slider).toHaveAttribute('aria-valuenow', '5');
  });

  it('falls back to sane slider bounds when none are declared', () => {
    render(
      <NumberControl
        prop={prop({ name: 'count', type: 'number', control: 'slider' })}
        value={5}
        onChange={vi.fn()}
      />
    );
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
  });

  it('shows the current value alongside the label', () => {
    render(<NumberControl prop={numeric} value={42} onChange={vi.fn()} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('parses a stringified number it is handed', () => {
    render(
      <NumberControl
        prop={numeric}
        value={'7' as unknown as number}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText('7')).toBeInTheDocument();
  });
});

describe('StringControl', () => {
  it('reports each edit', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StringControl prop={prop()} value="hi" onChange={onChange} />);

    await user.type(screen.getByDisplayValue('hi'), '!');
    expect(onChange).toHaveBeenLastCalledWith('label', 'hi!');
  });

  it('associates its label with the input', () => {
    render(<StringControl prop={prop()} value="hi" onChange={vi.fn()} />);
    expect(screen.getByLabelText('label')).toHaveValue('hi');
  });
});

describe('EnumControl', () => {
  const union = prop({
    name: 'variant',
    type: '"sm" | "md" | "lg"',
    default: '"md"',
  });

  it('derives its options from the union type', async () => {
    const user = userEvent.setup();
    render(<EnumControl prop={union} value="md" onChange={vi.fn()} />);

    await user.click(screen.getByRole('combobox'));
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'sm',
      'md',
      'lg',
    ]);
  });

  it('reports the chosen option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<EnumControl prop={union} value="md" onChange={onChange} />);

    await user.click(screen.getByRole('combobox'));
    await user.click(await screen.findByRole('option', { name: 'lg' }));

    expect(onChange).toHaveBeenCalledWith('variant', 'lg');
  });
});

describe('SelectControl', () => {
  const withOptions = prop({
    name: 'position',
    type: 'string',
    default: '"top"',
    control: 'select',
    options: ['top', 'bottom'],
  });

  it('uses the declared options rather than parsing the type', async () => {
    const user = userEvent.setup();
    render(<SelectControl prop={withOptions} value="top" onChange={vi.fn()} />);

    await user.click(screen.getByRole('combobox'));
    const options = await screen.findAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['top', 'bottom']);
  });

  it('renders an empty list when options are missing', async () => {
    const user = userEvent.setup();
    render(
      <SelectControl
        prop={prop({ name: 'position', control: 'select' })}
        value="top"
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('combobox'));
    // Wait for the popup itself, so an empty result means "no options" rather
    // than "the listbox has not opened yet".
    await screen.findByRole('listbox');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });
});

describe('CustomSelectControl', () => {
  const definition = prop({
    name: 'color',
    type: 'string',
    default: '"#eec847"',
    control: 'select-custom',
    options: ['#eec847', '#3b82f6'],
  });

  it('offers the declared options plus a custom escape hatch', async () => {
    const user = userEvent.setup();
    render(
      <CustomSelectControl
        prop={definition}
        value="#eec847"
        onChange={vi.fn()}
      />
    );

    await user.click(screen.getByRole('combobox'));
    // The listbox is portalled and opens on a transition, so it may not be in
    // the DOM on the tick the click resolves - find, do not get.
    const options = (await screen.findAllByRole('option')).map(
      (o) => o.textContent
    );
    expect(options).toContain('#eec847');
    expect(options.length).toBeGreaterThan(definition.options!.length);
  });
});

describe('ObjectArrayControl', () => {
  const definition = prop({
    name: 'menuItems',
    type: 'MenuItem[]',
    default: '[]',
    control: 'object-array',
  });

  const items = [{ title: 'Home', href: '/' }];

  it('explains itself when empty', () => {
    render(
      <ObjectArrayControl prop={definition} value={[]} onChange={vi.fn()} />
    );
    expect(
      screen.getByText('No items yet. Add one to configure the menu.')
    ).toBeInTheDocument();
  });

  it('renders a title and href field per item', () => {
    render(
      <ObjectArrayControl prop={definition} value={items} onChange={vi.fn()} />
    );
    expect(screen.getByDisplayValue('Home')).toBeInTheDocument();
    expect(screen.getByDisplayValue('/')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('appends a new item with sane defaults', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ObjectArrayControl prop={definition} value={items} onChange={onChange} />
    );

    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(onChange).toHaveBeenCalledWith('menuItems', [
      ...items,
      { title: 'New item', href: '/' },
    ]);
  });

  it('removes the item its button belongs to', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const two = [...items, { title: 'Work', href: '/work' }];

    render(
      <ObjectArrayControl prop={definition} value={two} onChange={onChange} />
    );

    await user.click(screen.getByRole('button', { name: 'Remove item 1' }));
    expect(onChange).toHaveBeenCalledWith('menuItems', [two[1]]);
  });

  it('edits one field without disturbing the others', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ObjectArrayControl prop={definition} value={items} onChange={onChange} />
    );

    await user.type(screen.getByDisplayValue('Home'), '!');
    expect(onChange).toHaveBeenLastCalledWith('menuItems', [
      { title: 'Home!', href: '/' },
    ]);
  });

  it('treats a non-array value as empty rather than crashing', () => {
    expect(() =>
      render(
        <ObjectArrayControl
          prop={definition}
          value={'not an array'}
          onChange={vi.fn()}
        />
      )
    ).not.toThrow();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ObjectArrayControl prop={definition} value={items} onChange={vi.fn()} />
    );
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
