Sneako Tee Shop

A modern, minimal e-commerce platform for selling premium T-shirts, featuring a clean storefront, seamless shopping experience, and a powerful admin dashboard.

The design takes inspiration from the visual style of Sneako, focusing on bold typography, clean layouts, high-quality product imagery, and a premium streetwear aesthetic.

Features
Customer Storefront
Minimal, responsive design for desktop, tablet, and mobile.
Modern homepage with promotional banners and featured collections.
Product listings with images, prices, sizes, colors, and availability.
Product detail pages with size and color selection.
Shopping cart and checkout flow.
Product search, filtering, and sorting.
Customer accounts and order history.
Wishlist and featured products.
Order confirmation and status tracking.
Admin Dashboard
Secure admin authentication using Supabase.
Dashboard overview with sales, revenue, orders, and product statistics.
Add, edit, delete, and manage products.
Upload product images and manage product galleries.
Manage categories, sizes, colors, stock, and pricing.
View, search, filter, and update customer orders.
Manage order statuses, including pending, processing, shipped, delivered, and cancelled.
View customer details and order history.
Manage discounts, coupons, and promotional campaigns.
Inventory management and low-stock alerts.
Customer management and sales reports.
Technology Stack
Frontend: React, TypeScript, Vite
Styling: Tailwind CSS and reusable UI components
Backend: Supabase
Database: PostgreSQL
Authentication: Supabase Auth
Image Storage: Supabase Storage
Deployment: Vercel or another compatible hosting provider
Project Setup
Requirements
Node.js
npm
A Supabase project
Installation
bash
git clone <your-repository-url>
cd <your-project-folder>
npm install
npm run dev

Environment Variables

Create a .env file in the project root:

env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key


Use the current Supabase publishable key configuration supported by your project. Never expose a Supabase service-role key in frontend code.

Supabase Configuration
Create a Supabase project.
Configure authentication and admin access.
Create database tables for products, categories, product variants, inventory, profiles, orders, and order items.
Configure Supabase Storage for product images.
Apply Row Level Security (RLS) policies to protect customer data and restrict administrative operations.
Connect the storefront and admin dashboard to the database.
Design Direction

The interface should feel minimal, premium, and fashion-focused.

Black, white, and neutral color palette.
Bold typography and generous whitespace.
Large product photography.
Clean product cards and subtle hover interactions.
Simple navigation and an intuitive shopping experience.
Consistent components throughout the storefront and admin dashboard.
Responsive layouts optimized for mobile shopping.
Project Structure
text
src/
├── components/
├── pages/
├── layouts/
├── hooks/
├── integrations/
│   └── supabase/
├── lib/
├── types/
└── App.tsx

supabase/
└── migrations/

public/
└── images/

Development

This project is maintained in GitHub and can be developed locally or through the connected project editor.

bash
npm install
npm run dev

Security
Enforce Row Level Security on sensitive database tables.
Restrict admin access through server-validated roles and policies.
Keep private credentials and service-role keys on the server.
Validate product prices, inventory, and order operations on trusted backend code.
Protect customer information and order history.
License

Add your chosen license before distributing or reusing this project publicly.
