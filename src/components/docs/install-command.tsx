"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsIndicator, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CommandBlock from "./command-block";
import { cn } from "@/lib/utils";

interface InstallCommandProps {
  packageName: string;
  className?: string;
}

const packageManagers = [
  { id: "npm", label: "npm", command: (pkg: string) => `npm install ${pkg}` },
  { id: "pnpm", label: "pnpm", command: (pkg: string) => `pnpm add ${pkg}` },
  { id: "yarn", label: "yarn", command: (pkg: string) => `yarn add ${pkg}` },
  { id: "bun", label: "bun", command: (pkg: string) => `bun add ${pkg}` },
];

const InstallCommand = ({ packageName, className }: InstallCommandProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (command: string, id: string) => {
    await navigator.clipboard.writeText(command);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className={cn("rounded-lg border border-border overflow-hidden", className)}>
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
          const command = pm.command(packageName);
          return (
            <TabsContent key={pm.id} value={pm.id} className="m-0">
              <div className="px-4 py-3 bg-card">
                <CommandBlock
                  command={command}
                  onCopy={() => handleCopy(command, pm.id)}
                  copied={copied === pm.id}
                />
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default InstallCommand;
