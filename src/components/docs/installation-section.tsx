"use client";

import { useState } from "react";
import { Check, Copy, Terminal, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlock from "./code-blocks";
import { ComponentConfig } from "@/config/components";
import { cn } from "@/lib/utils";

interface InstallationSectionProps {
  component: ComponentConfig;
  className?: string;
}

const packageManagers = [
  { id: "npm", label: "npm", command: (pkg: string) => `npm install ${pkg}` },
  { id: "pnpm", label: "pnpm", command: (pkg: string) => `pnpm add ${pkg}` },
  { id: "yarn", label: "yarn", command: (pkg: string) => `yarn add ${pkg}` },
  { id: "bun", label: "bun", command: (pkg: string) => `bun add ${pkg}` },
];

const cliCommands = [
  { id: "npx", label: "npx", command: (url: string) => `npx shadcn@latest add ${url}` },
  { id: "pnpm", label: "pnpm", command: (url: string) => `pnpm dlx shadcn@latest add ${url}` },
  { id: "bunx", label: "bunx", command: (url: string) => `bunx shadcn@latest add ${url}` },
];

const InstallationSection = ({ component, className }: InstallationSectionProps) => {
  const [copiedCli, setCopiedCli] = useState<string | null>(null);
  const [copiedDep, setCopiedDep] = useState<string | null>(null);

  const handleCopy = async (text: string, type: "cli" | "dep", id: string) => {
    await navigator.clipboard.writeText(text);
    if (type === "cli") {
      setCopiedCli(id);
      setTimeout(() => setCopiedCli(null), 2000);
    } else {
      setCopiedDep(id);
      setTimeout(() => setCopiedDep(null), 2000);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Tabs defaultValue="cli" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
          <TabsTrigger value="cli" className="gap-2">
            <Terminal className="w-4 h-4" />
            CLI
          </TabsTrigger>
          <TabsTrigger value="manual" className="gap-2">
            <FileCode className="w-4 h-4" />
            Manual
          </TabsTrigger>
        </TabsList>

        {/* CLI Installation Tab */}
        <TabsContent value="cli" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Use the shadcn CLI to install this component:
          </p>
          <div className="rounded-lg border border-border overflow-hidden">
            <Tabs defaultValue="npx" className="w-full">
              <div className="bg-muted/50 border-b border-border px-2">
                <TabsList className="h-10 bg-transparent">
                  {cliCommands.map((cmd) => (
                    <TabsTrigger
                      key={cmd.id}
                      value={cmd.id}
                      className="text-xs data-[state=active]:bg-background"
                    >
                      {cmd.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              {cliCommands.map((cmd) => {
                const command = cmd.command(component.registryUrl);
                return (
                  <TabsContent key={cmd.id} value={cmd.id} className="m-0">
                    <div className="flex items-center justify-between px-4 py-3 bg-card">
                      <code className="text-sm font-mono text-foreground break-all">
                        {command}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(command, "cli", cmd.id)}
                        className="h-7 px-2 ml-4 shrink-0"
                      >
                        {copiedCli === cmd.id ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </TabsContent>

        {/* Manual Installation Tab */}
        <TabsContent value="manual" className="mt-4 space-y-6">
          {/* Step 1: Install Dependencies */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                1
              </span>
              <h4 className="font-medium text-foreground">Install dependencies</h4>
            </div>
            <div className="rounded-lg border border-border overflow-hidden">
              <Tabs defaultValue="npm" className="w-full">
                <div className="bg-muted/50 border-b border-border px-2">
                  <TabsList className="h-10 bg-transparent">
                    {packageManagers.map((pm) => (
                      <TabsTrigger
                        key={pm.id}
                        value={pm.id}
                        className="text-xs data-[state=active]:bg-background"
                      >
                        {pm.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
                {packageManagers.map((pm) => {
                  const command = pm.command(component.installCommand);
                  return (
                    <TabsContent key={pm.id} value={pm.id} className="m-0">
                      <div className="flex items-center justify-between px-4 py-3 bg-card">
                        <code className="text-sm font-mono text-foreground">
                          {command}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopy(command, "dep", pm.id)}
                          className="h-7 px-2 ml-4 shrink-0"
                        >
                          {copiedDep === pm.id ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </div>
          </div>

          {/* Step 2: Copy Component Code */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                2
              </span>
              <h4 className="font-medium text-foreground">Copy component code</h4>
            </div>
            <p className="text-sm text-muted-foreground">
              Copy and paste the following code into your project:
            </p>
            <CodeBlock
              code={component.componentCode}
              language="tsx"
              collapsible={component.componentCode.split("\n").length > 30}
              maxHeight="500px"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstallationSection;
