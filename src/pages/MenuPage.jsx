import { useState, useEffect } from 'react';
import { Search, Plus, Minus, ShoppingCart, Calendar, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getMenus, getStock } from '../api/toast';
import { useStockCheck } from '../hooks/usePolling';
import ModifierModal from '../components/ModifierModal';
import ScheduleOrderModal from '../components/ScheduleOrderModal';
import RestaurantBanner from '../components/RestaurantBanner';

/**
 * MenuPage — enhanced
 *
 * Now includes:
 * - Restaurant open/closed banner (Availability + Restaurants APIs)
 * - Modifier selection modal (Menus API modifier groups)
 * - Stock/inventory checking (Stock API)
 * - Schedule order for later (promisedDate on Orders API)
 */

const DEMO_CATEGORIES = [
  {
    name: 'Popular',
    items: [
      { guid: 'd1', name: 'Classic Burger', description: 'Angus beef, cheddar, lettuce, tomato, special sauce', price: 14.5, itemGroupGuid: 'g1', emoji: '🍔', modifierGroups: [] },
      { guid: 'd2', name: 'Margherita Pizza', description: 'San Marzano tomatoes, fresh mozzarella, basil', price: 16.0, itemGroupGuid: 'g1', emoji: '🍕', modifierGroups: [] },
      { guid: 'd3', name: 'Caesar Salad', description: 'Romaine, parmesan, croutons, house caesar dressing', price: 11.0, itemGroupGuid: 'g1', emoji: '🥗', modifierGroups: [] },
    ],
  },
  {
    name: 'Mains',
    items: [
      { guid: 'd4', name: 'Grilled Salmon', description: 'Atlantic salmon, lemon butter, seasonal vegetables', price: 22.0, itemGroupGuid: 'g2', emoji: '🐟', modifierGroups: [] },
      { guid: 'd5', name: 'Chicken Parmesan', description: 'Breaded chicken, marinara, mozzarella, spaghetti', price: 18.5, itemGroupGuid: 'g2', emoji: '🍗', modifierGroups: [] },
      { guid: 'd6', name: 'Mushroom Risotto', description: 'Arborio rice, wild mushrooms, truffle oil, parmesan', price: 17.0, itemGroupGuid: 'g2', emoji: '🍄', modifierGroups: [] },
    ],
  },
  {
    name: 'Sides',
    items: [
      { guid: 'd7', name: 'Truffle Fries', description: 'Crispy fries, truffle oil, parmesan, herbs', price: 8.5, itemGroupGuid: 'g3', emoji: '🍟', modifierGroups: [] },
      { guid: 'd8', name: 'Garlic Bread', description: 'Toasted sourdough, roasted garlic butter', price: 6.0, itemGroupGuid: 'g3', emoji: '🍞', modifierGroups: [] },
    ],
  },
  {
    name: 'Drinks',
    items: [
      { guid: 'd9', name: 'Fresh Lemonade', description: 'House-squeezed lemons, mint, cane sugar', price: 4.5, itemGroupGuid: 'g4', emoji: '🍋', modifierGroups: [] },
      { guid: 'd10', name: 'Iced Coffee', description: 'Cold brew, oat milk option available', price: 5.0, itemGroupGuid: 'g4', emoji: '☕', modifierGroups: [] },
      { guid: 'd11', name: 'Sparkling Water', description: 'San Pellegrino 500ml', price: 3.5, itemGroupGuid: 'g4', emoji: '💧', modifierGroups: [] },
    ],
  },
  {
    name: 'Desserts',
    items: [
      { guid: 'd12', name: 'Tiramisu', description: 'Espresso-soaked ladyfingers, mascarpone cream', price: 10.0, itemGroupGuid: 'g5', emoji: '🍰', modifierGroups: [] },
      { guid: 'd13', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake, molten center, vanilla ice cream', price: 11.5, itemGroupGuid: 'g5', emoji: '🍫', modifierGroups: [] },
    ],
  },
];

function parseMenuData(apiData) {
  try {
    const categories = [];
    for (const menuGroup of apiData) {
      for (const menu of menuGroup.menus || []) {
        for (const group of menu.groups || []) {
          categories.push({
            name: group.name,
            items: (group.items || []).map((item) => ({
              guid: item.guid,
              name: item.name,
              description: item.description || '',
              price: item.price || item.prices?.[0]?.price || 0,
              itemGroupGuid: group.guid,
              emoji: '🍽️',
              imageUrl: item.imageUrl,
              modifierGroups: item.modifierGroups || [],
            })),
          });
        }
      }
    }
    return categories.length > 0 ? categories : DEMO_CATEGORIES;
  } catch {
    return DEMO_CATEGORIES;
  }
}

export default function MenuPage() {
  const [categories, setCategories] = useState(DEMO_CATEGORIES);
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modifierItem, setModifierItem] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduledTime, setScheduledTime] = useState(null);

  const {
    addItem,
    updateQuantity,
    items: cartItems,
    itemCount,
    subtotal,
  } = useCart();
  const navigate = useNavigate();

  // Stock checking via Toast Stock API
  const { isInStock } = useStockCheck(getStock);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMenus()
      .then((data) => {
        if (!cancelled) setCategories(parseMenuData(data));
      })
      .catch(() => {
        if (!cancelled) setCategories(DEMO_CATEGORIES);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const currentItems = categories[activeCategory]?.items || [];
  const filtered = search
    ? currentItems.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.description.toLowerCase().includes(search.toLowerCase())
      )
    : currentItems;

  const getCartQty = (guid) =>
    cartItems.find((i) => i.guid === guid)?.quantity || 0;

  const handleModifierConfirm = (configuredItem) => {
    addItem(configuredItem);
    setModifierItem(null);
  };

  const handleAddItem = (item) => {
    const hasModifiers =
      item.modifierGroups?.length > 0 ||
      ['d1', 'd2'].includes(item.guid); // demo items with modifiers

    if (hasModifiers) {
      setModifierItem(item);
    } else {
      addItem(item);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem' }}>
      {/* Menu content */}
      <div style={{ flex: 1 }}>
        <RestaurantBanner />

        <div className="page-header">
          <div>
            <h1>Our menu</h1>
            <p className="text-muted text-sm mt-1">
              Fresh ingredients, made with care
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowSchedule(true)}
              title="Schedule for later"
            >
              <Calendar size={14} />
              {scheduledTime ? (
                <span>
                  {new Date(scheduledTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              ) : (
                'ASAP'
              )}
            </button>
            <div style={{ position: 'relative', width: 220 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--clr-text-light)',
                }}
              />
              <input
                className="input"
                placeholder="Search menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>
        </div>

        {/* Category tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0.4rem',
            marginBottom: '1.5rem',
            overflowX: 'auto',
            paddingBottom: 4,
          }}
        >
          {categories.map((cat, idx) => (
            <button
              key={cat.name}
              onClick={() => {
                setActiveCategory(idx);
                setSearch('');
              }}
              className={`btn ${idx === activeCategory ? 'btn-primary' : 'btn-secondary'}`}
              style={{ whiteSpace: 'nowrap' }}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Items grid */}
        {loading ? (
          <div className="empty-state"><p>Loading menu...</p></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <p>No items found</p>
          </div>
        ) : (
          <div className="card-grid">
            {filtered.map((item, i) => {
              const outOfStock = !isInStock(item.guid);
              return (
                <div
                  key={item.guid}
                  className="menu-item fade-in"
                  style={{
                    animationDelay: `${i * 50}ms`,
                    opacity: outOfStock ? 0.55 : 1,
                  }}
                >
                  <div className="menu-item-img">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-md)',
                        }}
                      />
                    ) : (
                      item.emoji
                    )}
                  </div>
                  <div className="menu-item-info">
                    <div className="menu-item-name">
                      {item.name}
                      {(item.modifierGroups?.length > 0 || ['d1', 'd2'].includes(item.guid)) && (
                        <span
                          className="text-muted"
                          style={{ fontSize: '0.72rem', marginLeft: 4 }}
                        >
                          customizable
                        </span>
                      )}
                    </div>
                    <div className="menu-item-desc">{item.description}</div>
                    <div className="menu-item-bottom">
                      <span className="menu-item-price">
                        ${item.price.toFixed(2)}
                      </span>
                      {outOfStock ? (
                        <span className="badge badge-danger">
                          <AlertTriangle size={11} /> Sold out
                        </span>
                      ) : (
                        <>
                          {getCartQty(item.guid) > 0 && (
                            <span className="badge badge-success">
                              {getCartQty(item.guid)} in cart
                            </span>
                          )}
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddItem(item);
                            }}
                          >
                            <Plus size={14} /> Add
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mini cart sidebar */}
      <div className="cart-sidebar">
        <h3 style={{ marginBottom: '0.25rem' }}>
          <ShoppingCart size={18} style={{ verticalAlign: -3 }} /> Your order
        </h3>
        {scheduledTime && (
          <p className="text-sm text-muted mb-1">
            Scheduled for{' '}
            {new Date(scheduledTime).toLocaleString('en-US', {
              weekday: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
        )}

        {cartItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛒</div>
            <p className="text-sm text-muted">Your cart is empty</p>
          </div>
        ) : (
          <>
            {cartItems.map((item) => (
              <div key={item.guid + (item.selectedModifierNames?.join(',') || '')} className="cart-item">
                <div style={{ flex: 1 }}>
                  <div className="fw-600 text-sm">{item.name}</div>
                  {item.selectedModifierNames?.length > 0 && (
                    <div
                      className="text-muted"
                      style={{ fontSize: '0.72rem', lineHeight: 1.3 }}
                    >
                      {item.selectedModifierNames.join(', ')}
                    </div>
                  )}
                  <div className="text-muted text-sm">
                    ${((item.price + (item.modifierTotal || 0)) * item.quantity).toFixed(2)}
                  </div>
                </div>
                <div className="cart-item-qty">
                  <button onClick={() => updateQuantity(item.guid, item.quantity - 1)}>
                    <Minus size={12} />
                  </button>
                  <span className="fw-600 text-sm">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.guid, item.quantity + 1)}>
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}

            <div className="cart-summary">
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

              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%', marginTop: '1rem' }}
                onClick={() => navigate('/checkout', { state: { scheduledTime } })}
              >
                Proceed to checkout
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      {modifierItem && (
        <ModifierModal
          item={modifierItem}
          onConfirm={handleModifierConfirm}
          onClose={() => setModifierItem(null)}
        />
      )}
      {showSchedule && (
        <ScheduleOrderModal
          onConfirm={(time) => { setScheduledTime(time); setShowSchedule(false); }}
          onClose={() => setShowSchedule(false)}
          onASAP={() => setScheduledTime(null)}
        />
      )}
    </div>
  );
}
