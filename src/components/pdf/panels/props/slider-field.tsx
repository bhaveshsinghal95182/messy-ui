'use client';

import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Rendered beside the label, e.g. "12 pt" or "80%". */
  format?: (value: number) => string;
  mixed?: boolean;
  onChange: (value: number) => void;
  /** Fired once when the drag ends, so a drag is one undo entry, not fifty. */
  onCommit?: () => void;
}

const SliderField = ({
  label,
  value,
  min,
  max,
  step,
  format,
  mixed = false,
  onChange,
  onCommit,
}: SliderFieldProps) => {
  const id = useId();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-xs font-medium">
          {label}
        </Label>
        <span className="text-muted-foreground font-mono text-xs">
          {mixed ? 'Mixed' : (format?.(value) ?? String(value))}
        </span>
      </div>
      <Slider
        id={id}
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([next]) => {
          if (next !== undefined) onChange(next);
        }}
        onValueCommit={onCommit}
      />
    </div>
  );
};

export default SliderField;
