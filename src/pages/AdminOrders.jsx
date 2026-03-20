import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Eye,
  X,
  MapPin,
  Phone,
  Mail,
  Bell,
  BellOff,
  Volume2,
} from 'lucide-react';
import { getOrders, getOrder, voidOrder } from '../api/toast';
import { usePolling } from '../hooks/usePolling';

/**
 * AdminOrders — enhanced with real-time polling
 *
 * - Polls Toast Orders API every 15 seconds for live updates
 * - Audio alert when new orders come in
 * - Visual "new order" indicator
 * - Last-updated timestamp
 */

const DEMO_ORDERS = [
  { guid: 'o1', externalId: 'WEB-001', createdDate: new Date(Date.now() - 300000).toISOString(), diningOption: { name: 'Delivery' }, deliveryInfo: { address1: '456 Oak Ave', city: 'New York', state: 'NY', zipCode: '10002' }, checks: [{ totalAmount: 42.5, customer: { firstName: 'Sarah', lastName: 'Mitchell', phone: '555-0101', email: 'sarah@email.com' }, selections: [{ displayName: 'Classic Burger', quantity: 2, price: 14.5 }, { displayName: 'Truffle Fries', quantity: 1, price: 8.5 }] }], fulfillmentStatus: 'NEW' },
  { guid: 'o2', externalId: 'WEB-002', createdDate: new Date(Date.now() - 900000).toISOString(), diningOption: { name: 'Delivery' }, deliveryInfo: { address1: '789 Pine St', city: 'New York', state: 'NY', zipCode: '10003' }, checks: [{ totalAmount: 67.0, customer: { firstName: 'James', lastName: 'Kim', phone: '555-0202', email: 'james@email.com' }, selections: [{ displayName: 'Grilled Salmon', quantity: 1, price: 22.0 }, { displayName: 'Caesar Salad', quantity: 2, price: 11.0 }, { displayName: 'Tiramisu', quantity: 1, price: 10.0 }] }], fulfillmentStatus: 'IN_PROGRESS' },
  { guid: 'o3', externalId: 'WEB-003', createdDate: new Date(Date.now() - 1800000).toISOString(), diningOption: { name: 'Delivery' }, deliveryInfo: { address1: '321 Elm Blvd', city: 'Brooklyn', state: 'NY', zipCode: '11201' }, checks: [{ totalAmount: 34.5, customer: { firstName: 'Maria', lastName: 'Lopez', phone: '555-0303', email: 'maria@email.com' }, selections: [{ displayName: 'Margherita Pizza', quantity: 1, price: 16.0 }, { displayName: 'Fresh Lemonade', quantity: 2, price: 4.5 }] }], fulfillmentStatus: 'READY' },
  { guid: 'o4', externalId: 'WEB-004', createdDate: new Date(Date.now() - 3600000).toISOString(), diningOption: { name: 'Delivery' }, deliveryInfo: { address1: '654 Maple Dr', city: 'New York', state: 'NY', zipCode: '10010' }, checks: [{ totalAmount: 55.0, customer: { firstName: 'Alex', lastName: 'Torres', phone: '555-0404', email: 'alex@email.com' }, selections: [{ displayName: 'Chicken Parmesan', quantity: 1, price: 18.5 }, { displayName: 'Garlic Bread', quantity: 2, price: 6.0 }, { displayName: 'Iced Coffee', quantity: 1, price: 5.0 }] }], fulfillmentStatus: 'FULFILLED' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All orders' },
  { value: 'NEW', label: 'New' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'READY', label: 'Ready' },
  { value: 'FULFILLED', label: 'Fulfilled' },
];

const STATUS_MAP = {
  NEW: { label: 'New', class: 'badge-warning' },
  IN_PROGRESS: { label: 'In progress', class: 'badge-success' },
  READY: { label: 'Ready', class: 'badge-success' },
  FULFILLED: { label: 'Fulfilled', class: 'badge-neutral' },
  CANCELLED: { label: 'Cancelled', class: 'badge-danger' },
};

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminOrders() {
  const [orders, setOrders] = useState(DEMO_ORDERS);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newOrderGuids, setNewOrderGuids] = useState(new Set());
  const prevOrderCountRef = useRef(DEMO_ORDERS.length);

  // Fetch function for the polling hook
  const fetchOrders = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = await getOrders({ businessDate: today });
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch {
      // Fall through to demo data
    }
    return DEMO_ORDERS;
  }, []);

  // Poll every 15 seconds
  const {
    data: polledOrders,
    loading,
    lastUpdated,
    refresh,
  } = usePolling(fetchOrders, { interval: 15000 });

  // Update orders when polling returns new data
  useEffect(() => {
    if (!polledOrders) return;

    // Detect new orders
    if (polledOrders.length > prevOrderCountRef.current) {
      const existingGuids = new Set(orders.map((o) => o.guid));
      const freshGuids = polledOrders
        .filter((o) => !existingGuids.has(o.guid))
        .map((o) => o.guid);

      if (freshGuids.length > 0) {
        setNewOrderGuids((prev) => new Set([...prev, ...freshGuids]));

        // Play alert sound
        if (soundEnabled) {
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 800;
            gain.gain.value = 0.15;
            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.stop(ctx.currentTime + 0.3);
          } catch {
            // Audio not available
          }
        }
      }
    }

    prevOrderCountRef.current = polledOrders.length;
    setOrders(polledOrders);
  }, [polledOrders, soundEnabled, orders]);

  // Clear "new" indicator when an order is viewed
  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setNewOrderGuids((prev) => {
      const next = new Set(prev);
      next.delete(order.guid);
      return next;
    });
  };

  const filtered = orders.filter((o) => {
    const matchesStatus =
      statusFilter === 'ALL' || o.fulfillmentStatus === statusFilter;
    const customer = o.checks?.[0]?.customer;
    const name = `${customer?.firstName || ''} ${customer?.lastName || ''}`.toLowerCase();
    const matchesSearch =
      !search ||
      name.includes(search.toLowerCase()) ||
      o.externalId?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleVoid = async (guid) => {
    if (!confirm('Are you sure you want to void this order?')) return;
    try {
      await voidOrder(guid);
    } catch {
      // Demo: update locally
    }
    setOrders((prev) =>
      prev.map((o) =>
        o.guid === guid ? { ...o, fulfillmentStatus: 'CANCELLED' } : o
      )
    );
    setSelectedOrder(null);
  };

  const newCount = orders.filter((o) => o.fulfillmentStatus === 'NEW').length;

  return (
    <div style={{ display: 'flex', gap: '1.5rem' }}>
      {/* Orders list */}
      <div style={{ flex: 1 }}>
        <div className="page-header">
          <div>
            <h1>
              Orders
              {newCount > 0 && (
                <span
                  className="badge badge-warning"
                  style={{ marginLeft: 10, verticalAlign: 'middle', fontSize: '0.8rem' }}
                >
                  {newCount} new
                </span>
              )}
            </h1>
            {lastUpdated && (
              <p className="text-muted text-sm">
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                {' · '}Auto-refreshing every 15s
              </p>
            )}
          </div>
          <div className="flex gap-sm">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute alerts' : 'Enable alerts'}
            >
              {soundEnabled ? <Volume2 size={14} /> : <BellOff size={14} />}
            </button>
            <button
              className="btn btn-secondary"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1rem',
            alignItems: 'center',
          }}
        >
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--clr-text-light)',
              }}
            />
            <input
              className="input"
              placeholder="Search by name or order ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>

          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`btn btn-sm ${
                statusFilter === opt.value ? 'btn-primary' : 'btn-secondary'
              }`}
              onClick={() => setStatusFilter(opt.value)}
            >
              {opt.label}
              {opt.value === 'NEW' && newCount > 0 && (
                <span
                  style={{
                    background: 'rgba(255,255,255,0.3)',
                    borderRadius: 100,
                    padding: '0 5px',
                    marginLeft: 4,
                    fontSize: '0.72rem',
                  }}
                >
                  {newCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders table */}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const check = order.checks?.[0];
                const status =
                  STATUS_MAP[order.fulfillmentStatus] || STATUS_MAP.NEW;
                const isNew = newOrderGuids.has(order.guid);

                return (
                  <tr
                    key={order.guid}
                    style={{
                      cursor: 'pointer',
                      background: isNew
                        ? 'var(--clr-warning-bg)'
                        : selectedOrder?.guid === order.guid
                          ? 'var(--clr-accent-light)'
                          : undefined,
                      transition: 'background 0.3s',
                    }}
                    onClick={() => handleSelectOrder(order)}
                  >
                    <td>
                      <span className="order-number">
                        #{order.externalId?.slice(-3) || order.guid.slice(-4)}
                      </span>
                      {isNew && (
                        <Bell
                          size={13}
                          color="var(--clr-warning)"
                          style={{ marginLeft: 6, verticalAlign: -2 }}
                        />
                      )}
                    </td>
                    <td>
                      {check?.customer?.firstName} {check?.customer?.lastName}
                    </td>
                    <td className="text-sm text-muted">
                      {check?.selections?.length || 0} items
                    </td>
                    <td className="fw-600">
                      ${(check?.totalAmount || 0).toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge ${status.class}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {formatTime(order.createdDate)}
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectOrder(order);
                        }}
                      >
                        <Eye size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    <span className="text-muted">
                      No orders match your filters
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order detail panel */}
      {selectedOrder && (
        <div
          style={{
            width: 360,
            background: 'var(--clr-surface)',
            border: '1px solid var(--clr-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            position: 'sticky',
            top: '1rem',
            height: 'fit-content',
            maxHeight: 'calc(100vh - 2rem)',
            overflowY: 'auto',
          }}
          className="fade-in"
        >
          <div className="flex items-center justify-between mb-2">
            <h3>
              Order #
              {selectedOrder.externalId?.slice(-3) ||
                selectedOrder.guid.slice(-4)}
            </h3>
            <button
              onClick={() => setSelectedOrder(null)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--clr-text-muted)',
              }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <span
              className={`badge ${
                (STATUS_MAP[selectedOrder.fulfillmentStatus] || STATUS_MAP.NEW)
                  .class
              }`}
            >
              {
                (STATUS_MAP[selectedOrder.fulfillmentStatus] || STATUS_MAP.NEW)
                  .label
              }
            </span>
            <span className="text-sm text-muted" style={{ marginLeft: 8 }}>
              {formatTime(selectedOrder.createdDate)}
            </span>
          </div>

          <div
            style={{
              marginBottom: '1rem',
              padding: '0.75rem',
              background: 'var(--clr-bg)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            <div className="text-sm fw-600 mb-1">Customer</div>
            <div className="text-sm">
              {selectedOrder.checks?.[0]?.customer?.firstName}{' '}
              {selectedOrder.checks?.[0]?.customer?.lastName}
            </div>
            {selectedOrder.checks?.[0]?.customer?.phone && (
              <div className="text-sm text-muted flex items-center gap-sm">
                <Phone size={12} />
                {selectedOrder.checks[0].customer.phone}
              </div>
            )}
            {selectedOrder.checks?.[0]?.customer?.email && (
              <div className="text-sm text-muted flex items-center gap-sm">
                <Mail size={12} />
                {selectedOrder.checks[0].customer.email}
              </div>
            )}
          </div>

          {selectedOrder.deliveryInfo && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: 'var(--clr-bg)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div className="text-sm fw-600 mb-1">
                <MapPin size={13} style={{ verticalAlign: -2 }} /> Delivery
                address
              </div>
              <div className="text-sm text-muted">
                {selectedOrder.deliveryInfo.address1}
                {selectedOrder.deliveryInfo.address2 &&
                  `, ${selectedOrder.deliveryInfo.address2}`}
                <br />
                {selectedOrder.deliveryInfo.city},{' '}
                {selectedOrder.deliveryInfo.state}{' '}
                {selectedOrder.deliveryInfo.zipCode}
              </div>
            </div>
          )}

          <div className="text-sm fw-600 mb-1">Items</div>
          {selectedOrder.checks?.[0]?.selections?.map((sel, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.4rem 0',
                borderBottom: '1px solid var(--clr-border)',
                fontSize: '0.85rem',
              }}
            >
              <span>
                {sel.quantity || 1}× {sel.displayName || sel.item?.name}
              </span>
              <span className="fw-600">
                ${((sel.price || 0) * (sel.quantity || 1)).toFixed(2)}
              </span>
            </div>
          ))}

          <div
            className="flex justify-between fw-600"
            style={{
              marginTop: '0.75rem',
              paddingTop: '0.5rem',
              borderTop: '2px solid var(--clr-border)',
            }}
          >
            <span>Total</span>
            <span>
              ${(selectedOrder.checks?.[0]?.totalAmount || 0).toFixed(2)}
            </span>
          </div>

          {selectedOrder.fulfillmentStatus !== 'FULFILLED' &&
            selectedOrder.fulfillmentStatus !== 'CANCELLED' && (
              <div style={{ marginTop: '1rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{
                    width: '100%',
                    color: 'var(--clr-danger)',
                    borderColor: 'var(--clr-danger)',
                  }}
                  onClick={() => handleVoid(selectedOrder.guid)}
                >
                  Void order
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
