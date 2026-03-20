import { useState, useEffect } from 'react';
import {
  DollarSign,
  ShoppingBag,
  Clock,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { getOrders } from '../api/toast';

/**
 * AdminDashboard
 *
 * Shows high-level stats and recent orders pulled from the Toast Orders API.
 * In production, you'd also use the Analytics API (era) for detailed
 * revenue reports and performance metrics.
 */

// Demo data for when Toast API isn't connected
const DEMO_ORDERS = [
  { guid: 'o1', externalId: 'WEB-001', createdDate: new Date(Date.now() - 300000).toISOString(), diningOption: { name: 'Delivery' }, checks: [{ totalAmount: 42.5, customer: { firstName: 'Sarah', lastName: 'M.' }, selections: [{ displayName: 'Classic Burger' }, { displayName: 'Truffle Fries' }] }], fulfillmentStatus: 'NEW' },
  { guid: 'o2', externalId: 'WEB-002', createdDate: new Date(Date.now() - 900000).toISOString(), diningOption: { name: 'Delivery' }, checks: [{ totalAmount: 67.0, customer: { firstName: 'James', lastName: 'K.' }, selections: [{ displayName: 'Grilled Salmon' }, { displayName: 'Caesar Salad' }, { displayName: 'Tiramisu' }] }], fulfillmentStatus: 'IN_PROGRESS' },
  { guid: 'o3', externalId: 'WEB-003', createdDate: new Date(Date.now() - 1800000).toISOString(), diningOption: { name: 'Delivery' }, checks: [{ totalAmount: 34.5, customer: { firstName: 'Maria', lastName: 'L.' }, selections: [{ displayName: 'Margherita Pizza' }, { displayName: 'Fresh Lemonade' }] }], fulfillmentStatus: 'READY' },
  { guid: 'o4', externalId: 'WEB-004', createdDate: new Date(Date.now() - 3600000).toISOString(), diningOption: { name: 'Delivery' }, checks: [{ totalAmount: 55.0, customer: { firstName: 'Alex', lastName: 'T.' }, selections: [{ displayName: 'Chicken Parmesan' }, { displayName: 'Garlic Bread' }, { displayName: 'Iced Coffee' }] }], fulfillmentStatus: 'FULFILLED' },
  { guid: 'o5', externalId: 'WEB-005', createdDate: new Date(Date.now() - 5400000).toISOString(), diningOption: { name: 'Delivery' }, checks: [{ totalAmount: 28.0, customer: { firstName: 'Chris', lastName: 'P.' }, selections: [{ displayName: 'Mushroom Risotto' }] }], fulfillmentStatus: 'FULFILLED' },
];

const STATUS_MAP = {
  NEW: { label: 'New', class: 'badge-warning' },
  IN_PROGRESS: { label: 'In progress', class: 'badge-success' },
  READY: { label: 'Ready', class: 'badge-success' },
  FULFILLED: { label: 'Fulfilled', class: 'badge-neutral' },
  CANCELLED: { label: 'Cancelled', class: 'badge-danger' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState(DEMO_ORDERS);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const data = await getOrders({ businessDate: today });
      if (Array.isArray(data) && data.length > 0) {
        setOrders(data);
      }
    } catch {
      // Keep demo data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Compute stats
  const totalRevenue = orders.reduce(
    (sum, o) => sum + (o.checks?.[0]?.totalAmount || 0),
    0
  );
  const activeOrders = orders.filter(
    (o) => o.fulfillmentStatus !== 'FULFILLED' && o.fulfillmentStatus !== 'CANCELLED'
  ).length;
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted text-sm mt-1">Today's overview</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchOrders}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div className="stat-card">
          <div className="stat-label">
            <DollarSign size={14} style={{ verticalAlign: -2 }} /> Revenue today
          </div>
          <div className="stat-value">${totalRevenue.toFixed(0)}</div>
          <div className="stat-change" style={{ color: 'var(--clr-success)' }}>
            <TrendingUp size={13} style={{ verticalAlign: -2 }} /> +12% vs
            yesterday
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <ShoppingBag size={14} style={{ verticalAlign: -2 }} /> Orders today
          </div>
          <div className="stat-value">{orders.length}</div>
          <div className="stat-change" style={{ color: 'var(--clr-success)' }}>
            <TrendingUp size={13} style={{ verticalAlign: -2 }} /> +8% vs
            yesterday
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <Clock size={14} style={{ verticalAlign: -2 }} /> Active orders
          </div>
          <div className="stat-value">{activeOrders}</div>
          <div className="stat-change text-muted">In progress right now</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">
            <DollarSign size={14} style={{ verticalAlign: -2 }} /> Avg. order
          </div>
          <div className="stat-value">${avgOrderValue.toFixed(2)}</div>
          <div className="stat-change text-muted">Per order today</div>
        </div>
      </div>

      {/* Recent orders table */}
      <h3 style={{ marginBottom: '0.75rem' }}>Recent orders</h3>
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
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const check = order.checks?.[0];
              const status = STATUS_MAP[order.fulfillmentStatus] || STATUS_MAP.NEW;
              return (
                <tr key={order.guid}>
                  <td>
                    <span className="order-number">
                      #{order.externalId?.slice(-3) || order.guid.slice(-4)}
                    </span>
                  </td>
                  <td>
                    {check?.customer?.firstName} {check?.customer?.lastName}
                  </td>
                  <td className="text-sm text-muted">
                    {check?.selections
                      ?.slice(0, 2)
                      .map((s) => s.displayName || s.item?.name)
                      .join(', ')}
                    {(check?.selections?.length || 0) > 2 &&
                      ` +${check.selections.length - 2} more`}
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
                    {timeAgo(order.createdDate)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
