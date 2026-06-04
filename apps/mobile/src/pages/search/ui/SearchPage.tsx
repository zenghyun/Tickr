import { View } from 'react-native';
import { router } from '@/shared/lib';
import { Screen } from '@/shared/ui';
import { SearchInput, SearchResults, useSymbolSearch } from '@/features/search-symbols';

export const SearchPage = () => {
  const { input, setInput, query, data, isLoading, isError, refetch } = useSymbolSearch();

  return (
    <Screen padded={false} edges={['left', 'right', 'bottom']}>
      <View className="py-2">
        <SearchInput
          value={input}
          onChangeText={setInput}
          onClear={() => setInput('')}
        />
      </View>
      <SearchResults
        query={query}
        data={data}
        isLoading={isLoading}
        isError={isError}
        onSelect={(symbol) =>
          router.push({ pathname: '/symbol/[symbol]', params: { symbol } })
        }
        onRetry={refetch}
      />
    </Screen>
  );
};
