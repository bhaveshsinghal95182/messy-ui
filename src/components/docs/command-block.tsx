'use client';

import { useSyncExternalStore } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useTheme } from 'next-themes';
import { gruvboxDark, gruvboxLight } from '@/lib/gruvbox-theme';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Client-side only check using useSyncExternalStore
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface CommandBlockProps {
  command: string;
  className?: string;
  onCopy?: () => void;
  copied?: boolean;
}

/**
 * A compact code block for displaying CLI commands with bash syntax highlighting
 */
const CommandBlock = ({
  command,
  className,
  onCopy,
  copied = false,
}: CommandBlockProps) => {
  const { resolvedTheme } = useTheme();

  // Use useSyncExternalStore to safely detect client-side without useEffect
  const isClient = useSyncExternalStore(
    emptySubscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  const isDark = isClient && resolvedTheme === 'dark';
  const theme = isDark ? gruvboxDark : gruvboxLight;

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex-1 overflow-x-auto">
        <SyntaxHighlighter
          language="bash"
          style={theme as Record<string, React.CSSProperties>}
          customStyle={{
            margin: 0,
            padding: 0,
            background: 'transparent',
            fontSize: '13px',
          }}
          codeTagProps={{
            style: {
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
            },
          }}
        >
          {command}
        </SyntaxHighlighter>
      </div>
      {onCopy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="h-7 px-2 ml-4 shrink-0"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
};

export default CommandBlock;
