import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { detectDocumentType, detectFormat } from './detect';

const fixturesDir = join(__dirname, '../../../test/fixtures/nubank');
const read = (name: string) => readFileSync(join(fixturesDir, name));

describe('detectFormat', () => {
  it('recognizes OFX by its header, not the extension', () => {
    expect(detectFormat(read('conta.ofx'))).toBe('ofx');
    expect(detectFormat(read('fatura.ofx'))).toBe('ofx');
  });

  it('falls back to csv for plain text that is not OFX', () => {
    expect(detectFormat(read('conta.csv'))).toBe('csv');
    expect(detectFormat(read('fatura.csv'))).toBe('csv');
  });

  it('rejects binary content', () => {
    const binary = Buffer.from([0x00, 0x01, 0xff, 0xfe, 0x00, 0x00]);
    expect(detectFormat(binary)).toBeNull();
  });
});

describe('detectDocumentType', () => {
  it('tells account statement and invoice apart in CSV by their header row', () => {
    expect(detectDocumentType(read('conta.csv'), 'csv')).toBe('accountStatement');
    expect(detectDocumentType(read('fatura.csv'), 'csv')).toBe('invoice');
  });

  it('tells account statement and invoice apart in OFX by the message set', () => {
    expect(detectDocumentType(read('conta.ofx'), 'ofx')).toBe('accountStatement');
    expect(detectDocumentType(read('fatura.ofx'), 'ofx')).toBe('invoice');
  });

  it('returns null for an unrecognized header', () => {
    expect(detectDocumentType(Buffer.from('foo,bar\n1,2'), 'csv')).toBeNull();
  });
});
