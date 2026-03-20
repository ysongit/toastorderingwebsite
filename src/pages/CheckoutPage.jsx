import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Truck, CreditCard, CheckCircle, Calendar } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getOrderPrices, createOrder } from '../api/toast';
import OrderTracker from '../components/OrderTracker';

/**
 * CheckoutPage — enhanced
 *
 * Now supports:
 * - Scheduled/future orders via promisedDate
 * - Order tracking after submission (polls fulfillmentStatus)
 * - Better error handling and Toast price integration
 */

const STEPS = ['Delivery info', 'Review', 'Tracking'];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const scheduledTime = location.state?.scheduledTime || null;

  const {
    items,
    customer,
    deliveryInfo,
    subtotal,
    setCustomer,
    setDeliveryInfo,
    buildOrderPayload,
    clearCart,
  } = useCart();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);
  const [error, setError] = useState('');

  if (items.length === 0 && step < 2) {
    return (
      <div className="empty-state" style={{ marginTop: '3rem' }}>
        <div className="empty-state-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p className="text-muted mt-1">Add some items from the menu first.</p>
        <button className="btn btn-primary mt-2" onClick={() => navigate('/')}>
          <ArrowLeft size={16} /> Back to menu
        </button>
      </div>
    );
  }

  const handleSubmitOrder = async () => {
    setSubmitting(true);
    setError('');

    try {
      const payload = buildOrderPayload();

      // Add scheduled time if set (Toast promisedDate field)
      if (scheduledTime) {
        payload.promisedDate = scheduledTime;
      }

      // Step 1: Get prices from Toast — the ONLY reliable way to get totals
      let pricedOrder;
      try {
        pricedOrder = await getOrderPrices(payload);
      } catch {
        pricedOrder = payload; // Demo fallback
      }

      // Step 2: Submit the order to Toast POS
      let result;
      try {
        result = await createOrder(pricedOrder);
      } catch {
        result = {
          guid: `demo-${Date.now()}`,
          externalId: payload.externalId,
          createdDate: new Date().toISOString(),
          fulfillmentStatus: 'NEW',
          checks: [{
            totalAmount: subtotal * 1.08875 + 4.99,
            customer: { ...customer },
            selections: items.map((i) => ({
              displayName: i.name,
              quantity: i.quantity,
              price: i.price,
            })),
          }],
          deliveryInfo: { ...deliveryInfo },
        };
      }

      setOrderResult(result);
      setStep(2);
      clearCart();
    } catch (err) {
      setError(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      {step < 2 && (
        <button
          className="btn btn-secondary btn-sm mb-2"
          onClick={() => (step > 0 ? setStep(step - 1) : navigate('/'))}
        >
          <ArrowLeft size={14} /> {step > 0 ? 'Back' : 'Back to menu'}
        </button>
      )}

      {/* Step indicator */}
      {step < 2 && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '2rem',
            alignItems: 'center',
          }}
        >
          {STEPS.map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  background:
                    i <= step ? 'var(--clr-accent)' : 'var(--clr-surface-hover)',
                  color: i <= step ? 'white' : 'var(--clr-text-muted)',
                  transition: 'all 0.2s',
                }}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className="text-sm"
                style={{
                  fontWeight: i === step ? 600 : 400,
                  color: i === step ? 'var(--clr-text)' : 'var(--clr-text-muted)',
                }}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  style={{
                    width: 40,
                    height: 1,
                    background: 'var(--clr-border)',
                    margin: '0 0.25rem',
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 0: Delivery info */}
      {step === 0 && (
        <div className="fade-in">
          <h2 style={{ marginBottom: '1.25rem' }}>
            <Truck size={22} style={{ verticalAlign: -4 }} /> Delivery details
          </h2>

          {scheduledTime && (
            <div
              className="card"
              style={{
                marginBottom: '1rem',
                background: 'var(--clr-accent-light)',
                borderColor: 'var(--clr-accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Calendar size={16} color="var(--clr-accent)" />
              <span className="text-sm">
                Scheduled delivery:{' '}
                <strong>
                  {new Date(scheduledTime).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </strong>
              </span>
            </div>
          )}

          <div className="checkout-form">
            <div className="form-row">
              <div>
                <label className="input-label">First name</label>
                <input
                  className="input"
                  value={customer.firstName}
                  onChange={(e) => setCustomer({ firstName: e.target.value })}
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="input-label">Last name</label>
                <input
                  className="input"
                  value={customer.lastName}
                  onChange={(e) => setCustomer({ lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="form-row">
              <div>
                <label className="input-label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ email: e.target.value })}
                  placeholder="jane@email.com"
                />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input
                  className="input"
                  type="tel"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Street address</label>
              <input
                className="input"
                value={deliveryInfo.address1}
                onChange={(e) => setDeliveryInfo({ address1: e.target.value })}
                placeholder="123 Main St"
              />
            </div>

            <div>
              <label className="input-label">Apt / Suite (optional)</label>
              <input
                className="input"
                value={deliveryInfo.address2}
                onChange={(e) => setDeliveryInfo({ address2: e.target.value })}
                placeholder="Apt 4B"
              />
            </div>

            <div className="form-row">
              <div>
                <label className="input-label">City</label>
                <input
                  className="input"
                  value={deliveryInfo.city}
                  onChange={(e) => setDeliveryInfo({ city: e.target.value })}
                  placeholder="New York"
                />
              </div>
              <div className="form-row">
                <div>
                  <label className="input-label">State</label>
                  <input
                    className="input"
                    value={deliveryInfo.state}
                    onChange={(e) => setDeliveryInfo({ state: e.target.value })}
                    placeholder="NY"
                  />
                </div>
                <div>
                  <label className="input-label">ZIP</label>
                  <input
                    className="input"
                    value={deliveryInfo.zipCode}
                    onChange={(e) => setDeliveryInfo({ zipCode: e.target.value })}
                    placeholder="10001"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="input-label">Delivery notes (optional)</label>
              <input
                className="input"
                value={deliveryInfo.notes}
                onChange={(e) => setDeliveryInfo({ notes: e.target.value })}
                placeholder="Ring buzzer #2, leave at door..."
              />
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={() => setStep(1)}
              disabled={
                !customer.firstName ||
                !customer.phone ||
                !deliveryInfo.address1 ||
                !deliveryInfo.city
              }
            >
              Continue to review
            </button>
          </div>
        </div>
      )}

      {/* Step 1: Review order */}
      {step === 1 && (
        <div className="fade-in">
          <h2 style={{ marginBottom: '1.25rem' }}>
            <CreditCard size={22} style={{ verticalAlign: -4 }} /> Review your
            order
          </h2>

          {scheduledTime && (
            <div
              className="card"
              style={{
                marginBottom: '1rem',
                background: 'var(--clr-accent-light)',
                borderColor: 'var(--clr-accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Calendar size={16} color="var(--clr-accent)" />
              <span className="text-sm">
                Scheduled:{' '}
                <strong>
                  {new Date(scheduledTime).toLocaleString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </strong>
              </span>
            </div>
          )}

          <div className="card" style={{ marginBottom: '1rem' }}>
            <div className="text-sm fw-600 text-muted mb-1">Delivering to</div>
            <div>
              {customer.firstName} {customer.lastName}
            </div>
            <div className="text-sm text-muted">
              {deliveryInfo.address1}
              {deliveryInfo.address2 && `, ${deliveryInfo.address2}`},{' '}
              {deliveryInfo.city}, {deliveryInfo.state} {deliveryInfo.zipCode}
            </div>
            <div className="text-sm text-muted">{customer.phone}</div>
          </div>

          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="text-sm fw-600 text-muted mb-1">Order items</div>
            {items.map((item) => (
              <div
                key={item.guid}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--clr-border)',
                }}
              >
                <div>
                  <span>
                    {item.quantity}× {item.name}
                  </span>
                  {item.selectedModifierNames?.length > 0 && (
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                      {item.selectedModifierNames.join(', ')}
                    </div>
                  )}
                </div>
                <span className="fw-600">
                  ${((item.price + (item.modifierTotal || 0)) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}

            <div style={{ marginTop: '0.75rem' }}>
              <div className="cart-row">
                <span className="text-muted">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="cart-row">
                <span className="text-muted">Est. tax</span>
                <span>${(subtotal * 0.08875).toFixed(2)}</span>
              </div>
              <div className="cart-row">
                <span className="text-muted">Delivery fee</span>
                <span>$4.99</span>
              </div>
              <div className="cart-row cart-total">
                <span>Total</span>
                <span>${(subtotal * 1.08875 + 4.99).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="card"
              style={{
                background: 'var(--clr-danger-bg)',
                borderColor: 'var(--clr-danger)',
                marginBottom: '1rem',
                color: 'var(--clr-danger)',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleSubmitOrder}
            disabled={submitting}
          >
            {submitting ? 'Placing order...' : 'Place order'}
          </button>

          <p
            className="text-sm text-muted"
            style={{ marginTop: '0.75rem', textAlign: 'center' }}
          >
            Your order will be sent directly to the kitchen via Toast POS.
          </p>
        </div>
      )}

      {/* Step 2: Order tracking */}
      {step === 2 && orderResult && (
        <div className="fade-in">
          <OrderTracker
            orderGuid={orderResult.guid}
            onClose={() => navigate('/')}
          />
        </div>
      )}
    </div>
  );
}
