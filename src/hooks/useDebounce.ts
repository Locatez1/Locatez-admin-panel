import { useState, useEffect } from "react";

/**
 * Custom hook to debounce any value (e.g. search input string).
 * @param value The value to debounce.
 * @param delay Delay in milliseconds (default: 400ms).
 * @returns The debounced value.
 */
export function useDebounce<T>(value: T, delay = 400): T {
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
