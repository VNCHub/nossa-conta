import { parseInternalExport } from './parse';

const validFile = {
  version: 1,
  exportedAt: '2026-09-18T00:00:00.000Z',
  expenses: [
    {
      date: '2026-08-03',
      description: 'Mercado',
      amount: 154.9,
      category: 'food',
      expenseType: 'optional',
      paymentMethod: 'Pix',
    },
  ],
};

const buf = (v: unknown) => Buffer.from(JSON.stringify(v));

describe('parseInternalExport', () => {
  it('extracts every valid gasto', () => {
    expect(parseInternalExport(buf(validFile))).toEqual(validFile.expenses);
  });

  it('accepts null category/expenseType/paymentMethod — an incomplete gasto in the source too', () => {
    const entry = { ...validFile.expenses[0], category: null, expenseType: null, paymentMethod: null };
    expect(parseInternalExport(buf({ ...validFile, expenses: [entry] }))).toEqual([entry]);
  });

  it('rejects a file that is not JSON', () => {
    expect(() => parseInternalExport(Buffer.from('not json'))).toThrow(/JSON válido/);
  });

  it('rejects a file missing the expenses array', () => {
    expect(() => parseInternalExport(buf({ version: 1 }))).toThrow(/exportação da Nossa Conta/);
  });

  it('rejects an unsupported version', () => {
    expect(() => parseInternalExport(buf({ ...validFile, version: 2 }))).toThrow(/[Vv]ersão/);
  });

  it('rejects a gasto with an invalid category', () => {
    const entry = { ...validFile.expenses[0], category: 'nao-existe' };
    expect(() => parseInternalExport(buf({ ...validFile, expenses: [entry] }))).toThrow(/inválido/);
  });

  it('rejects a gasto with a non-positive amount', () => {
    const entry = { ...validFile.expenses[0], amount: 0 };
    expect(() => parseInternalExport(buf({ ...validFile, expenses: [entry] }))).toThrow(/inválido/);
  });

  it('rejects a gasto with a malformed date', () => {
    const entry = { ...validFile.expenses[0], date: '03/08/2026' };
    expect(() => parseInternalExport(buf({ ...validFile, expenses: [entry] }))).toThrow(/inválido/);
  });
});
