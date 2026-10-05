import { useMemo } from 'react';
import {
    type BundleBuilderSnapshot,
    type BundleCartState,
    type BundleDetail,
    type BundleOffer,
    calculatePriceWithConditions,
    getDiscountLadderProgress,
    getDiscountTierText,
    type MoneyFormatter,
    resolvePresentmentPricing,
    type ShopSettings,
} from '@kitenzo/core';
import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius, space, type } from '@/theme';
import { Button } from './ui';

interface BundleSummaryProps {
    bundle: BundleDetail;
    offer: BundleOffer;
    snapshot: BundleBuilderSnapshot;
    settings: ShopSettings | undefined;
    money: MoneyFormatter;
    cart: BundleCartState;
    /** The next visible step, when the shopper should go there before adding. */
    nextStep: { name: string; go: () => void } | null;
    onAdd: () => void;
}

/** The bar under the builder: what is picked, what it costs, and what to do next. */
export function BundleSummary({ bundle, offer, snapshot, settings, money, cart, nextStep, onAdd }: BundleSummaryProps) {
    const insets = useSafeAreaInsets();
    const { selections, progress, isSatisfied, isSectionValid, problems } = snapshot;
    const picked = progress.quantity - progress.requiredQuantity;

    // The price checkout will charge: the bundle's discount (or the conditions
    // engine's), then converted to the shopper's market when one was requested.
    const pricing = useMemo(() => {
        const base = calculatePriceWithConditions(bundle, selections, { currency: settings?.currency });
        return resolvePresentmentPricing(bundle, selections, base) ?? base;
    }, [bundle, selections, settings?.currency]);
    const saving = Number(pricing.originalPrice) - Number(pricing.discountedPrice);

    const thumbnails = useMemo(() => pickedImages(bundle, offer, snapshot), [bundle, offer, snapshot]);
    const hint = statusLine(bundle, snapshot, money, picked);

    const showNext = nextStep !== null && !isSatisfied && isSectionValid;

    // A rule the selection breaks (a price limit, "sold in pairs"), once every step is
    // filled. Counts are left out: the hint above already says "pick 1 more".
    const stepsFilled = !Object.values(progress.sections).some(({ missing }) => missing > 0) && progress.missing === 0;
    const problem = stepsFilled
        ? problems.find(({ rule }) => rule?.type !== 'total-number-of-products')
        : undefined;

    return (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
            {thumbnails.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
                    {thumbnails.map(({ key, uri }) => (
                        <Image key={key} source={uri} style={styles.thumb} contentFit="cover" />
                    ))}
                </ScrollView>
            ) : null}

            <View style={styles.row}>
                <View style={styles.flex}>
                    <Text style={type.small} accessibilityLiveRegion="polite">
                        {hint}
                    </Text>
                    {problem ? (
                        <Text style={[type.small, styles.problem]}>{problem.message}</Text>
                    ) : null}
                </View>
                {progress.quantity > 0 ? (
                    <View style={styles.price}>
                        {saving > 0.004 ? (
                            <Text style={[type.small, styles.was]}>{money.format(pricing.originalPrice)}</Text>
                        ) : null}
                        <Text style={styles.total}>{money.format(pricing.discountedPrice)}</Text>
                    </View>
                ) : null}
            </View>

            {cart.shopperMessage ? <Text style={[type.small, styles.problem]}>{cart.shopperMessage}</Text> : null}

            {showNext ? (
                <Button label={`Next: ${nextStep.name}`} onPress={nextStep.go} />
            ) : (
                <Button
                    label={cart.isResumable ? 'Try again' : 'Add to cart'}
                    onPress={onAdd}
                    disabled={!isSatisfied && !cart.isResumable}
                    busy={cart.isAdding}
                    accessibilityHint={isSatisfied ? undefined : hint}
                />
            )}
        </View>
    );
}

/** One line telling the shopper where they are: what is missing, or what the next tier gives. */
function statusLine(
    bundle: BundleDetail,
    snapshot: BundleBuilderSnapshot,
    money: MoneyFormatter,
    picked: number,
): string {
    const { progress, currentSection, selections } = snapshot;
    const stepMissing = currentSection ? (progress.sections[currentSection.id]?.missing ?? 0) : 0;

    if (stepMissing > 0) return `Pick ${stepMissing} more in ${currentSection?.name}`;
    if (progress.missing > 0) return `Pick ${progress.missing} more to complete your set`;

    // The merchant's own "add 1 more for 15% off" sentence wins when there is one.
    const tierText = getDiscountTierText(bundle, selections, { money });
    if (tierText) return tierText;

    const { next, missing } = getDiscountLadderProgress(bundle, progress.quantity);
    if (next && missing > 0) {
        const off =
            next.discountType === 'percentage' ? `${Number(next.discount)}% off` : `${money.format(next.discount)} off`;
        return `Add ${missing} more for ${off}`;
    }
    if (picked > 0) return `${picked} ${picked === 1 ? 'item' : 'items'} in your set`;
    return progress.requiredQuantity > 0 ? 'Everything in this bundle is included' : 'Choose your items to begin';
}

/** One thumbnail per unit in the bundle, included products first, for the strip above the total. */
function pickedImages(bundle: BundleDetail, offer: BundleOffer, snapshot: BundleBuilderSnapshot): { key: string; uri: string }[] {
    const images: { key: string; uri: string }[] = [];
    for (const { required, product, quantity } of offer.requiredProducts) {
        const uri = product?.image ?? product?.images?.[0]?.url;
        for (let unit = 0; uri && unit < quantity; unit += 1) {
            images.push({ key: `required-${required.shopifyProductId}-${unit}`, uri });
        }
    }
    for (const section of bundle.sections) {
        for (const pick of snapshot.selections[section.id] ?? []) {
            const product = section.products.find(({ variants }) => variants.some(({ id }) => id === pick.variantId));
            const variant = product?.variants.find(({ id }) => id === pick.variantId);
            const uri = variant?.image ?? product?.image ?? product?.images?.[0]?.url;
            for (let unit = 0; uri && unit < pick.quantity; unit += 1) {
                images.push({ key: `${section.id}-${pick.variantId}-${unit}`, uri });
            }
        }
    }
    return images;
}

const styles = StyleSheet.create({
    bar: {
        backgroundColor: colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.border,
        paddingHorizontal: space.lg,
        paddingTop: space.md,
        gap: space.md,
    },
    thumbs: { gap: 6 },
    thumb: { width: 40, height: 48, borderRadius: radius.sm, backgroundColor: colors.background },
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
    flex: { flex: 1, gap: 2 },
    price: { alignItems: 'flex-end' },
    was: { textDecorationLine: 'line-through' },
    total: { fontSize: 20, fontWeight: '700', color: colors.text },
    problem: { color: colors.danger },
});
