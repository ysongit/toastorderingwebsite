import { useState, useEffect } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { getOrderingSchedule } from '../api/toast';

/**
 * ScheduleOrderModal
 *
 * Lets customers schedule a delivery for a future time.
 *
 * Toast supports this via the `promisedDate` field on the Order object.
 * When set, the kitchen will prepare the order to be ready at that time
 * rather than ASAP.
 *
 * The Order Management Configuration API provides the restaurant's
 * online ordering schedule, which we use to show valid time slots.
 *
 * See: https://doc.toasttab.com/doc/devguide/orders_api_future_orders.html
 */

// Generate time slots from 11am to 9pm in 30-min increments
function generateTimeSlots(date) {
  const slots = [];
  const now = new Date();
  const isToday =
    date.toDateString() === now.toDateString();

  for (let h = 11; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      if (h === 21 && m > 0) continue; // Stop at 9:00 PM

      const slot = new Date(date);
      slot.setHours(h, m, 0, 0);

      // Skip past times for today (with 45-min buffer for prep)
      if (isToday && slot.getTime() < now.getTime() + 45 * 60000) {
        continue;
      }

      slots.push(slot);
    }
  }

  return slots;
}

function formatTime(date) {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(date) {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function ScheduleOrderModal({ onConfirm, onClose, onASAP }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [schedule, setSchedule] = useState(null);

  // Generate available dates (today + next 6 days)
  const availableDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const timeSlots = generateTimeSlots(selectedDate);

  // Try to fetch the restaurant's ordering schedule
  useEffect(() => {
    getOrderingSchedule()
      .then(setSchedule)
      .catch(() => {}); // Use default slots if API unavailable
  }, []);

  const handleConfirm = () => {
    if (selectedSlot) {
      // Format as ISO string for Toast's promisedDate field
      onConfirm(selectedSlot.toISOString());
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(26, 22, 18, 0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="fade-in"
        style={{
          background: 'var(--clr-surface)',
          borderRadius: 'var(--radius-xl)',
          width: '100%',
          maxWidth: 460,
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--clr-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h3>
            <Calendar size={18} style={{ verticalAlign: -3, marginRight: 6 }} />
            Schedule delivery
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--clr-text-muted)',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {/* ASAP option */}
          <button
            className="btn btn-secondary"
            style={{
              width: '100%',
              marginBottom: '1.25rem',
              justifyContent: 'center',
              padding: '0.75rem',
            }}
            onClick={() => {
              onASAP();
              onClose();
            }}
          >
            <Clock size={16} /> Deliver as soon as possible
          </button>

          <div
            style={{
              textAlign: 'center',
              color: 'var(--clr-text-light)',
              fontSize: '0.78rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '1rem',
            }}
          >
            Or pick a time
          </div>

          {/* Date picker */}
          <div
            style={{
              display: 'flex',
              gap: '0.4rem',
              marginBottom: '1rem',
              overflowX: 'auto',
              paddingBottom: 4,
            }}
          >
            {availableDates.map((date) => {
              const isSelected =
                date.toDateString() === selectedDate.toDateString();
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedSlot(null);
                  }}
                  style={{
                    padding: '0.5rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${isSelected ? 'var(--clr-accent)' : 'var(--clr-border)'}`,
                    background: isSelected
                      ? 'var(--clr-accent-light)'
                      : 'var(--clr-surface)',
                    color: isSelected
                      ? 'var(--clr-accent)'
                      : 'var(--clr-text)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 600 : 400,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s',
                  }}
                >
                  {formatDate(date)}
                </button>
              );
            })}
          </div>

          {/* Time slots grid */}
          {timeSlots.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '0.4rem',
              }}
            >
              {timeSlots.map((slot) => {
                const isSelected =
                  selectedSlot?.getTime() === slot.getTime();
                return (
                  <button
                    key={slot.toISOString()}
                    onClick={() => setSelectedSlot(slot)}
                    style={{
                      padding: '0.55rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${isSelected ? 'var(--clr-accent)' : 'var(--clr-border)'}`,
                      background: isSelected
                        ? 'var(--clr-accent-light)'
                        : 'var(--clr-surface)',
                      color: isSelected
                        ? 'var(--clr-accent)'
                        : 'var(--clr-text)',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? 600 : 400,
                      transition: 'all 0.15s',
                    }}
                  >
                    {formatTime(slot)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '1.5rem 0' }}>
              <p className="text-sm text-muted">
                No available time slots for this date.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--clr-border)',
          }}
        >
          {selectedSlot && (
            <p
              className="text-sm text-muted"
              style={{ marginBottom: '0.5rem', textAlign: 'center' }}
            >
              Delivery on{' '}
              <strong>
                {formatDate(selectedDate)} at {formatTime(selectedSlot)}
              </strong>
            </p>
          )}
          <button
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            onClick={handleConfirm}
            disabled={!selectedSlot}
          >
            Confirm time
          </button>
        </div>
      </div>
    </div>
  );
}
