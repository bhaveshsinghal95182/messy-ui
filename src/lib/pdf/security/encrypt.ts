/**
 * Passwords and permissions.
 *
 * All of this rides on `@cantoo/pdf-lib`'s native `encrypt()`, which is the
 * main reason that fork was chosen over the unmaintained upstream. It defaults
 * to AES-256 (ISO 32000-2 revision 6) and refuses RC4 unless explicitly
 * allowed, so there is no way to accidentally produce a file protected by
 * broken crypto.
 */

import type { EncryptionSettings } from '../types';

/** What a PDF's permission flags can express. Defaults are permissive. */
export const DEFAULT_PERMISSIONS: EncryptionSettings['permissions'] = {
  printing: 'highResolution',
  modifying: true,
  copying: true,
  annotating: true,
  fillingForms: true,
  contentAccessibility: true,
  documentAssembly: true,
};

export const createEncryptionSettings = (): EncryptionSettings => ({
  userPassword: '',
  ownerPassword: '',
  permissions: { ...DEFAULT_PERMISSIONS },
});

/**
 * The honest description of what each password actually does.
 *
 * Worth stating in the UI, because the two are routinely confused and the
 * difference is the difference between real protection and a polite request:
 *
 * - The **user password** is real. Without it the file cannot be decrypted at
 *   all; the content is AES-encrypted.
 * - The **owner password** only guards the permission flags. Those flags are a
 *   convention that well-behaved viewers honour — any tool that chooses to
 *   ignore them can, and many do. It stops honest users, not determined ones.
 */
export const PASSWORD_EXPLANATION = {
  user: 'Required to open the document. The contents are encrypted with AES-256, so without it the file cannot be read at all.',
  owner:
    'Controls the permission flags below. These are honoured by well-behaved PDF readers but are not cryptographically enforced — treat them as a request, not a guarantee.',
} as const;

/** True when the settings would actually change anything on export. */
export const hasEncryption = (settings: EncryptionSettings | null): boolean =>
  Boolean(settings && (settings.userPassword || settings.ownerPassword));

/**
 * Removes every trace of the document's provenance.
 *
 * Separate from encryption because it answers a different question: not "who
 * may open this" but "what does this file say about where it came from".
 * Metadata routinely carries an author name, the software used, and creation
 * and modification timestamps.
 */
export interface SanitizeOptions {
  /** Clear /Info and the XMP metadata stream. */
  metadata: boolean;
  /** Remove document-level JavaScript and launch actions. */
  scripts: boolean;
  /** Remove embedded file attachments. */
  attachments: boolean;
}

export const DEFAULT_SANITIZE: SanitizeOptions = {
  metadata: true,
  scripts: true,
  attachments: true,
};
