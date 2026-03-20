# Toast Online Ordering — React + Vite

A full-stack web application for online food ordering powered by the **Toast POS API**. Includes a customer-facing ordering site and an admin dashboard.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐
│  Customer App    │     │  Admin Dashboard  │
│  (React + Vite)  │     │  (React + Vite)   │
└────────┬─────────┘     └────────┬──────────┘
         │                        │
         └──────────┬─────────────┘
                    │
          ┌─────────▼──────────┐
          │  Backend Proxy     │
          │  (Node + Express)  │
          │  OAuth2 + routing  │
          └─────────┬──────────┘
                    │
          ┌─────────▼──────────┐
          │  Toast Platform    │
          │  REST APIs         │
          └────────────────────┘
```

## Features

### Customer ordering site (`/`)
- **Menu browsing** with category tabs, search, and item cards
- **Modifier selection** — radio/checkbox modal for customizing items (size, toppings, cooking temp)
- **Stock checking** — items marked "Sold out" via the Toast Stock API
- **Restaurant status banner** — shows open/closed using Availability + Restaurants APIs
- **Scheduled orders** — pick a future date/time (sets `promisedDate` on the Toast order)
- **Shopping cart** — managed client-side (Toast has no cart API)
- **Checkout flow** — delivery info → order review → submit via Toast Orders API
- **Order tracking** — real-time status page polling `fulfillmentStatus` every 10s

### Admin dashboard (`/admin`)
- **Dashboard** — today's revenue, order count, active orders, avg order value
- **Order management** — table with status filters, search, detail panel
- **Real-time polling** — orders auto-refresh every 15 seconds
- **New order alerts** — audio chime + visual indicator when new orders arrive
- **Order actions** — view details, void orders

## Toast APIs Used

| API | Purpose |
|-----|---------|
| **Menus API** (v2) | Fetch menu items, modifier groups, prices |
| **Orders API** (v2) | Create/read orders, get prices, track fulfillment |
| **Credit Cards API** | Authorize card payments at checkout |
| **Stock API** | Check item availability / inventory |
| **Restaurant Availability API** | Verify the location accepts online orders |
| **Restaurants API** | Hours, address, location info |
| **Configuration API** | Dining options, revenue centers |
| **Order Mgmt Config API** | Online ordering schedule for time slots |

## Setup

### 1. Get Toast API credentials

Sign up at [dev.toasttab.com](https://dev.toasttab.com) and create an integration. You'll need:
- Client ID
- Client Secret
- Restaurant GUID

### 2. Configure environment

```bash
cp server/.env.example server/.env
# Edit server/.env with your Toast credentials
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run in development

```bash
# Start both backend proxy and Vite dev server:
npm run dev:all

# Or separately:
npm run server   # Backend on :4000
npm run dev      # Frontend on :3000
```

### 5. Build for production

```bash
npm run build
```

## Project Structure

```
toast-ordering/
├── server/
│   ├── index.js              # Express proxy (Toast auth + API routing)
│   └── .env.example          # Required environment variables
├── src/
│   ├── api/
│   │   └── toast.js          # Frontend API client
│   ├── components/
│   │   ├── ModifierModal.jsx      # Item customization (modifiers)
│   │   ├── OrderTracker.jsx       # Real-time order status tracker
│   │   ├── ScheduleOrderModal.jsx # Future order time picker
│   │   ├── RestaurantBanner.jsx   # Open/closed status bar
│   │   └── Notifications.jsx     # App-wide toast notifications
│   ├── context/
│   │   └── CartContext.jsx   # Shopping cart + Toast order builder
│   ├── hooks/
│   │   └── usePolling.js     # Polling hook + stock checker
│   ├── pages/
│   │   ├── MenuPage.jsx          # Customer: browse, customize, add to cart
│   │   ├── CheckoutPage.jsx      # Customer: delivery info → submit → track
│   │   ├── OrderTrackingPage.jsx # Customer: standalone /track/:id page
│   │   ├── AdminDashboard.jsx    # Admin: stats + recent orders
│   │   └── AdminOrders.jsx       # Admin: full order management + polling
│   ├── App.jsx               # Router + sidebar navigation
│   ├── main.jsx              # Entry point
│   └── index.css             # Global styles + design system
├── index.html
├── vite.config.js
└── package.json
```

## Order Flow

1. **Customer browses menu** → `GET /menus/v2/menus`
2. **Checks stock** → `GET /stock/v1/inventory`
3. **Customizes item** → Modifier groups from menus API data
4. **Adds to cart** → Client-side state (Toast has no cart API)
5. **Optionally schedules** → Sets `promisedDate` for future fulfillment
6. **Gets prices** → `POST /orders/v2/prices` (Toast calculates tax & totals)
7. **Places order** → `POST /orders/v2/orders` (sent to Toast POS & kitchen)
8. **Tracks order** → `GET /orders/v2/orders/{guid}` (polls fulfillmentStatus)

## Important Toast API Notes

- **Shopping cart**: Toast has no cart API — manage cart state yourself
- **Payments**: Only `CREDIT` and `OTHER` types supported (no cash/gift cards)
- **Service hours**: Orders API does NOT check hours — use Restaurant Availability API
- **Kitchen routing**: With KDS auto-fire, orders go straight to kitchen
- **Order limits**: Max 1,000 top-level selections, 1 MB request body
- **No SMS**: API-created orders don't trigger Toast SMS — build your own notifications

## Demo Mode

The app includes demo data so you can explore the full UI without Toast API credentials. When credentials are configured, it seamlessly switches to live data.

## License

MIT
