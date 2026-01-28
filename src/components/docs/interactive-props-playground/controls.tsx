"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { ControlProps } from "./types";
import { parseEnumOptions } from "./utils";
import { CustomSelectControl } from "./custom-select-control";

export function BooleanControl({ prop, value, onChange }: ControlProps) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={prop.name} className="text-sm font-medium">
        {prop.name}
      </Label>
      <Switch
        id={prop.name}
        checked={value as boolean}
        onCheckedChange={(checked) => onChange(prop.name, checked)}
      />
    </div>
  );
}

export function NumberControl({ prop, value, onChange }: ControlProps) {
  const numValue = typeof value === "number" ? value : parseFloat(String(value)) || 0;
  const useSlider = prop.control === "slider";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={prop.name} className="text-sm font-medium">
          {prop.name}
        </Label>
        <span className="text-sm text-muted-foreground">{numValue}</span>
      </div>
      {useSlider ? (
        <Slider
          id={prop.name}
          value={[numValue]}
          onValueChange={([val]) => onChange(prop.name, val)}
          min={prop.min ?? 0}
          max={prop.max ?? 100}
          step={prop.step ?? 1}
          className="w-full"
        />
      ) : (
        <Input
          id={prop.name}
          type="number"
          value={numValue}
          onChange={(e) => onChange(prop.name, parseFloat(e.target.value) || 0)}
          className="h-8"
        />
      )}
    </div>
  );
}

export function EnumControl({ prop, value, onChange }: ControlProps) {
  const options = parseEnumOptions(prop.type);

  return (
    <div className="space-y-2">
      <Label htmlFor={prop.name} className="text-sm font-medium">
        {prop.name}
      </Label>
      <Select
        value={String(value)}
        onValueChange={(val) => onChange(prop.name, val)}
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

export function StringControl({ prop, value, onChange }: ControlProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={prop.name} className="text-sm font-medium">
        {prop.name}
      </Label>
      <Input
        id={prop.name}
        value={String(value)}
        onChange={(e) => onChange(prop.name, e.target.value)}
        className="h-8"
      />
    </div>
  );
}

export function SelectControl({ prop, value, onChange }: ControlProps) {
  const options = prop.options?.map(String) || [];

  return (
    <div className="space-y-2">
      <Label htmlFor={prop.name} className="text-sm font-medium">
        {prop.name}
      </Label>
      <Select
        value={String(value)}
        onValueChange={(val) => onChange(prop.name, val)}
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

export function PropControl({ prop, value, onChange }: ControlProps) {
  if (prop.type === "boolean") {
    return <BooleanControl prop={prop} value={value} onChange={onChange} />;
  }
  if (prop.type === "number") {
    return <NumberControl prop={prop} value={value} onChange={onChange} />;
  }
  if (prop.control === "select") {
    return <SelectControl prop={prop} value={value} onChange={onChange} />;
  }
  if (prop.control === "select-custom") {
    return <CustomSelectControl prop={prop} value={value} onChange={onChange} />;
  }
  if (prop.type.includes("|") && prop.type.includes('"')) {
    return <EnumControl prop={prop} value={value} onChange={onChange} />;
  }
  return <StringControl prop={prop} value={value} onChange={onChange} />;
}
