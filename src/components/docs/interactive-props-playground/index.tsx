'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InteractivePropsPlaygroundProps } from './types';
import { parseDefaultValue, generateUsageCode } from './utils';
import { PropControl } from './controls';

export default function InteractivePropsPlayground({
  props,
  onPropsChange,
  currentProps,
  componentName,
}: InteractivePropsPlaygroundProps) {
  const [copied, setCopied] = useState(false);

  const handleChange = useCallback(
    (name: string, value: unknown) => {
      onPropsChange({ ...currentProps, [name]: value });
    },
    [currentProps, onPropsChange]
  );

  const handleCopyCode = useCallback(async () => {
    const code = generateUsageCode(componentName, currentProps, props);
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [componentName, currentProps, props]);

  // Filter out callback props
  const configurableProps = props.filter((p) => !p.type.includes('=>'));

  if (configurableProps.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        This component has no configurable props.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border-t border-border bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          Props Playground
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyCode}
          className="h-7 gap-1.5 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy Code
            </>
          )}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {configurableProps.map((prop) => {
          const value =
            currentProps[prop.name] ??
            parseDefaultValue(prop.default, prop.type);
          return (
            <div key={prop.name} className="space-y-1">
              <PropControl prop={prop} value={value} onChange={handleChange} />
              <p className="text-xs text-muted-foreground">
                {prop.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export * from './types';
export * from './utils';
export * from './controls';
