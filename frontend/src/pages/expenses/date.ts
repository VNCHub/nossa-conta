// Mantine 9 date pickers hand back a Date on initial mount but a
// `YYYY-MM-DD` string once the user actually picks a day — accept both.
export const iso = (d: Date | string) =>
  typeof d === 'string'
    ? d.slice(0, 10)
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
