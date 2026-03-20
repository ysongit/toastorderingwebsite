import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import {
  UtensilsCrossed,
  ShoppingCart,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
} from 'lucide-react';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminOrders from './pages/AdminOrders';
import { useCart } from './context/CartContext';

function App() {
  const location = useLocation();
  const { itemCount } = useCart();
  const isAdmin = location.pathname.startsWith('/admin');

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>Bistro</h2>
          <span>{isAdmin ? 'Admin panel' : 'Online ordering'}</span>
        </div>

        <nav className="sidebar-nav">
          {!isAdmin ? (
            <>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <UtensilsCrossed />
                Menu
              </NavLink>
              <NavLink
                to="/checkout"
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <ShoppingCart />
                Checkout
                {itemCount > 0 && (
                  <span className="badge badge-success" style={{ marginLeft: 'auto' }}>
                    {itemCount}
                  </span>
                )}
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/admin"
                end
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <LayoutDashboard />
                Dashboard
              </NavLink>
              <NavLink
                to="/admin/orders"
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <ClipboardList />
                Orders
              </NavLink>
            </>
          )}

          <div style={{ flex: 1 }} />

          {/* Mode switcher */}
          <NavLink
            to={isAdmin ? '/' : '/admin'}
            className="sidebar-link"
            style={{ marginTop: 'auto' }}
          >
            <Settings />
            {isAdmin ? 'Customer view' : 'Admin panel'}
          </NavLink>
        </nav>
      </aside>

      <main className="app-main">
        <Routes>
          {/* Customer */}
          <Route path="/" element={<MenuPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/track/:orderId" element={<OrderTrackingPage />} />

          {/* Admin */}
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
