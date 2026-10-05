import { useEffect, useMemo, useRef } from 'react';
import {
    type BundleDetail,
    type BundleOffer,
    createBundleBuilder,
    createBundleCartFlow,
    createMoneyFormatter,
    getBundleOffer,
    htmlToPlainText,
    type KitenzoClient,
    type MoneyFormatter,
    type ShopSettings,
} from '@kitenzo/core';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { BundleSummary } from '@/components/BundleSummary';
import { ProductCard } from '@/components/ProductCard';
import { StepTabs } from '@/components/StepTabs';
import { Button, Loading, Message } from '@/components/ui';
import { config } from '@/config';
import { useAsync } from '@/hooks/useAsync';
import { useStore } from '@/hooks/useStore';
import { kitenzo, loadSettings } from '@/kitenzo';
import { cartStore } from '@/shopify/cart';
import { colors, radius, space, type } from '@/theme';

export default function BundleScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { data, error, loading, reload } = useAsync(async () => {
        if (!kitenzo) throw new Error('Kitenzo is not configured');
        const [bundle, settings] = await Promise.all([kitenzo.getBundle(Number(id)), loadSettings(kitenzo)]);
        return { bundle, settings };
    }, [id]);

    if (loading) return <Loading />;
    if (error || !data || !kitenzo) {
        return (
            <Message
                title="Couldn't load this bundle"
                body={error?.message}
                action={<Button label="Try again" variant="secondary" onPress={reload} />}
            />
        );
    }
    return <Builder client={kitenzo} bundle={data.bundle} settings={data.settings} />;
}

function Builder({
    client,
    bundle,
    settings,
}: {
    client: KitenzoClient;
    bundle: BundleDetail;
    settings: ShopSettings;
}) {
    // The SDK's state machine holds the selection and enforces the bundle's rules.
    const builder = useMemo(() => createBundleBuilder(bundle), [bundle]);
    const snapshot = useStore(builder);

    // The SDK's add-to-cart flow: /configure, the lines, the `_bundles` merge, and
    // recovery from a lost answer. This app only supplies the Storefront API cart.
    const flow = useMemo(
        () =>
            createBundleCartFlow({
                client,
                settings,
                operations: cartStore.operations,
                onAdded: () => router.push('/cart'),
            }),
        [client, settings],
    );
    const cart = useStore(flow);

    const money = useMemo(() => createMoneyFormatter(bundle, settings), [bundle, settings]);
    const offer = useMemo(
        () => getBundleOffer(bundle, { settings, conditions: snapshot.conditions }),
        [bundle, settings, snapshot.conditions],
    );

    // Start on the first step the shopper can see.
    useEffect(() => {
        const first = offer.sections[0]?.section.id;
        if (first !== undefined && !offer.sections.some(({ section }) => section.id === snapshot.currentSection?.id)) {
            builder.goToSection(bundle.sections.findIndex(({ id }) => id === first));
        }
    }, [builder, bundle, offer, snapshot.currentSection?.id]);

    const position = offer.sections.findIndex(({ section }) => section.id === snapshot.currentSection?.id);
    const current = offer.sections[position] ?? offer.sections[0];
    const following = position >= 0 ? offer.sections[position + 1] : undefined;
    const nextStep = following
        ? {
              name: following.section.name,
              go: () => builder.goToSection(bundle.sections.findIndex(({ id }) => id === following.section.id)),
          }
        : null;

    // When a pick fills the step and the merchant set it to move on by itself, go to the
    // next one. Only on a pick: coming back to a full step through its tab stays put.
    const stepQuantity = current ? (snapshot.progress.sections[current.section.id]?.quantity ?? 0) : 0;
    const lastPick = useRef({ sectionId: current?.section.id, quantity: stepQuantity });
    useEffect(() => {
        const picked = lastPick.current.sectionId === current?.section.id && stepQuantity > lastPick.current.quantity;
        lastPick.current = { sectionId: current?.section.id, quantity: stepQuantity };
        const full = current?.limits.max != null && stepQuantity >= current.limits.max;
        if (picked && full && current?.section.autoNextSection) nextStep?.go();
    }, [current, stepQuantity, nextStep]);

    // Nothing can be bought: a step that can't be filled, a required product that's gone.
    // `offer.issues` says why, in words for the merchant rather than the shopper.
    if (!offer.isSellable) {
        return <Message title="This bundle isn't available right now" body="Please check back soon." />;
    }

    return (
        <View style={styles.screen}>
            <Stack.Screen options={{ title: bundle.name }} />
            <FlatList
                // A bundle can be all included products and no steps: then the list is empty.
                data={current?.products ?? []}
                key={current?.section.id ?? 'included'}
                keyExtractor={({ product }) => product.id}
                numColumns={2}
                columnWrapperStyle={styles.columns}
                contentContainerStyle={styles.grid}
                ListHeaderComponent={
                    <View style={styles.header}>
                        {bundle.description ? (
                            <Text style={[type.small, styles.padded]} numberOfLines={3}>
                                {htmlToPlainText(bundle.description)}
                            </Text>
                        ) : null}
                        <IncludedProducts offer={offer} money={money} />
                        <StepTabs bundle={bundle} sections={offer.sections} builder={builder} snapshot={snapshot} />
                        {current ? (
                            <View style={styles.padded}>
                                {offer.sections.length > 1 ? (
                                    <Text style={type.label}>
                                        Step {position + 1} of {offer.sections.length}
                                    </Text>
                                ) : null}
                                <Text style={type.title}>{current.section.name || 'Choose your items'}</Text>
                                {current.section.description ? (
                                    <Text style={type.small}>{htmlToPlainText(current.section.description)}</Text>
                                ) : null}
                            </View>
                        ) : null}
                    </View>
                }
                renderItem={({ item }) =>
                    current ? (
                        <View style={styles.cell}>
                            <ProductCard
                                product={item.product}
                                soldOut={item.soldOut}
                                sectionId={current.section.id}
                                builder={builder}
                                selections={snapshot.selections}
                                money={money}
                            />
                        </View>
                    ) : null
                }
            />
            <BundleSummary
                bundle={bundle}
                offer={offer}
                snapshot={snapshot}
                settings={settings}
                money={money}
                cart={cart}
                nextStep={nextStep}
                onAdd={() => flow.addToCart(bundle, snapshot.selections, { countryCode: config.countryCode })}
            />
        </View>
    );
}

