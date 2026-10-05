import { useEffect, useMemo } from 'react';
import {
    type BundleDetail,
    createBundleBuilder,
    createBundleCartFlow,
    createMoneyFormatter,
    getBundleOffer,
    htmlToPlainText,
    type KitenzoClient,
    type ShopSettings,
} from '@kitenzo/core';
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
import { colors, space, type } from '@/theme';

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

    if (!offer.isSellable || !current) {
        return <Message title="This bundle isn't available right now" body="Please check back soon." />;
    }

    return (
        <View style={styles.screen}>
            <Stack.Screen options={{ title: bundle.name }} />
            <FlatList
                data={current.products}
                key={current.section.id}
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
                        <StepTabs bundle={bundle} sections={offer.sections} builder={builder} snapshot={snapshot} />
                        <View style={styles.padded}>
                            <Text style={type.label}>
                                Step {position + 1} of {offer.sections.length}
                            </Text>
                            <Text style={type.title}>{current.section.name}</Text>
                            {current.section.description ? (
                                <Text style={type.small}>{htmlToPlainText(current.section.description)}</Text>
                            ) : null}
                        </View>
                    </View>
                }
                renderItem={({ item }) => (
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
                )}
            />
            <BundleSummary
                bundle={bundle}
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

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { gap: space.md, paddingBottom: space.md },
    padded: { paddingHorizontal: space.lg, gap: space.xs },
    grid: { paddingBottom: space.xl, gap: space.md },
    columns: { gap: space.md, paddingHorizontal: space.lg },
    cell: { flex: 1, maxWidth: '50%' },
});
