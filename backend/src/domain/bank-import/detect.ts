import type { ImportDocumentType, ImportFileFormat } from './types';

/**
 * Sniffs content instead of trusting the extension — a renamed file should
 * not slip past validation, and this is also what lets the upload modal skip
 * asking the user which kind of document they picked.
 */
export function detectFormat(buffer: Buffer): ImportFileFormat | null {
  const head = buffer.toString('utf8', 0, 200).trimStart();
  if (head.startsWith('OFXHEADER') || /^<OFX>/i.test(head)) return 'ofx';
  // A CSV has no fixed magic bytes — accept anything that isn't OFX and looks
  // like text; detectDocumentType is what actually validates the header.
  if (/^[\x09\x0A\x0D\x20-\x7E -￿]*$/.test(head)) return 'csv';
  return null;
}

export function detectDocumentType(
  buffer: Buffer,
  format: ImportFileFormat,
): ImportDocumentType | null {
  if (format === 'ofx') {
    const text = buffer.toString('utf8');
    if (/<CCACCTFROM>|<CREDITCARDMSGSRSV1>/i.test(text)) return 'invoice';
    if (/<BANKACCTFROM>|<BANKMSGSRSV1>/i.test(text)) return 'accountStatement';
    return null;
  }

  const firstLine = buffer.toString('utf8').split(/\r?\n/, 1)[0]?.trim().toLowerCase() ?? '';
  if (firstLine.startsWith('data,valor,identificador')) return 'accountStatement';
  if (firstLine.startsWith('date,title,amount')) return 'invoice';
  return null;
}
