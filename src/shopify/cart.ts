import { AjaxCartError, type CartLine, type CartLineAttribute, type CartOperations } from '@kitenzo/core';

import { config } from '@/config';
import { StorefrontError, storefront } from './storefront';

// ---------------------------------------------------------------------------
// Types: the parts of a Storefront API cart this app reads
// ---------------------------------------------------------------------------

export interface Money {
    amount: string;
    currencyCode: string;
}

export interface CartMerchandise {
    id: string;
    title: string;
    image: { url: string; altText: string | null } | null;
    product: { title: string };
}

export interface CartLineComponent {
    id: string;
    quantity: number;
    attributes: CartLineAttribute[];
    merchandise: CartMerchandise;
}

/**
 * One line of the cart as Shopify shows it.
 *
 * A Kitenzo native bundle is added as one line per item and merged into a
 * single line by Shopify's Cart Transform. The merged line carries the bundle
 * price, and its `lineComponents` are the items that went in.
 */
export interface StorefrontCartLine {
    id: string;
    quantity: number;
    attributes: CartLineAttribute[];
    merchandise: CartMerchandise;
    cost: { totalAmount: Money; subtotalAmount: Money };
    lineComponents?: CartLineComponent[];
}

export interface Cart {
    id: string;
    checkoutUrl: string;
    totalQuantity: number;
    attributes: CartLineAttribute[];
    cost: { subtotalAmount: Money; totalAmount: Money };
    lines: { nodes: StorefrontCartLine[] };
}

const MERCHANDISE = /* GraphQL */ `
    merchandise {
        ... on ProductVariant {
            id
            title
            image { url altText }
            product { title }
        }
    }
`;

const CART_FIELDS = /* GraphQL */ `
    fragment CartFields on Cart {
        id
        checkoutUrl
        totalQuantity
        attributes { key value }
        cost {
            subtotalAmount { amount currencyCode }
            totalAmount { amount currencyCode }
        }
        lines(first: 100) {
            nodes {
                id
                quantity
                attributes { key value }
                ${MERCHANDISE}
                cost {
                    totalAmount { amount currencyCode }
                    subtotalAmount { amount currencyCode }
                }
                ... on ComponentizableCartLine {
                    lineComponents {
                        id
                        quantity
                        attributes { key value }
                        ${MERCHANDISE}
                    }
                }
            }
        }
    }
`;

interface UserError {
    field: string[] | null;
    message: string;
}

interface CartPayload {
    cart: Cart | null;
    userErrors: UserError[];
}

/** A mutation's `userErrors` are a refusal: Shopify saw the request and wrote nothing. */
function cartOrThrow(payload: CartPayload, operation: string): Cart {
    if (payload.userErrors.length || !payload.cart) {
        const detail = payload.userErrors.map((error) => error.message).join('; ') || 'No cart returned';
        throw new AjaxCartError(operation, 422, detail);
    }
    return payload.cart;
}

/**
 * Translate a Storefront failure for the SDK's cart flow: a refusal becomes an
 * `AjaxCartError` (nothing landed, start over); a lost answer stays a plain
 * error, so the flow reads the cart back before deciding what to do.
 */
function asCartError(error: unknown, operation: string): unknown {
    if (error instanceof StorefrontError && error.status !== undefined) {
        return new AjaxCartError(operation, error.status, error.message);
    }
    return error;
}

const country = config.countryCode ?? null;
const IN_CONTEXT = 'query Cart($id: ID!, $country: CountryCode) @inContext(country: $country)';

// ---------------------------------------------------------------------------
// The cart store
// ---------------------------------------------------------------------------

/**
 * The shopper's cart, held for the session.
 *
 * A tiny external store (subscribe/getSnapshot) so screens can read it with
 * `useSyncExternalStore`. To keep the cart across app launches, save `cart.id`
 * with expo-secure-store or AsyncStorage and pass it to `load()` on start-up.
 */
