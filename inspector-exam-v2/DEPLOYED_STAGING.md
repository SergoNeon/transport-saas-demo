# Electra Afikim VPS staging — verified 2026-10-28

Developer: BRILL TEAM PROJECT. Synthetic test data only; not approved for real personnel records.

Worker: https://afikim.77.42.93.209.sslip.io/#worker
Manager: https://afikim.77.42.93.209.sslip.io/#admin
Health: https://afikim.77.42.93.209.sslip.io/api/health

Host: ubuntu-4gb-hel1-1, IP 77.42.93.209. Source: SergoNeon/transport-saas-demo/inspector-exam-v2.
Deployment: /opt/afikim-exam-staging; systemd afikim-exam.service (unprivileged), localhost:18439.
Database: Docker afikim-exam-postgres, private 127.0.0.1:15543, separate persistent volume.
HTTPS: Nginx / Let's Encrypt certificate; HTTP 80 redirects to HTTPS.
Secrets and generated login credentials: /etc/afikim-exam/, root-only, never in GitHub.
EXAM_TEST_ONLY=1 restricts identity numbers to synthetic 000000XXX.
Owner ID 000001 has a required password change at next login.

Verified:
- HTTPS UI and SQL-backed health both returned HTTP 200; health confirmed 30 questions.
- A second VPS (Brill-radio, 2.29.8.25) retrieved both HTTPS endpoints (HTTP 200).
- Distinct manager and worker authenticated sessions were used for exam assignment and completion.
- All 30 answers saved in PostgreSQL; 15 restored after logout and a fresh worker session.
- Fresh manager session after logout retrieved the persisted result and 30 answer details.
- Another manager was denied access to details (HTTP 404) and review approval (HTTP 409).
- Human manager approved test exam; direct PostgreSQL query returned status submitted, decision accepted, and 30 saved answer records.
- Worker did not receive correct answers or score.

Release limits: temporary sslip.io URL, no real employee data, pending backups/retention policy, production identity provision, mobile browser QA, and operational monitoring.
test.brillteamp.com and adm.brillteamp.com DNS remain pointed at 167.235.125.76, not this VPS.
