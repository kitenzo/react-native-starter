import { useEffect, useState } from 'react';
import { formatCurrency } from '@kitenzo/core';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Message } from '@/components/ui';
import { useStore } from '@/hooks/useStore';
import { cartStore, type Money, type StorefrontCartLine } from '@/shopify/cart';
import { colors, radius, space, type } from '@/theme';

const money = ({ amount, currencyCode }: Money) => formatCurrency(amount, currencyCode);

export default function CartScreen() {
    const cart = useStore(cartStore);
    const insets = useSafeAreaInsets();
    const [removing, setRemoving] = useState<string | null>(null);

    useEffect(() => {
        cartStore.refresh().catch(() => {
            // Keep showing the cart we have; the next change refreshes it.
        });
    }, []);

    if (!cart?.lines.nodes.length) {
        return (
            <Message
                title="Your cart is empty"
                body="Build a bundle and it appears here, priced as one."
                action={<Button label="Browse bundles" variant="secondary" onPress={() => router.back()} />}
            />
        );
    }

    const remove = async (line: StorefrontCartLine) => {
        setRemoving(line.id);
        try {
            await cartStore.removeLine(line.id);
        } finally {
            setRemoving(null);
        }
    };

    return (
        <View style={styles.screen}>
            <FlatList
                data={cart.lines.nodes}
                keyExtractor={(line) => line.id}
                contentContainerStyle={styles.list}
                renderItem={({ item: line }) => (
                    <View style={styles.line}>
                        {line.merchandise.image ? (
                            <Image source={line.merchandise.image.url} style={styles.image} contentFit="cover" />
                        ) : (
                            <View style={styles.image} />
                        )}
                        <View style={styles.lineBody}>
                            <Text style={type.heading}>{line.merchandise.product.title}</Text>
                            {/* A Kitenzo bundle, merged by Shopify's Cart Transform: list what went in. */}
                            {line.lineComponents?.map((component) => (
                                <Text key={component.id} style={type.small}>
                                    {component.quantity} × {component.merchandise.product.title}
                                    {component.merchandise.title !== 'Default Title'
                                        ? `, ${component.merchandise.title}`
                                        : ''}
                                </Text>
                            ))}
                            <View style={styles.lineFooter}>
                                <Text style={styles.linePrice}>{money(line.cost.totalAmount)}</Text>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Remove ${line.merchandise.product.title}`}
                                    disabled={removing !== null}
                                    hitSlop={8}
                                    onPress={() => remove(line)}
                                >
                                    <Text style={styles.remove}>{removing === line.id ? 'Removing…' : 'Remove'}</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                )}
            />
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
                <View style={styles.totalRow}>
                    <Text style={type.heading}>Subtotal</Text>
                    <Text style={styles.total}>{money(cart.cost.subtotalAmount)}</Text>
                </View>
                <Text style={type.small}>Shipping and taxes are worked out at checkout.</Text>
                {/* Shopify's own checkout, in an in-app browser. The bundle price carries through. */}
                <Button label="Checkout" onPress={() => WebBrowser.openBrowserAsync(cart.checkoutUrl)} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    list: { padding: space.lg, gap: space.md },
    line: {
        flexDirection: 'row',
        gap: space.md,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: space.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    image: { width: 72, height: 90, borderRadius: radius.sm, backgroundColor: colors.background },
    lineBody: { flex: 1, gap: 2 },
    lineFooter: {
        marginTop: 'auto',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: space.sm,
    },
    linePrice: { fontSize: 16, fontWeight: '700', color: colors.text },
    remove: { fontSize: 14, color: colors.textMuted, textDecorationLine: 'underline' },
    footer: {
        backgroundColor: colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        padding: space.lg,
        gap: space.sm,
    },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    total: { fontSize: 20, fontWeight: '700', color: colors.text },
});
