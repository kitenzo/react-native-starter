import { KitenzoClient, type ShopSettings } from '@kitenzo/core';

import { config, missingConfig } from '@/config';

/**
 * The one Kitenzo client the app shares, or `null` until `.env` is filled in.
 *
 * A/B testing is off: it routes shoppers between bundle pages by URL, which is a
 * storefront idea. Turn it on once you map those redirects to your own screens.
 */
export const kitenzo: KitenzoClient | null = missingConfig().length
    ? null
    : new KitenzoClient({
          apiKey: config.kitenzoApiKey,
          countryCode: config.countryCode,
          baseUrl: config.kitenzoBaseUrl,
          abTesting: false,
      });

let settings: Promise<ShopSettings> | null = null;

/** The shop's Kitenzo settings (currency, money format, stock rules), fetched once. */
export function loadSettings(client: KitenzoClient): Promise<ShopSettings> {
    settings ??= client.getSettings().catch((error: unknown) => {
        settings = null;
        throw error;
    });
    return settings;
}
