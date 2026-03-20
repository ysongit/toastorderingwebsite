/**
 * Frontend API client — all calls go to our backend proxy,
 * which handles Toast authentication and forwards to Toast APIs.
 */

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }

  return res.json();
}

// ─── Restaurant ───────────────────────────────────────
export const getRestaurant = () => request('/restaurant');
export const getAvailability = () => request('/restaurant/availability');
export const getOrderingSchedule = () => request('/ordering-schedule');

// ─── Menus ────────────────────────────────────────────
export const getMenus = () => request('/menus');
export const getMenuMetadata = () => request('/menus/metadata');

// ─── Stock ────────────────────────────────────────────
export const getStock = () => request('/stock');

// ─── Orders ───────────────────────────────────────────
export const getOrders = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return request(`/orders${qs ? `?${qs}` : ''}`);
};

export const getOrder = (guid) => request(`/orders/${guid}`);

export const getOrderPrices = (order) =>
  request('/orders/prices', {
    method: 'POST',
    body: JSON.stringify(order),
  });

export const createOrder = (order) =>
  request('/orders', {
    method: 'POST',
    body: JSON.stringify(order),
  });

export const updateOrder = (guid, updates) =>
  request(`/orders/${guid}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });

export const voidOrder = (guid) =>
  request(`/orders/${guid}/void`, { method: 'POST' });

// ─── Payments ─────────────────────────────────────────
export const authorizeCreditCard = (data) =>
  request('/creditcards/authorize', {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// ─── Configuration ────────────────────────────────────
export const getDiningOptions = () => request('/config/dining-options');
export const getRevenueCenters = () => request('/config/revenue-centers');

// ─── Analytics ────────────────────────────────────────
export const runAnalyticsReport = (params) =>
  request('/analytics', {
    method: 'POST',
    body: JSON.stringify(params),
  });
