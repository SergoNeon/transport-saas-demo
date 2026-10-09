# Transport SaaS — public interactive demo

Live GitHub Pages: https://sergoneon.github.io/transport-saas-demo/

This repository contains public STATIC FRONTEND ONLY, with entirely fictional data. The private commercial core remains at https://github.com/SergoNeon/transport-saas-core

## Preview
- Onboarding / 30 days free: https://sergoneon.github.io/transport-saas-demo/register.html
- Interactive dispatch dashboard: https://sergoneon.github.io/transport-saas-demo/
- Languages: Russian, Hebrew (RTL), English.
- Features to try: create example bookings, assign demo drivers, change ride status, switch between modules.

## Important
The 30-day trial in the real API is stored and enforced server-side in the PRIVATE core. This GitHub Pages site is a visual demonstration only: no production signups, backend connection, actual payments or GPS tracking. The company name entered on the preview is kept only in the browser tab sessionStorage; no email or password is collected.

## Publication
GitHub Pages from main branch root. The core repository is not exposed. Only static frontend assets are published; DO NOT copy API code, SQL migrations, secrets, real passenger data or env files into this public demo.
