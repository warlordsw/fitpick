export const theme = {
    colors: {
        primary: '#6C63FF', // Example premium purple
        secondary: '#03DAC6',
        background: '#121212',
        surface: '#1E1E1E',
        text: '#FFFFFF',
        textSecondary: '#A0A0A0',
        error: '#CF6679',
        success: '#00C853',
        glass: 'rgba(255, 255, 255, 0.1)',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
    },
    borderRadius: {
        s: 8,
        m: 16,
        l: 24,
    },
    typography: {
        h1: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
        h2: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
        body: { fontSize: 16, color: '#FFFFFF' },
        button: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
    }
};

export const commonStyles = {
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.m,
    },
    glassCard: {
        backgroundColor: theme.colors.glass,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
};
