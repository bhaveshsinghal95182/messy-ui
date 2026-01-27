"use client";

import * as React from "react";
import { Tabs as BaseUITabs } from "@base-ui/react/tabs";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof BaseUITabs.Root>) {
  return (
    <BaseUITabs.Root
      data-slot="tabs"
      className={cn("flex flex-col", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof BaseUITabs.List>) {
  return (
    <BaseUITabs.List
      data-slot="tabs-list"
      className={cn(
        "relative z-0 bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-lg p-[3px]",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof BaseUITabs.Tab>) {
  return (
    <BaseUITabs.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 data-active:text-foreground dark:data-active:text-foreground text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsIndicator({
  className,
  ...props
}: React.ComponentProps<typeof BaseUITabs.Indicator>) {
  return (
    <BaseUITabs.Indicator
      data-slot="tabs-indicator"
      className={cn(
        "absolute left-0 z-0 h-[calc(100%-6px)] w-(--active-tab-width) translate-x-(--active-tab-left) rounded-md bg-background shadow-sm transition-all duration-200 ease-in-out dark:bg-input/30",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof BaseUITabs.Panel>) {
  return (
    <BaseUITabs.Panel
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsIndicator, TabsContent };
