import { type Bundle, htmlToPlainText } from '@kitenzo/core';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Loading, Message } from '@/components/ui';
import { config, missingConfig } from '@/config';
import { useAsync } from '@/hooks/useAsync';
import { kitenzo } from '@/kitenzo';
import { colors, radius, space, type } from '@/theme';

/** The shop's published bundles, or the ones `EXPO_PUBLIC_BUNDLE_IDS` features, in that order. */
async function loadBundles(): Promise<Bundle[]> {
    if (!kitenzo) return [];
    const bundles = await kitenzo.listBundles();
    if (!config.bundleIds.length) return bundles;
    return config.bundleIds.flatMap((id) => bundles.filter((bundle) => bundle.id === id));
}

export default function BundlesScreen() {
    const { data: bundles, error, loading, reload } = useAsync(loadBundles, []);

    if (!kitenzo) {
        return (
            <Message
                title="Add your shop to .env"
                body={`Copy .env.example to .env and set ${missingConfig().join(' and ')}, then restart Expo.`}
            />
        );
    }
    if (loading) return <Loading />;
    if (error) {
        return (
            <Message
                title="Couldn't load bundles"
                body={error.message}
                action={<Button label="Try again" variant="secondary" onPress={reload} />}
            />
        );
    }
    if (!bundles?.length) {
        return <Message title="No bundles yet" body="Publish a bundle in Kitenzo and it appears here." />;
    }

    return (
        <FlatList
            data={bundles}
            keyExtractor={(bundle) => String(bundle.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item: bundle }) => (
                <Link href={{ pathname: '/bundle/[id]', params: { id: String(bundle.id) } }} asChild>
                    <Pressable
                        accessibilityRole="link"
                        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                    >
                        {bundle.imageUrl ? (
                            <Image source={bundle.imageUrl} style={styles.image} contentFit="cover" />
                        ) : null}
                        <View style={styles.body}>
                            <Text style={type.heading}>{bundle.name}</Text>
                            {bundle.description ? (
                                <Text style={type.small} numberOfLines={2}>
                                    {htmlToPlainText(bundle.description)}
                                </Text>
                            ) : null}
                            <Text style={styles.cta}>Build yours →</Text>
                        </View>
                    </Pressable>
                </Link>
            )}
        />
    );
}

const styles = StyleSheet.create({
    list: { padding: space.lg, gap: space.lg },
    card: {
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
    },
    pressed: { opacity: 0.9 },
    image: { aspectRatio: 16 / 10, backgroundColor: colors.background },
    body: { padding: space.lg, gap: space.xs },
    cta: { marginTop: space.sm, fontSize: 15, fontWeight: '600', color: colors.accent },
});