function createCartStore() {
    let cart: Cart | null = null;
    let creating: Promise<Cart> | null = null;
    const listeners = new Set<() => void>();

    const set = (next: Cart) => {
        cart = next;
        listeners.forEach((listener) => listener());
        return next;
    };

    async function ensureCart(): Promise<Cart> {
        if (cart) return cart;
        creating ??= storefront<{ cartCreate: CartPayload }>(
            `${CART_FIELDS}
            mutation CartCreate($input: CartInput!, $country: CountryCode) @inContext(country: $country) {
                cartCreate(input: $input) { cart { ...CartFields } userErrors { field message } }
            }`,
            { input: country ? { buyerIdentity: { countryCode: country } } : {}, country },
        )
            .then((data) => set(cartOrThrow(data.cartCreate, 'cartCreate')))
            .finally(() => {
                creating = null;
            });
        return creating;
    }

    async function refresh(): Promise<Cart | null> {
        if (!cart) return null;
        const data = await storefront<{ cart: Cart | null }>(
            `${CART_FIELDS} ${IN_CONTEXT} { cart(id: $id) { ...CartFields } }`,
            { id: cart.id, country },
        );
        return data.cart ? set(data.cart) : null;
    }

    /**
     * Run one cart mutation that takes the cart id plus a single argument, e.g.
     * `mutate('cartLinesAdd', 'lines', '[CartLineInput!]!', lines)`.
     */
    async function mutate(name: string, arg: string, type: string, value: unknown): Promise<Cart> {
        const { id } = await ensureCart();
        try {
            const data = await storefront<Record<string, CartPayload>>(
                `${CART_FIELDS}
                mutation ${name}($cartId: ID!, $${arg}: ${type}, $country: CountryCode) @inContext(country: $country) {
                    ${name}(cartId: $cartId, ${arg}: $${arg}) {
                        cart { ...CartFields }
                        userErrors { field message }
                    }
                }`,
                { cartId: id, country, [arg]: value },
            );
            return set(cartOrThrow(data[name], name));
        } catch (error) {
            throw asCartError(error, name);
        }
    }

    /**
     * The cart as `@kitenzo/core`'s add-to-cart flow drives it. The flow builds
     * the lines and merges the `_bundles` attribute; these just carry them to
     * Shopify.
     */
    const operations: CartOperations = {
        addLines: async (lines: CartLine[]) => {
            await mutate(
                'cartLinesAdd',
                'lines',
                '[CartLineInput!]!',
                lines.map(({ merchandiseId, quantity, attributes }) => ({ merchandiseId, quantity, attributes })),
            );
        },
        getAttributes: async () => (await ensureCart()).attributes,
        setAttributes: async (attributes: CartLineAttribute[]) => {
            await mutate('cartAttributesUpdate', 'attributes', '[AttributeInput!]!', attributes);
        },
        // Read back after a lost answer, so a retry never adds the bundle twice. A
        // merged bundle is reported as the items that went in, as they were added.
        getLines: async () => {
            const current = (await refresh()) ?? (await ensureCart());
            return current.lines.nodes.flatMap((line): CartLine[] =>
                line.lineComponents?.length
                    ? line.lineComponents.map((component) => ({
                          key: component.id,
                          merchandiseId: component.merchandise.id,
                          quantity: component.quantity,
                          attributes: component.attributes,
                      }))
                    : [
                          {
                              key: line.id,
                              merchandiseId: line.merchandise.id,
                              quantity: line.quantity,
                              attributes: line.attributes,
                          },
                      ],
            );
        },
    };

    return {
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        getSnapshot: () => cart,
        operations,
        refresh,
        /** Take a line out of the cart. A merged bundle leaves as one line. */
        removeLine: (lineId: string) => mutate('cartLinesRemove', 'lineIds', '[ID!]!', [lineId]),
    };
}

export const cartStore = createCartStore();
