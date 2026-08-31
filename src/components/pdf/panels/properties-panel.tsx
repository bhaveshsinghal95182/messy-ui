'use client';

import { useCallback, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BringToFront,
  Italic,
  Lock,
  MousePointerSquareDashed,
  SendToBack,
  Trash2,
  Unlock,
} from 'lucide-react';
import { usePdf, usePdfDispatch, usePdfState } from '../pdf-store-provider';
import ColorField from './props/color-field';
import SliderField from './props/slider-field';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { saveToolDefaults } from '@/lib/pdf/tool-defaults-storage';
import { isValidLinkUrl } from '@/lib/pdf/link';
import type { PdfObject, RGB, ToolId } from '@/lib/pdf/types';

/** Kinds whose single colour lives on a plain `color` field. */
const COLOR_KINDS = new Set<PdfObject['kind']>([
  'text',
  'ink',
  'highlight',
  'whiteout',
  'note',
]);

/** Kinds that carry a stroke width. */
const STROKE_KINDS = new Set<PdfObject['kind']>(['ink', 'shape']);

/** Tools whose defaults are worth editing before anything is drawn. */
const DRAW_TOOLS = new Set<ToolId>([
  'text',
  'ink',
  'highlight',
  'rect',
  'ellipse',
  'line',
  'arrow',
  'whiteout',
  'note',
]);

/**
 * Reads one property across the selection.
 *
 * Returns the shared value when every object that has the property agrees, and
 * flags `mixed` otherwise so a control can say so instead of silently showing
 * the first object's value and overwriting the rest on the next keystroke.
 */
function shared<O extends PdfObject, T>(
  objects: O[],
  read: (object: O) => T | undefined
): { value: T | undefined; mixed: boolean } {
  let value: T | undefined;
  let seen = false;
  let mixed = false;

  for (const object of objects) {
    const next = read(object);
    if (next === undefined) continue;
    if (!seen) {
      value = next;
      seen = true;
    } else if (JSON.stringify(next) !== JSON.stringify(value)) {
      mixed = true;
    }
  }

  return { value, mixed };
}

/**
 * Edits whatever is selected — or, when nothing is, the defaults the active
 * drawing tool will use next.
 *
 * Without this the editor could create objects but never change one: a
 * highlight was yellow forever, and colour, size, opacity, stacking order and
 * lock had no reachable control at all.
 */
