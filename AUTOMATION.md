# Order confirmation + Delhivery automation

When a website order is **actually paid** (₹500 COD deposit or the full amount, confirmed by CCAvenue), the CRM:

1. Sends the customer a WhatsApp message: *"Order #24600 · Muejaza For Men (300g) x1 · Total ₹4,300 · Online paid ₹500 · Cash on delivery ₹3,800. Is this order correct?"* with **Haan, confirm** / **Change karna hai** buttons.
2. On **Haan, confirm**: shows the delivery address with **Haan, sahi hai** / **Address badlo** buttons. On *Address badlo*, the customer types the new address with a 6-digit pincode, and it's shown again for confirmation.
3. On **Haan, sahi hai**: checks the pincode with Delhivery (serviceable, COD available), then **creates the Delhivery order** with the website order number, the full order value as declared value, and the COD balance as the cash to collect. The customer gets "Order confirm ho gaya" plus the AWB and a tracking link.
4. **Pickup is not requested.** Pickups stay manual in Delhivery One.

Anything unusual makes the order **"Needs a call"** and alerts the team in the CRM: the customer chose *Change karna hai*, the pincode isn't serviceable or has no COD, a WhatsApp or Delhivery error, or no reply. No reply means one reminder after 4 h, then "needs a call" after 24 h.

Unpaid website orders (abandoned or failed payments) are never messaged and never shipped.

## In the CRM
**Orders → View order → "Confirmation & Delhivery"** shows the status, amounts, the delivery address (editable) and the AWB. Actions:

- **Send / Re-send WhatsApp confirmation:** website orders.
- **Mark confirmed (after call):** after the team has spoken to the customer.
- **Create Delhivery order:** for an order confirmed on a call, or a **WhatsApp order entered by hand** (uses its delivery address, else the billing address and its pincode).

The orders table shows a small chip under the status: *Waiting for customer*, *Needs a call*, *AWB 002542*, and so on.

## Safety built in
- **Off by default.** Nothing changes until `AUTOMATION_ENABLED=true`.
- **Test mode:** with `AUTOMATION_TEST_PHONES` set, only those numbers get the flow.
- **Never old orders:** only orders placed in the last 48 h (`AUTOMATION_MAX_ORDER_AGE_HOURS`), so the first sync can't message past customers.
- **Sent once:** each order is claimed in the database before sending, so duplicate webhooks can't send twice.
- **Signed replies only:** button replies and typed addresses are acted on only when Meta's `X-Hub-Signature-256` signature is valid (`WA_APP_SECRET`).
- **Customer match:** a reply must come from the order's own mobile number.
- **Delhivery dry run** (`DELHIVERY_MODE=dry_run`, the default): the shipment is built and logged, but nothing is created in Delhivery.

## Go-live steps

### 1. Create the WhatsApp template (Meta must approve it)
WhatsApp Manager → Message templates → Create:

- **Name:** `nk_order_confirm`
- **Category:** Utility
- **Language:** English (`en`)
- **Body:**
  ```
  Namaste {{1}} ji 🙏
  NK Herbal par aapka order receive ho gaya hai.

  Order: #{{2}}
  Product: {{3}}
  Total: {{4}}
  Online paid: {{5}}
  Cash on delivery: {{6}}

  Kya yeh order sahi hai? Neeche button dabakar confirm karein.
  ```
- **Sample values:** Ravi · 24600 · Muejaza For Men (300g) x1 · ₹4,300 · ₹500 · ₹3,800
- **Buttons:** Quick reply → `Haan, confirm`, then Quick reply → `Change karna hai`, in this order.

The address step uses normal WhatsApp buttons (allowed because the customer has just replied), so no second template is needed.

### 2. Render → crm-backend → Environment
| Variable | Value |
|---|---|
| `AUTOMATION_ENABLED` | `true` |
| `AUTOMATION_TEST_PHONES` | your own 10-digit number for the first test; remove it to go live for everyone |
| `WA_APP_SECRET` | Meta app secret (developers.facebook.com → your app → Settings → Basic → App secret) |
| `WA_TEMPLATE_ORDER_CONFIRM` | `nk_order_confirm` |
| `WA_TEMPLATE_LANG` | `en` |
| `DELHIVERY_MODE` | `dry_run` first, then `live` |
| `DELHIVERY_TOKEN` | Delhivery One → Settings → API and MCP Setup |
| `DELHIVERY_PICKUP_NAME` | exact pickup location name, case-sensitive (Settings → Pickup Locations), e.g. `Nk Herbal` |
| `DELHIVERY_SELLER_GST` | `27AUIPK9713C2ZL` |
| optional | `DELHIVERY_HSN` (default 30049011), `CONFIRM_REMINDER_HOURS` (4), `CONFIRM_ESCALATE_HOURS` (24), `AUTOMATION_MAX_ORDER_AGE_HOURS` (48), `DELHIVERY_BASE_URL` (default https://track.delhivery.com) |

Check the setup (logged in): `GET /api/automation/status` shows what's on and what's missing, with no secrets.

### 3. Roll out
1. **Test mode + dry run:** your number in `AUTOMATION_TEST_PHONES`, `DELHIVERY_MODE=dry_run`. On one of your own website orders, use **Send WhatsApp confirmation** and go through the buttons. Check the CRM shows *Shipment (test)* with the right COD amount.
2. **Everyone + dry run:** remove `AUTOMATION_TEST_PHONES`. Real customers confirm on WhatsApp; you still book Delhivery by hand using the values in the order view.
3. **Live:** `DELHIVERY_MODE=live`. Check the first few AWBs in Delhivery One: COD amount, declared value, package weight. Pickups stay manual.

## Package defaults
300 g jars: 750 g, 17 × 17 × 17 cm per unit. Shilajit: 500 g, 9 × 9 × 9 cm. These come from past Delhivery bookings. Change them in `backend/services/delhivery.js` (`packageFor`) if your boxes differ.

## Tests
`cd backend && npm test`: 24 tests covering the full conversation, safety rules, reminders, Delhivery payloads and the WooCommerce/CCAvenue webhooks. Nothing is sent anywhere.
