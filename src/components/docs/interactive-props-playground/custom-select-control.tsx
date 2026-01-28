"use client";

import * as React from "react";
import { Field } from "@base-ui/react/field";
import { Select } from "@base-ui/react/select";
import { ControlProps } from "./types";
import { Check, ChevronDown, Pen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * A control that allows selecting from predefined options OR entering a custom value.
 * Uses Base UI Select for the dropdown and a custom input mode.
 */
export function CustomSelectControl({ prop, value, onChange }: ControlProps) {
  const [isCustomMode, setIsCustomMode] = React.useState(false);
  
  // Parse options: either from prop.options or parsed from type string if it's a union
  const options = React.useMemo(() => {
    if (prop.options) {
      if (Array.isArray(prop.options)) return prop.options.map(String);
    }
    // Fallback: try to parse from type string if it looks like "a" | "b"
    if (prop.type.includes("|")) {
      return prop.type
        .split("|")
        .map((s) => s.trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "")) // Remove quotes
        .filter(Boolean);
    }
    return [];
  }, [prop.options, prop.type]);

  const currentValue = String(value);
  const isValueInOptions = options.includes(currentValue);

  // If the current value is not in options, we might be in custom mode, 
  // or it just happens to be a custom value.
  // We'll auto-switch to custom mode if the value isn't in options, 
  // unless options are empty (then everything is custom).
  // But for better UX, we keep explicit toggle.
  
  const handleSelectChange = (val: string) => {
    if (val === "__custom__") {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
      onChange(prop.name, val);
    }
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(prop.name, e.target.value);
  };

  // Wrapper to make it look consistent
  return (
    <Field.Root className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between">
        <Field.Label className="text-sm font-medium text-foreground">
          {prop.name}
        </Field.Label>
        <button
          onClick={() => setIsCustomMode(!isCustomMode)}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 flex items-center gap-1"
        >
          {isCustomMode ? "Select preset" : "Custom input"}
          <Pen className="size-3" />
        </button>
      </div>

      {isCustomMode ? (
        <Input
          value={currentValue}
          onChange={handleCustomChange}
          placeholder={`Enter custom ${prop.name}...`}
          className="h-10"
        />
      ) : (
        <Select.Root
          value={isValueInOptions ? currentValue : "__custom__"}
          onValueChange={(val) => val && handleSelectChange(val)}
        >
          <Select.Trigger className="flex min-h-10 h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-placeholder:text-muted-foreground">
            <Select.Value placeholder="Select an option">
              {isValueInOptions ? currentValue : <span className="text-muted-foreground italic">Custom value ({currentValue})</span>}
            </Select.Value>
            <Select.Icon className="flex items-center text-muted-foreground">
              <ChevronDown className="size-4 opacity-50" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner className="z-50" sideOffset={8}>
              <Select.Popup className="relative z-50 max-h-96 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
                <Select.List className="p-1">
                  {options.map((opt) => (
                    <Select.Item
                      key={opt}
                      value={opt}
                      className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50"
                    >
                      <Select.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Check className="h-4 w-4" />
                      </Select.ItemIndicator>
                      <Select.ItemText>{opt}</Select.ItemText>
                    </Select.Item>
                  ))}
                  <Select.Separator className="-mx-1 my-1 h-px bg-muted" />
                  <Select.Item
                    value="__custom__"
                    className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground font-medium text-muted-foreground italic"
                  >
                     <Select.ItemIndicator className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                        <Pen className="h-3 w-3" />
                      </Select.ItemIndicator>
                    <Select.ItemText>Enter custom value...</Select.ItemText>
                  </Select.Item>
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      )}
    </Field.Root>
  );
}
