import type { CSSProperties } from 'react';

export const colors = {
  primary: '#667eea',
  primaryHover: '#5a67d8',
  background: '#f5f7fa',
  cardBg: '#ffffff',
  inputBg: '#f9fafb',
  border: '#e5e7eb',
  borderLight: '#f3f4f6',
  text: '#1a1a1a',
  textSecondary: '#6b7280',
  textMuted: '#9ca3af',
  success: '#10b981',
  successBg: '#dcfce7',
  warning: '#f59e0b',
  warningBg: '#fef3c7',
  error: '#ef4444',
  errorBg: '#fee2e2',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const baseStyles = {
  card: {
    backgroundColor: colors.cardBg,
    borderRadius: borderRadius.xl,
    border: `1px solid ${colors.border}`,
    padding: spacing.md,
  } as CSSProperties,

  input: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.border}`,
    borderRadius: borderRadius.sm,
    fontSize: '14px',
    outline: 'none',
    backgroundColor: colors.cardBg,
  } as CSSProperties,

  button: {
    padding: '12px 24px',
    borderRadius: borderRadius.md,
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s ease',
  } as CSSProperties,

  buttonPrimary: {
    padding: '16px 24px',
    borderRadius: borderRadius.lg,
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: colors.primary,
    color: '#fff',
    width: '100%',
    transition: 'all 0.2s ease',
  } as CSSProperties,

  buttonSecondary: {
    padding: '12px 24px',
    borderRadius: borderRadius.sm,
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.inputBg,
    color: colors.text,
    transition: 'all 0.2s ease',
  } as CSSProperties,

  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  } as CSSProperties,

  sectionTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: colors.text,
  } as CSSProperties,
};

export const tabStyles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  } as CSSProperties,

  tab: {
    padding: '12px 24px',
    borderRadius: borderRadius.full,
    border: 'none',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  } as CSSProperties,

  tabActive: {
    backgroundColor: colors.text,
    color: '#fff',
  } as CSSProperties,

  tabInactive: {
    backgroundColor: 'transparent',
    color: colors.textSecondary,
  } as CSSProperties,
};

export const formatSats = (sats: number): string => {
  return sats.toLocaleString() + ' sats';
};

export const formatAddress = (address: string, chars = 6): string => {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
};
