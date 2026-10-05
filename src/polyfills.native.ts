// React Native's own URL and URLSearchParams are incomplete; @kitenzo/core reads
// query strings with them. The web build uses the browser's, so this file is
// native-only (Metro picks `.native.ts` on iOS and Android).
import 'react-native-url-polyfill/auto';
