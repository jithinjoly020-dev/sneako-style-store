# Roadmap

- [x] Storefront + admin (unlabelled), INR pricing, cPanel build
- [x] Order emails to jithinjoly020@gmail.com (needs RESEND_API_KEY)
- [x] Payments: removed Paytm/Razorpay/Cashfree; BharatPe is the only gateway
  - [x] BharatPe order creation + HMAC signing, hosted checkout window
  - [x] Auto-verify via BharatPe order status polling (txn id) before confirming the order
  - [ ] Add BHARATPE_MERCHANT_ID / BHARATPE_API_KEY / BHARATPE_SECRET (+ BHARATPE_MODE) secrets — checkout stays COD-only until then
