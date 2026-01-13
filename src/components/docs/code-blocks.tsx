"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { useTheme } from "next-themes";
import { gruvboxDark, gruvboxLight } from "@/lib/gruvbox-theme";
import { Check, Copy, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: "tsx" | "jsx" | "js" | "ts" | "html" | "css" | "json";
  showLineNumbers?: boolean;
  className?: string;
  collapsible?: boolean;
  maxHeight?: string;
}

const CodeBlock = ({
  code,
  language = "tsx",
  showLineNumbers = true,
  className,
  collapsible = false,
  maxHeight = "400px",
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(collapsible);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const theme = isDark ? gruvboxDark : gruvboxLight;

  return (
    <div className={cn("relative rounded-lg overflow-hidden border border-border", className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
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
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2"
          >
            {copied ? (
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
          "overflow-auto transition-all duration-300",
          !isExpanded && "max-h-0"
        )}
        style={{ maxHeight: isExpanded ? maxHeight : 0 }}
      >
        <SyntaxHighlighter
          language={language === "tsx" ? "typescript" : language}
          style={theme as any}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            background: isDark ? "#1d2021" : "#fbf1c7",
            fontSize: "13px",
          }}
          lineNumberStyle={{
            minWidth: "3em",
            paddingRight: "1em",
            color: isDark ? "#665c54" : "#928374",
            userSelect: "none",
          }}
        >
          {code.trim()}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

export default CodeBlock;
