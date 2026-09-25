'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { usePdf, usePdfDispatch, usePdfState } from '../pdf-store-provider';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { readFormFields, type FormField } from '@/lib/pdf/ops/forms';

/**
 * Fills an AcroForm.
 *
 * Fields are read from the *source* document rather than tracked in editor
 * state, because they are a property of the file rather than of the edit —
 * reading them once per open keeps the two from drifting apart.
 */
const FormPanel = () => {
  const dispatch = usePdfDispatch();
  const getState = usePdfState();

  const sources = usePdf((state) => state.sources);
  const values = usePdf((state) => state.forms);
  const flatten = usePdf((state) => state.exportSettings.flattenForms);

  const [fields, setFields] = useState<FormField[] | null>(null);

  // Keyed on the set of open sources, so this re-reads when a file is added.
  const sourceKey = Object.keys(sources).join(',');

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const state = getState();
      const found: FormField[] = [];
      for (const source of Object.values(state.sources)) {
        found.push(
          ...(await readFormFields(source.bytes, source.password ?? undefined))
        );
      }
      if (!cancelled) setFields(found);
    })();

    return () => {
      cancelled = true;
    };
  }, [getState, sourceKey]);

  const setValue = useCallback(
    (name: string, value: string | boolean | string[]) =>
      dispatch({ type: 'SET_FORM_VALUE', field: name, value }),
    [dispatch]
  );

  if (fields === null) {
    return (
      <p className="text-muted-foreground p-4 text-sm">Looking for fields…</p>
    );
  }

  const fillable = fields.filter(
    (field) =>
      !field.readOnly && field.kind !== 'button' && field.kind !== 'signature'
  );

  if (fillable.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        <ClipboardList className="mx-auto mb-2 size-5" />
        <p>This document has no fillable form fields.</p>
        <p className="mt-1 text-xs">
          You can still add text boxes anywhere on the page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <p className="text-muted-foreground text-xs">
        {fillable.length} field{fillable.length === 1 ? '' : 's'} found.
      </p>

      {fillable.map((field) => {
        const id = `form-${field.name}`;
        const current = values[field.name] ?? field.value;

        if (field.kind === 'checkbox') {
          return (
            <div key={field.name} className="flex items-center gap-2">
              <Checkbox
                id={id}
                checked={current === true}
                onCheckedChange={(checked) =>
                  setValue(field.name, checked === true)
                }
              />
              <Label htmlFor={id} className="font-normal">
                {field.name}
              </Label>
            </div>
          );
        }

        if (
          (field.kind === 'dropdown' || field.kind === 'radio') &&
          field.options?.length
        ) {
          return (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={id}>{field.name}</Label>
              <Select
                value={typeof current === 'string' ? current : ''}
                onValueChange={(value) => setValue(field.name, value)}
              >
                <SelectTrigger id={id} size="sm" className="w-full">
                  <SelectValue placeholder="Choose…" />
                </SelectTrigger>
                <SelectContent>
                  {field.options.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        }

        return (
          <div key={field.name} className="space-y-1.5">
            <Label htmlFor={id}>{field.name}</Label>
            <Input
              id={id}
              value={typeof current === 'string' ? current : ''}
              onChange={(event) => setValue(field.name, event.target.value)}
            />
          </div>
        );
      })}

      <div className="flex items-start gap-2 border-t pt-4">
        <Switch
          id="flatten-forms"
          checked={flatten}
          onCheckedChange={(checked) =>
            dispatch({
              type: 'SET_EXPORT_SETTINGS',
              patch: { flattenForms: checked },
            })
          }
        />
        <div>
          <Label htmlFor="flatten-forms" className="font-normal">
            Flatten on download
          </Label>
          <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
            Turns the filled fields into ordinary page content. The values
            become permanent and every reader shows the same thing, but the form
            stops being editable.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FormPanel;
