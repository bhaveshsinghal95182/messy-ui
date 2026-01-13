import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { PropDefinition } from "@/config/components";

interface InteractivePropsPlaygroundProps {
  props: PropDefinition[];
  onPropsChange: (props: Record<string, unknown>) => void;
  currentProps: Record<string, unknown>;
}

const InteractivePropsPlayground = ({
  props,
  onPropsChange,
  currentProps,
}: InteractivePropsPlaygroundProps) => {
  const handleChange = useCallback(
    (name: string, value: unknown) => {
      onPropsChange({ ...currentProps, [name]: value });
    },
    [currentProps, onPropsChange]
  );

  const parseDefaultValue = (defaultStr: string, type: string): unknown => {
    if (type === "boolean") return defaultStr === "true";
    if (type === "number") return parseFloat(defaultStr) || 0;
    // Remove quotes for strings
    return defaultStr.replace(/^["']|["']$/g, "");
  };

  const renderControl = (prop: PropDefinition) => {
    const value = currentProps[prop.name] ?? parseDefaultValue(prop.default, prop.type);

    // Boolean
    if (prop.type === "boolean") {
      return (
        <div className="flex items-center justify-between">
          <Label htmlFor={prop.name} className="text-sm font-medium">
            {prop.name}
          </Label>
          <Switch
            id={prop.name}
            checked={value as boolean}
            onCheckedChange={(checked) => handleChange(prop.name, checked)}
          />
        </div>
      );
    }

    // Number
    if (prop.type === "number") {
      const numValue = typeof value === "number" ? value : parseFloat(String(value)) || 0;
      const isSmallRange = numValue <= 10;
      
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={prop.name} className="text-sm font-medium">
              {prop.name}
            </Label>
            <span className="text-sm text-muted-foreground">{numValue}</span>
          </div>
          {isSmallRange ? (
            <Slider
              id={prop.name}
              value={[numValue]}
              onValueChange={([val]) => handleChange(prop.name, val)}
              min={0}
              max={Math.max(10, numValue * 2)}
              step={0.1}
              className="w-full"
            />
          ) : (
            <Input
              id={prop.name}
              type="number"
              value={numValue}
              onChange={(e) => handleChange(prop.name, parseFloat(e.target.value) || 0)}
              className="h-8"
            />
          )}
        </div>
      );
    }

    // Enum/Union types like '"sm" | "md" | "lg"'
    if (prop.type.includes("|") && prop.type.includes('"')) {
      const options = prop.type
        .split("|")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter((s) => s.length > 0);

      return (
        <div className="space-y-2">
          <Label htmlFor={prop.name} className="text-sm font-medium">
            {prop.name}
          </Label>
          <Select
            value={String(value)}
            onValueChange={(val) => handleChange(prop.name, val)}
          >
            <SelectTrigger id={prop.name} className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // String (default)
    return (
      <div className="space-y-2">
        <Label htmlFor={prop.name} className="text-sm font-medium">
          {prop.name}
        </Label>
        <Input
          id={prop.name}
          value={String(value)}
          onChange={(e) => handleChange(prop.name, e.target.value)}
          className="h-8"
        />
      </div>
    );
  };

  if (props.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        This component has no configurable props.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border-t border-border bg-muted/30">
      <h4 className="text-sm font-semibold text-foreground">Props Playground</h4>
      <div className="grid gap-4 sm:grid-cols-2">
        {props
          .filter((p) => !p.type.includes("=>")) // Skip callback props
          .map((prop) => (
            <div key={prop.name} className="space-y-1">
              {renderControl(prop)}
              <p className="text-xs text-muted-foreground">{prop.description}</p>
            </div>
          ))}
      </div>
    </div>
  );
};

export default InteractivePropsPlayground;
