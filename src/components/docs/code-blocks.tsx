'use client';

import { useState, useSyncExternalStore } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { useTheme } from 'next-themes';
import { gruvboxDark, gruvboxLight } from '@/lib/gruvbox-theme';
import { Check, Copy, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';

// Client-side only check using useSyncExternalStore
const emptySubscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

interface CodeBlockProps {
  code: string;
  language?: 'tsx' | 'jsx' | 'js' | 'ts' | 'html' | 'css' | 'json' | 'bash';
  showLineNumbers?: boolean;
  className?: string;
  collapsible?: boolean;
  maxHeight?: string;
}

const CodeBlock = ({
  code,
  language = 'tsx',
  showLineNumbers = true,
  className,
  collapsible = false,
  maxHeight = '400px',
}: CodeBlockProps) => {
  const { copy, isCopied } = useCopyToClipboard();
  const [isExpanded, setIsExpanded] = useState(true);
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
    <div className={cn('relative overflow-hidden rounded-xl', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground uppercase">
            {language}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {collapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 text-xs"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void copy(code)}
            // Icon-only, so it needs an explicit name for screen readers.
            aria-label={isCopied() ? 'Code copied' : 'Copy code'}
            className="h-7 px-2"
          >
            {isCopied() ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Code */}
      <div
        className={cn(
          'overflow-auto transition-all duration-300',
          !isExpanded && 'max-h-0'
        )}
        style={{ maxHeight: isExpanded ? maxHeight : 0 }}
      >
        <SyntaxHighlighter
          // Forwarded onto the <pre>. It scrolls horizontally on narrow
          // screens, so it has to be focusable and named or a keyboard user
          // cannot reach the end of a long line.
          tabIndex={0}
          role="region"
          aria-label={`${language} code`}
          language={language === 'tsx' ? 'typescript' : language}
          style={theme as Record<string, React.CSSProperties>}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            background: 'var(--code-background)',
            fontSize: '13px',
          }}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: 'var(--code-line-number)',
            userSelect: 'none',
          }}
        >
          {code.trim()}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;
