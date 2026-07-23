import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StatusBar } from 'react-native';
import { colors, typography, spacing } from '../../theme';

export default function SplashScreen() {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
            <View style={styles.emblemContainer}>
                <Text style={styles.emblemIcon}>🏛️</Text>
            </View>
            <Text style={styles.governmentText}>Government of Gujarat</Text>
            <Text style={styles.title}>Vadodara Municipal Corporation</Text>
            <View style={styles.divider} />
            <Text style={styles.appName}>NagarSeva Mobile App</Text>
            
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    emblemContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emblemIcon: {
        fontSize: 50,
    },
    governmentText: {
        ...typography.small,
        color: colors.textMuted,
        fontWeight: '500',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    title: {
        ...typography.heading2,
        color: colors.primary,
        marginTop: spacing.sm,
        textAlign: 'center',
    },
    divider: {
        width: 80,
        height: 3,
        backgroundColor: colors.primary,
        marginVertical: spacing.lg,
    },
    appName: {
        ...typography.heading3,
        color: colors.textSecondary,
    },
    loader: {
        marginTop: spacing.xxl,
    },
});
