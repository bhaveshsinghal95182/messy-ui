"use client";

import { useState, useMemo } from "react";
import { Terminal, FileCode } from "lucide-react";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeBlock from "./code-blocks";
import CommandBlock from "./command-block";
import { ComponentConfig, ComponentFile } from "@/config/types";
import { cn } from "@/lib/utils";

interface InstallationSectionProps {
  component: ComponentConfig;
  className?: string;
}

const packageManagers = [
  { id: "npm", label: "npm", command: (pkgs: string[]) => `npm install ${pkgs.join(" ")}` },
  { id: "pnpm", label: "pnpm", command: (pkgs: string[]) => `pnpm add ${pkgs.join(" ")}` },
  { id: "yarn", label: "yarn", command: (pkgs: string[]) => `yarn add ${pkgs.join(" ")}` },
  { id: "bun", label: "bun", command: (pkgs: string[]) => `bun add ${pkgs.join(" ")}` },
];

const cliRunners = [
  { id: "npx", label: "npx" },
  { id: "pnpm", label: "pnpm" },
  { id: "bun", label: "bun" },
];

// Note styling based on type
const InstallationSection = ({ component, className }: InstallationSectionProps) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [language, setLanguage] = useState<"ts" | "js">("ts");

  // Parse component code - can be string or ComponentFile[] (ComponentFileRef[] is resolved server-side)
  const files = useMemo((): ComponentFile[] => {
    if (typeof component.componentCode === "string") {
      // Legacy single string format
      return [{
        filename: `${component.slug}.tsx`,
        targetPath: `components/ui/${component.slug}.tsx`,
        code: component.componentCode,
      }];
    }
    // ComponentFileRef[] should be resolved to ComponentFile[] by server component
    // Check if it's already resolved (has 'code' property)
    if (component.componentCode.length > 0 && 'code' in component.componentCode[0]) {
      return component.componentCode as ComponentFile[];
    }
    // Fallback: ComponentFileRef[] not resolved (shouldn't happen in production)
    return [];
  }, [component.componentCode, component.slug]);

  // Check if any file has JS version
  const hasJsVersion = useMemo(() => {
    return files.some(f => f.jsCode);
  }, [files]);

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Calculate step numbers dynamically based on what's present
  const hasCLIDeps = component.cliDependencies && component.cliDependencies.length > 0;
  const hasNpmDeps = component.dependencies && component.dependencies.length > 0;
  const hasSnippets = component.snippets && component.snippets.length > 0;
  
  let stepNumber = 0;

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
          <TabsIndicator />
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
                  {cliRunners.map((runner) => (
                    <TabsTrigger
                      key={runner.id}
                      value={runner.id}
                      className="text-xs data-[state=active]:bg-background"
                    >
                      {runner.label}
                    </TabsTrigger>
                  ))}
                  <TabsIndicator />
                </TabsList>
              </div>
              {cliRunners.map((runner) => {
                const command = runner.id === "npx" 
                  ? `npx shadcn@latest add ${component.registryUrl}`
                  : runner.id === "pnpm"
                  ? `pnpm dlx shadcn@latest add ${component.registryUrl}`
                  : `bunx shadcn@latest add ${component.registryUrl}`;
                return (
                  <TabsContent key={runner.id} value={runner.id} className="m-0">
                    <div className="px-4 py-3 bg-card">
                      <CommandBlock
                        command={command}
                        onCopy={() => handleCopy(command, `cli-${runner.id}`)}
                        copied={copiedId === `cli-${runner.id}`}
                      />
                    </div>
                  </TabsContent>
                );
              })}
            </Tabs>
          </div>
        </TabsContent>

        {/* Manual Installation Tab */}
        <TabsContent value="manual" className="mt-4 space-y-6">
          {/* Step: CLI Dependencies (if any) */}
          {hasCLIDeps && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {++stepNumber}
                </span>
                <h4 className="font-medium text-foreground">Install required components</h4>
              </div>
              <div className="space-y-3">
                {component.cliDependencies!.map((dep, depIndex) => (
                  <div key={depIndex} className="space-y-2">
                    <p className="text-sm text-muted-foreground pl-8">{dep.label}</p>
                    <div className="rounded-lg border border-border overflow-hidden">
                      <Tabs defaultValue="npx" className="w-full">
                        <div className="bg-muted/50 border-b border-border px-2">
                          <TabsList className="h-10 bg-transparent">
                            {cliRunners.map((runner) => (
                              <TabsTrigger
                                key={runner.id}
                                value={runner.id}
                                className="text-xs data-[state=active]:bg-background"
                              >
                                {runner.label}
                              </TabsTrigger>
                            ))}
                            <TabsIndicator />
                          </TabsList>
                        </div>
                        {cliRunners.map((runner) => {
                          const command = dep.commands[runner.id as keyof typeof dep.commands];
                          return (
                            <TabsContent key={runner.id} value={runner.id} className="m-0">
                              <div className="px-4 py-3 bg-card">
                                <CommandBlock
                                  command={command}
                                  onCopy={() => handleCopy(command, `dep-${depIndex}-${runner.id}`)}
                                  copied={copiedId === `dep-${depIndex}-${runner.id}`}
                                />
                              </div>
                            </TabsContent>
                          );
                        })}
                      </Tabs>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step: Install NPM Dependencies */}
          {hasNpmDeps && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {++stepNumber}
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
                      <TabsIndicator />
                    </TabsList>
                  </div>
                  {packageManagers.map((pm) => {
                    const command = pm.command(component.dependencies);
                    return (
                      <TabsContent key={pm.id} value={pm.id} className="m-0">
                        <div className="px-4 py-3 bg-card">
                          <CommandBlock
                            command={command}
                            onCopy={() => handleCopy(command, `npm-${pm.id}`)}
                            copied={copiedId === `npm-${pm.id}`}
                          />
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </div>
            </div>
          )}

          {/* Step: Copy Component Files */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {++stepNumber}
                </span>
                <h4 className="font-medium text-foreground">Copy component code</h4>
              </div>
              
              {/* Language Toggle */}
              {hasJsVersion && (
                <div className="flex items-center border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setLanguage("ts")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors",
                      language === "ts" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setLanguage("js")}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium transition-colors",
                      language === "js" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    JavaScript
                  </button>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Copy and paste the following code into your project:
            </p>

            {/* Single file or Multiple files with tabs */}
            {files.length === 1 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-mono pl-1">
                  {files[0].targetPath}
                </p>
                <CodeBlock
                  code={language === "js" && files[0].jsCode ? files[0].jsCode : files[0].code}
                  language={language === "js" ? "jsx" : "tsx"}
                  collapsible={files[0].code.split("\n").length > 30}
                  maxHeight="500px"
                />
              </div>
            ) : (
              <Tabs defaultValue={files[0].filename} className="w-full">
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/50 border-b border-border px-2">
                    <TabsList className="h-10 bg-transparent">
                      {files.map((file) => (
                        <TabsTrigger
                          key={file.filename}
                          value={file.filename}
                          className="text-xs data-[state=active]:bg-background font-mono"
                        >
                          {file.filename}
                        </TabsTrigger>
                      ))}
                      <TabsIndicator />
                    </TabsList>
                  </div>
                  {files.map((file) => {
                    const code = language === "js" && file.jsCode ? file.jsCode : file.code;
                    return (
                      <TabsContent key={file.filename} value={file.filename} className="m-0">
                        <div className="p-1">
                          <p className="text-xs text-muted-foreground font-mono px-3 py-2">
                            {file.targetPath}
                          </p>
                          <CodeBlock
                            code={code}
                            language={language === "js" ? "jsx" : "tsx"}
                            collapsible={code.split("\n").length > 30}
                            maxHeight="500px"
                          />
                        </div>
                      </TabsContent>
                    );
                  })}
                </div>
              </Tabs>
            )}
          </div>

          {/* Step: Additional Code Snippets (CSS, config, etc.) */}
          {hasSnippets && component.snippets!.map((snippet, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                  {++stepNumber}
                </span>
                <h4 className="font-medium text-foreground">{snippet.label}</h4>
              </div>
              <CodeBlock
                code={snippet.code}
                language={snippet.language}
                collapsible={snippet.code.split("\n").length > 15}
                maxHeight="300px"
              />
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default InstallationSection;

