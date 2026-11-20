import { pickMemberColor } from './member-color';

const PALETTE = ['#111111', '#222222', '#333333'];

describe('pickMemberColor', () => {
  it('uses the first color when the family is empty', () => {
    expect(pickMemberColor([], PALETTE)).toBe('#111111');
  });

  it('skips colors already taken', () => {
    expect(pickMemberColor(['#111111'], PALETTE)).toBe('#222222');
    expect(pickMemberColor(['#111111', '#333333'], PALETTE)).toBe('#222222');
  });

  it('compares colors ignoring case', () => {
    expect(pickMemberColor(['#aaaaaa'], ['#AAAAAA', '#BBBBBB'])).toBe('#BBBBBB');
  });

  it('repeats the least-used color once the palette is exhausted', () => {
    const taken = ['#111111', '#222222', '#333333', '#111111'];
    expect(pickMemberColor(taken, PALETTE)).toBe('#222222');
  });

  it('ignores colors outside the palette', () => {
    expect(pickMemberColor(['#ABCDEF'], PALETTE)).toBe('#111111');
  });
});
