'use client';

import { Suspense, useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Monitor,
  Tablet,
  Smartphone,
  RotateCcw,
  Maximize2,
  SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import DeviceFrame from './device-frame';
import CodeBlock from './code-blocks';
import InteractivePropsPlayground from './interactive-props-playground';
import { ComponentConfig } from '@/config/components';
import { cn } from '@/lib/utils';

type DeviceType = 'desktop' | 'tablet' | 'mobile';

interface ComponentPreviewProps {
  component: ComponentConfig;
  className?: string;
}

const deviceIcons = {
  desktop: Monitor,
  tablet: Tablet,
  mobile: Smartphone,
};

const ComponentPreview = ({ component, className }: ComponentPreviewProps) => {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [previewKey, setPreviewKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPlayground, setShowPlayground] = useState(false);
  const [customProps, setCustomProps] = useState<Record<string, unknown>>({});

  const handleReload = useCallback(() => {
    setPreviewKey((prev) => prev + 1);
  }, []);

  const Component = component.component;

  // Parse default values for initial props
  const defaultProps = useMemo(() => {
    const defaults: Record<string, unknown> = {};
    component.props.forEach((prop) => {
      if (prop.type === 'boolean') {
        defaults[prop.name] = prop.default === 'true';
      } else if (prop.type === 'number') {
        defaults[prop.name] = parseFloat(prop.default) || 0;
      } else if (!prop.type.includes('=>')) {
        defaults[prop.name] = prop.default.replace(/^["']|["']$/g, '');
      }
    });
    return defaults;
  }, [component.props]);

  const mergedProps = { ...defaultProps, ...customProps };

  const hasConfigurableProps =
    component.props.filter((p) => !p.type.includes('=>')).length > 0;

  const PreviewContent = (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12">
          <Skeleton className="w-full h-48" />
        </div>
      }
    >
      <Component key={previewKey} {...mergedProps} />
    </Suspense>
  );

  return (
    <div
      className={cn(
        'rounded-xl border border-border overflow-hidden bg-card',
        className
      )}
    >
      <Tabs defaultValue="preview" className="w-full">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <TabsList className="h-9 bg-transparent p-0">
            <TabsTrigger
              value="preview"
              className="text-sm data-[state=active]:bg-background"
            >
              Preview
            </TabsTrigger>
            <TabsTrigger
              value="code"
              className="text-sm data-[state=active]:bg-background"
            >
              Code
            </TabsTrigger>
            <TabsIndicator />
          </TabsList>

          <div className="flex items-center gap-1">
            {/* Device Switcher */}
            <div className="flex items-center border border-border rounded-lg p-0.5 bg-background mr-2">
              {(Object.keys(deviceIcons) as DeviceType[]).map((d) => {
                const Icon = deviceIcons[d];
                return (
                  <Button
                    key={d}
                    variant="ghost"
                    size="sm"
                    onClick={() => setDevice(d)}
                    className={cn('h-7 w-7 p-0', device === d && 'bg-muted')}
                  >
                    <Icon className="w-4 h-4" />
                  </Button>
                );
              })}
            </div>

            {/* Reload Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReload}
              className="h-8 w-8 p-0"
              title="Reload component"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            {/* Props Playground Toggle */}
            {hasConfigurableProps && (
              <Button
                variant={showPlayground ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setShowPlayground(!showPlayground)}
                className="h-8 w-8 p-0"
                title="Toggle props playground"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </Button>
            )}

            {/* Fullscreen Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-8 w-8 p-0"
              title="Toggle fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Preview Panel */}
        <TabsContent value="preview" className="m-0">
          <motion.div
            className={cn(
              'p-4 bg-[radial-gradient(circle_at_center,hsl(var(--muted))_1px,transparent_1px)] bg-size-[24px_24px]',
              isFullscreen && 'fixed inset-0 z-50 bg-background'
            )}
            layout
          >
            {isFullscreen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreen(false)}
                className="absolute top-4 right-4 z-10"
              >
                Exit Fullscreen
              </Button>
            )}
            {component.sandbox === 'iframe' ? (
              <DeviceFrame device={device}>
                <iframe
                  src={`/preview/${component.slug}?${new URLSearchParams(
                    Object.entries(mergedProps).reduce(
                      (acc, [key, value]) => {
                        if (value !== undefined) acc[key] = String(value);
                        return acc;
                      },
                      {} as Record<string, string>
                    )
                  ).toString()}`}
                  className="w-full h-[600px] border-none bg-background"
                  title={`${component.name} preview`}
                />
              </DeviceFrame>
            ) : (
              <DeviceFrame device={device}>
                <div className="min-h-[200px] flex items-center justify-center">
                  {PreviewContent}
                </div>
              </DeviceFrame>
            )}
          </motion.div>

          {/* Interactive Props Playground */}
          {hasConfigurableProps && (
            <Collapsible open={showPlayground} onOpenChange={setShowPlayground}>
              <CollapsibleContent>
                <InteractivePropsPlayground
                  props={component.props}
                  currentProps={mergedProps}
                  onPropsChange={setCustomProps}
                  componentName={component.name.replace(/\s+/g, '')}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </TabsContent>

        {/* Code Panel - Shows usage example */}
        <TabsContent value="code" className="m-0">
          <CodeBlock
            code={component.usageCode}
            language="tsx"
            collapsible={true}
            maxHeight="400px"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ComponentPreview;
