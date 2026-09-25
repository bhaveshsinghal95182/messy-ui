'use client';

import { useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InteractivePropsPlaygroundProps } from './types';
import { parseDefaultValue, generateUsageCode } from './utils';
import { PropControl } from './controls';
import RichTextLinks from '../rich-text-links';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

export default function InteractivePropsPlayground({
  props,
  onPropsChange,
  currentProps,
  componentName,
}: InteractivePropsPlaygroundProps) {
  const { copy, isCopied } = useCopyToClipboard();

  const handleChange = useCallback(
    (name: string, value: unknown) => {
      onPropsChange({ ...currentProps, [name]: value });
    },
    [currentProps, onPropsChange]
  );

  const handleCopyCode = useCallback(() => {
    void copy(generateUsageCode(componentName, currentProps, props));
  }, [copy, componentName, currentProps, props]);

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
    <div className="space-y-4 p-4 bg-muted/30">
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
          {isCopied() ? (
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
      <div
        className={`flex flex-row flex-wrap justify-between w-full h-full p-4 gap-4`}
      >
        {configurableProps.map((prop) => {
          const value =
            currentProps[prop.name] ??
            parseDefaultValue(prop.default, prop.type);
          const isObjectArray = prop.control === 'object-array';
          return (
            <div
              key={prop.name}
              className={`space-y-1 ${isObjectArray ? 'w-full' : 'w-[calc(50%-0.5rem)] min-w-45'}`}
            >
              <PropControl prop={prop} value={value} onChange={handleChange} />
              <p className="text-xs text-muted-foreground">
                <RichTextLinks>{prop.description}</RichTextLinks>
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
