import { createTheme, type MantineColorsTuple } from '@mantine/core';

/**
 * Identidade visual do protótipo (docs/prototipo.jsx) traduzida para o tema do
 * Mantine. As cores e fontes são as mesmas — o que muda é quem desenha os
 * componentes. Escrever isto uma vez evita reestilizar componente a componente.
 */

// Mantine exige 10 tons por cor; o tom 6 é o usado por padrão.
const petrol: MantineColorsTuple = [
  '#EAF1EE', '#D3E3DD', '#A9C7BD', '#7BAA9C', '#569180',
  '#3F826F', '#1F5F52', '#1B4A40', '#12332C', '#0C221D',
];

const mostarda: MantineColorsTuple = [
  '#FDF6E4', '#FAF1DC', '#F3E0AF', '#EBCE7F', '#E4BE57',
  '#DFB236', '#D9A21B', '#B98812', '#8A6410', '#5E440A',
];

const tijolo: MantineColorsTuple = [
  '#FBEDEB', '#F4D8D4', '#E4B0A9', '#D4867C', '#C66357',
  '#BE4D40', '#A8332A', '#8E2A23', '#75221C', '#5C1A16',
];

export const tema = createTheme({
  primaryColor: 'petrol',
  primaryShade: 6,
  colors: { petrol, mostarda, tijolo },

  fontFamily: "'Archivo', system-ui, -apple-system, sans-serif",
  fontFamilyMonospace: "'Archivo', ui-monospace, monospace",
  headings: {
    fontFamily: "'Newsreader', Georgia, serif",
    fontWeight: '500',
    sizes: {
      h1: { fontSize: '30px', lineHeight: '1.15' },
      h2: { fontSize: '21px', lineHeight: '1.25' },
      h3: { fontSize: '16px', lineHeight: '1.3' },
    },
  },
  fontSizes: { xs: '11.5px', sm: '12.5px', md: '13.5px', lg: '16px', xl: '21px' },
  defaultRadius: 'md',
  radius: { sm: '7px', md: '8px', lg: '12px', xl: '14px' },

  // Tokens do protótipo expostos como CSS variables, para o CSS próprio e
  // qualquer componente nosso consumirem a mesma paleta que o Mantine usa.
  other: {
    paper: '#F1F3EF',
    card: '#FFFFFF',
    ink: '#12332C',
    inkSoft: '#4E605A',
    inkFaint: '#8B978F',
    line: '#DFE4DC',
    credito: '#2E7D63',
    debito: '#A8332A',
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
