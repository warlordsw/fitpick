export const theme = {
    colors: {
        primary: '#F72585', // Neon Pink (High Energy)
        secondary: '#4CC9F0', // Neon Blue (Modern)
        tertiary: '#7209B7', // Deep Purple (Accent)
        background: '#0F0E17', // Very Dark Blue/Black
        surface: '#232230', // Dark Blue/Gray Surface
        text: '#FFFFFE',
        textSecondary: '#A7A9BE',
        error: '#FF0055',
        success: '#00F5D4', // Bright Turquoise
        glass: 'rgba(255, 255, 255, 0.05)',
        cardGradient: ['#232230', '#2E2C3D'] // For gradients if needed
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
        xxl: 48
    },
    borderRadius: {
        s: 12, // More rounded
        m: 20,
        l: 30,
        xl: 40
    },
    typography: {
        h1: { fontSize: 32, fontWeight: 'bold' as any, color: '#FFFFFE' },
        h2: { fontSize: 24, fontWeight: 'bold' as any, color: '#FFFFFE' },
        body: { fontSize: 16, color: '#A7A9BE' },
        button: { fontSize: 16, fontWeight: 'bold' as any, color: '#FFFFFE' },
    }
};

export const commonStyles = {
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.m,
    },
    glassCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10, // High elevation for modern depth
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
};
