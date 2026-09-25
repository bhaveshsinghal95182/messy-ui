import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { checkA11y } from '@tests/setup/a11y';
import type { ComponentConfig, PropDefinition } from '@/config/types';
import { decodePreviewProps } from '@/lib/preview-props';
import ComponentPreview from './components-preview';

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));

const Demo = ({ label = 'Demo' }: { label?: string }) => (
  <div data-testid="demo">{label}</div>
);

const props: PropDefinition[] = [
  {
    name: 'label',
    type: 'string',
    default: '"Demo"',
    description: 'The label',
  },
  {
    name: 'onConfirm',
    type: '() => void',
    default: 'undefined',
    description: 'A callback',
  },
];

const config = (over: Partial<ComponentConfig> = {}): ComponentConfig =>
  ({
    slug: 'demo',
    name: 'Demo Component',
    category: 'Buttons',
    description: 'A demo',
    seoTitle: 'Demo',
    seoDescription: 'Demo',
    keywords: [],
    aliases: [],
    sandbox: 'inline',
    registryUrl: 'https://messyui.dev/r/demo.json',
    dependencies: [],
    props,
    component: Demo,
    usageCode: '<Demo />',
    componentCode: 'export const Demo = () => null;',
    ...over,
  }) as unknown as ComponentConfig;

const iframeOf = (container: HTMLElement) =>
  container.querySelector('iframe') as HTMLIFrameElement;

describe('ComponentPreview', () => {
  it('renders the component inline by default', async () => {
    render(<ComponentPreview component={config()} />);
    expect(await screen.findByTestId('demo')).toHaveTextContent('Demo');
  });

  it('switches to the usage code and back', async () => {
    const user = userEvent.setup();
    render(<ComponentPreview component={config()} />);

    await user.click(screen.getByRole('tab', { name: 'Code' }));
    expect(screen.getByText(/Demo/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Preview' }));
    expect(await screen.findByTestId('demo')).toBeInTheDocument();
  });

  it('offers desktop, tablet and mobile', () => {
    render(<ComponentPreview component={config()} />);
    for (const name of ['desktop', 'tablet', 'mobile']) {
      expect(
        screen.getByRole('button', { name: `${name} preview` })
      ).toBeInTheDocument();
    }
  });

  it('narrows the frame when a device is picked', async () => {
    const user = userEvent.setup();
    const { container } = render(<ComponentPreview component={config()} />);

    await user.click(screen.getByRole('button', { name: 'mobile preview' }));

    // The device frame is the only element that carries an inline width.
    const sized = [
      ...container.querySelectorAll<HTMLElement>('[style]'),
    ].filter((el) => el.style.width !== '');
    expect(sized.map((el) => el.style.width)).toContain('375px');
  });

  it('remounts the component when reloaded', async () => {
    const user = userEvent.setup();
    render(<ComponentPreview component={config()} />);

    const before = await screen.findByTestId('demo');
    await user.click(screen.getByRole('button', { name: /reload/i }));
    const after = await screen.findByTestId('demo');

    expect(after).not.toBe(before);
  });

  it('opens the props playground on demand', async () => {
    const user = userEvent.setup();
    render(<ComponentPreview component={config()} />);

    const toggle = screen.getByRole('button', { name: /playground/i });
    expect(screen.queryByText('Props Playground')).not.toBeInTheDocument();

    await user.click(toggle);
    expect(screen.getByText('Props Playground')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /playground/i }));
    expect(screen.queryByText('Props Playground')).not.toBeInTheDocument();
  });

  it('marks the active device as pressed', async () => {
    const user = userEvent.setup();
    render(<ComponentPreview component={config()} />);

    expect(
      screen.getByRole('button', { name: 'desktop preview' })
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'mobile preview' }));
    expect(
      screen.getByRole('button', { name: 'mobile preview' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'desktop preview' })
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('hides the playground toggle when every prop is a callback', () => {
    render(
      <ComponentPreview
        component={config({
          props: [props[1]],
        })}
      />
    );
    expect(
      screen.queryByRole('button', { name: /playground/i })
    ).not.toBeInTheDocument();
  });

  it('toggles fullscreen', async () => {
    const user = userEvent.setup();
    render(<ComponentPreview component={config()} />);

    await user.click(screen.getByRole('button', { name: /fullscreen/i }));
    expect(
      screen.getByRole('button', { name: 'Exit Fullscreen' })
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Exit Fullscreen' }));
    expect(
      screen.queryByRole('button', { name: 'Exit Fullscreen' })
    ).not.toBeInTheDocument();
  });

  it('forwards className', () => {
    const { container } = render(
      <ComponentPreview component={config()} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ComponentPreview component={config()} />);
    await screen.findByTestId('demo');
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});

describe('ComponentPreview - iframe sandbox', () => {
  const iframeConfig = config({ sandbox: 'iframe' });

  it('renders an iframe pointed at the preview route', () => {
    const { container } = render(<ComponentPreview component={iframeConfig} />);
    const src = iframeOf(container).getAttribute('src')!;
    expect(src.startsWith('/preview/demo?')).toBe(true);
  });

  it('titles the iframe for assistive tech', () => {
    const { container } = render(<ComponentPreview component={iframeConfig} />);
    expect(iframeOf(container)).toHaveAttribute(
      'title',
      'Demo Component preview'
    );
  });

  it('encodes the default props so the preview route can decode them', () => {
    const { container } = render(<ComponentPreview component={iframeConfig} />);
    const query = iframeOf(container).getAttribute('src')!.split('?')[1];
    const decoded = decodePreviewProps(
      Object.fromEntries(new URLSearchParams(query).entries())
    );

    expect(decoded.label).toBe('Demo');
    // Callback props have no serialisable value and must not be sent.
    expect(decoded).not.toHaveProperty('onConfirm');
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ComponentPreview component={iframeConfig} />);
    expect(await checkA11y(container)).toHaveNoViolations();
  });
});
