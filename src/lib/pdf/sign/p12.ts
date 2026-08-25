/**
 * Reading a PKCS#12 certificate, so the user can see what they are about to
 * sign with before they sign with it.
 *
 * Everything here happens on the device. The `.p12` bytes and the passphrase
 * are never stored, never put in the editor state, and never transmitted —
 * they exist only for the duration of the signing dialog.
 */

import { bytesToBinaryString } from './buffer-shim';

/** node-forge is ~350KB, so it loads only when the certificate dialog opens. */
let forgePromise: Promise<typeof import('node-forge')> | null = null;
export const loadForge = () => {
  forgePromise ??= import('node-forge');
  return forgePromise;
};

export interface CertificateInfo {
  /** Common name, or the first attribute that looks like a name. */
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: Date;
  validTo: Date;
  /** True when now is outside the validity window. */
  expired: boolean;
  /** True when issuer equals subject, i.e. it signs for itself. */
  selfSigned: boolean;
}

export class CertificateError extends Error {
  constructor(
    message: string,
    /** True when the passphrase was the problem rather than the file. */
    readonly wrongPassphrase = false
  ) {
    super(message);
    this.name = 'CertificateError';
  }
}

const attribute = (
  fields: { shortName?: string; name?: string; value?: unknown }[],
  shortName: string
): string => {
  const found = fields.find((field) => field.shortName === shortName);
  return typeof found?.value === 'string' ? found.value : '';
};

/** A readable one-liner for a certificate name, preferring CN then O. */
const describe = (
  fields: { shortName?: string; name?: string; value?: unknown }[]
): string => {
  const common = attribute(fields, 'CN');
  const organisation = attribute(fields, 'O');
  if (common && organisation && common !== organisation) {
    return `${common} (${organisation})`;
  }
  return common || organisation || 'Unnamed certificate';
};

/**
 * Parses a `.p12`/`.pfx` and reports what is inside.
 *
 * A wrong passphrase and a corrupt file are distinguished, because they need
 * different things from the user — retyping versus finding another file.
 */
export async function readCertificate(
  bytes: Uint8Array,
  passphrase: string
): Promise<CertificateInfo> {
  const forge = await loadForge();

  let p12;
  try {
    // Must be a byte-transparent binary string — see bytesToBinaryString for
    // why TextDecoder('latin1') is wrong here.
    const binary = forge.util.createBuffer(bytesToBinaryString(bytes));
    const asn1 = forge.asn1.fromDer(binary);
    p12 = forge.pkcs12.pkcs12FromAsn1(asn1, passphrase);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // node-forge reports a bad passphrase as a MAC verification failure.
    const wrongPassphrase = /mac|password|invalid password/i.test(message);
    throw new CertificateError(
      wrongPassphrase
        ? 'That passphrase did not unlock the certificate.'
        : 'That file could not be read as a PKCS#12 certificate.',
      wrongPassphrase
    );
  }

  const bags = p12.getBags({ bagType: forge.pki.oids.certBag })[
    forge.pki.oids.certBag
  ];
  const certificate = bags?.find((bag) => bag.cert)?.cert;
  if (!certificate) {
    throw new CertificateError('No certificate was found in that file.');
  }

  const now = new Date();
  const subject = describe(certificate.subject.attributes);
  const issuer = describe(certificate.issuer.attributes);

  return {
    subject,
    issuer,
    serialNumber: certificate.serialNumber,
    validFrom: certificate.validity.notBefore,
    validTo: certificate.validity.notAfter,
    expired:
      now < certificate.validity.notBefore ||
      now > certificate.validity.notAfter,
    selfSigned: subject === issuer,
  };
}
