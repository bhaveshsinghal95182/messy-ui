/**
 * Reading and filling AcroForm fields.
 *
 * pdf-lib's form API is used rather than pdf.js's annotation layer because the
 * values have to end up in the *exported* document, and pdf-lib is what writes
 * it. The trade-off is that appearances are regenerated rather than reusing
 * the original appearance streams, so a form with unusual styling will look
 * slightly plainer than the original — correct values in a plainer form beats
 * pretty values that do not save.
 */

import type { PDFDocument, PDFField } from '@cantoo/pdf-lib';
import { loadPdfLib } from '../export/build';

type PdfLibModule = typeof import('@cantoo/pdf-lib');
import type { FormFieldValue } from '../types';

export type FormFieldKind =
  | 'text'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'optionlist'
  | 'button'
  | 'signature';

export interface FormField {
  name: string;
  kind: FormFieldKind;
  /** Current value as stored in the document. */
  value: FormFieldValue;
  /** Choices, for radio groups, dropdowns and option lists. */
  options?: string[];
  readOnly: boolean;
  /** 0-based page indices the field's widgets appear on. */
  pages: number[];
}

/**
 * Maps a pdf-lib field to a kind the UI can switch on.
 *
 * `instanceof` against the real classes, not `field.constructor.name`: class
 * names are mangled by the production minifier, so a name-based check works in
 * development and silently classifies every field as text once built.
 */
function classify(field: PDFField, lib: PdfLibModule): FormFieldKind {
  if (field instanceof lib.PDFCheckBox) return 'checkbox';
  if (field instanceof lib.PDFRadioGroup) return 'radio';
  if (field instanceof lib.PDFDropdown) return 'dropdown';
  if (field instanceof lib.PDFOptionList) return 'optionlist';
  if (field instanceof lib.PDFButton) return 'button';
  if (field instanceof lib.PDFSignature) return 'signature';
  return 'text';
}

/**
 * Lists the fillable fields in a document.
 *
 * Returns an empty list rather than throwing when the document has no form,
 * which is the overwhelmingly common case and not an error.
 */
export async function readFormFields(
  bytes: Uint8Array,
  password?: string
): Promise<FormField[]> {
  const lib = await loadPdfLib();
  const { PDFDocument } = lib;

  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, {
      password,
      ignoreEncryption: password === undefined,
    });
  } catch {
    return [];
  }

  let fields;
  try {
    fields = doc.getForm().getFields();
  } catch {
    return [];
  }

  const pageRefs = doc.getPages().map((page) => page.ref);

  return fields.map((field) => {
    const kind = classify(field, lib);
    const name = field.getName();

    // Which pages the field is drawn on, so the UI can jump to it.
    const pages = field.acroField
      .getWidgets()
      .map((widget) => {
        const pageRef = widget.P();
        return pageRefs.findIndex((ref) => ref === pageRef);
      })
      .filter((index) => index >= 0);

    let value: FormFieldValue = '';
    let options: string[] | undefined;

    try {
      if (field instanceof lib.PDFCheckBox) {
        value = field.isChecked();
      } else if (
        field instanceof lib.PDFRadioGroup ||
        field instanceof lib.PDFDropdown
      ) {
        options = field.getOptions();
        value = field.getSelected() ?? '';
      } else if (field instanceof lib.PDFOptionList) {
        options = field.getOptions();
        value = field.getSelected();
      } else if (field instanceof lib.PDFTextField) {
        value = field.getText() ?? '';
      }
    } catch {
      // A field whose value cannot be read is still worth listing, so the user
      // can see it exists; it simply starts empty.
    }

    return {
      name,
      kind,
      value,
      options,
      readOnly: field.isReadOnly(),
      pages,
    };
  });
}

/**
 * Writes the collected values into a document, and optionally flattens it.
 *
 * Flattening converts fields into ordinary page content: the values become
 * permanent and the document stops being interactive. That is usually what
 * someone wants when sending a completed form onwards, and it is the only way
 * to guarantee every reader shows the same thing.
 */
export async function applyFormValues(
  doc: PDFDocument,
  values: Record<string, FormFieldValue>,
  flatten: boolean
): Promise<void> {
  if (Object.keys(values).length === 0 && !flatten) return;
  const lib = await loadPdfLib();

  let form;
  try {
    form = doc.getForm();
  } catch {
    return;
  }

  for (const [name, value] of Object.entries(values)) {
    try {
      const field = form.getField(name);

      if (field instanceof lib.PDFCheckBox) {
        if (value === true) field.check();
        else field.uncheck();
      } else if (
        field instanceof lib.PDFRadioGroup ||
        field instanceof lib.PDFDropdown
      ) {
        if (typeof value === 'string' && value) field.select(value);
      } else if (field instanceof lib.PDFOptionList) {
        if (Array.isArray(value) && value.length > 0) field.select(value);
      } else if (
        field instanceof lib.PDFTextField &&
        typeof value === 'string'
      ) {
        field.setText(value);
      }
    } catch {
      // A field that has gone away since the form was read is not worth
      // failing an entire export over.
    }
  }

  try {
    // Regenerate appearances, or readers show stale or empty widgets.
    form.updateFieldAppearances();
  } catch {
    // Some documents have fonts that defeat appearance generation; the values
    // are still set, so carry on rather than losing them.
  }

  if (flatten) {
    try {
      form.flatten();
    } catch {
      // Flattening can fail on malformed forms. Better to save an interactive
      // document with the right values than to save nothing.
    }
  }
}
