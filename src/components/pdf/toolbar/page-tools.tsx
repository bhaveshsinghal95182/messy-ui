'use client';

import { Copy, FilePlus2, RotateCcw, RotateCw, Trash2 } from 'lucide-react';
import { usePdf, usePdfDispatch } from '../pdf-store-provider';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Page operations for the currently selected page.
 *
 * Everything here is disabled without a selection rather than silently acting
 * on page 1 — an unlabelled "delete" that removes a page the user wasn't
 * looking at is the kind of thing that loses work.
 */
const PageTools = ({ onInsertBlank }: { onInsertBlank: () => void }) => {
  const dispatch = usePdfDispatch();
  const selectedPageId = usePdf((state) => state.selection.pageId);
  const hasPages = usePdf((state) => state.pages.length > 0);
  const pageCount = usePdf((state) => state.pages.length);

  const target = selectedPageId;
  const disabled = !target;

  const actions = [
    {
      label: 'Rotate page left',
      icon: RotateCcw,
      disabled,
      run: () =>
        target &&
        dispatch({ type: 'ROTATE_PAGES', pageIds: [target], delta: -90 }),
    },
    {
      label: 'Rotate page right',
      icon: RotateCw,
      disabled,
      run: () =>
        target &&
        dispatch({ type: 'ROTATE_PAGES', pageIds: [target], delta: 90 }),
    },
    {
      label: 'Duplicate page',
      icon: Copy,
      disabled,
      run: () =>
        target && dispatch({ type: 'DUPLICATE_PAGES', pageIds: [target] }),
    },
    {
      label: 'Insert blank page',
      icon: FilePlus2,
      disabled: !hasPages,
      run: onInsertBlank,
    },
    {
      // Removing the only page would leave an unexportable document.
      label: 'Delete page',
      icon: Trash2,
      disabled: disabled || pageCount <= 1,
      run: () =>
        target && dispatch({ type: 'DELETE_PAGES', pageIds: [target] }),
    },
  ];

  return (
    <>
      {actions.map(({ label, icon: Icon, disabled: isDisabled, run }) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={label}
              disabled={isDisabled}
              onClick={run}
            >
              <Icon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDisabled && !selectedPageId && hasPages
              ? `${label} — select a page first`
              : label}
          </TooltipContent>
        </Tooltip>
      ))}
    </>
  );
};

export default PageTools;
