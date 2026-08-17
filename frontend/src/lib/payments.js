import WebApp from '@twa-dev/sdk'

// Must match STARS_TOPUP_PACKAGES / VENUE_TIERS in backend/src/index.js
export const STARS_TOPUP_PACKAGES = [100, 300, 750]

export const VENUE_TIERS = {
  week:  { price: 300, days: 7,  radius_km: 20, label: '1 тиждень' },
  month: { price: 500, days: 30, radius_km: 20, label: '1 місяць' },
}

// Opens a Telegram Stars invoice and resolves once the sheet closes —
// 'paid' means the payment actually went through (the webhook has already
// credited the balance server-side by the time this callback runs).
export function payInvoice(invoiceLink) {
  return new Promise((resolve) => {
    WebApp.openInvoice(invoiceLink, (status) => resolve(status))
  })
}
