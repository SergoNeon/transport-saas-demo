# Electra Afikim official-domain release acceptance — 2026-10-28

**Developer:** BRILL TEAM PROJECT  
**Domains:** https://test.brillteamp.com/ (examinee), https://adm.brillteamp.com/ (authorized manager)

## Verified directly
- DNS for both official hostnames resolves to 77.42.93.209.
- TLS on both hostnames serves HTTP 200 with Let's Encrypt certificate for both domains.
- Dedicated worker UI (`worker.js`, `worker.css`) has a personal invitation-code field and a 9-digit Israeli ID field; the rendered page has no horizontal scroll at browser widths 390px and 1366px.
- Dedicated supervisor UI (`admin.js`, `admin.css`) has distinct staff-number/password login.
- Manager authenticated with synthetic staff credentials on the official hostname, selected a submitted candidate, and displayed exactly 30 question comparison cards and 60 answer panels (actual answer and expected answer). The tested candidate displayed 47%; no horizontal overflow at 390px or 1366px.
- PostgreSQL-backed `/api/health` returned 30 questions.
- Staging has previously passed server-level tests for separate worker invitation codes and Teudat Zehut matching, persistence, submission lockout and independent manager decision.
- The owner role is active in PostgreSQL; the owner browser test on the official domain was inconclusive (did not reach staff-management controls).

## Blocking production use with real employee PII
- Environment is still `EXAM_TEST_ONLY=1` and only allows synthetic IDs. **Do not enter real employee identity numbers.**
- Owner session/access to user-management UI must pass an authorized browser E2E test without using passwords published in a chat.
- Test mobile exam start, all 30 answers, interruption/relogin, final submission and result review through the *official* domains in the same acceptance run.
- Conduct security/privacy/retention and full backup/restore acceptance. In particular six-digit admin PINs should not be enabled without extra protections for real personnel information.
- Confirm manager/HR role matrix and owner ability to create and disable privileged staff accounts. Production credentials must be exchanged privately.
- Release only after these gates are verified and recorded.

## Architecture
The server serves the worker landing from `/`, and the manager landing from `/admin.html`, with separate actual JavaScript/CSS bundles. **Do not edit `secure.js` to change the current worker or manager screen**, because those pages use `worker.js` and `admin.js` respectively.
