import '@/polyfills';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CartButton } from '@/components/CartButton';
import { colors } from '@/theme';

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.background },
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                    headerTitleStyle: { fontWeight: '600' },
                    headerBackButtonDisplayMode: 'minimal',
                    contentStyle: { backgroundColor: colors.background },
                    headerRight: () => <CartButton />,
                }}
            >
                <Stack.Screen name="index" options={{ title: 'Bundles' }} />
                <Stack.Screen name="bundle/[id]" options={{ title: '' }} />
                <Stack.Screen name="cart" options={{ title: 'Cart', presentation: 'modal', headerRight: () => null }} />
            </Stack>
        </SafeAreaProvider>
    );
}
