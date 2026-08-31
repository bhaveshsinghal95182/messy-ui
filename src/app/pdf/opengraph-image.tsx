import { ImageResponse } from 'next/og';
import { pdfCard, size, contentType, alt } from './og-card';

export { size, contentType, alt };

export default function OpengraphImage() {
  return new ImageResponse(
    pdfCard({
      eyebrow: 'PDF toolkit',
      heading: 'Edit and sign PDFs',
      description:
        'A complete PDF editor that runs entirely in your browser. Nothing is uploaded.',
    }),
    size
  );
}
