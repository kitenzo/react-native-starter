import { type DependencyList, useCallback, useEffect, useState } from 'react';

interface AsyncState<T> {
    data: T | undefined;
    error: Error | undefined;
    loading: boolean;
    reload: () => void;
}

/** Run a promise-returning function when `deps` change, and track its result. */
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> {
    const [state, setState] = useState<Omit<AsyncState<T>, 'reload'>>({
        data: undefined,
        error: undefined,
        loading: true,
    });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let current = true;
        setState((previous) => ({ ...previous, error: undefined, loading: true }));
        load().then(
            (data) => current && setState({ data, error: undefined, loading: false }),
            (error: unknown) =>
                current &&
                setState({
                    data: undefined,
                    error: error instanceof Error ? error : new Error(String(error)),
                    loading: false,
                }),
        );
        return () => {
            current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, attempt]);

    const reload = useCallback(() => setAttempt((n) => n + 1), []);
    return { ...state, reload };
}
