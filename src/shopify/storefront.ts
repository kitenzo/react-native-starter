import { config } from '@/config';

/** Storefront API version. Bump it with Shopify's quarterly releases. */
export const STOREFRONT_API_VERSION = '2026-07';

/**
 * Why a Storefront API call failed.
 *
 * `status` is set when Shopify answered and refused (an HTTP error, or the
 * mutation's `userErrors`); it is absent when no answer arrived at all. The
 * difference matters to the cart: a refusal means nothing was written, a lost
 * answer means it might have been.
 */
export class StorefrontError extends Error {
    readonly status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.name = 'StorefrontError';
        this.status = status;
    }
}

/**
 * Send one GraphQL operation to the shop's Storefront API.
 *
 * Without a token this uses Shopify's tokenless access, which covers products,
 * collections and carts: all this app needs.
 */
export async function storefront<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (config.storefrontToken) {
        headers['X-Shopify-Storefront-Access-Token'] = config.storefrontToken;
    }

    const url = `https://${config.shopDomain}/api/${STOREFRONT_API_VERSION}/graphql.json`;
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ query, variables }) });

    if (!response.ok) {
        throw new StorefrontError(`Storefront API responded ${response.status}`, response.status);
    }

    const body = (await response.json()) as { data?: T; errors?: { message: string }[] };
    if (body.errors?.length) {
        throw new StorefrontError(body.errors.map((error) => error.message).join('; '), response.status);
    }
    if (!body.data) {
        throw new StorefrontError('Storefront API returned no data', response.status);
    }
    return body.data;
}
