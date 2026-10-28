# BRILL TEAM PROJECT — Electra Afikim server API

## State, 2026-10-28

Neon project: `dark-breeze-82688216`; default branch `br-steep-sea-b9vt7x3q`; region `aws-eu-central-1`.

Neon Function: `afikimexam`, deployment 1, status completed.

URL: https://br-steep-sea-b9vt7x3q-afikimexam.compute.c-7.eu-central-1.aws.neon.tech/

The function is a **connectivity probe only**. It is not a production API, does not authenticate users, and does not persist exams. It only reports whether the injected DATABASE_URL environment variable exists, without exposing its value.

Neon database tables exist; 30 examination questions, zero real candidates, zero registered administrators as of last confirmed query. No live passport/ID data has been requested or inserted.

## Release gates

- Implement server-side session authentication and staff roles: owner, manager (`מנהל`), HR (`משאבי אנוש`).
- Store only minimized Israeli ID metadata and a keyed fingerprint in production. Avoid raw IDs and any real personal data in the demo.
- Create a worker invitation, save answers, enforce 40-minute timer, submit without revealing scores to the worker, allow a human reviewer decision.
- Verify cross-device, cross-session data and authorization with test identities before switching the live Vercel app away from browser-local demo data.
- Configure session cookie security and same-origin restrictions before accepting credentials.

The existing production-demo UI remains at https://afikim-exam-review-demo.vercel.app/ and /admin.html, with browser-only storage. Do not describe it as ready for real personnel use.
