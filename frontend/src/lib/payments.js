import WebApp from '@twa-dev/sdk'

// Must match STARS_TOPUP_PACKAGES / PRO_PRICE_STARS / VENUE_TIERS in backend/src/index.js
export const STARS_TOPUP_PACKAGES = [100, 300, 750]
export const PRO_PRICE_STARS = 300

export const VENUE_TIERS = {
  basic:    { price: 250, days: 14, radius_km: 10, label: 'Базовий' },
  standard: { price: 450, days: 30, radius_km: 20, label: 'Стандарт' },
  premium:  { price: 800, days: 30, radius_km: 30, label: 'Преміум' },
}

// Opens a Telegram Stars invoice and resolves once the sheet closes —
// 'paid' means the payment actually went through (the webhook has already
// credited the balance server-side by the time this callback runs).
export function payInvoice(invoiceLink) {
  return new Promise((resolve) => {
    WebApp.openInvoice(invoiceLink, (status) => resolve(status))
  })
}
