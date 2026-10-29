# SAJ Academy Hussainabad - Attendance Portal

## v57 - soft white + blue theme, professional reports, new login panels
- Dashboard / login / dialogs: eye-friendly white + soft blue theme (colours are variables at the top of css/style.css).
- New js/reports.js: one shared design for Daily Attendance, Monthly Attendance, DSR and Left Students.
  PDF = colourful (blue header band, both logos, stat cards, coloured P/A/L/Lv cells, page footer). Print = black and white, same layout.
- Reports tab: new "Daily Print" and "Monthly Print" buttons. Left Students: new PDF button.
- Login panels (parent + management): navy and gold, serif headings, wave footer; management login has Admin / Principal / Teachers / Incharges tabs.
- Dark mode: moon/sun button next to Refresh (top bar); the choice is remembered in the browser.
- Mobile app (PWA): installable from the phone browser (manifest.webmanifest, sw.js, icons/). Android: Install app button or menu > Install app. iPhone: Share > Add to Home Screen.
- Only two logos are used everywhere: assets/logo.jpg (SAJ) and assets/omys.jpg (OMYS). assets/saj-card.jpg removed.


Static website + Vercel serverless API (`api/rpc.js`) + Firebase Firestore. No build step.

## Roles
- **Admin**: add students (Excel, CSV or manual), create teacher logins, assign classes, set passwords, block/unblock/delete/reset any user, take attendance for any class, daily/monthly PDF reports.
- **Teacher**: can take attendance and view reports only for the classes assigned by the admin (enforced by Firestore rules too).
- **Parent**: username = Student ID (SAJ-0001, SAJ-0002 ... given automatically), default password = 1234 (can be changed). Sees only their own child's record.

## One-time setup
1. Firebase Console > create a project > Firestore Database > Create database (production mode).
2. Firestore > Rules tab: paste the content of `firestore.rules` and Publish.
3. Project settings > General > Your apps > add a Web app (`</>`). Paste the config into `js/firebase-config.js`.
4. Project settings > Service accounts > Generate new private key. Paste the whole JSON into the Vercel environment variable `FIREBASE_SERVICE_ACCOUNT`. Never upload this file to GitHub.
5. Upload the project to GitHub, then Vercel > Add New Project > import the repo (Framework: Other, leave build command empty).
6. Vercel > Settings > Environment Variables:
   - `FIREBASE_SERVICE_ACCOUNT` = the full service account JSON
   - `ADMIN_PASSWORD` = your admin password, required (the admin account is created from it on first login)
7. Deploy / Redeploy. Login: username `admin`, password = `ADMIN_PASSWORD`.

## Daily use
1. Admin > Students: upload an Excel file (use the Sample template button for the format) or add students one by one.
2. Admin > Users: create teacher logins, tick their classes, and share the username/password.
3. Teachers open Attendance, pick class and date, and mark P / A / L / Lv.
4. Reports: daily and monthly PDF.

## Notes
- If Firestore shows an "index required" error, click the link in the error to create the index.
- Class changes or blocking a user take effect at that user's next login (an existing session can last up to ~1 hour).
- PDF reports do not render Urdu script; enter names in English.
- Passwords are hashed on the server; Firestore rules block clients from reading the users collection.

## Fresh setup checklist (new Firebase + new GitHub + new Vercel)
1. Firebase: create project > **Build > Firestore Database** (production mode) > Rules tab: paste `firestore.rules` > Publish.
2. Firebase: **Build > Authentication > Get started** (needed once; no sign-in method has to be enabled).
3. Firebase: Project settings > General > Web app (`</>`) > copy the config into `js/firebase-config.js`. The file must contain ONLY `export const firebaseConfig = { ... };` (no `import`, no `initializeApp`, no `getAnalytics`).
4. Firebase: Project settings > Service accounts > Generate new private key. Keep that JSON OUTSIDE the project folder; it only goes into Vercel.
5. GitHub: new repo, upload all files from inside the `saj-portal` folder (api, css, js, assets, index.html, package.json, vercel.json, firestore.rules, README.md).
6. Vercel: import the repo (Preset: Other). Environment Variables: `FIREBASE_SERVICE_ACCOUNT` (full JSON) and `ADMIN_PASSWORD`. Deploy.
7. Always open the main project link (the "Visit" button), not the old per-deployment links.

