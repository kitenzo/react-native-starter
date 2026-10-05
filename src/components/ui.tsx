import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme';

interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    busy?: boolean;
    accessibilityHint?: string;
}

export function Button({ label, onPress, variant = 'primary', disabled, busy, accessibilityHint }: ButtonProps) {
    const primary = variant === 'primary';
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || busy, busy }}
            accessibilityHint={accessibilityHint}
            disabled={disabled || busy}
            onPress={onPress}
            style={({ pressed }) => [
                styles.button,
                primary ? styles.primary : styles.secondary,
                (disabled || busy) && (primary ? styles.primaryDisabled : styles.secondaryDisabled),
                pressed && styles.pressed,
            ]}
        >
            {busy ? (
                <ActivityIndicator color={primary ? colors.onPrimary : colors.text} />
            ) : (
                <Text style={[styles.label, { color: primary ? colors.onPrimary : colors.text }]}>{label}</Text>
            )}
        </Pressable>
    );
}

/** A centred loading, error or empty state. */
export function Message({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
    return (
        <View style={styles.message}>
            <Text style={[type.heading, styles.center]}>{title}</Text>
            {body ? <Text style={[type.small, styles.center]}>{body}</Text> : null}
            {action}
        </View>
    );
}

export function Loading() {
    return (
        <View style={styles.message}>
            <ActivityIndicator color={colors.text} />
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        minHeight: 50,
        borderRadius: radius.pill,
        paddingHorizontal: space.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    primaryDisabled: { backgroundColor: colors.disabled },
    secondaryDisabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
    label: { fontSize: 16, fontWeight: '600' },
    message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl },
    center: { textAlign: 'center' },
});
