import { ImageResponse } from 'next/og';
import { pdfCard, size, contentType, alt } from '../og-card';
import { curatedPdfTools, resolvePdfTool } from '@/config/pdf';

export { size, contentType, alt };

export async function generateStaticParams() {
  return curatedPdfTools.map((tool) => ({ tool: tool.slug }));
}

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ tool: string }>;
}) {
  const { tool: slug } = await params;
  const tool = resolvePdfTool(slug);

  return new ImageResponse(
    pdfCard({
      eyebrow: 'PDF toolkit',
      heading: tool?.heading ?? 'Edit and sign PDFs',
      description:
        tool?.description ??
        'A complete PDF editor that runs entirely in your browser.',
    }),
    size
  );
}