/** Products every bundle includes. The SDK adds them on submit; the shopper only needs to see them. */
function IncludedProducts({ offer, money }: { offer: BundleOffer; money: MoneyFormatter }) {
    if (!offer.requiredProducts.length) return null;

    return (
        <View style={styles.padded}>
            <Text style={type.label}>Included</Text>
            <View style={styles.included}>
                {offer.requiredProducts.map(({ required, product, quantity }) => {
                    const variant = product?.variants.find(({ id }) => required.variantIds.includes(id)) ?? product?.variants[0];
                    const image = variant?.image ?? product?.image ?? product?.images?.[0]?.url;
                    return (
                        <View key={required.shopifyProductId} style={styles.includedRow}>
                            {image ? <Image source={image} style={styles.includedImage} contentFit="cover" /> : null}
                            <View style={styles.flex}>
                                <Text style={type.body}>
                                    {quantity > 1 ? `${quantity} × ` : ''}
                                    {product?.title}
                                </Text>
                                {variant && variant.title !== 'Default Title' ? <Text style={type.small}>{variant.title}</Text> : null}
                            </View>
                            {variant ? <Text style={type.small}>{money.format(money.unitPrice(variant))}</Text> : null}
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { gap: space.md, paddingBottom: space.md },
    padded: { paddingHorizontal: space.lg, gap: space.xs },
    grid: { paddingBottom: space.xl, gap: space.md },
    columns: { gap: space.md, paddingHorizontal: space.lg },
    cell: { flex: 1, maxWidth: '50%' },
    flex: { flex: 1 },
    included: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        paddingHorizontal: space.md,
        marginTop: space.xs,
    },
    includedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingVertical: space.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
    },
    includedImage: { width: 48, height: 56, borderRadius: radius.sm, backgroundColor: colors.background },
});
