import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

type AuthStackParamList = {
    RoleSelection: undefined;
    Login: { role: 'SURVEYOR' | 'ENGINEER' };
};

type RoleSelectionScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'RoleSelection'>;

function RoleCard({ title, description, icon, onPress }: { title: string, description: string, icon: string, onPress: () => void }) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 20 }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
    };

    return (
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
                style={({ pressed }) => [
                    styles.card,
                    pressed && styles.cardPressed
                ]}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={onPress}
            >
                <View style={styles.cardIconContainer}>
                    <Text style={styles.cardIcon}>{icon}</Text>
                </View>
                <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <Text style={styles.cardDescription}>{description}</Text>
                </View>
                <View style={styles.cardArrow}>
                    <Text style={styles.arrowIcon}>→</Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

export default function RoleSelectionScreen() {
    const navigation = useNavigation<RoleSelectionScreenNavigationProp>();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
            
            <View style={styles.heroSection}>
                <View style={styles.emblemContainer}>
                    <Text style={styles.emblemIcon}>🏛️</Text>
                </View>
                <Text style={styles.governmentText}>Government of Gujarat</Text>
                <Text style={styles.title}>NagarSeva</Text>
                <Text style={styles.subtitle}>Civic Operations Portal</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.headerTextContainer}>
                    <Text style={styles.welcomeText}>Welcome back</Text>
                    <Text style={styles.instruction}>Select your operational role to securely log in to the portal.</Text>
                </View>
                
                <RoleCard 
                    title="Surveyor" 
                    description="Conduct field surveys and report active civic issues." 
                    icon="🔍" 
                    onPress={() => navigation.navigate('Login', { role: 'SURVEYOR' })}
                />

                <RoleCard 
                    title="Engineer" 
                    description="View assignments and update issue resolution status." 
                    icon="🛠️" 
                    onPress={() => navigation.navigate('Login', { role: 'ENGINEER' })}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    heroSection: {
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
        borderBottomLeftRadius: borderRadius.xxl,
        borderBottomRightRadius: borderRadius.xxl,
        paddingTop: spacing.xxxl + 40, 
        ...shadows.lg,
        zIndex: 10,
    },
    emblemContainer: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        ...shadows.md,
    },
    emblemIcon: {
        fontSize: 44,
    },
    governmentText: {
        ...typography.small,
        color: colors.primaryLight,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    title: {
        ...typography.heading1,
        color: colors.textInverse,
        marginTop: spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        ...typography.body,
        color: colors.textInverse,
        opacity: 0.8,
        marginTop: spacing.xs,
    },
    content: {
        flex: 1,
        padding: spacing.xl,
        paddingTop: spacing.xxl,
    },
    headerTextContainer: {
        marginBottom: spacing.xxl,
    },
    welcomeText: {
        ...typography.heading2,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    instruction: {
        ...typography.body,
        color: colors.textSecondary,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.md,
    },
    cardPressed: {
        borderColor: colors.primaryLight,
        backgroundColor: colors.accent,
    },
    cardIconContainer: {
        width: 56,
        height: 56,
        borderRadius: borderRadius.md,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.lg,
    },
    cardIcon: {
        fontSize: 28,
    },
    cardTextContainer: {
        flex: 1,
    },
    cardTitle: {
        ...typography.heading3,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    cardDescription: {
        ...typography.caption,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    cardArrow: {
        marginLeft: spacing.md,
        padding: spacing.sm,
    },
    arrowIcon: {
        fontSize: 24,
        color: colors.primaryLight,
    },
});
