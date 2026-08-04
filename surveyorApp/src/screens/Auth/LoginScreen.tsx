import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StatusBar,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Button } from '../../components';
import { useAuth, Role } from '../../contexts/AuthContext';

type AuthStackParamList = {
    RoleSelection: undefined;
    Login: { role: Role };
};

export default function LoginScreen() {
    const insets = useSafeAreaInsets();
    const route = useRoute<RouteProp<AuthStackParamList, 'Login'>>();
    const navigation = useNavigation();
    const role = route.params?.role || 'SURVEYOR';
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    async function handleLogin() {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setLoading(true);
        const result = await login(email, password, role);
        setLoading(false);

        if (!result.success) {
            Alert.alert('Login Failed', result.message || 'Invalid credentials. Please try again.');
        }
    }

    const titleText = role === 'ENGINEER' ? 'Engineer Login' : 'Surveyor Login';
    const roleIcon = role === 'ENGINEER' ? '🛠️' : '🔍';

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primaryDark} />
            <View style={[styles.headerBg, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <Text style={styles.backButton} onPress={() => navigation.goBack()}>← Back</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.logoContainer}>
                    <View style={styles.iconCircle}>
                        <Text style={styles.roleIcon}>{roleIcon}</Text>
                    </View>
                    <Text style={styles.logoTitle}>NagarSeva</Text>
                    <Text style={styles.logoSubtitle}>Government of Gujarat</Text>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.formContainer}
                >
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{titleText}</Text>
                            <Text style={styles.instructionText}>
                                Enter your credentials to access your workspace.
                            </Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email Address</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="name@vmc.gov.in"
                                placeholderTextColor={colors.textMuted}
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoComplete="email"
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="••••••••"
                                placeholderTextColor={colors.textMuted}
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                autoComplete="password"
                            />
                        </View>

                        <Button
                            title="Secure Login"
                            onPress={handleLogin}
                            loading={loading}
                            style={styles.loginButton}
                            size="lg"
                        />

                        <Text style={styles.helpText}>
                            Forgot password? Contact IT Helpdesk
                        </Text>
                    </View>
                </KeyboardAvoidingView>

                <View style={styles.footer}>
                    <Text style={styles.digitalIndiaText}>Digital India 🇮🇳</Text>
                    <Text style={styles.copyrightText}>
                        © 2024 Vadodara Municipal Corporation
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerBg: {
        backgroundColor: colors.primary,
        height: 280,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
        ...shadows.lg,
    },
    headerContent: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.md,
    },
    backButton: {
        ...typography.bodyBold,
        color: colors.textInverse,
        opacity: 0.9,
        fontSize: 18,
    },
    scrollContent: {
        flexGrow: 1,
        paddingTop: 40,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        ...shadows.lg,
        borderWidth: 4,
        borderColor: colors.primaryLight + '40',
    },
    roleIcon: {
        fontSize: 36,
    },
    logoTitle: {
        ...typography.heading1,
        color: colors.textInverse,
        fontSize: 36,
        letterSpacing: -1,
    },
    logoSubtitle: {
        ...typography.small,
        color: colors.primaryLight,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: spacing.xs,
        fontWeight: '800',
    },
    formContainer: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.md,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: 30,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: colors.borderLight,
        ...shadows.xl,
        elevation: 10,
    },
    cardHeader: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    cardTitle: {
        ...typography.heading2,
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        fontSize: 26,
    },
    instructionText: {
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        ...typography.small,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    input: {
        backgroundColor: colors.surfaceAlt,
        borderRadius: borderRadius.lg,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        ...typography.body,
        color: colors.textPrimary,
        borderWidth: 1.5,
        borderColor: colors.border,
        height: 56,
    },
    loginButton: {
        marginTop: spacing.md,
    },
    helpText: {
        ...typography.small,
        color: colors.primary,
        textAlign: 'center',
        marginTop: spacing.xl,
        fontWeight: '600',
    },
    footer: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        marginTop: 'auto',
    },
    digitalIndiaText: {
        ...typography.bodyBold,
        color: colors.textSecondary,
    },
    copyrightText: {
        ...typography.small,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },
});
