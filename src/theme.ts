/**
 * Design tokens. Change these to make the app your shop's own; every screen
 * reads its colours, spacing and type from here.
 */
export const colors = {
    background: '#F4F2ED',
    surface: '#FFFFFF',
    text: '#0C0B09',
    textMuted: '#6B665C',
    border: '#E2DED5',
    accent: '#5E6B45',
    accentSoft: '#E6EADB',
    primary: '#0C0B09',
    onPrimary: '#F4F2ED',
    danger: '#A23B2A',
    disabled: '#C9C4B8',
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const type = {
    title: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.4, color: colors.text },
    heading: { fontSize: 17, fontWeight: '600' as const, color: colors.text },
    body: { fontSize: 15, lineHeight: 21, color: colors.text },
    small: { fontSize: 13, lineHeight: 18, color: colors.textMuted },
    label: {
        fontSize: 12,
        fontWeight: '600' as const,
        letterSpacing: 0.4,
        textTransform: 'uppercase' as const,
        color: colors.textMuted,
    },
};
