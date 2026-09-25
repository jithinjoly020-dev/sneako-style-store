# Roadmap

- [x] Storefront + admin (unlabelled), INR pricing, cPanel build
- [x] Order emails to jithinjoly020@gmail.com (needs RESEND_API_KEY)
- [x] Direct UPI checkout (works with no gateway keys)
  - [x] UPI intent link + QR on checkout, customer submits UTR / txn reference
  - [x] Reference saved to the order, owner emailed for confirmation
  - [x] Set the studio UPI ID in src/lib/upi.ts
- [x] Checkout: manual UPI (QR + UTR) as the ONLY payment method; Paytm and COD removed
- [x] Studio virtual try-on using active shop products
  - [x] Live camera preview with movable and resizable shirt layer
  - [x] Realistic AI photo try-on with streamed previews and download
