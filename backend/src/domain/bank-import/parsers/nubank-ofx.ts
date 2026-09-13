import { toCents } from '../../split';
import type { RawTransaction } from '../types';

const tag = (name: string) => new RegExp(`<${name}>([^<\r\n]*)`, 'i');

/**
 * Shared by the account-statement and invoice OFX exports: Nubank's
 * TRNTYPE/TRNAMT sign convention is identical for both (CREDIT positive,
 * DEBIT negative) — unlike the two CSV exports, which disagree with each
 * other on what a positive value means.
 */
export function parseNubankOfx(buffer: Buffer): RawTransaction[] {
  const text = buffer.toString('utf8');
  const blocks = text.match(/<STMTTRN>[\s\S]*?<\/STMTTRN>/gi) ?? [];

  return blocks.map((block) => {
    const trnType = block.match(tag('TRNTYPE'))?.[1]?.trim().toUpperCase() ?? '';
    const dtPosted = block.match(tag('DTPOSTED'))?.[1]?.trim() ?? '';
    const trnAmt = block.match(tag('TRNAMT'))?.[1]?.trim() ?? '0';
    const memo = block.match(tag('MEMO'))?.[1]?.trim() ?? '';

    return {
      date: ofxDateToIso(dtPosted),
      description: memo,
      amountCents: Math.abs(toCents(trnAmt)),
      kind: trnType === 'CREDIT' ? 'credit' : 'debit',
    };
  });
}

/** "20260805000000[-3:BRT]" -> "2026-08-05" */
function ofxDateToIso(raw: string): string {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}
