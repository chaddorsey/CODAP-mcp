/**
 * Design tokens for CODAP Plugin components
 * Based on CODAP design system patterns and modern UI principles
 */

// Color palette - CODAP-inspired with accessibility in mind
export const colors = {
  // Primary colors (CODAP blue theme)
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#007cba', // CODAP primary blue
    600: '#005a87',
    700: '#004c73',
    800: '#003d5c',
    900: '#002e45',
  },
  
  // Semantic colors
  semantic: {
    success: '#4caf50',
    successLight: '#e8f5e8',
    successBorder: '#c8e6c9',
    warning: '#ff9800',
    warningLight: '#fff3e0',
    warningBorder: '#ffcc02',
    error: '#f44336',
    errorLight: '#ffebee',
    errorBorder: '#ffcdd2',
    critical: '#d32f2f',
    info: '#2196f3',
    infoLight: '#e3f2fd',
  },
  
  // Neutral colors
  neutral: {
    0: '#ffffff',
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },
  
  // Background colors
  background: {
    primary: '#ffffff',
    secondary: '#f9f9f9',
    tertiary: '#f5f5f5',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  
  // Text colors
  text: {
    primary: '#333333',
    secondary: '#666666',
    disabled: '#9e9e9e',
    inverse: '#ffffff',
  },
} as const;

// Typography scale
export const typography = {
  fontFamily: {
    primary: 'inherit', // Inherit from CODAP
    monospace: "'Courier New', 'Monaco', 'Menlo', monospace",
  },
  
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.85rem',    // 13.6px
    base: '0.9rem',   // 14.4px
    md: '0.95rem',    // 15.2px
    lg: '1.1rem',     // 17.6px
    xl: '1.2rem',     // 19.2px
    '2xl': '1.4rem',  // 22.4px
    '3xl': '1.6rem',  // 25.6px
  },
  
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
  
  letterSpacing: {
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.1em',
  },
} as const;

// Spacing scale (based on 0.25rem = 4px)
export const spacing = {
  0: '0',
  1: '0.25rem',  // 4px
  2: '0.5rem',   // 8px
  3: '0.75rem',  // 12px
  4: '1rem',     // 16px
  5: '1.25rem',  // 20px
  6: '1.5rem',   // 24px
  7: '1.75rem',  // 28px
  8: '2rem',     // 32px
  10: '2.5rem',  // 40px
  12: '3rem',    // 48px
  16: '4rem',    // 64px
  20: '5rem',    // 80px
} as const;

// Border radius
export const borderRadius = {
  none: '0',
  sm: '2px',
  base: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  '2xl': '16px',
  full: '9999px',
} as const;

// Shadows
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
} as const;

// Breakpoints for responsive design
export const breakpoints = {
  xs: '320px',   // Small phones
  sm: '480px',   // Large phones
  md: '768px',   // Tablets
  lg: '1024px',  // Small laptops
  xl: '1200px',  // Desktops
  '2xl': '1400px', // Large desktops
} as const;

// Z-index scale
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Animation durations
export const duration = {
  instant: '0ms',
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

// Easing functions
export const easing = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  bounceOut: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

// Component-specific tokens
export const components = {
  button: {
    minHeight: '44px', // WCAG touch target minimum
    borderWidth: '1px',
    paddingX: spacing[4],
    paddingY: spacing[2],
  },
  
  input: {
    minHeight: '44px',
    borderWidth: '1px',
    paddingX: spacing[3],
    paddingY: spacing[2],
  },
  
  banner: {
    padding: spacing[4],
    borderWidth: '1px',
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
} as const;

// Media query helpers
export const mediaQueries = {
  xs: `(min-width: ${breakpoints.xs})`,
  sm: `(min-width: ${breakpoints.sm})`,
  md: `(min-width: ${breakpoints.md})`,
  lg: `(min-width: ${breakpoints.lg})`,
  xl: `(min-width: ${breakpoints.xl})`,
  '2xl': `(min-width: ${breakpoints['2xl']})`,
  
  // Max-width queries
  maxXs: `(max-width: calc(${breakpoints.sm} - 1px))`,
  maxSm: `(max-width: calc(${breakpoints.md} - 1px))`,
  maxMd: `(max-width: calc(${breakpoints.lg} - 1px))`,
  maxLg: `(max-width: calc(${breakpoints.xl} - 1px))`,
  maxXl: `(max-width: calc(${breakpoints['2xl']} - 1px))`,
  
  // Accessibility queries
  prefersReducedMotion: '(prefers-reduced-motion: reduce)',
  prefersHighContrast: '(prefers-contrast: high)',
  prefersDarkMode: '(prefers-color-scheme: dark)',
} as const;

// Export all tokens as a single object for easy access
export const designTokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  breakpoints,
  zIndex,
  duration,
  easing,
  components,
  mediaQueries,
} as const;

export default designTokens; 
