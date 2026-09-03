# Roadmap

- [x] Storefront + admin (unlabelled), INR pricing, cPanel build
- [x] Order emails to jithinjoly020@gmail.com (needs RESEND_API_KEY)
- [ ] Payments: remove Razorpay/Cashfree, use Paytm merchant (MID + merchant key)
  - [ ] Paytm initiateTransaction + checksum signing
  - [ ] Auto-verify payment via Paytm order/transaction status (txn id) before confirming order
  - [ ] Collect PAYTM_MID / PAYTM_MERCHANT_KEY secrets
