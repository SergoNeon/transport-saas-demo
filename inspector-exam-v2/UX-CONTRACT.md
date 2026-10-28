# Electra Afikim — Product UX Contract

- Roles: owner, manager (מנהל), HR (משאבי אנוש), examinee.
- Authentication: owner/supervisor via staff number + password. Examinee via invitation code + nine-digit Israeli identity number (תעודת זהות). Staging accepts synthetic 000000XXX only.
- The login presents worker and manager entries as explicit role tabs. Tabs do not grant server permissions.
- Staff passwords must be changed after first login, and server sessions use HttpOnly Secure cookies.
- Owner manages staff access. A manager sees only exams that they assigned; owner sees all.
- Manager invites worker -> worker signs in -> answers 30 questions with server-side persistence -> submits -> authorized manager reviews and manually records a decision.
- Worker sees no correct answer index and no score or percentage, even after submission or re-login.
- Server remains authoritative for completion, timer, session validity, review decisions and role permissions.
- Network failure must preserve safe form input and give visible status. Buttons disable while awaiting the server to avoid duplicate requests.
- Mobile: keep form fields, role selection, submit, errors and footer readable without horizontal scroll. RTL Hebrew labels; ID/code inputs LTR.
- Public staging environment uses dummy data only; actual employee IDs are not permitted until a production privacy and security acceptance.
