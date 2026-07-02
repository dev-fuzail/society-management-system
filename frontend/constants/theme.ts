import { Platform } from 'react-native';

export const Palette = {
  // Brand
  indigo50:  '#eef2ff',
  indigo100: '#e0e7ff',
  indigo400: '#818cf8',
  indigo500: '#6366f1',
  indigo600: '#4f46e5',
  indigo700: '#4338ca',
  violet500: '#8b5cf6',
  violet600: '#7c3aed',

  // Semantic
  emerald400: '#34d399',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald900: '#064e3b',
  amber400:   '#fbbf24',
  amber500:   '#f59e0b',
  amber900:   '#78350f',
  red400:     '#f87171',
  red500:     '#ef4444',
  red600:     '#dc2626',
  red900:     '#450a0a',
  sky400:     '#38bdf8',
  sky500:     '#0ea5e9',
  sky900:     '#0c4a6e',
  cyan500:    '#06b6d4',

  // Neutrals
  white:      '#ffffff',
  slate50:    '#f8fafc',
  slate100:   '#f1f5f9',
  slate200:   '#e2e8f0',
  slate300:   '#cbd5e1',
  slate400:   '#94a3b8',
  slate500:   '#64748b',
  slate600:   '#475569',
  slate700:   '#334155',
  slate800:   '#1e293b',
  slate850:   '#162032',
  slate900:   '#0f172a',
  slate950:   '#080f1a',
  black:      '#000000',
};

export const Colors = {
  light: {
    // Surfaces
    bg:               Palette.slate50,
    surface:          Palette.white,
    surfaceElevated:  Palette.white,
    surfaceSubtle:    Palette.slate100,

    // Brand
    primary:          Palette.indigo600,
    primaryAlt:       Palette.violet600,
    primaryLight:     Palette.indigo50,
    primaryMid:       Palette.indigo100,

    // Text
    text:             Palette.slate900,
    textSecondary:    Palette.slate600,
    textMuted:        Palette.slate400,
    textInverse:      Palette.white,

    // Borders
    border:           Palette.slate200,
    borderLight:      Palette.slate100,

    // Status
    success:          Palette.emerald500,
    successLight:     '#d1fae5',
    successText:      Palette.emerald600,
    warning:          Palette.amber500,
    warningLight:     '#fef3c7',
    warningText:      Palette.amber900,
    danger:           Palette.red500,
    dangerLight:      '#fee2e2',
    dangerText:       Palette.red600,
    info:             Palette.sky500,
    infoLight:        '#e0f2fe',
    infoText:         Palette.sky900,

    // Navigation
    tabBg:            Palette.white,
    tabBorder:        Palette.slate100,
    tabActive:        Palette.indigo600,
    tabInactive:      Palette.slate400,
    headerBg:         Palette.indigo600,
    headerText:       Palette.white,

    // Shadows
    shadowColor:      Palette.black,
    shadowOpacity:    0.06,
    shadowOpacityMd:  0.1,

    // Icon boxes
    icon: Palette.slate500,
  },
  dark: {
    // Surfaces
    bg:               Palette.slate900,
    surface:          Palette.slate800,
    surfaceElevated:  Palette.slate850,
    surfaceSubtle:    '#1a2538',

    // Brand
    primary:          Palette.indigo400,
    primaryAlt:       Palette.violet500,
    primaryLight:     '#1e1b4b',
    primaryMid:       '#312e81',

    // Text
    text:             Palette.slate50,
    textSecondary:    Palette.slate400,
    textMuted:        Palette.slate500,
    textInverse:      Palette.white,

    // Borders
    border:           Palette.slate700,
    borderLight:      '#253347',

    // Status
    success:          Palette.emerald400,
    successLight:     '#064e3b',
    successText:      Palette.emerald400,
    warning:          Palette.amber400,
    warningLight:     '#451a03',
    warningText:      Palette.amber400,
    danger:           Palette.red400,
    dangerLight:      '#450a0a',
    dangerText:       Palette.red400,
    info:             Palette.sky400,
    infoLight:        '#0c4a6e',
    infoText:         Palette.sky400,

    // Navigation
    tabBg:            Palette.slate800,
    tabBorder:        Palette.slate700,
    tabActive:        Palette.indigo400,
    tabInactive:      Palette.slate500,
    headerBg:         Palette.slate800,
    headerText:       Palette.slate50,

    // Shadows
    shadowColor:      Palette.black,
    shadowOpacity:    0.3,
    shadowOpacityMd:  0.5,

    // Icon boxes
    icon: Palette.slate400,
  },
};

export type AppTheme = typeof Colors.light;

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  full: 999,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const FontSize = {
  xs:   10,
  sm:   12,
  md:   14,
  lg:   16,
  xl:   18,
  xxl:  22,
  xxxl: 28,
  huge: 34,
};

export const Shadow = {
  sm: Platform.select({
    ios:     { shadowOffset: { width: 0, height: 2 }, shadowRadius: 6 },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios:     { shadowOffset: { width: 0, height: 4 }, shadowRadius: 12 },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios:     { shadowOffset: { width: 0, height: 8 }, shadowRadius: 20 },
    android: { elevation: 8 },
    default: {},
  }),
};

// Fonts kept for reference — system fonts used
export const Fonts = Platform.select({
  ios:     { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web:     { sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", serif: "Georgia, serif", rounded: "normal", mono: "monospace" },
});
