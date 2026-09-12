import { createTheme, type MantineColorsTuple } from '@mantine/core';

/**
 * The prototype's visual identity (docs/prototipo.jsx) translated into the
 * Mantine theme. The colors and fonts are the same — what changes is who draws
 * the components. Writing this once avoids restyling component by component.
 */

// Mantine requires 10 shades per color; shade 6 is the default one.
const petrol: MantineColorsTuple = [
  '#EAF1EE', '#D3E3DD', '#A9C7BD', '#7BAA9C', '#569180',
  '#3F826F', '#1F5F52', '#1B4A40', '#12332C', '#0C221D',
];

const mustard: MantineColorsTuple = [
  '#FDF6E4', '#FAF1DC', '#F3E0AF', '#EBCE7F', '#E4BE57',
  '#DFB236', '#D9A21B', '#B98812', '#8A6410', '#5E440A',
];

const brick: MantineColorsTuple = [
  '#FBEDEB', '#F4D8D4', '#E4B0A9', '#D4867C', '#C66357',
  '#BE4D40', '#A8332A', '#8E2A23', '#75221C', '#5C1A16',
];

export const theme = createTheme({
  primaryColor: 'petrol',
  primaryShade: 6,
  colors: { petrol, mustard, brick },

  fontFamily: "'Archivo', system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "'Archivo', ui-monospace, monospace",
  headings: {
    fontFamily: "'Newsreader', Georgia, serif",
    fontWeight: '500',
    sizes: {
      h1: { fontSize: '32px', lineHeight: '1.15' },
      h2: { fontSize: '22px', lineHeight: '1.25' },
      h3: { fontSize: '17px', lineHeight: '1.3' },
    },
  },
  fontSizes: { xs: '12.5px', sm: '13.5px', md: '14.5px', lg: '17px', xl: '22px' },
  defaultRadius: 'md',
  radius: { sm: '7px', md: '8px', lg: '12px', xl: '14px' },

  // Prototype tokens exposed as CSS variables, so our own CSS and any of our
  // components consume the same palette Mantine uses.
  other: {
    paper: '#F1F3EF',
    card: '#FFFFFF',
    ink: '#12332C',
    inkSoft: '#4E605A',
    inkFaint: '#8B978F',
    line: '#DFE4DC',
    credit: '#2E7D63',
    debit: '#A8332A',
  },

  components: {
    Card: {
      defaultProps: {
        withBorder: true,
        radius: 'xl',
        padding: 'lg',
        bg: 'var(--gf-card)',
      },
    },
    Paper: { defaultProps: { bg: 'var(--gf-card)' } },
    Table: { defaultProps: { verticalSpacing: 'sm', horizontalSpacing: 'sm' } },
    Button: { defaultProps: { radius: 'md' } },
    TextInput: { defaultProps: { radius: 'md' } },
    NumberInput: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md', checkIconPosition: 'right' } },
    PasswordInput: { defaultProps: { radius: 'md' } },
  },
});
