import { useState } from 'react';
import { X, Check, Plus, Minus } from 'lucide-react';

/**
 * ModifierModal
 *
 * When a customer clicks "Add" on a menu item that has modifier groups
 * (e.g. size, toppings, cooking temp), this modal lets them configure
 * their selection before it's added to the cart.
 *
 * Toast Menus API modifier structure:
 *   item.modifierGroups[] → each has:
 *     - name (e.g. "Choose your size")
 *     - minSelections / maxSelections (validation rules)
 *     - modifiers[] → each has: name, price, guid
 *
 * The selected modifiers get attached to the cart item and included
 * in the Order payload sent to Toast.
 */

// Demo modifier groups for when Toast API isn't connected
const DEMO_MODIFIERS = {
  d1: [
    {
      guid: 'mg1',
      name: 'Cooking temperature',
      minSelections: 1,
      maxSelections: 1,
      modifiers: [
        { guid: 'mod1', name: 'Rare', price: 0 },
        { guid: 'mod2', name: 'Medium rare', price: 0 },
        { guid: 'mod3', name: 'Medium', price: 0 },
        { guid: 'mod4', name: 'Medium well', price: 0 },
        { guid: 'mod5', name: 'Well done', price: 0 },
      ],
    },
    {
      guid: 'mg2',
      name: 'Extra toppings',
      minSelections: 0,
      maxSelections: 4,
      modifiers: [
        { guid: 'mod6', name: 'Bacon', price: 2.5 },
        { guid: 'mod7', name: 'Avocado', price: 2.0 },
        { guid: 'mod8', name: 'Fried egg', price: 1.5 },
        { guid: 'mod9', name: 'Caramelized onions', price: 1.0 },
        { guid: 'mod10', name: 'Jalapeños', price: 0.75 },
      ],
    },
  ],
  d2: [
    {
      guid: 'mg3',
      name: 'Size',
      minSelections: 1,
      maxSelections: 1,
      modifiers: [
        { guid: 'mod11', name: 'Personal (10")', price: 0 },
        { guid: 'mod12', name: 'Medium (14")', price: 4.0 },
        { guid: 'mod13', name: 'Large (18")', price: 7.0 },
      ],
    },
    {
      guid: 'mg4',
      name: 'Extra toppings',
      minSelections: 0,
      maxSelections: 5,
      modifiers: [
        { guid: 'mod14', name: 'Pepperoni', price: 2.0 },
        { guid: 'mod15', name: 'Mushrooms', price: 1.5 },
        { guid: 'mod16', name: 'Sausage', price: 2.0 },
        { guid: 'mod17', name: 'Bell peppers', price: 1.5 },
        { guid: 'mod18', name: 'Olives', price: 1.0 },
      ],
    },
  ],
};

