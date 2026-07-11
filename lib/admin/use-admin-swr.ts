'use client';

import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { useAdminAuth } from './auth-context';
import { adminGet } from './api-client';

/**
 * Wrapper de useSWR que ya conoce el secret de admin (via AdminAuthContext),
 * para no repetir el fetcher + header en cada hook de lib/hooks/.
 * `key` ya debe incluir cualquier query string (?search=&page=...).
 */
export function useAdminSWR<T>(key: string | null, config?: SWRConfiguration): SWRResponse<T, Error> {
  const { secret } = useAdminAuth();
  return useSWR<T>(key, (path: string) => adminGet<T>(path, secret), config);
}
