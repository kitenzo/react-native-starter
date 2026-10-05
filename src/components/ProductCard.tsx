import { useState } from 'react';
import {
    type AddBlockedReason,
    type BundleBuilder,
    type BundleProduct,
    isVariantBuyable,
    type MoneyFormatter,
    type SectionSelections,
} from '@kitenzo/core';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme';

/** A sentence for every reason the builder can refuse one more. */
const BLOCKED: Record<AddBlockedReason, string> = {
    'not-offered': 'Not in this step',
    'sold-out': 'Sold out',
    stock: 'No more in stock',
    'variant-limit': 'You have the most allowed',
    'product-limit': 'You have the most allowed',
    'section-full': 'This step is full',
    'bundle-full': 'Your bundle is full',
};

interface ProductCardProps {
    product: BundleProduct;
    soldOut: boolean;
    sectionId: number;
    builder: BundleBuilder;
    selections: SectionSelections;
    money: MoneyFormatter;
}

export function ProductCard({ product, soldOut, sectionId, builder, selections, money }: ProductCardProps) {
    const [variantId, setVariantId] = useState(
        () => (product.variants.find(isVariantBuyable) ?? product.variants[0])?.id,
    );
    const variant = product.variants.find(({ id }) => id === variantId) ?? product.variants[0];
    if (!variant) return null;

    // A pick is held under the bundle's own spelling of the id, so this comparison holds.
    const quantity = selections[sectionId]?.find((pick) => pick.variantId === variant.id)?.quantity ?? 0;
    const blocked = soldOut ? 'sold-out' : builder.blockedReason(sectionId, variant.id);
    const image = variant.image ?? product.image ?? product.images?.[0]?.url;
    const surcharge = money.surcharge(variant);

    return (
        <View style={styles.card}>
            <View style={styles.imageWrap}>
                {image ? (
                    <Image
                        source={image}
                        style={styles.image}
                        contentFit="cover"
                        transition={150}
                        accessibilityIgnoresInvertColors
                    />
                ) : null}
                {quantity > 0 ? (
                    <View style={styles.pickedBadge}>
                        <Text style={styles.pickedText}>{quantity} in set</Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.body}>
                <Text style={type.body} numberOfLines={2}>
                    {product.title}
                </Text>
                <Text style={type.small}>
                    {money.format(money.unitPrice(variant))}
                    {surcharge > 0 ? `  +${money.format(surcharge)}` : ''}
                </Text>

                {product.variants.length > 1 ? (
                    <View style={styles.variants}>
                        {product.variants.map((option) => {
                            const selected = option.id === variant.id;
                            const buyable = isVariantBuyable(option);
                            return (
                                <Pressable
                                    key={option.id}
                                    accessibilityRole="radio"
                                    accessibilityState={{ selected, disabled: !buyable }}
                                    accessibilityLabel={`${option.title}${buyable ? '' : ', sold out'}`}
                                    disabled={!buyable}
                                    onPress={() => setVariantId(option.id)}
                                    style={[
                                        styles.chip,
                                        selected && styles.chipSelected,
                                        !buyable && styles.chipDisabled,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.chipText,
                                            selected && styles.chipTextSelected,
                                            !buyable && styles.strike,
                                        ]}
                                    >
                                        {option.title}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                ) : null}

                {quantity > 0 ? (
                    <View style={styles.stepper}>
                        <StepperButton
                            label="−"
                            hint="Remove one"
                            onPress={() => builder.updateQuantity(sectionId, variant.id, quantity - 1)}
                        />
                        <Text style={styles.stepperValue} accessibilityLiveRegion="polite">
                            {quantity}
                        </Text>
                        <StepperButton
                            label="+"
                            hint="Add one more"
                            disabled={blocked !== null}
                            onPress={() => builder.addItem(sectionId, variant.id)}
                        />
                    </View>
                ) : (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: blocked !== null }}
                        accessibilityLabel={`Add ${product.title}`}
                        disabled={blocked !== null}
                        onPress={() => builder.addItem(sectionId, variant.id)}
                        style={({ pressed }) => [
                            styles.add,
                            blocked !== null && styles.addDisabled,
                            pressed && styles.pressed,
                        ]}
                    >
                        <Text style={[styles.addText, blocked !== null && styles.addTextDisabled]}>
                            {blocked ? BLOCKED[blocked] : 'Add'}
                        </Text>
                    </Pressable>
                )}
                {quantity > 0 && blocked && blocked !== 'not-offered' ? (
                    <Text style={type.small}>{BLOCKED[blocked]}</Text>
                ) : null}
            </View>
        </View>
    );
}

function StepperButton({
    label,
    hint,
    onPress,
    disabled,
}: {
    label: string;
    hint: string;
    onPress: () => void;
    disabled?: boolean;
}) {
    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={hint}
            accessibilityState={{ disabled }}
            disabled={disabled}
            hitSlop={8}
            onPress={onPress}
            style={({ pressed }) => [styles.stepperButton, disabled && styles.addDisabled, pressed && styles.pressed]}
        >
            <Text style={[styles.stepperLabel, disabled && styles.addTextDisabled]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    imageWrap: { aspectRatio: 4 / 5, backgroundColor: colors.background },
    image: { flex: 1 },
    pickedBadge: {
        position: 'absolute',
        top: space.sm,
        left: space.sm,
        backgroundColor: colors.accent,
        borderRadius: radius.pill,
        paddingHorizontal: space.sm,
        paddingVertical: 3,
    },
    pickedText: { color: colors.onPrimary, fontSize: 12, fontWeight: '700' },
    body: { padding: space.md, gap: space.sm, flex: 1 },
    variants: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
        minWidth: 36,
        paddingHorizontal: space.sm,
        paddingVertical: 5,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
    },
    chipSelected: { borderColor: colors.text, backgroundColor: colors.text },
    chipDisabled: { opacity: 0.45 },
    chipText: { fontSize: 13, color: colors.text },
    chipTextSelected: { color: colors.onPrimary, fontWeight: '600' },
    strike: { textDecorationLine: 'line-through' },
    add: {
        marginTop: 'auto',
        minHeight: 40,
        borderRadius: radius.pill,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addDisabled: { backgroundColor: colors.border },
    addText: { color: colors.onPrimary, fontWeight: '600', fontSize: 15 },
    addTextDisabled: { color: colors.textMuted },
    pressed: { opacity: 0.85 },
    stepper: {
        marginTop: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: radius.pill,
        backgroundColor: colors.accentSoft,
        padding: 4,
    },
    stepperButton: {
        width: 32,
        height: 32,
        borderRadius: radius.pill,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperLabel: { fontSize: 18, fontWeight: '600', color: colors.text },
    stepperValue: { fontSize: 16, fontWeight: '700', color: colors.text },
});