## Troubleshooting
- `auth/api-key-not-valid`: `js/firebase-config.js` on GitHub still has placeholder values.
- Blank page + "Failed to resolve module specifier firebase/app": `firebase-config.js` still has the `import` lines, or you opened an old deployment link.
- "Node.js Version is discontinued": `package.json` engines must be `24.x` (already set).
- "Incorrect username or password": check `ADMIN_PASSWORD`, then Redeploy after changing env variables.

## v3 additions
- Admin login: `/admin/login` (admin only). Teachers and parents use the main link. Each login page rejects the other role.
- New parents/teachers must change the default password at first login.
- Teachers post homework (Homework tab); parents see it for their child's class. Admin posts Notices for everyone.
- The whole portal is English only.
- Admin sidebar: Add Student (manual + Excel), Add Teacher, Students, Users, Notices.
- IMPORTANT: re-publish `firestore.rules` in Firebase (new rules for homework and notices), then redeploy on Vercel.

## v9 changes
- Fixed blank screen: "Cannot access 'ADM' before initialization" (app.js).
- Admin > Notices: choose "All students" or "Individual student" (class > student). Individual notices are stored in `pnotices`; only that student's parent and the admin can read them.
- Logo on login pages now sits fully inside the circle.
- Sidebar: Logout stays pinned at the bottom; only the menu list scrolls.
- `js/firebase-config.js` filled with the saj-portal project config.
- IMPORTANT: re-publish `firestore.rules` in Firebase (new `pnotices` rule), then redeploy on Vercel.

## v10 changes
- Two shifts: Morning (Boys) and Afternoon (Girls). Every student belongs to a shift; class key is now `AM|class|section` or `PM|class|section`. Manual add has a Shift selector; Excel has an optional Shift column (Morning/Afternoon), otherwise the "Default shift" selector is used.
- Teachers: one login can be given classes from both shifts (tick them in Add Teacher / Edit). Separate-shift teachers just get separate logins.
- Admin > Reset All Data: type DELETE + admin password; erases students, parents, teachers, attendance, homework, notices. Admin login stays.
- Footer with copyright and developer credit on login and all panels.
- Students saved before v10 have no shift (shown as "5 - A"). To move them into a shift, re-import them with the Shift column (same GR updates the student) or use Reset All Data and import fresh.

## v11 changes
- Add/Edit Teacher has a Shift dropdown (Morning / Afternoon / Both). Only that shift's classes can be ticked, and the server also drops any class outside the chosen shift.
- A teacher (or admin) who has classes in both shifts first picks Morning or Afternoon (Attendance, Homework, Reports), then that shift's class list opens. Single-shift teachers never see the other shift.
- Visibility is enforced by Firestore rules: a teacher can read only students/attendance of the classes in their login; a parent only their own child; admin everything. Existing teachers keep working (their shift is inferred from their classes).
- Class/shift changes apply at the teacher's next login.

## v12 changes
- **Results** (Admin + Teacher sidebar). Terms: First, Mid, Final. Two formats from your sample PDFs: Pre-Primary (KG/Nursery/Prep/PG classes) and Primary to Matric. Format is auto-detected from the class name and can be switched on the page.
  - Teacher: choose shift, class, term, academic year, then "Enter marks" per student (subjects and maximum marks are preset; totals, percentage, grade, result are automatic). Save, or Save & next student.
  - Teacher and Admin: View, Print, PDF per student, and Print all / Download all as PDF for the class. Admin cannot enter or edit marks.
  - Parents have NO access (enforced in firestore.rules, not only in the screen).
  - A subject left completely empty is treated as "not taken" and is left out of the total.
- **Progress report** button (Students tab, Results list): logo, school, name, father, class, roll, GR, attendance summary and month table, and the three terms. Terms not held yet show "Exam not yet held / result coming soon".
- **Events** (Admin only): add holidays (school closed) or plain events. Saturday and Sunday are always off. On a holiday students show as Holiday (not present/absent/late/leave), attendance cannot be marked, and reports/progress ignore that day.
- New assets: assets/omys.jpg, saj-card.jpg, kid-girl.png, kid-boy.png (from your sample PDFs).
- Publish the new `firestore.rules` (adds `results` and `events`).
- Academic year is taken as April to March (e.g. 2025-2026). The year box on the Results page can be edited.

