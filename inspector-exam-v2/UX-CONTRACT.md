# Electra Afikim — Product UX Contract

- Roles: owner, manager (מנהל), HR (משאבי אנוש), examinee.
- Authentication: owner/supervisor via staff number + password. Examinee via invitation code + nine-digit Israeli identity number (תעודת זהות). Staging accepts synthetic 000000XXX only.
- Worker enters at `/` (its own worker-only HTML page); owner, manager and HR enter at `/admin.html` (a separate admin-only HTML page). No role switching tabs exist on either page. The backend enforces access separately from the visual route.
- Staff passwords must be changed after first login, and server sessions use HttpOnly Secure cookies.
- Owner manages staff access. A manager sees only exams that they assigned; owner sees all.
- For every new candidate the manager creates an independent cryptographically random invitation code bound server-side to that candidate's exact nine-digit תעודת זהות. Other candidates' codes and IDs are never interchangeable.
- A worker may resume their own *unfinished* exam until its deadline, but submitting permanently closes that candidate's examination and the invitation code may not be used for new entry. Existing sessions may show only a submission receipt, not exam questions.
- After a submitted exam there is **no automatic acceptance or rejection**. The authorized manager alone records a manual decision, independently for each candidate.
- Worker sees no correct answer index and no score or percentage, even after submission or re-login.
- Server remains authoritative for completion, timer, session validity, review decisions and role permissions.
- Network failure must preserve safe form input and give visible status. Buttons disable while awaiting the server to avoid duplicate requests.
- Mobile: keep role-specific form fields, submit, errors and footer readable without horizontal scroll. Never show manager-login controls on the worker page or worker-login controls on the management page.
- Public staging environment uses dummy data only; actual employee IDs are not permitted until a production privacy and security acceptance.
