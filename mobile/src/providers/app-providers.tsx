import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useState } from 'react';

import { I18nProvider } from '@/i18n';
import { ActiveJobProvider } from './active-job';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 10_000 },
          mutations: { retry: 0 },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ActiveJobProvider>{children}</ActiveJobProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
