import { useMemo } from 'react';
import { createApiClient } from '../lib/api';
import { useAuth } from './useAuth';

export const useApi = () => {
  const { accessToken } = useAuth();
  return useMemo(() => {
    if (!accessToken) {
      return null;
    }
    return createApiClient(accessToken);
  }, [accessToken]);
};
