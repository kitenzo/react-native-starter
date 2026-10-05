# Kitenzo React Native Starter

Put [Kitenzo](https://kitenzo.com) bundles in your own iOS and Android app.

This is a small, complete Expo app: shoppers browse your bundles, build one step by step with live pricing, add it to a Shopify cart and check out. Fork it, restyle it, ship it.

**Try it:** [web demo](https://kitenzo-rn-starter.pages.dev) · [on your phone](https://kitenzo.com/developers/react-native)

## What's inside

- **Native bundles with live pricing.** The bundle's rules, steps, discounts and tiers all come from Kitenzo, through [`@kitenzo/core`](https://www.npmjs.com/package/@kitenzo/core). Nothing is hard-coded.
- **A real Shopify cart.** Bundles go into a Storefront API cart with the attributes Shopify's Cart Transform needs, so the cart and checkout show the bundle price.
- **Shopify checkout.** The cart's `checkoutUrl` opens in an in-app browser.
- **Markets aware.** Set a country and prices, the cart and checkout all use that market's currency.
- **Two values to configure.** Your shop domain and a Kitenzo API key. It uses Shopify's tokenless Storefront API access, so there is no Storefront token to create.
- **Expo Router, TypeScript, no UI library.** Plain React Native components with one theme file, easy to make your own.

## Quick start

You need a Shopify store with Kitenzo installed, at least one published **Native** bundle, and Headless switched on for your shop ([ask us](mailto:support@kitenzo.com) if it isn't).

```bash
npx degit kitenzo/react-native-starter my-app
cd my-app
npm install
cp .env.example .env
```

In Kitenzo, go to **Settings > Headless**, create an API key, and put it in `.env` with your shop's domain:

```bash
EXPO_PUBLIC_SHOP_DOMAIN=your-store.myshopify.com
EXPO_PUBLIC_KITENZO_API_KEY=kit_live_...
EXPO_PUBLIC_COUNTRY_CODE=GB   # optional: the market to sell in
```

Then start it and scan the QR code with [Expo Go](https://expo.dev/go), or press `w` for the web:

```bash
npx expo start
```

## How a bundle reaches checkout

```
 Kitenzo API                 this app                     Shopify
 ───────────                 ────────                     ───────
 getBundle(id)  ──────────▶  builder (steps, rules,
                             price, tiers)
 /configure     ◀──────────  Add to cart
   signed discount ────────▶ cartLinesAdd: one line per item,
                             each with _bundle_data  ───▶ Cart Transform merges
                             cartAttributesUpdate:        the lines into one
                             _bundles (merged)       ───▶ bundle at the bundle price
                             Checkout ─────────────────▶  checkoutUrl
```

The SDK does the Kitenzo half. `createBundleBuilder` holds the selection and enforces the bundle's rules, and `createBundleCartFlow` configures the bundle, builds the cart lines and merges the `_bundles` cart attribute. This app adds the Shopify half: [`src/shopify/cart.ts`](src/shopify/cart.ts) is a Storefront API cart that the SDK's flow drives.

Three rules if you change the cart code:

1. **Pass the line attributes through unchanged.** Every line of a bundle carries the same `_bundle_data`; that is how the Cart Transform knows they belong together.
2. **Always write `_bundles`.** Without it the bundle checks out at full price. Merge into the existing value, never replace it, or bundles already in the cart lose their pricing. The SDK does this for you.
3. **Every route to checkout goes through that cart.** A "Buy now" button is fine as long as it builds a cart with the same lines and `_bundles` and then opens its `checkoutUrl`.

## Project structure

```
src/
  app/                  Screens (Expo Router)
    index.tsx           Bundle list
    bundle/[id].tsx     The bundle builder
    cart.tsx            Cart and checkout
  components/           Product card, step tabs, summary bar, buttons
  shopify/
    storefront.ts       Storefront API client (tokenless by default)
    cart.ts             The cart, and the operations the SDK's cart flow calls
  kitenzo.ts            The shared KitenzoClient
  config.ts             Reads .env
  theme.ts              Colours, spacing and type: start restyling here
```

## Taking it to production

- **Keep the cart between launches.** The cart lives in memory. Save `cart.id` with `expo-secure-store` and load it on start-up.
- **Native checkout.** Swap the in-app browser for [Shopify Checkout Sheet Kit](https://shopify.dev/docs/storefronts/mobile/checkout-sheet-kit) for a native checkout sheet (it needs a development build, not Expo Go).
- **Rate limits.** Tokenless Storefront access is rate limited per shopper. Set `EXPO_PUBLIC_STOREFRONT_TOKEN` to a public Storefront API token for headroom.
- **A/B tests.** Off in this app, because Kitenzo's tests route shoppers between bundle pages by URL. Turn on `abTesting` in [`src/kitenzo.ts`](src/kitenzo.ts) once you map those to your screens.
- **Personalisation.** Bundles that ask for a name, a message or a photo are refused by the SDK until those fields are sent. `@kitenzo/core` has the helpers (`validatePersonalisationFields`, `personalisationValuesToProperties`); this starter doesn't collect them yet.
- **Sizes for included products.** Products every bundle includes use the variant the merchant set. A picker for them is a good next step for apparel.
- **Classic bundles.** This starter is built for Native bundles. Single- and multiple-product bundles work through the same flow, but have not been tested here yet.

## About the API key

The key is read-only and is made to ship inside apps and web pages. The "allowed origins" setting on a key only applies to browsers, because native apps do not send an origin. That is expected.

## Licence

MIT. Built by [Kitenzo](https://kitenzo.com). Questions or ideas: open an issue, or email [support@kitenzo.com](mailto:support@kitenzo.com).
