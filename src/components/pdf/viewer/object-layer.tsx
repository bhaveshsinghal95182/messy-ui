'use client';

import { useCallback, useRef, useState } from 'react';
import type { PageViewport } from 'pdfjs-dist/types/src/display/page_viewport';
import { usePdf, usePdfDispatch, usePdfState } from '../pdf-store-provider';
import ObjectRenderer from '../objects/object-renderer';
import TextObjectEditor from '../objects/text-object-editor';
import {
  useObjectTransform,
  type TransformHandle,
} from '@/hooks/use-object-transform';
import { pdfRectToScreen, pdfToScreen } from '@/lib/pdf/geometry';
import { cn } from '@/lib/utils';
import type { PageEntryId, PdfObject } from '@/lib/pdf/types';

interface ObjectLayerProps {
  pageId: PageEntryId;
  viewport: PageViewport | null;
  scale: number;
  /** Draw tools take over the pointer; select mode leaves it to the text layer. */
  interactive: boolean;
}

/** The eight resize handles, with their cursors. */
const HANDLES: { handle: TransformHandle; label: string; className: string }[] =
  [
    {
      handle: 'nw',
      label: 'Resize top left',
      className: 'left-0 top-0 cursor-nwse-resize',
    },
    {
      handle: 'n',
      label: 'Resize top',
      className: 'left-1/2 top-0 -translate-x-1/2 cursor-ns-resize',
    },
    {
      handle: 'ne',
      label: 'Resize top right',
      className: 'right-0 top-0 cursor-nesw-resize',
    },
    {
      handle: 'w',
      label: 'Resize left',
      className: 'left-0 top-1/2 -translate-y-1/2 cursor-ew-resize',
    },
    {
      handle: 'e',
      label: 'Resize right',
      className: 'right-0 top-1/2 -translate-y-1/2 cursor-ew-resize',
    },
    {
      handle: 'sw',
      label: 'Resize bottom left',
      className: 'bottom-0 left-0 cursor-nesw-resize',
    },
    {
      handle: 's',
      label: 'Resize bottom',
      className: 'bottom-0 left-1/2 -translate-x-1/2 cursor-ns-resize',
    },
    {
      handle: 'se',
      label: 'Resize bottom right',
      className: 'bottom-0 right-0 cursor-nwse-resize',
    },
  ];

/**
 * The interactive overlay: one absolutely-positioned element per object.
 *
 * DOM elements rather than an all-canvas scene graph. Hit-testing, z-order and
 * pointer capture then come from the browser and are correct for rotated
 * elements for free, handles are focusable buttons with real labels, and each
 * object can be reached by keyboard — an all-canvas editor has no way to offer
 * any of that without reimplementing the accessibility tree by hand.
 */