const PropertiesPanel = () => {
  const dispatch = usePdfDispatch();
  const getState = usePdfState();

  const activeTool = usePdf((state) => state.activeTool);
  const toolSettings = usePdf((state) => state.toolDefaults[state.activeTool]);
  const pageId = usePdf((state) => state.selection.pageId);
  const pageIds = usePdf((state) => state.pages.map((page) => page.id));
  const firstPageId = pageIds[0];

  const selected = usePdf((state) => {
    const { pageId: page, objectIds } = state.selection;
    if (!page || objectIds.length === 0) return [];
    const ids = new Set(objectIds);
    return (state.objects[page] ?? []).filter((object) => ids.has(object.id));
  });

  /**
   * Applies a patch to every selected object that supports it.
   *
   * `make` returns `null` for objects the property does not apply to, so a
   * mixed selection of a shape and a photo can still have its opacity changed
   * without the photo growing a meaningless `strokeWidth`.
   */
  const patch = useCallback(
    (make: (object: PdfObject) => Partial<PdfObject> | null) => {
      const state = getState();
      const page = state.selection.pageId;
      if (!page) return;

      const ids = new Set(state.selection.objectIds);
      const patches = (state.objects[page] ?? [])
        .filter((object) => ids.has(object.id))
        .flatMap((object) => {
          const next = make(object);
          return next ? [{ objectId: object.id, patch: next }] : [];
        });

      if (patches.length > 0) {
        dispatch({ type: 'UPDATE_OBJECTS', pageId: page, patches });
      }
    },
    [dispatch, getState]
  );

  /** Slider drags coalesce into one undo entry, exactly as a pointer drag does. */
  const beginDrag = useCallback(
    () => dispatch({ type: 'BEGIN_TRANSACTION' }),
    [dispatch]
  );
  const endDrag = useCallback(
    () => dispatch({ type: 'COMMIT_TRANSACTION' }),
    [dispatch]
  );

  const setDefaults = useCallback(
    (tool: ToolId, next: Partial<typeof toolSettings>) => {
      dispatch({ type: 'SET_TOOL_DEFAULTS', tool, patch: next });
      saveToolDefaults(getState().toolDefaults);
    },
    [dispatch, getState]
  );

  const reorder = useCallback(
    (to: 'front' | 'back' | 'forward' | 'backward') => {
      const state = getState();
      const page = state.selection.pageId;
      if (!page) return;
      for (const objectId of state.selection.objectIds) {
        dispatch({ type: 'REORDER_OBJECT', pageId: page, objectId, to });
      }
    },
    [dispatch, getState]
  );

  /* ------------------------------ Tool defaults ----------------------------- */

  if (selected.length === 0) {
    if (!DRAW_TOOLS.has(activeTool)) {
      return (
        <div className="text-muted-foreground p-4 text-center text-sm">
          <MousePointerSquareDashed
            className="mx-auto mb-2 size-5"
            aria-hidden="true"
          />
          <p>Select an annotation to edit it.</p>
          <p className="mt-1 text-xs">
            Or pick a drawing tool to set what the next one looks like.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-3">
        <div>
          <h2 className="text-sm font-medium capitalize">{activeTool} tool</h2>
          <p className="text-muted-foreground text-xs">
            Applies to the next one you draw.
          </p>
        </div>

        <ColorField
          label="Colour"
          value={toolSettings.color}
          onChange={(color) => color && setDefaults(activeTool, { color })}
        />

        {activeTool === 'text' ? (
          <SliderField
            label="Font size"
            value={toolSettings.fontSize}
            min={6}
            max={96}
            step={1}
            format={(value) => `${value} pt`}
            onChange={(fontSize) => setDefaults(activeTool, { fontSize })}
          />
        ) : (
          <SliderField
            label="Stroke width"
            value={toolSettings.strokeWidth}
            min={0.5}
            max={24}
            step={0.5}
            format={(value) => `${value} pt`}
            onChange={(strokeWidth) => setDefaults(activeTool, { strokeWidth })}
          />
        )}

        <SliderField
          label="Opacity"
          value={toolSettings.opacity}
          min={0.05}
          max={1}
          step={0.05}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(opacity) => setDefaults(activeTool, { opacity })}
        />
      </div>
    );
  }

  /* --------------------------- Selected objects ---------------------------- */

  const kinds = new Set(selected.map((object) => object.kind));
  const only = <T extends PdfObject['kind']>(kind: T) =>
    selected.filter(
      (object): object is Extract<PdfObject, { kind: T }> =>
        object.kind === kind
    );

  const hasColor = [...kinds].some((kind) => COLOR_KINDS.has(kind));
  const hasStroke = [...kinds].some((kind) => STROKE_KINDS.has(kind));
  const texts = only('text');
  const shapes = only('shape');
  const notes = only('note');
  const images = only('image');
  const signatures = only('signature');
  const redactions = only('redaction');
  const links = only('link');

  const opacity = shared(selected, (object) => object.opacity);
  const locked = shared(selected, (object) => object.locked);
  const allLocked = selected.every((object) => object.locked);

  const colorValue = shared(selected, (object) =>
    COLOR_KINDS.has(object.kind)
      ? (object as Extract<PdfObject, { color: RGB }>).color
      : undefined
  );
  const strokeWidth = shared(selected, (object) =>
    STROKE_KINDS.has(object.kind)
      ? (object as Extract<PdfObject, { strokeWidth: number }>).strokeWidth
      : undefined
  );

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">
          {selected.length === 1
            ? `${selected[0]!.kind[0]!.toUpperCase()}${selected[0]!.kind.slice(1)}`
            : `${selected.length} selected`}
        </h2>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Toggle
                size="sm"
                pressed={allLocked}
                aria-label={allLocked ? 'Unlock' : 'Lock'}
                onPressedChange={(next) => patch(() => ({ locked: next }))}
              >
                {allLocked ? (
                  <Lock className="size-3.5" />
                ) : (
                  <Unlock className="size-3.5" />
                )}
              </Toggle>
            </TooltipTrigger>
            <TooltipContent>
              {allLocked ? 'Unlock' : 'Lock in place'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                aria-label="Delete"
                onClick={() => {
                  if (!pageId) return;
                  dispatch({
                    type: 'DELETE_OBJECTS',
                    pageId,
                    objectIds: selected.map((object) => object.id),
                  });
                }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {locked.value === true && (
        <p className="text-muted-foreground text-xs">
          Locked — unlock to move or resize.
        </p>
      )}

      {hasColor && (
        <ColorField
          label="Colour"
          value={colorValue.value ?? null}
          mixed={colorValue.mixed}
          onChange={(color) =>
            color &&
            patch((object) =>
              COLOR_KINDS.has(object.kind)
                ? ({ color } as Partial<PdfObject>)
                : null
            )
          }
        />
      )}

      {shapes.length > 0 && (
        <>
          <ColorField
            label="Stroke"
            nullable
            value={shared(shapes, (object) => object.stroke).value ?? null}
            mixed={shared(shapes, (object) => object.stroke).mixed}
            onChange={(stroke) =>
              patch((object) => (object.kind === 'shape' ? { stroke } : null))
            }
          />
          <ColorField
            label="Fill"
            nullable
            value={shared(shapes, (object) => object.fill).value ?? null}
            mixed={shared(shapes, (object) => object.fill).mixed}
            onChange={(fill) =>
              patch((object) => (object.kind === 'shape' ? { fill } : null))
            }
          />
        </>
      )}

      {hasStroke && (
        <SliderField
          label="Stroke width"
          value={strokeWidth.value ?? 2}
          mixed={strokeWidth.mixed}
          min={0.5}
          max={24}
          step={0.5}
          format={(value) => `${value} pt`}
          onChange={(next) => {
            beginDrag();
            patch((object) =>
              STROKE_KINDS.has(object.kind)
                ? ({ strokeWidth: next } as Partial<PdfObject>)
                : null
            );
          }}
          onCommit={endDrag}
        />
      )}

      <SliderField
        label="Opacity"
        value={opacity.value ?? 1}
        mixed={opacity.mixed}
        min={0.05}
        max={1}
        step={0.05}
        format={(value) => `${Math.round(value * 100)}%`}
        onChange={(next) => {
          beginDrag();
          patch(() => ({ opacity: next }));
        }}
        onCommit={endDrag}
      />

      {texts.length > 0 && (
        <>
          <Separator />
          <SliderField
            label="Font size"
            value={shared(texts, (object) => object.size).value ?? 12}
            mixed={shared(texts, (object) => object.size).mixed}
            min={6}
            max={96}
            step={1}
            format={(value) => `${value} pt`}
            onChange={(size) => {
              beginDrag();
              patch((object) => (object.kind === 'text' ? { size } : null));
            }}
            onCommit={endDrag}
          />

          <div className="flex items-center gap-1">
            <Toggle
              size="sm"
              aria-label="Bold"
              pressed={texts.every((object) => object.bold)}
              onPressedChange={(bold) =>
                patch((object) => (object.kind === 'text' ? { bold } : null))
              }
            >
              <Bold className="size-3.5" />
            </Toggle>
            <Toggle
              size="sm"
              aria-label="Italic"
              pressed={texts.every((object) => object.italic)}
              onPressedChange={(italic) =>
                patch((object) => (object.kind === 'text' ? { italic } : null))
              }
            >
              <Italic className="size-3.5" />
            </Toggle>

            <Separator orientation="vertical" className="mx-1 h-6" />

            {(
              [
                ['left', AlignLeft, 'Align left'],
                ['center', AlignCenter, 'Align centre'],
                ['right', AlignRight, 'Align right'],
              ] as const
            ).map(([align, Icon, label]) => (
              <Toggle
                key={align}
                size="sm"
                aria-label={label}
                pressed={texts.every((object) => object.align === align)}
                onPressedChange={() =>
                  patch((object) => (object.kind === 'text' ? { align } : null))
                }
              >
                <Icon className="size-3.5" />
              </Toggle>
            ))}
          </div>

          <SliderField
            label="Line height"
            value={shared(texts, (object) => object.lineHeight).value ?? 1.2}
            mixed={shared(texts, (object) => object.lineHeight).mixed}
            min={0.8}
            max={3}
            step={0.1}
            format={(value) => value.toFixed(1)}
            onChange={(lineHeight) => {
              beginDrag();
              patch((object) =>
                object.kind === 'text' ? { lineHeight } : null
              );
            }}
            onCommit={endDrag}
          />
        </>
      )}

      {notes.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="note-body" className="text-xs font-medium">
              Note text
            </Label>
            <Textarea
              id="note-body"
              rows={4}
              placeholder="What should this note say?"
              value={shared(notes, (object) => object.body).value ?? ''}
              onChange={(event) =>
                patch((object) =>
                  object.kind === 'note' ? { body: event.target.value } : null
                )
              }
            />
            <p className="text-muted-foreground text-xs">
              Exported as a real PDF note, so it opens as a popup in Acrobat and
              Preview.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note-author" className="text-xs font-medium">
              Author
            </Label>
            <Input
              id="note-author"
              className="h-8"
              placeholder="Optional"
              value={shared(notes, (object) => object.author).value ?? ''}
              onChange={(event) =>
                patch((object) =>
                  object.kind === 'note' ? { author: event.target.value } : null
                )
              }
            />
          </div>
        </>
      )}

      {redactions.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="redaction-label" className="text-xs font-medium">
            Overlay label
          </Label>
          <Input
            id="redaction-label"
            className="h-8"
            placeholder="e.g. EXEMPT 6"
            value={
              shared(redactions, (object) => object.label ?? '').value ?? ''
            }
            onChange={(event) =>
              patch((object) =>
                object.kind === 'redaction'
                  ? { label: event.target.value || null }
                  : null
              )
            }
          />
        </div>
      )}

      {links.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Link target</Label>
          <Select
            value={shared(links, (object) => object.target.type).value ?? 'url'}
            onValueChange={(value) =>
              patch((object) =>
                object.kind === 'link'
                  ? {
                      target:
                        value === 'url'
                          ? { type: 'url', url: '' }
                          : { type: 'page', pageId: firstPageId ?? '' },
                    }
                  : null
              )
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="url">Web address</SelectItem>
              <SelectItem value="page">A page in this document</SelectItem>
            </SelectContent>
          </Select>

          {links.every((object) => object.target.type === 'url') ? (
            <LinkUrlField links={links} patch={patch} />
          ) : (
            <Select
              value={
                shared(links, (object) =>
                  object.target.type === 'page'
                    ? object.target.pageId
                    : undefined
                ).value ?? ''
              }
              onValueChange={(pageId) =>
                patch((object) =>
                  object.kind === 'link'
                    ? { target: { type: 'page', pageId } }
                    : null
                )
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Choose a page" />
              </SelectTrigger>
              <SelectContent>
                {pageIds.map((id, index) => (
                  <SelectItem key={id} value={id}>
                    Page {index + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {images.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Fit</Label>
          <Select
            value={shared(images, (object) => object.fit).value ?? 'contain'}
            onValueChange={(value) =>
              patch((object) =>
                object.kind === 'image'
                  ? { fit: value as 'contain' | 'stretch' }
                  : null
              )
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="contain">Keep proportions</SelectItem>
              <SelectItem value="stretch">Stretch to box</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {signatures.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium">Role</Label>
          <Select
            value={
              shared(signatures, (object) => object.variant).value ??
              'signature'
            }
            onValueChange={(value) =>
              patch((object) =>
                object.kind === 'signature'
                  ? { variant: value as 'signature' | 'initials' }
                  : null
              )
            }
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="signature">Signature</SelectItem>
              <SelectItem value="initials">Initials</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <Label className="text-xs font-medium">Arrange</Label>
        <div className="grid grid-cols-2 gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => reorder('front')}
          >
            <BringToFront className="size-3.5" /> Front
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => reorder('back')}
          >
            <SendToBack className="size-3.5" /> Back
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => reorder('forward')}
          >
            Forward
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => reorder('backward')}
          >
            Backward
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * The URL box for a link.
 *
 * Its own component so it can hold a draft: a controlled input bound straight
 * to the object would be rewritten on every keystroke, and "example" would be
 * normalised to "https://example" before the user finished typing ".com".
 */
const LinkUrlField = ({
  links,
  patch,
}: {
  links: Extract<PdfObject, { kind: 'link' }>[];
  patch: (make: (object: PdfObject) => Partial<PdfObject> | null) => void;
}) => {
  const current =
    shared(links, (object) =>
      object.target.type === 'url' ? object.target.url : undefined
    ).value ?? '';
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? current;
  const invalid = shown.trim().length > 0 && !isValidLinkUrl(shown);

  return (
    <div className="space-y-1">
      <Input
        className="h-8 text-xs"
        placeholder="example.com"
        spellCheck={false}
        aria-invalid={invalid}
        aria-label="Link address"
        value={shown}
        onChange={(event) => {
          setDraft(event.target.value);
          patch((object) =>
            object.kind === 'link'
              ? { target: { type: 'url', url: event.target.value } }
              : null
          );
        }}
        onBlur={() => setDraft(null)}
      />
      {invalid ? (
        <p className="text-destructive text-xs">
          Only web and email addresses can be linked.
        </p>
      ) : (
        <p className="text-muted-foreground text-xs">
          Exported as a real PDF link. Empty links are left out of the file.
        </p>
      )}
    </div>
  );
};

export default PropertiesPanel;
