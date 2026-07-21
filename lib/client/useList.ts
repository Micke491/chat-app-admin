"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetchPaginated, type Paginated } from "./api";

export interface ListState<T> {
  items: T[];
  pagination: Paginated<T[]>["pagination"];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

/**
 * Fetch a paginated admin list endpoint whose `data` is an array.
 * Refetches whenever `path` changes (compose query params in the caller).
 */
export function useList<T>(path: string): ListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [pagination, setPagination] = useState<Paginated<T[]>["pagination"]>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetchPaginated<T[]>(path);
      if (id === reqId.current) {
        setItems(res.data ?? []);
        setPagination(res.pagination);
      }
    } catch (e) {
      if (id === reqId.current) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { items, pagination, loading, error, reload: fetchData };
}
