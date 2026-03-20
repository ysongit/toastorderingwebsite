import { useParams, useNavigate } from 'react-router-dom';
import OrderTracker from '../components/OrderTracker';

/**
 * OrderTrackingPage
 *
 * Standalone page at /track/:orderId so customers can
 * bookmark or share their order status link.
 */
export default function OrderTrackingPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  return (
    <OrderTracker
      orderGuid={orderId}
      onClose={() => navigate('/')}
    />
  );
}
