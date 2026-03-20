import { useState, useEffect } from 'react';
import { Package, ChefHat, Truck, CheckCircle, Clock, MapPin } from 'lucide-react';
import { getOrder } from '../api/toast';

/**
 * OrderTracker
 *
 * Customer-facing order status tracker. After placing an order,
 * the customer can watch its progress in real-time.
 *
 * Polls the Toast Orders API for fulfillment status updates.
 * The fulfillmentStatus field on order selections transitions:
 *   NEW → IN_PROGRESS → READY → FULFILLED
 *
 * Toast doesn't send SMS for API-created orders, so this tracker
 * is the primary way customers know when their food is ready.
 */

const STAGES = [
  { key: 'NEW', label: 'Order placed', icon: Package, description: 'Your order has been received' },
  { key: 'IN_PROGRESS', label: 'Preparing', icon: ChefHat, description: 'The kitchen is making your food' },
  { key: 'READY', label: 'Ready', icon: Truck, description: 'Your order is out for delivery' },
  { key: 'FULFILLED', label: 'Delivered', icon: CheckCircle, description: 'Enjoy your meal!' },
];

function getStageIndex(status) {
  const idx = STAGES.findIndex((s) => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function OrderTracker({ orderGuid, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderGuid) return;

    let cancelled = false;
    let timer;

    const fetchStatus = async () => {
      try {
        const data = await getOrder(orderGuid);
        if (!cancelled) {
          setOrder(data);
          setLoading(false);

          // Stop polling once delivered or cancelled
          if (
            data.fulfillmentStatus === 'FULFILLED' ||
            data.fulfillmentStatus === 'CANCELLED'
          ) {
            return;
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      }

      // Poll every 10 seconds
      if (!cancelled) {
        timer = setTimeout(fetchStatus, 10000);
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderGuid]);

  // Demo mode if no real order
  const currentStatus = order?.fulfillmentStatus || 'IN_PROGRESS';
  const currentStage = getStageIndex(currentStatus);
  const check = order?.checks?.[0];

  return (
    <div
      style={{
        maxWidth: 520,
        margin: '0 auto',
        padding: '2rem 0',
      }}
    >
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.4rem' }}>Order status</h1>
          {order?.externalId && (
            <p className="text-sm text-muted">
              Order #{order.externalId.slice(-6)}
            </p>
          )}
        </div>
        {onClose && (
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Close
          </button>
        )}
      </div>

      {/* Progress stepper */}
      <div
        className="card"
        style={{ padding: '1.5rem', marginBottom: '1.5rem' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {STAGES.map((stage, idx) => {
            const isComplete = idx < currentStage;
            const isCurrent = idx === currentStage;
            const isPending = idx > currentStage;
            const StageIcon = stage.icon;

            return (
              <div key={stage.key}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  {/* Icon circle */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      background: isComplete
                        ? 'var(--clr-success)'
                        : isCurrent
                          ? 'var(--clr-accent)'
                          : 'var(--clr-surface-hover)',
                      color: isComplete || isCurrent ? 'white' : 'var(--clr-text-light)',
                      transition: 'all 0.4s ease',
                      boxShadow: isCurrent
                        ? '0 0 0 4px var(--clr-accent-light)'
                        : 'none',
                    }}
                  >
                    <StageIcon size={20} />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontWeight: isCurrent ? 700 : 500,
                        fontSize: '0.95rem',
                        color: isPending
                          ? 'var(--clr-text-light)'
                          : 'var(--clr-text)',
                      }}
                    >
                      {stage.label}
                    </div>
                    <div
                      className="text-sm"
                      style={{
                        color: isPending
                          ? 'var(--clr-text-light)'
                          : 'var(--clr-text-muted)',
                      }}
                    >
                      {stage.description}
                    </div>
                  </div>

                  {/* Status indicator */}
                  {isComplete && (
                    <CheckCircle
                      size={18}
                      color="var(--clr-success)"
                    />
                  )}
                  {isCurrent && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: 'var(--clr-accent)',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      <Clock size={13} />
                      Now
                    </div>
                  )}
                </div>

                {/* Connector line */}
                {idx < STAGES.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      height: 28,
                      marginLeft: 21,
                      background:
                        idx < currentStage
                          ? 'var(--clr-success)'
                          : 'var(--clr-border)',
                      transition: 'background 0.4s ease',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Delivery info */}
      {order?.deliveryInfo && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="flex items-center gap-sm mb-1">
            <MapPin size={15} color="var(--clr-accent)" />
            <span className="fw-600 text-sm">Delivering to</span>
          </div>
          <p className="text-sm text-muted">
            {order.deliveryInfo.address1}
            {order.deliveryInfo.address2 &&
              `, ${order.deliveryInfo.address2}`}
            <br />
            {order.deliveryInfo.city}, {order.deliveryInfo.state}{' '}
            {order.deliveryInfo.zipCode}
          </p>
        </div>
      )}

      {/* Order items summary */}
      {check && (
        <div className="card">
          <div className="fw-600 text-sm mb-1">Your items</div>
          {check.selections?.map((sel, i) => (
            <div
              key={i}
              className="flex justify-between text-sm"
              style={{
                padding: '0.35rem 0',
                borderBottom:
                  i < check.selections.length - 1
                    ? '1px solid var(--clr-border)'
                    : 'none',
              }}
            >
              <span className="text-muted">
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
              marginTop: '0.5rem',
              paddingTop: '0.5rem',
              borderTop: '2px solid var(--clr-border)',
            }}
          >
            <span>Total</span>
            <span>${(check.totalAmount || 0).toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Auto-refresh notice */}
      <p
        className="text-sm text-muted"
        style={{ textAlign: 'center', marginTop: '1.5rem' }}
      >
        This page updates automatically every 10 seconds.
      </p>
    </div>
  );
}
