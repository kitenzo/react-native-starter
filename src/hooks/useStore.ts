import { useCallback, useSyncExternalStore } from 'react';

interface Store<T> {
    subscribe: (listener: () => void) => () => void;
    getState?: () => T;
    getSnapshot?: () => T;
}

/**
 * Read any subscribe/getState store: the SDK's bundle builder and cart flow, or
 * this app's cart. Re-renders when the store hands out a new snapshot.
 */
export function useStore<T>(store: Store<T>): T {
    const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
    const read = useCallback(() => (store.getState ? store.getState() : (store.getSnapshot as () => T)()), [store]);
    return useSyncExternalStore(subscribe, read, read);
}
