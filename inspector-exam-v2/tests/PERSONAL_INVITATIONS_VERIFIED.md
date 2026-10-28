# Personal worker examination invitations — verified server acceptance

Verification date: 2026-10-28 (Asia/Jerusalem).
Staging URL: https://afikim.77.42.93.209.sslip.io/
Source: `inspector-exam-v2/api/index.js` and `tests/personal-invitations-e2e.mjs`.
All employee identities used in the test were synthetic (EXAM_TEST_ONLY=1).

## Behavior verified over real HTTPS

- Each manager-issued invitation receives a cryptographically random code stored only as an HMAC digest in PostgreSQL. Two issued codes were different.
- Worker login requires both the correct code and the exact nine-digit registered Israeli ID. Swapped ID/code pairs returned HTTP 401.
- The two workers had independent authenticated sessions and independent answer records.
- Each worker saved 30 questions and submitted independently. Their answers were confirmed in PostgreSQL.
- After submission, a fresh login with the same invitation and Israeli ID returned HTTP 401, including after worker logout. Attempting to retrieve examination questions from the old session returned HTTP 409.
- Submission **did not** automatically approve or reject. PostgreSQL verification showed one candidate with decision PENDING after submission, while the other candidate was only accepted following an explicit authorized manager review.
- Worker responses did not disclose score/percentage.
- Separate public worker and management pages were rechecked with Chromium at widths 390px and 1366px. Both returned HTTP 200; health reports 30 questions.

## Direct PostgreSQL validation

For both synthetic test records: status `submitted`; answer count `30`.
One candidate: reviewer decision `accepted` after manager action.
One candidate: reviewer decision `NULL` (shown as `PENDING`) until reviewed.

## Operating constraints

This remains a TEST environment. `EXAM_TEST_ONLY=1` allows only synthetic ID numbers of the form `000000XXX`. Do not submit real employee identity information until production privacy, security, retention, backups and acceptance checks are completed.
