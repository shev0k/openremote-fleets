import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";

interface UseRepositoryQueryOptions<T> {
  enabled?: boolean;
  initialData: T;
  keepPreviousData?: boolean;
  query: () => Promise<T>;
}

export interface RepositoryQueryResult<T> {
  data: T;
  error: unknown | null;
  isLoading: boolean;
  refresh: () => Promise<T | undefined>;
  setData: Dispatch<SetStateAction<T>>;
}

export function useRepositoryQuery<T>({
  enabled = true,
  initialData,
  keepPreviousData = true,
  query,
}: UseRepositoryQueryOptions<T>): RepositoryQueryResult<T> {
  const [data, setData] = useState(initialData);
  const [isLoading, setLoading] = useState(enabled);
  const [error, setError] = useState<unknown | null>(null);
  const queryRef = useRef(query);
  const initialDataRef = useRef(initialData);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(false);

  useEffect(() => {
    queryRef.current = query;
  }, [query]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return undefined;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);

    try {
      const nextData = await queryRef.current();

      if (isMountedRef.current && requestId === requestIdRef.current) {
        setData(nextData);
        setError(null);
      }

      return nextData;
    } catch (nextError) {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setError(nextError);
        if (!keepPreviousData) {
          setData(initialDataRef.current);
        }
      }

      return undefined;
    } finally {
      if (isMountedRef.current && requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [enabled, keepPreviousData, query]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    void refresh();
  }, [enabled, refresh]);

  return {
    data,
    error,
    isLoading,
    refresh,
    setData,
  };
}
