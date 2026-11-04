# Electra Afikim cross-device demo sync

The Flutter mobile app and attendance API are in this GitHub repository.

## Test API
- URL: https://attendance.77.42.93.209.sslip.io
- GET /health is public and has no personal data.
- POST /api/login uses short-lived, role-bound tokens. Demo passwords must be set
  on the server only. Never commit passwords or database credentials.
- GET /api/assignments returns all records to managers and only their own
  records to workers.
- PUT /api/assignments/:id requires manager role and an expected version.
  Updates reset a prior acknowledgment.
- POST /api/assignments/:id/confirm requires matching worker role and version.
- GET /api/events provides SSE notifications; the Flutter client currently
  uses automatic 3-second polling so network reconnection is simple.
- All changes are persisted in a dedicated PostgreSQL container.

## Demo vs production
Only fictional test accounts and assignments. This is not a production staff
tracking or time/payroll system. No device GPS collection. Manager/worker test
accounts cannot be substituted for Electra's real identity provider.

## Deployment boundaries
The API runs on a private loopback port, behind HTTPS and a separate Nginx
server name. The database is isolated from existing company systems, with a
named Docker volume. Login secrets and signing keys are stored in a
root-readable server environment file outside GitHub. Other vhosts are
untouched.

## Acceptance
1. Open the Flutter app twice, in two independent browser profiles or phones.
2. Sign in as manager and worker with distinct temporary demo accounts.
3. Update the assignment from the manager session.
4. Within 3 seconds, the worker should see the changed assignment and
   unconfirmed status, without a manual refresh.
5. Worker confirms; the manager should see that confirmation.
6. A worker PUT should return 403. A stale manager PUT should return 409.
7. Reload both devices and verify the records persist.

Before production: employee/manager IAM, scoped organizational tenancy,
password reset, audit review, secure sessions and revocation, consent and
purpose limitation, legal review of workplace GPS, retention/deletion policy,
mobile offline queues and conflict reconciliation, monitoring and backups.
