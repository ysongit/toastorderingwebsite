import { createContext, useContext, useReducer, useCallback } from 'react';

const CartContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(
        (i) => i.guid === action.item.guid
      );
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.guid === action.item.guid
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return {
        ...state,
        items: [...state.items, { ...action.item, quantity: 1 }],
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter((i) => i.guid !== action.guid),
      };

    case 'UPDATE_QTY': {
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.guid !== action.guid),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.guid === action.guid ? { ...i, quantity: action.quantity } : i
        ),
      };
    }

    case 'SET_CUSTOMER':
      return { ...state, customer: { ...state.customer, ...action.data } };

    case 'SET_DELIVERY_INFO':
      return {
        ...state,
        deliveryInfo: { ...state.deliveryInfo, ...action.data },
      };

    case 'SET_DINING_OPTION':
      return { ...state, diningOptionGuid: action.guid };

    case 'SET_PRICES':
      return { ...state, prices: action.prices };

    case 'CLEAR_CART':
      return { ...initialState };

    default:
      return state;
  }
}

const initialState = {
  items: [],
  customer: {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
  },
  deliveryInfo: {
    address1: '',
    address2: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
  },
  diningOptionGuid: null,
  prices: null,
};

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = useCallback(
    (item) => dispatch({ type: 'ADD_ITEM', item }),
    []
  );

  const removeItem = useCallback(
    (guid) => dispatch({ type: 'REMOVE_ITEM', guid }),
    []
  );

  const updateQuantity = useCallback(
    (guid, quantity) => dispatch({ type: 'UPDATE_QTY', guid, quantity }),
    []
  );

  const setCustomer = useCallback(
    (data) => dispatch({ type: 'SET_CUSTOMER', data }),
    []
  );

  const setDeliveryInfo = useCallback(
    (data) => dispatch({ type: 'SET_DELIVERY_INFO', data }),
    []
  );

  const setDiningOption = useCallback(
    (guid) => dispatch({ type: 'SET_DINING_OPTION', guid }),
    []
  );

  const setPrices = useCallback(
    (prices) => dispatch({ type: 'SET_PRICES', prices }),
    []
  );

  const clearCart = useCallback(() => dispatch({ type: 'CLEAR_CART' }), []);

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  /**
   * Build the Toast Order object from the current cart state.
   * This is the JSON structure the Orders API expects.
   */
  const buildOrderPayload = useCallback(() => {
    const externalId = `web-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      entityType: 'Order',
      externalId,
      diningOption: { guid: state.diningOptionGuid },
      deliveryInfo: {
        address1: state.deliveryInfo.address1,
        address2: state.deliveryInfo.address2,
        city: state.deliveryInfo.city,
        state: state.deliveryInfo.state,
        zipCode: state.deliveryInfo.zipCode,
        notes: state.deliveryInfo.notes,
      },
      checks: [
        {
          entityType: 'Check',
          externalId: `${externalId}-check`,
          customer: {
            firstName: state.customer.firstName,
            lastName: state.customer.lastName,
            phone: state.customer.phone,
            email: state.customer.email,
          },
          selections: state.items.map((item, idx) => ({
            entityType: 'MenuItemSelection',
            externalId: `${externalId}-sel-${idx}`,
            itemGroup: { guid: item.itemGroupGuid },
            item: { guid: item.guid },
            quantity: item.quantity,
            modifiers: item.modifiers || [],
          })),
        },
      ],
    };
  }, [state]);

  return (
    <CartContext.Provider
      value={{
        ...state,
        addItem,
        removeItem,
        updateQuantity,
        setCustomer,
        setDeliveryInfo,
        setDiningOption,
        setPrices,
        clearCart,
        itemCount,
        subtotal,
        buildOrderPayload,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
