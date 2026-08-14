import { components, categories } from '@/config/components';
import { absoluteUrl, categoryPath, siteConfig } from '@/lib/seo';
import { plainText } from '@/lib/text';

/**
 * Serves /llms.txt (see llmstxt.org).
 *
 * A growing share of discovery happens through coding agents and LLM search
 * rather than a browser. This gives them a plain-text index of every component
 * with its docs URL and the exact shadcn command to install it, instead of
 * making them parse the animated React pages.
 */
export const dynamic = 'force-static';

export function GET() {
  const lines: string[] = [
    `# ${siteConfig.name}`,
    '',
    `> ${siteConfig.description}`,
    '',
    'Components are installed with the shadcn CLI (`npx shadcn@latest add <url>`)',
    'or by copying the source from the component page. Every component is React +',
    'TypeScript + Tailwind CSS, animated with GSAP or Framer Motion (motion/react).',
    '',
    '## Site',
    '',
    `- [Home](${absoluteUrl('/')}): Overview and featured components`,
    `- [Component gallery](${absoluteUrl('/components')}): All ${components.length} components`,
    `- [Source code](${siteConfig.repository}): GitHub repository`,
    '',
    '## Categories',
    '',
    ...categories.map((category) => {
      const count = components.filter((c) => c.category === category).length;
      return `- [${category}](${absoluteUrl(categoryPath(category))}): ${count} component${count === 1 ? '' : 's'}`;
    }),
    '',
    '## Components',
    '',
  ];

  for (const component of components) {
    lines.push(
      `### ${component.name}`,
      '',
      `- Docs: ${absoluteUrl(`/components/${component.slug}`)}`,
      `- Category: ${component.category}`,
      `- Description: ${plainText(component.description)}`,
      `- Install: npx shadcn@latest add ${component.registryUrl}`,
      `- Registry JSON: ${component.registryUrl}`,
      ...(component.dependencies.length > 0
        ? [`- Dependencies: ${component.dependencies.join(', ')}`]
        : []),
      ...(component.props.length > 0
        ? [
            `- Props: ${component.props
              .map((prop) => `${prop.name} (${prop.type})`)
              .join(', ')}`,
          ]
        : []),
      ...(component.aliases.length > 0
        ? [`- Also known as: ${component.aliases.join(', ')}`]
        : []),
      ''
    );
  }

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=3600, must-revalidate',
    },
  });
}