## v13 changes
- **New report card** (one clean A4 design for all classes): SAJ logo on the left, OMYS logo on the right (OMYS logo re-cropped, no black line), subject-wise marks table, big result box (Total / Obtained / % / Grade / PASSED or FAILED), remarks, grading scale and signatures. View / Print / PDF / Progress buttons are unchanged.
- **Admin > Subjects**: choose a class, add/remove subjects and their parts (Written, Practical, Objective...) with max marks. Only these subjects appear in marks entry and on that class's report card. Default lists: classes 1-2 Computer has a practical; 3-7 Science and Computer have practicals; 8-10 Chemistry, Biology and Computer have practicals (Physics etc. can be added). Each subject has a "+ Practical" button, and any part can be removed, so you decide which subjects have practical or theory only.
- **Admin > Grading Scale**: choose a class and set From % - To % for every grade (add/remove grades, mark the failing grade). Defaults: Mont-KG2 and 1-7 = 90/80/70/60/50, 8-10 = 80/70/60/50/40.
- **Result lock**: when a teacher saves a result it locks. The teacher presses "Request edit" (with a reason); admin/principal sees it in **Edit Requests** (and in Results) and approves or rejects. After approval the teacher edits once and the result locks again on Save. Enforced in firestore.rules.
- **Add User**: Teacher, Principal or Admin. Principal and Admin both get full admin rights (log in at /admin/login).
- **PDF download fixed** (logos are embedded before drawing, and the card is drawn on-screen instead of far off-screen).
- IMPORTANT: re-publish `firestore.rules` (new `cfg` rules and result locking), then redeploy on Vercel.

- **Two report card designs**: Mont / KG 1 / KG 2 / class 1 / class 2 get a colourful kids design (orange + blue frame, cartoon kids, "Well done!" message); classes 3 to Matric get the clean black-and-white design. Chosen automatically from the class name.

