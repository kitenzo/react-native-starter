import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '@/hooks/useStore';
import { cartStore } from '@/shopify/cart';
import { colors, radius } from '@/theme';

/** The header's cart link, with a count once something is in it. */
export function CartButton() {
    const cart = useStore(cartStore);
    const count = cart?.totalQuantity ?? 0;

    return (
        <Link href="/cart" asChild>
            <Pressable
                accessibilityRole="link"
                accessibilityLabel={count ? `Cart, ${count} items` : 'Cart'}
                hitSlop={12}
                style={styles.button}
            >
                <Text style={styles.text}>Cart</Text>
                {count > 0 ? (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{count}</Text>
                    </View>
                ) : null}
            </Pressable>
        </Link>
    );
}

const styles = StyleSheet.create({
    button: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
    text: { fontSize: 16, fontWeight: '600', color: colors.text },
    badge: {
        minWidth: 20,
        height: 20,
        paddingHorizontal: 6,
        borderRadius: radius.pill,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },
});
