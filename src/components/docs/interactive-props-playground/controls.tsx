'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Trash2, Plus } from 'lucide-react';
import { ControlProps } from './types';
import { parseEnumOptions } from './utils';
import { CustomSelectControl } from './custom-select-control';

export function BooleanControl({ prop, value, onChange }: ControlProps) {
  return (
    <div className="flex items-center justify-between">
      <Label htmlFor={prop.name} className="text-sm font-medium uppercase">
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
  const numValue =
    typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  const useSlider = prop.control === 'slider';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={prop.name} className="text-sm font-medium uppercase">
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
      <Label htmlFor={prop.name} className="text-sm font-medium uppercase">
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
      <Label htmlFor={prop.name} className="text-sm font-medium uppercase">
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
      <Label htmlFor={prop.name} className="text-sm font-medium uppercase">
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

type ArrayObject = Record<string, string>;

export function ObjectArrayControl({ prop, value, onChange }: ControlProps) {
  const items = Array.isArray(value) ? (value as ArrayObject[]) : [];

  const updateItem = (index: number, key: string, nextValue: string) => {
    const nextItems = items.map((item, currentIndex) =>
      currentIndex === index ? { ...item, [key]: nextValue } : item
    );
    onChange(prop.name, nextItems);
  };

  const addItem = () => {
    onChange(prop.name, [...items, { title: 'New item', href: '/' }]);
  };

  const removeItem = (index: number) => {
    onChange(
      prop.name,
      items.filter((_, currentIndex) => currentIndex !== index)
    );
  };

  return (
    <div className="space-y-3 w-full">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium uppercase">{prop.name}</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-3.5 w-3.5" />
          Add item
        </Button>
      </div>
      <div className="flex flex-col w-full h-full ">
        {items.map((item, index) => (
          <div key={index} className="space-y-2 rounded-md border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Item {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeItem(index)}
                // Icon-only, and there is one per row, so the name has to
                // carry which row it removes.
                aria-label={`Remove item ${index + 1}`}
                className="h-7 px-2 text-muted-foreground hover:bg-rose-600!"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="space-y-2">
              {/* htmlFor/id, so each field is actually announced with its
                  label rather than as an unlabelled text box. */}
              <Label
                htmlFor={`${prop.name}-${index}-title`}
                className="text-xs text-muted-foreground"
              >
                Title
              </Label>
              <Input
                id={`${prop.name}-${index}-title`}
                value={item.title}
                onChange={(e) => updateItem(index, 'title', e.target.value)}
                className="h-8"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor={`${prop.name}-${index}-href`}
                className="text-xs text-muted-foreground"
              >
                Href
              </Label>
              <Input
                id={`${prop.name}-${index}-href`}
                value={item.href}
                onChange={(e) => updateItem(index, 'href', e.target.value)}
                className="h-8"
              />
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
            No items yet. Add one to configure the menu.
          </div>
        )}
      </div>
    </div>
  );
}

export function PropControl({ prop, value, onChange }: ControlProps) {
  if (prop.type === 'boolean') {
    return <BooleanControl prop={prop} value={value} onChange={onChange} />;
  }
  if (prop.type === 'number') {
    return <NumberControl prop={prop} value={value} onChange={onChange} />;
  }
  if (prop.control === 'select') {
    return <SelectControl prop={prop} value={value} onChange={onChange} />;
  }
  if (prop.control === 'select-custom') {
    return (
      <CustomSelectControl prop={prop} value={value} onChange={onChange} />
    );
  }
  if (prop.control === 'object-array') {
    return <ObjectArrayControl prop={prop} value={value} onChange={onChange} />;
  }
  if (prop.type.includes('|') && prop.type.includes('"')) {
    return <EnumControl prop={prop} value={value} onChange={onChange} />;
  }
  return <StringControl prop={prop} value={value} onChange={onChange} />;
}
