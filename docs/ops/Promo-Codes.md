# Promo codes (Stripe)

ResumeLingo's hosted Stripe Checkout page shows an "Add promotion code" field (`allow_promotion_codes: true` in `StripeService.createCheckoutSession`). Codes live entirely in Stripe — there is no promo-code table or validation logic in the app.

## Create a code

1. Stripe Dashboard → **Product catalog → Coupons → New**.
2. Pick the discount: percent off or amount off, and a duration (once, repeating for N months, or forever).
3. Optional limits: applies to specific products only (e.g. Professional but not Premium), max redemptions, expiry date.
4. On the coupon, **Promotion codes → New**. Set the customer-facing code (e.g. `LAUNCH20`), and optionally: first-time customers only, minimum order, per-code redemption limit/expiry.
5. Use Test mode first and try the code on a test checkout before creating it in Live mode (the app picks test vs. live keys by environment — see `SubscriptionService`'s live-mode check).

## Things to know

- A discounted subscriber still sees full list prices inside ResumeLingo (Pricing page, Dashboard) — those come from the Admin > Plans & Pricing data. Stripe charges the discounted amount.
- Codes apply to any Checkout session, including Professional→Premium upgrades, unless the coupon is restricted to specific products.
- Redemptions are visible in the Stripe dashboard only; the Admin Console does not report them.
- Not supported yet: entering a code inside ResumeLingo's own upgrade modal. If codes get real use, that's the next step (validate via Stripe's API before redirecting to Checkout).
