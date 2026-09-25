'use client';

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  PdfPasswordRequiredError,
  entriesForSource,
  openSource,
} from '@/lib/pdf/document';
import { LARGE_FILE_WARN_MB } from '@/lib/pdf/constants';
import { usePdfDispatch } from '@/components/pdf/pdf-store-provider';

/** A file parked mid-open because it needs a password. */
export interface PendingPasswordFile {
  file: File;
  /** True once a supplied password has been rejected at least once. */
  wasWrong: boolean;
}

/**
 * Opens dropped/picked files into the store.
 *
 * Encrypted files can't be opened without a password and there is no way to ask
 * for one from inside a loop, so such a file is parked in `pendingPassword` and
 * the UI resumes it via `submitPassword` once the user has typed one.
 */
export function useOpenDocuments() {
  const dispatch = usePdfDispatch();
  const [pendingPassword, setPendingPassword] =
    useState<PendingPasswordFile | null>(null);
  const [isOpening, setIsOpening] = useState(false);

  // Files queued behind the one currently waiting on a password.
  const deferred = useRef<File[]>([]);

  const openOne = useCallback(
    async (file: File, password?: string): Promise<boolean> => {
      const megabytes = file.size / 1_000_000;
      if (megabytes > LARGE_FILE_WARN_MB) {
        toast.warning(`${file.name} is ${Math.round(megabytes)} MB`, {
          description:
            'Large files can be slow, and may be closed by the browser on mobile.',
        });
      }

      try {
        const source = await openSource(file, password);
        dispatch({
          type: 'ADD_SOURCE',
          source,
          entries: entriesForSource(source),
        });
        return true;
      } catch (error) {
        if (error instanceof PdfPasswordRequiredError) {
          setPendingPassword({ file, wasWrong: error.wasWrong });
          return false;
        }
        console.error(error);
        toast.error(`Could not open ${file.name}`, {
          description:
            error instanceof Error ? error.message : 'The file may be damaged.',
        });
        return true;
      }
    },
    [dispatch]
  );

  const openFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      setIsOpening(true);
      try {
        for (let index = 0; index < files.length; index += 1) {
          const opened = await openOne(files[index]);
          if (!opened) {
            // Park the rest; they resume once the password dialog resolves.
            deferred.current = files.slice(index + 1);
            return;
          }
        }
      } finally {
        setIsOpening(false);
      }
    },
    [openOne]
  );

  const submitPassword = useCallback(
    async (password: string) => {
      const pending = pendingPassword;
      if (!pending) return;
      setIsOpening(true);
      try {
        const opened = await openOne(pending.file, password);
        if (!opened) return; // Wrong password: the dialog stays up.
        setPendingPassword(null);
        const rest = deferred.current;
        deferred.current = [];
        if (rest.length > 0) await openFiles(rest);
      } finally {
        setIsOpening(false);
      }
    },
    [openFiles, openOne, pendingPassword]
  );

  const cancelPassword = useCallback(() => {
    setPendingPassword(null);
    const rest = deferred.current;
    deferred.current = [];
    if (rest.length > 0) void openFiles(rest);
  }, [openFiles]);

  return {
    openFiles,
    isOpening,
    pendingPassword,
    submitPassword,
    cancelPassword,
  };
}