export default function ModifierModal({ item, onConfirm, onClose }) {
  // Use real modifier groups from Toast API data, or fall back to demo
  const modifierGroups = item.modifierGroups?.length
    ? item.modifierGroups
    : DEMO_MODIFIERS[item.guid] || [];

  // Track selections per group: { groupGuid: Set<modifierGuid> }
  const [selections, setSelections] = useState(() => {
    const initial = {};
    modifierGroups.forEach((g) => {
      initial[g.guid] = new Set();
      // Pre-select first option for required single-select groups
      if (g.minSelections >= 1 && g.maxSelections === 1 && g.modifiers.length > 0) {
        initial[g.guid].add(g.modifiers[0].guid);
      }
    });
    return initial;
  });

  const [quantity, setQuantity] = useState(1);
  const [specialInstructions, setSpecialInstructions] = useState('');

  const toggleModifier = (groupGuid, modGuid, maxSelections) => {
    setSelections((prev) => {
      const current = new Set(prev[groupGuid]);

      if (maxSelections === 1) {
        // Radio behavior — replace selection
        current.clear();
        current.add(modGuid);
      } else if (current.has(modGuid)) {
        current.delete(modGuid);
      } else if (current.size < maxSelections) {
        current.add(modGuid);
      }

      return { ...prev, [groupGuid]: current };
    });
  };

  // Validation: check all required groups have enough selections
  const isValid = modifierGroups.every((g) => {
    const count = selections[g.guid]?.size || 0;
    return count >= (g.minSelections || 0);
  });

  // Calculate extra cost from modifiers
  const modifierTotal = modifierGroups.reduce((sum, g) => {
    return (
      sum +
      g.modifiers
        .filter((m) => selections[g.guid]?.has(m.guid))
        .reduce((s, m) => s + (m.price || 0), 0)
    );
  }, 0);

  const totalPrice = (item.price + modifierTotal) * quantity;

  const handleConfirm = () => {
    // Build the modifiers array in the format Toast Orders API expects
    const selectedModifiers = [];
    modifierGroups.forEach((g) => {
      g.modifiers
        .filter((m) => selections[g.guid]?.has(m.guid))
        .forEach((m) => {
          selectedModifiers.push({
            entityType: 'MenuItemSelection',
            guid: m.guid,
            itemGroup: { guid: g.guid },
            item: { guid: m.guid },
            quantity: 1,
            modifiers: [],
          });
        });
    });

    onConfirm({
      ...item,
      quantity,
      modifiers: selectedModifiers,
      specialInstructions,
      // Store display info for the cart UI
      selectedModifierNames: modifierGroups.flatMap((g) =>
        g.modifiers
          .filter((m) => selections[g.guid]?.has(m.guid))
          .map((m) => m.name)
      ),
      modifierTotal,
    });
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
          maxWidth: 520,
          maxHeight: '85vh',
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
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)' }}>{item.name}</h3>
            {item.description && (
              <p
                className="text-sm text-muted"
                style={{ marginTop: 4, lineHeight: 1.4 }}
              >
                {item.description}
              </p>
            )}
            <span className="text-accent fw-600" style={{ marginTop: 4, display: 'block' }}>
              ${item.price.toFixed(2)}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--clr-text-muted)',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable modifier groups */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem 1.5rem' }}>
          {modifierGroups.length === 0 && (
            <p className="text-sm text-muted" style={{ padding: '1rem 0' }}>
              No customization options for this item.
            </p>
          )}

          {modifierGroups.map((group) => {
            const isRequired = (group.minSelections || 0) > 0;
            const isSingleSelect = group.maxSelections === 1;
            const selectedCount = selections[group.guid]?.size || 0;

            return (
              <div key={group.guid} style={{ marginBottom: '1.25rem' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem',
                  }}
                >
                  <div>
                    <span className="fw-600" style={{ fontSize: '0.92rem' }}>
                      {group.name}
                    </span>
                    {isRequired && (
                      <span
                        className="badge badge-warning"
                        style={{ marginLeft: 8 }}
                      >
                        Required
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-muted">
                    {isSingleSelect
                      ? 'Choose 1'
                      : `Choose up to ${group.maxSelections}`}
                  </span>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  {group.modifiers.map((mod) => {
                    const isSelected = selections[group.guid]?.has(mod.guid);
                    const isDisabled =
                      !isSelected &&
                      !isSingleSelect &&
                      selectedCount >= group.maxSelections;

                    return (
                      <button
                        key={mod.guid}
                        onClick={() =>
                          !isDisabled &&
                          toggleModifier(
                            group.guid,
                            mod.guid,
                            group.maxSelections
                          )
                        }
                        disabled={isDisabled}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.65rem 0.85rem',
                          border: `1.5px solid ${
                            isSelected
                              ? 'var(--clr-accent)'
                              : 'var(--clr-border)'
                          }`,
                          borderRadius: 'var(--radius-md)',
                          background: isSelected
                            ? 'var(--clr-accent-light)'
                            : 'var(--clr-surface)',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          opacity: isDisabled ? 0.5 : 1,
                          transition: 'all 0.15s',
                          textAlign: 'left',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.88rem',
                          width: '100%',
                        }}
                      >
                        {/* Checkbox / radio indicator */}
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: isSingleSelect ? '50%' : 4,
                            border: `2px solid ${
                              isSelected
                                ? 'var(--clr-accent)'
                                : 'var(--clr-border-dark)'
                            }`,
                            background: isSelected
                              ? 'var(--clr-accent)'
                              : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.15s',
                          }}
                        >
                          {isSelected && <Check size={13} color="white" strokeWidth={3} />}
                        </div>

                        <span style={{ flex: 1 }}>{mod.name}</span>

                        {mod.price > 0 && (
                          <span
                            className="text-muted"
                            style={{ fontSize: '0.82rem' }}
                          >
                            +${mod.price.toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Special instructions */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label className="input-label">Special instructions (optional)</label>
            <input
              className="input"
              placeholder="Allergies, preferences, etc."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </div>
        </div>

        {/* Footer — quantity + add to cart */}
        <div
          style={{
            padding: '1rem 1.5rem',
            borderTop: '1px solid var(--clr-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
          }}
        >
          {/* Quantity control */}
          <div className="cart-item-qty">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              style={{ width: 34, height: 34, fontSize: '1rem' }}
            >
              <Minus size={14} />
            </button>
            <span
              className="fw-600"
              style={{ minWidth: 28, textAlign: 'center' }}
            >
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              style={{ width: 34, height: 34, fontSize: '1rem' }}
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add to cart button */}
          <button
            className="btn btn-primary btn-lg"
            style={{ flex: 1 }}
            onClick={handleConfirm}
            disabled={!isValid}
          >
            Add to order — ${totalPrice.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
