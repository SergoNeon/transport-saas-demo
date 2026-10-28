# Electra Afikim — Product UX Contract

- Roles: owner, manager (מנהל), HR (משאבי אנוש), examinee.
- Authentication: owner/supervisor via staff number + password. Examinee via invitation code + nine-digit Israeli identity number (תעודת זהות). Staging accepts synthetic 000000XXX only.
- Worker enters at `/` (its own worker-only HTML page); owner, manager and HR enter at `/admin.html` (a separate admin-only HTML page). No role switching tabs exist on either page. The backend enforces access separately from the visual route.
- Staff passwords must be changed after first login, and server sessions use HttpOnly Secure cookies.
- Only in the isolated synthetic-data staging environment (`EXAM_TEST_ONLY=1`), an administrator may choose a numeric PIN of **6–24 digits** instead of a 14-character password. Password changes and owner-created staff credentials use the same server-provided `/api/password-policy`; the password must persist after logout and fresh login. All passwords are salted and scrypt-hashed. Production with real employee data keeps a minimum of 14 characters pending security acceptance.
- Password changes show a precise error for an incorrect current password or an invalid new PIN. On success the user returns to the authorized manager dashboard and sees a server-confirmed success message. Staff can also update passwords later using the dashboard control.
- Owner manages staff access. A manager sees only exams that they assigned; owner sees all.
- For every new candidate the manager creates an independent cryptographically random invitation code bound server-side to that candidate's exact nine-digit תעודת זהות. Other candidates' codes and IDs are never interchangeable.
- A worker may resume their own *unfinished* exam until its deadline, but submitting permanently closes that candidate's examination and the invitation code may not be used for new entry. Existing sessions may show only a submission receipt, not exam questions.
- After a submitted exam there is **no automatic acceptance or rejection**. The authorized manager alone records a manual decision, independently for each candidate.
- Worker sees no correct answer index and no score or percentage, even after submission or re-login.
- Server remains authoritative for completion, timer, session validity, review decisions and role permissions.
- Network failure must preserve safe form input and give visible status. Buttons disable while awaiting the server to avoid duplicate requests.
- Mobile: keep role-specific form fields, submit, errors and footer readable without horizontal scroll. Never show manager-login controls on the worker page or worker-login controls on the management page.
- Public staging environment uses dummy data only; actual employee IDs are not permitted until a production privacy and security acceptance.
