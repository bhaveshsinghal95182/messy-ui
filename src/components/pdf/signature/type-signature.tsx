'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface TypeSignatureProps {
  onChange: (canvas: HTMLCanvasElement | null) => void;
}

/**
 * Script faces for typed signatures.
 *
 * Deliberately CSS generic families and widely-installed faces rather than
 * webfonts: the whole page must keep working offline, and fetching a font from
 * a CDN to render a signature would quietly break the promise that nothing
 * leaves the device. The fallbacks degrade to italic serif, which still reads
 * as a signature.
 */
const FACES = [
  {
    id: 'cursive',
    label: 'Script',
    stack: "'Segoe Script', 'Brush Script MT', cursive",
  },
  {
    id: 'serif',
    label: 'Formal',
    stack: "'Palatino Linotype', Palatino, Georgia, serif",
  },
  {
    id: 'italic',
    label: 'Slanted',
    stack: "'Georgia', 'Times New Roman', serif",
  },
  { id: 'mono', label: 'Plain', stack: "'Courier New', Courier, monospace" },
];

const TypeSignature = ({ onChange }: TypeSignatureProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [text, setText] = useState('');
  const [face, setFace] = useState(FACES[0]);

  /**
   * Renders the typed name to a transparent canvas at a fixed high resolution,
   * so the placed signature stays sharp however large it is scaled in the PDF.
   */
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const height = 160;
    const fontSize = 96;
    context.font = `italic ${fontSize}px ${face.stack}`;
    const width = Math.max(
      200,
      Math.ceil(context.measureText(text).width) + 40
    );

    canvas.width = width;
    canvas.height = height;

    // Re-set after resizing: changing width resets the whole context state.
    context.clearRect(0, 0, width, height);
    context.font = `italic ${fontSize}px ${face.stack}`;
    context.fillStyle = '#111111';
    context.textBaseline = 'middle';
    context.fillText(text, 20, height / 2);

    onChange(text.trim() ? canvas : null);
  }, [face, onChange, text]);

  useEffect(render, [render]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="typed-signature">Your name</Label>
        <Input
          id="typed-signature"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type your name"
          autoComplete="name"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">Style</span>
        <div className="grid grid-cols-2 gap-2">
          {FACES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFace(option)}
              aria-pressed={face.id === option.id}
              className={cn(
                'rounded-md border px-3 py-3 text-xl italic',
                face.id === option.id
                  ? 'border-primary ring-primary ring-1'
                  : 'hover:bg-accent/50'
              )}
              style={{ fontFamily: option.stack }}
            >
              {text.trim() || option.label}
            </button>
          ))}
        </div>
      </div>

      {/* The canvas is the actual source of the placed image; it is kept out of
          view because the styled buttons above are the real preview. */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  );
};

export default TypeSignature;
