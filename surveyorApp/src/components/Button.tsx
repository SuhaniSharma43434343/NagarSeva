import React, { useRef } from 'react';
import {
    Pressable,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle,
    Animated,
} from 'react-native';
import { colors, typography, borderRadius, spacing, shadows } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'warning' | 'info' | 'ghost' | 'link';
type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    icon?: React.ReactNode;
}

export default function Button({
    title,
    onPress,
    variant = 'primary',
    size = 'default',
    disabled = false,
    loading = false,
    style,
    textStyle,
    icon,
}: ButtonProps) {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
            speed: 20,
            bounciness: 5,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 20,
            bounciness: 5,
        }).start();
    };

    const buttonStyles = [
        styles.button,
        styles[`size_${size}`],
        styles[variant],
        disabled && styles.disabled,
        variant === 'primary' && !disabled && shadows.md,
        style,
    ];

    const isLightText = ['primary', 'secondary', 'danger', 'success', 'warning', 'info'].includes(variant);
    const textStyles = [
        styles.text,
        styles[`text_${size}`],
        isLightText ? styles.solidText : styles.darkText,
        variant === 'link' && styles.linkText,
        textStyle,
    ];

    const containerLayout = style ? {
        flex: style.flex,
        flexGrow: style.flexGrow,
        width: style.width,
    } : undefined;

    return (
        <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, containerLayout]}>
            <Pressable
                style={buttonStyles}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
            >
                {loading ? (
                    <ActivityIndicator
                        size="small"
                        color={isLightText ? colors.textInverse : colors.primary}
                    />
                ) : (
                    <>
                        {icon}
                        <Text style={textStyles}>{title}</Text>
                    </>
                )}
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        minHeight: 52,
        width: '100%',
    },
    // Size variants
    size_sm: {
        paddingVertical: spacing.xs,
        paddingHorizontal: spacing.md,
    },
    size_default: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
    },
    size_lg: {
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
    },
    size_icon: {
        padding: spacing.md,
        aspectRatio: 1,
    },
    // Color variants
    primary: {
        backgroundColor: colors.primary,
    },
    secondary: {
        backgroundColor: colors.secondary,
    },
    danger: {
        backgroundColor: colors.danger,
    },
    success: {
        backgroundColor: colors.success,
    },
    warning: {
        backgroundColor: colors.warning,
    },
    info: {
        backgroundColor: colors.info,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    ghost: {
        backgroundColor: 'transparent',
    },
    link: {
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
    },
    disabled: {
        opacity: 0.5,
    },
    // Text styles
    text: {
        ...typography.bodyBold,
        includeFontPadding: false,
        textAlignVertical: 'center',
    },
    text_sm: {
        ...typography.small,
        fontWeight: '600',
    },
    text_default: {
        ...typography.bodyBold,
    },
    text_lg: {
        ...typography.bodyBold,
        fontSize: 18,
    },
    text_icon: {
        ...typography.body,
    },
    solidText: {
        color: colors.textInverse,
    },
    darkText: {
        color: colors.primary,
    },
    linkText: {
        textDecorationLine: 'underline',
    },
});
