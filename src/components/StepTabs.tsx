import type { BundleBuilder, BundleBuilderSnapshot, BundleDetail, OfferedSection } from '@kitenzo/core';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radius, space } from '@/theme';

interface StepTabsProps {
    bundle: BundleDetail;
    sections: OfferedSection[];
    builder: BundleBuilder;
    snapshot: BundleBuilderSnapshot;
}

/**
 * One tab per step, with how many are picked. Steps the conditions engine hides
 * are already left out of `sections` by `getBundleOffer`.
 */
export function StepTabs({ bundle, sections, builder, snapshot }: StepTabsProps) {
    if (sections.length < 2) return null;

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
            {sections.map(({ section, limits }) => {
                const active = snapshot.currentSection?.id === section.id;
                const picked = builder.getSectionQuantity(section.id);
                const done = picked > 0 && (snapshot.progress.sections[section.id]?.missing ?? 0) === 0;
                const target = limits.max ?? limits.min;
                return (
                    <Pressable
                        key={section.id}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        // The builder counts steps by their place in the bundle, hidden ones included.
                        onPress={() => builder.goToSection(bundle.sections.findIndex(({ id }) => id === section.id))}
                        style={[styles.tab, active && styles.active]}
                    >
                        <Text style={[styles.text, active && styles.activeText]}>
                            {done ? '✓ ' : ''}
                            {section.name}
                            {target ? ` ${picked}/${target}` : picked ? ` ${picked}` : ''}
                        </Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    row: { gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
    tab: {
        paddingHorizontal: space.lg,
        paddingVertical: space.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    active: { backgroundColor: colors.primary, borderColor: colors.primary },
    text: { fontSize: 14, fontWeight: '600', color: colors.text },
    activeText: { color: colors.onPrimary },
});
