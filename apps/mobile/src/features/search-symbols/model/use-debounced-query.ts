import { useState, useEffect } from 'react';

export const useDebouncedQuery = (input: string, delay = 250): string => {
  const [debounced, setDebounced] = useState(input.trim());

  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(input.trim());
    }, delay);
    return () => clearTimeout(id);
  }, [input, delay]);

  return debounced;
};
