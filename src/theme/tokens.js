/** Design tokens. Palette tuned from the spec's starting values. */

export const palettes = {
  light: {
    scheme: 'light',
    background: '#F6F7F3',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF1EB',
    surfaceRaised: '#FFFFFF',
    text: '#17221D',
    textSecondary: '#3E4A44',
    muted: '#66736B',
    faint: '#A3ADA6',
    primary: '#167A58',
    primaryPressed: '#11664A',
    primarySoft: '#DDF2E8',
    onPrimary: '#FFFFFF',
    border: '#E3E7DF',
    borderStrong: '#CBD3CC',
    success: '#1E9E6A',
    danger: '#C2453D',
    dangerSoft: '#F8E3E1',
    withdraw: '#A85A22',
    withdrawSoft: '#F6E7DA',
    warningSoft: '#F7EFD9',
    scrim: 'rgba(16, 26, 23, 0.42)',
    shadow: '#0E2A20',
    heat: ['#E9EDE6', '#C3E8D5', '#86D0AC', '#3FAA7E', '#167A58'],
    chartGrid: '#E6EAE3',
  },
  dark: {
    scheme: 'dark',
    background: '#101A17',
    surface: '#192621',
    surfaceAlt: '#1E2D27',
    surfaceRaised: '#22332B',
    text: '#F3F7F3',
    textSecondary: '#D2DDD6',
    muted: '#A8BDB2',
    faint: '#6D8278',
    primary: '#68D9A5',
    primaryPressed: '#55C892',
    primarySoft: '#244B3C',
    onPrimary: '#0B1F17',
    border: '#2A3B33',
    borderStrong: '#3A4E44',
    success: '#68D9A5',
    danger: '#F08A80',
    dangerSoft: '#3D2422',
    withdraw: '#F0B37E',
    withdrawSoft: '#3B2D20',
    warningSoft: '#3A3320',
    scrim: 'rgba(0, 0, 0, 0.55)',
    shadow: '#000000',
    heat: ['#1F2E28', '#24503F', '#2F7A5B', '#46A97C', '#68D9A5'],
    chartGrid: '#24352D',
  },
};

/** The Savings Dial is always a focused deep-forest surface. */
export const dialPalette = {
  top: '#0F3F2E',
  bottom: '#071C15',
  text: '#F3F7F3',
  muted: '#9FC3B2',
  accent: '#6EE7B0',
  accentDim: 'rgba(110, 231, 176, 0.22)',
  track: 'rgba(255, 255, 255, 0.09)',
  chip: 'rgba(255, 255, 255, 0.08)',
  chipBorder: 'rgba(255, 255, 255, 0.14)',
  withdraw: '#F5B98A',
  withdrawDim: 'rgba(245, 185, 138, 0.22)',
};

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, huge: 40 };

export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };

export const type = {
  display: { fontSize: 44, lineHeight: 52, fontWeight: '600', letterSpacing: -1 },
  h1: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.6 },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  h3: { fontSize: 18, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  small: { fontSize: 14, lineHeight: 19, fontWeight: '400' },
  smallStrong: { fontSize: 14, lineHeight: 19, fontWeight: '600' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.2 },
  overline: { fontSize: 11, lineHeight: 14, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
};

export const CATEGORIES = [
  { key: 'Electronics', icon: 'Smartphone', hue: '#2E8C8C' },
  { key: 'Travel', icon: 'Plane', hue: '#3B7EA8' },
  { key: 'Vehicle', icon: 'Bike', hue: '#B07A2A' },
  { key: 'Home', icon: 'Sofa', hue: '#9A6B4F' },
  { key: 'Fashion', icon: 'Shirt', hue: '#A3567A' },
  { key: 'Education', icon: 'GraduationCap', hue: '#5B62A8' },
  { key: 'Other', icon: 'Gift', hue: '#3E8B5E' },
];

export const PRIORITIES = ['Low', 'Medium', 'High'];

/** Soft two-stop gradients for goal "cards" (top → bottom). Text on them is always dark ink. */
export const CARD_GRADIENTS = {
  Electronics: ['#C3E2FB', '#F2B657'],
  Travel: ['#CFF3EA', '#6FBFE6'],
  Vehicle: ['#FFE6B8', '#EE8F55'],
  Home: ['#F4E5D6', '#CC9370'],
  Fashion: ['#FADAE9', '#B98AD9'],
  Education: ['#DCE0FF', '#7D88E3'],
  Other: ['#D7F5E3', '#4FBF8B'],
};

export function cardGradient(category) {
  return CARD_GRADIENTS[category] || CARD_GRADIENTS.Other;
}

/** Calendar dot-grid palette (inspired by the minimalist date sample). */
export const DOT_COLORS = {
  light: { saved: '#17221D', past: '#D6D3CD', future: '#E8E6E1', outline: '#D6D3CD', today: '#FF6B1A', savedText: '#F6F7F3', text: '#5E6862' },
  dark: { saved: '#F3F7F3', past: '#2B3933', future: '#1D2924', outline: '#2E3D36', today: '#FF8A3D', savedText: '#101A17', text: '#A8BDB2' },
};

export function categoryMeta(key) {
  return CATEGORIES.find(c => c.key === key) || CATEGORIES[CATEGORIES.length - 1];
}

/** Mix a hex color with alpha. */
export function alpha(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
