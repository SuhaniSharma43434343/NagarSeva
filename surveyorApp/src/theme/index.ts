// NagarSeva Premium Design System

export const colors = {
  // Vibrant Primary - Deep Royal Blue / Indigo
  primary: '#4338CA', 
  primaryDark: '#312E81',
  primaryLight: '#818CF8',
  primaryFaded: 'rgba(67, 56, 202, 0.15)',

  // Secondary - Soft Teal / Aqua
  secondary: '#0D9488', 
  secondaryLight: '#5EEAD4',

  // Status Colors
  success: '#10B981', // Emerald
  warning: '#F59E0B', // Amber
  danger: '#EF4444', // Red
  destructive: '#EF4444',
  info: '#3B82F6', // Blue

  // Neutrals - Modern sleek grays
  background: '#F8FAFC', // Very light blue-gray
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9', // Slightly darker background for contrast
  accent: '#EEF2FF', // Primary tinted background
  border: '#E2E8F0', 
  borderLight: '#F1F5F9',

  // Text
  textPrimary: '#0F172A', // Slate 900
  textSecondary: '#475569', // Slate 600
  textMuted: '#94A3B8', // Slate 400
  textInverse: '#FFFFFF',

  // Status-specific backgrounds
  pendingBg: '#FEF3C7',
  pendingText: '#92400E',
  activeBg: '#DBEAFE',
  activeText: '#1E40AF',
  completedBg: '#D1FAE5',
  completedText: '#065F46',

  // Dark Mode Overrides (Optional support later)
  glassBg: 'rgba(255, 255, 255, 0.85)',
};

export const typography = {
  heading1: {
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  heading2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  heading3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  caption: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  small: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Premium rounded corners
export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

// Deep, natural shadows
export const shadows = {
  '2xs': {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  xs: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sm: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  md: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  lg: {
    shadowColor: '#4338CA', // Colored shadow for primary elements
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  xl: {
    shadowColor: '#4338CA',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 16,
  },
};

export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
};
