import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * usePolling — polls a function at a given interval.
 *
 * Used on the admin side to keep orders fresh without websockets.
 * Toast doesn't provide real-time push, so polling the Orders API
 * at a reasonable interval (e.g. 15s) is the standard approach.
 *
 * @param {Function} fetchFn  - Async function that returns data
 * @param {number}   interval - Poll interval in ms (default 15000)
 * @param {boolean}  enabled  - Whether polling is active
 */
export function usePolling(fetchFn, { interval = 15000, enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const timerRef = useRef(null);
  const fetchRef = useRef(fetchFn);

  // Keep fetchFn ref current without restarting the interval
  useEffect(() => {
    fetchRef.current = fetchFn;
  }, [fetchFn]);

  const poll = useCallback(async () => {
    try {
      const result = await fetchRef.current();
      setData(result);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Manual refresh
  const refresh = useCallback(() => {
    setLoading(true);
    return poll();
  }, [poll]);

  useEffect(() => {
    if (!enabled) {
      clearInterval(timerRef.current);
      return;
    }

    // Initial fetch
    poll();

    // Start polling
    timerRef.current = setInterval(poll, interval);

    return () => clearInterval(timerRef.current);
  }, [poll, interval, enabled]);

  return { data, loading, error, lastUpdated, refresh };
}

/**
 * useStockCheck — checks item availability against the Toast Stock API.
 *
 * Returns a Map of itemGuid → { status, quantity }.
 * status is one of: 'IN_STOCK', 'OUT_OF_STOCK', 'QUANTITY'
 */
export function useStockCheck(stockFetchFn) {
  const [stockMap, setStockMap] = useState(new Map());
  const [loading, setLoading] = useState(false);

  const checkStock = useCallback(async () => {
    setLoading(true);
    try {
      const data = await stockFetchFn();
      const map = new Map();
      if (Array.isArray(data)) {
        data.forEach((item) => {
          map.set(item.menuItem?.guid || item.guid, {
            status: item.status || (item.quantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'),
            quantity: item.quantity ?? null,
          });
        });
      }
      setStockMap(map);
    } catch {
      // Stock API unavailable — assume everything is in stock
    } finally {
      setLoading(false);
    }
  }, [stockFetchFn]);

  useEffect(() => {
    checkStock();
  }, [checkStock]);

  const isInStock = useCallback(
    (guid) => {
      const entry = stockMap.get(guid);
      if (!entry) return true; // Unknown = assume available
      return entry.status !== 'OUT_OF_STOCK';
    },
    [stockMap]
  );

  return { stockMap, isInStock, loading, refresh: checkStock };
}
