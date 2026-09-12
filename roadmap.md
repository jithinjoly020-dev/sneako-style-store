# Roadmap

- [x] Storefront + admin (unlabelled), INR pricing, cPanel build
- [x] Order emails to jithinjoly020@gmail.com (needs RESEND_API_KEY)
- [x] Payments: removed Paytm/Razorpay/Cashfree; BharatPe is the only gateway
  - [x] BharatPe order creation + HMAC signing, hosted checkout window
  - [x] Auto-verify via BharatPe order status polling (txn id) before confirming the order
  - [ ] Add BHARATPE_MERCHANT_ID / BHARATPE_API_KEY / BHARATPE_SECRET (+ BHARATPE_MODE) secrets — BharatPe option hidden until then
- [ ] Direct UPI checkout (works with no gateway keys)
  - [x] UPI intent link + QR on checkout, customer submits UTR / txn reference
  - [x] Reference saved to the order, owner emailed for confirmation
  - [x] Set the studio UPI ID in src/lib/upi.ts

- [ ] Get live Paytm Merchant Key (blocked: user must copy it from Paytm dashboard → Developer Settings → API Keys) then save PAYTM_MID + PAYTM_MERCHANT_KEY
- [x] Add "already paid? enter Paytm Order ID" auto-verify (like PHP example: status check, amount match, no reuse, <24h old)
- [ ] Remove manual UPI/UTR payment method; keep only Paytm auto-verify + COD
