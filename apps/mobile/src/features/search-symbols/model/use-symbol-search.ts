import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { symbolQueries } from '@/entities/symbol';
import { useDebouncedQuery } from './use-debounced-query';

export const useSymbolSearch = () => {
  const [input, setInput] = useState('');
  const query = useDebouncedQuery(input);
  const result = useQuery(symbolQueries.search(query));

  return {
    input,
    setInput,
    query,
    data: result.data,
    isLoading: result.isLoading,
    isError: result.isError,
    refetch: result.refetch,
  };
};