const ObjectLayer = ({
  pageId,
  viewport,
  scale,
  interactive,
}: ObjectLayerProps) => {
  const dispatch = usePdfDispatch();
  const getState = usePdfState();
  const containerRef = useRef<HTMLDivElement>(null);
  /** Id of the text object currently open for typing, if any. */
  const [editingId, setEditingId] = useState<string | null>(null);

  const objects = usePdf((state) => state.objects[pageId]);
  const selectedIds = usePdf((state) =>
    state.selection.pageId === pageId ? state.selection.objectIds : null
  );

  const { begin, move, end, guides } = useObjectTransform(
    pageId,
    viewport,
    containerRef
  );

  const select = useCallback(
    (objectId: string, additive: boolean) => {
      const current = getState().selection;
      const existing =
        current.pageId === pageId ? current.objectIds : ([] as string[]);
      const objectIds = additive
        ? existing.includes(objectId)
          ? existing.filter((id) => id !== objectId)
          : [...existing, objectId]
        : [objectId];
      dispatch({ type: 'SET_SELECTION', selection: { pageId, objectIds } });
    },
    [dispatch, getState, pageId]
  );

  if (!viewport || !objects?.length) {
    // Nothing to show, but the layer still has to exist so a newly drawn object
    // has somewhere to land without remounting the page.
    return (
      <div
        ref={containerRef}
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      />
    );
  }

  const ordered = [...objects].sort((a, b) => a.z - b.z);

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute inset-0',
        // touch-action:none only on the overlay, so a touch drag on an object
        // moves it while a touch anywhere else still scrolls the document.
        interactive ? 'pointer-events-auto touch-none' : 'pointer-events-none'
      )}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      role="list"
      aria-label="Annotations"
    >
      {ordered.map((object) => {
        const box = pdfRectToScreen(viewport, object.rect);
        const selected = selectedIds?.includes(object.id) ?? false;

        return (
          <div
            key={object.id}
            role="listitem"
            aria-label={describeObject(object)}
            tabIndex={interactive ? 0 : -1}
            onPointerDown={(event) => {
              if (editingId === object.id) return;
              select(object.id, event.shiftKey || event.metaKey);
              begin(event, object.id, 'move');
            }}
            onDoubleClick={() => {
              if (object.kind === 'text') setEditingId(object.id);
            }}
            onKeyDown={(event) => {
              // Enter opens a text object for typing, which together with Tab
              // to cycle objects gives a complete keyboard editing path.
              if (event.key === 'Enter' && object.kind === 'text') {
                event.preventDefault();
                setEditingId(object.id);
              }
              if (event.key === 'Delete' || event.key === 'Backspace') {
                event.preventDefault();
                dispatch({
                  type: 'DELETE_OBJECTS',
                  pageId,
                  objectIds: [object.id],
                });
              }
            }}
            className={cn(
              'absolute',
              interactive && !object.locked && 'cursor-move',
              selected && 'outline-primary outline-2',
              'focus-visible:outline-primary focus-visible:outline-2'
            )}
            style={{
              left: box.left,
              top: box.top,
              width: box.width,
              height: box.height,
              opacity: object.opacity,
              transform: object.rotation
                ? `rotate(${-object.rotation}deg)`
                : undefined,
              zIndex: Math.round(object.z),
            }}
          >
            {editingId === object.id && object.kind === 'text' ? (
              <TextObjectEditor
                pageId={pageId}
                object={object}
                scale={scale}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <ObjectRenderer
                object={object}
                scale={scale}
                selected={selected}
              />
            )}

            {selected && interactive && !object.locked && (
              <>
                {HANDLES.map(({ handle, label, className }) => (
                  <button
                    key={handle}
                    type="button"
                    aria-label={label}
                    onPointerDown={(event) => begin(event, object.id, handle)}
                    className={cn(
                      // 10px visual, 44px touch target via the ::before below.
                      'border-primary absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-white',
                      "before:absolute before:-inset-4 before:content-['']",
                      className
                    )}
                    style={{ margin: 0 }}
                  />
                ))}
                <button
                  type="button"
                  aria-label="Rotate"
                  onPointerDown={(event) => begin(event, object.id, 'rotate')}
                  className="border-primary absolute -top-7 left-1/2 size-2.5 -translate-x-1/2 cursor-grab rounded-full border-2 bg-white before:absolute before:-inset-4 before:content-['']"
                />
              </>
            )}
          </div>
        );
      })}

      {/* Live snap guides, drawn only while a drag is in progress. */}
      {guides.map((guide) => {
        const at = pdfToScreen(
          viewport,
          guide.axis === 'x' ? guide.at : 0,
          guide.axis === 'y' ? guide.at : 0
        );
        return (
          <div
            key={`${guide.axis}-${guide.at}`}
            aria-hidden="true"
            className="bg-primary pointer-events-none absolute"
            style={
              guide.axis === 'x'
                ? { left: at.x, top: 0, width: 1, height: '100%' }
                : { top: at.y, left: 0, height: 1, width: '100%' }
            }
          />
        );
      })}
    </div>
  );
};

/** A description a screen reader can actually use to tell objects apart. */
function describeObject(object: PdfObject): string {
  switch (object.kind) {
    case 'text':
      return `Text: ${object.text.slice(0, 40) || 'empty'}`;
    case 'note':
      return `Note: ${object.body.slice(0, 40) || 'empty'}`;
    case 'signature':
      return object.variant === 'initials' ? 'Initials' : 'Signature';
    case 'redaction':
      return object.label ? `Redaction: ${object.label}` : 'Redaction';
    case 'shape':
      return `Shape: ${object.shape}`;
    case 'link':
      return object.target.type === 'url'
        ? `Link to ${object.target.url}`
        : 'Link to a page';
    default:
      return object.kind;
  }
}

export default ObjectLayer;
