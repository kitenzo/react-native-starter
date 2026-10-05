/**
 * Everything the app needs to know about the shop, read from `EXPO_PUBLIC_*`
 * variables (see `.env.example`). Expo inlines these at build time, so a
 * change needs a restart of `npx expo start`.
 */
export const config = {
    shopDomain: process.env.EXPO_PUBLIC_SHOP_DOMAIN?.trim() ?? '',
    kitenzoApiKey: process.env.EXPO_PUBLIC_KITENZO_API_KEY?.trim() ?? '',
    countryCode: process.env.EXPO_PUBLIC_COUNTRY_CODE?.trim().toUpperCase() || undefined,
    storefrontToken: process.env.EXPO_PUBLIC_STOREFRONT_TOKEN?.trim() || undefined,
    /** Point the SDK at another Kitenzo environment. Leave unset for production. */
    kitenzoBaseUrl: process.env.EXPO_PUBLIC_KITENZO_BASE_URL?.trim() || undefined,
};

/** What is missing from the configuration, so the app can say so instead of failing quietly. */
export function missingConfig(): string[] {
    const missing: string[] = [];
    if (!config.shopDomain) missing.push('EXPO_PUBLIC_SHOP_DOMAIN');
    if (!/^kit_(live|test)_/.test(config.kitenzoApiKey)) missing.push('EXPO_PUBLIC_KITENZO_API_KEY');
    return missing;
}
