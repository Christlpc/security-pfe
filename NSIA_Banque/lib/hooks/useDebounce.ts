import { useEffect, useState } from "react";

/**
 * Hook personnalisé pour débouncer une valeur
 * @param value La valeur à débouncer
 * @param delay Le délai en millisecondes (défaut: 500ms)
 * @returns La valeur débouncée
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}