## v13b changes
- **Profiles**: students/parents (name, father's name, date of birth, blood group, contact, email, address) and teachers/incharges/principal (name, designation, DOB, gender, contact, email, qualification, joining date, address). Everything is optional, so a student or user can be saved with a blank profile and completed later. Parents edit from "Child Profile", teachers from "My Profile", and admin/principal can edit anyone from the **Profile** button in Students and Users. The manual Add Student form has an optional "More details" section. Parents with an incomplete profile see a reminder on their home page.
- **Incharge role** (Add User > Role > Incharge): admin chooses exactly which classes (and shift) an incharge sees, e.g. only Mont and KG 1. Incharge gets Students (class dropdown), Reports (attendance), Results and Progress for those classes, read-only. To change a saved result the incharge sends an edit request, which the principal/admin approves, the same as a teacher. Class changes can be made later with Edit in Users (applies at the next login).
- **Attendance lock**: the class teacher marks attendance and presses **Complete & Lock** (everyone must be marked first). After that the teacher cannot change it; only admin/principal can change a status (late arrival, leave application, correction). Enforced in firestore.rules (new `attlock` collection).
- Re-publish `firestore.rules`, then redeploy.

## v13c changes
- **Parent Results tab**: shows "Coming soon" until the admin turns results ON (Admin > Result Access > Turn ON). When ON, each parent login sees only their own child's results (View / Print / PDF). Enforced in firestore.rules.
- **Dues hold** (Admin > Result Access): pick class and student, press Hold result. That parent sees "Your dues are pending... please clear all dues" instead of the result. Release when cleared.
- **Promotion** (Admin > Promotion): choose a class and the new class (default is the next class; Class 10 goes to "Passed Out"). Students who passed the Final Term are pre-selected; failed students can be ticked and promoted by the admin/principal's decision. Old attendance and results stay safe. Parents see the new class at their next login.
- **Excel import** sample template and importer now also take Date of Birth, Blood Group, Email, Address.
- **Report card** attendance now reads "present / total days" (for example 100 / 142 days), no percentage.
- Re-publish `firestore.rules`, then redeploy.

## v13d changes
- **Promotion roll numbers**: when promoting, choose how new roll numbers are given in the new class: by name (A to Z), by old roll order, by position (Final Term percentage), keep old, or leave empty. Rolls are given per section, continuing after students already in that class. Promote the highest class first.
- **Year Archive** (Admin > Year Archive): per class, download an Excel backup (attendance summary, day-by-day attendance, results) of an academic year; then optionally delete that class's attendance of that year. Results are never deleted.
- Teachers are tied to classes, not to students: when a student is promoted, he/she automatically appears under the teacher assigned to the new class (see Users > Edit).

## v40 notes
- Admin dashboard: class strength and attendance bars (shift dropdown, date, per class and section), with Excel, PDF and Print.
- Promotion: class teachers listed separately from incharges.

## v37 notes
- Long help paragraphs shortened to one short line on every page.

## v36 notes
- Promotion lists only the classes that really exist (plus the next class on the ladder and Passed Out). Kindergarten classes sort correctly (Montessori, Kindergarten 1, Kindergarten 2). Auto-promote uses the ladder and only marks Passed Out for class 10.
- Shift dropdown (Morning or Afternoon) now comes first in Attendance and every class picker.

## v35 notes
- Browser tab title is now just "SAJ Academy".

## v34 notes
- Fixed: popup (logout confirm) froze on screen because an animation rule blocked SweetAlert closing. Animations now use backwards fill so hover effects keep working; loader has a 30s failsafe.

## v33 notes
- PDF: image-wait helper made fully defensive; cache-busting (?v=33) and no-cache headers so a new deploy always loads; small version tag (bottom-right) to confirm which version is live.

## v32 notes
- Animations: page entrance, card pop-in, count-up numbers, table rows, growing progress bars, button press feedback, top loading bar during actions, loading spinner, floating login logo. Respects "reduce motion".

## v31 notes
- On Confirm & Lock, every student not marked is counted ABSENT automatically (at least one student must be marked).

## v30 notes
- Confirm & Lock works even if only some students are marked: the whole class is locked and unmarked students can then only be marked by the admin.

## v29 notes
- Teachers can only take attendance for TODAY; past days are view only (admin can edit or add past days). Enforced in the app AND in firestore.rules: re-publish firestore.rules in Firebase (Firestore > Rules > Publish).

## v28 notes
- Attendance: teacher marks are saved as a DRAFT and are not counted anywhere (dashboard, reports, parents, PDF, Excel) until the teacher presses "Confirm Attendance & Lock" at the bottom. Admin marks count immediately; admin also has a "Confirm Attendance" button for a class. Old records stay counted.

## v27 notes
- Fixed PDF download error ("images is not iterable").

## v26 notes
- Login loading animation (spinning logo ring + moving bar).
- Black and white print mode for report cards (for pre-printed watermark paper); PDF keeps colours.
- PDF download: libraries now reload from a backup source if the first is blocked, clearer error, and a print-to-PDF fallback.

## v25 notes
- Blue themes by role: Admin+Principal (neon midnight blue, also the Management Console login), Teacher+Incharge (azure), Parent (royal sky blue, also the parent login).

## v21 notes
- Subjects and Grading Scale show only the classes that exist in the portal (plus classes with a saved custom list).
- Login split: the blue main page is for PARENTS only (GR No). Admin, Principal, Teachers, Coordinators and Incharges use the Management Console (/admin/login). Staff who type their ID on the main page are sent to the Management Console and sign in there.
- New unique admin login design.

## v20 notes
- Promotion: shift dropdown, new roll numbers (by name / old order / position), new-class teacher shown, "Already promoted" guard, one-click "Auto-promote ALL passed students" (failed students stay for admin/principal decision), Passed Out blocks the parent login.
- Results (Final Term): class position 1st/2nd/3rd, class highest and lowest percentage (button "Calculate class positions").
- Users list compact, sidebar keeps its scroll position, mobile polish.

## Student ID and GR No (v50)
- Every student gets an automatic, unique **Student ID** (`SAJ-0001`, `SAJ-0002` ...) from one school-wide counter. It is the parent username and never clashes between classes or shifts.
- **GR No** is now only an optional reference column (for matching with the accounts / academic records). It can repeat and has no effect on logins.
- Roll numbers run per class + section + shift. If Roll is empty (manual add or Excel import), the next number after the highest in that section is given automatically. A duplicate roll in the same class/section/shift is refused.
- Excel columns: GR No, Name, Father, Class, Section, Roll, Phone, Shift (+ optional Date of Birth, Blood Group, Email, Address). Re-importing the same student (same name, father, class, section, shift) updates it instead of creating a duplicate.
- Reset All Data also resets the Student ID counter, so the next student is SAJ-0001 again.

## Low-read version (v56)
- The portal keeps recent reads in the browser for a few minutes (students list 15 min, dashboard attendance 3 min, month reports 5 min, notices/homework 10 min, events 30 min) so Firestore is not read again on every page change or refresh.
- Every save (attendance, homework, notices, results) and every server action that changes students clears the matching cache, so your own changes show immediately.
- Changes made by other users show up after the cache time, or at once with the **Refresh** button in the top bar.
- Notices are limited to the newest 40 (individual notices 60 for admin) instead of reading the whole history.
- Cache is cleared on logout. No data, design or feature changed.
