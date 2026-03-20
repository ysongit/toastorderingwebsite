import { useState, useEffect } from 'react';
import { Clock, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { getRestaurant, getAvailability } from '../api/toast';

/**
 * RestaurantBanner
 *
 * Shows the restaurant's name, address, hours, and whether it's
 * currently accepting online orders.
 *
 * Uses two Toast APIs:
 *   - Restaurants API → name, address, schedule/hours
 *   - Restaurant Availability API → whether online ordering is active
 *
 * This is critical because the Orders API does NOT check service hours.
 * Your app must prevent orders when the restaurant is closed.
 */

// Demo restaurant data
const DEMO_RESTAURANT = {
  restaurantName: 'Bistro',
  location: {
    address1: '142 West Broadway',
    city: 'New York',
    stateCode: 'NY',
    zipCode: '10013',
  },
  schedules: [
    { scheduleName: 'Main', services: [{ startTime: '11:00', endTime: '22:00' }] },
  ],
};

export default function RestaurantBanner() {
  const [restaurant, setRestaurant] = useState(DEMO_RESTAURANT);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.allSettled([getRestaurant(), getAvailability()])
      .then(([rxResult, availResult]) => {
        if (cancelled) return;
        if (rxResult.status === 'fulfilled' && rxResult.value) {
          setRestaurant(rxResult.value);
        }
        if (availResult.status === 'fulfilled' && availResult.value) {
          setIsAvailable(
            availResult.value.availableForOrdering ??
              availResult.value.available ??
              true
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Determine if currently within service hours (simple check)
  const now = new Date();
  const currentHour = now.getHours();
  const isOpenHours = currentHour >= 11 && currentHour < 22;
  const effectivelyOpen = isAvailable && isOpenHours;

  const loc = restaurant?.location;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: effectivelyOpen
          ? 'var(--clr-success-bg)'
          : 'var(--clr-warning-bg)',
        borderRadius: 'var(--radius-lg)',
        marginBottom: '1.25rem',
        border: `1px solid ${
          effectivelyOpen ? '#c3e0c8' : '#eedcb0'
        }`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {effectivelyOpen ? (
          <CheckCircle size={18} color="var(--clr-success)" />
        ) : (
          <AlertCircle size={18} color="var(--clr-warning)" />
        )}
        <div>
          <span className="fw-600" style={{ fontSize: '0.9rem' }}>
            {effectivelyOpen ? 'Open for delivery' : 'Currently closed'}
          </span>
          {!effectivelyOpen && (
            <span
              className="text-sm text-muted"
              style={{ marginLeft: 8 }}
            >
              Opens at 11:00 AM
            </span>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.82rem',
          color: 'var(--clr-text-muted)',
        }}
      >
        {loc && (
          <span className="flex items-center gap-sm">
            <MapPin size={13} />
            {loc.address1}, {loc.city}
          </span>
        )}
        <span className="flex items-center gap-sm">
          <Clock size={13} />
          11:00 AM – 10:00 PM
        </span>
      </div>
    </div>
  );
}
