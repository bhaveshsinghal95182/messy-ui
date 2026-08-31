'use client';

import { useId, useState } from 'react';
import { Ban, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { SWATCHES, hexToRgb, rgbToHex, sameColor } from '@/lib/pdf/color';
import type { RGB } from '@/lib/pdf/types';

interface ColorFieldProps {
  label: string;
  value: RGB | null;
  /** Mixed selections show no swatch as active until one is chosen. */
  mixed?: boolean;
  /** Offer a "no colour" choice, for a shape's optional fill or stroke. */
  nullable?: boolean;
  onChange: (value: RGB | null) => void;
}

/**
 * A swatch row plus a hex input.
 *
 * Both, rather than either: swatches are faster and guarantee a legible result,
 * while the hex input is the only way to match a colour the document already
 * uses. Every swatch carries its name as an accessible label, so the control
 * never relies on colour alone to say what it does.
 */
const ColorField = ({
  label,
  value,
  mixed = false,
  nullable = false,
  onChange,
}: ColorFieldProps) => {
  const hexId = useId();

  /**
   * The input is uncontrolled while focused. A controlled value would rewrite
   * the field on every keystroke, so typing "#f00" would be clobbered the
   * moment "#f" parsed as invalid — the classic half-typed-hex bug.
   */
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value ? rgbToHex(value) : '');

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>

      <div className="flex flex-wrap gap-1">
        {nullable && (
          <button
            type="button"
            aria-label="No colour"
            aria-pressed={!mixed && value === null}
            onClick={() => onChange(null)}
            className={cn(
              'text-muted-foreground flex size-6 items-center justify-center rounded border',
              !mixed && value === null && 'ring-primary ring-2 ring-offset-1'
            )}
          >
            <Ban className="size-3" aria-hidden="true" />
          </button>
        )}

        {SWATCHES.map((swatch) => {
          const active = !mixed && sameColor(value, swatch.value);
          return (
            <button
              key={swatch.name}
              type="button"
              aria-label={swatch.name}
              aria-pressed={active}
              onClick={() => {
                setDraft(null);
                onChange(swatch.value);
              }}
              className={cn(
                'flex size-6 items-center justify-center rounded border',
                active && 'ring-primary ring-2 ring-offset-1'
              )}
              style={{ background: rgbToHex(swatch.value) }}
            >
              {active && (
                <Check
                  aria-hidden="true"
                  className={cn(
                    'size-3',
                    // A tick on a pale swatch has to invert or it vanishes.
                    swatch.value.r + swatch.value.g + swatch.value.b > 2
                      ? 'text-black'
                      : 'text-white'
                  )}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Label htmlFor={hexId} className="text-muted-foreground text-xs">
          Hex
        </Label>
        <Input
          id={hexId}
          value={shown}
          placeholder={mixed ? 'Mixed' : '#000000'}
          spellCheck={false}
          className="h-7 font-mono text-xs"
          onChange={(event) => {
            setDraft(event.target.value);
            const parsed = hexToRgb(event.target.value);
            if (parsed) onChange(parsed);
          }}
          onBlur={() => setDraft(null)}
        />
      </div>
    </div>
  );
};

export default ColorField;
