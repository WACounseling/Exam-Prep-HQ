# Exam Prep HQ: Middle School Exam Prep

A study-planning website for Woodward Academy 7th and 8th graders. Students add their grades, study guides, confidence for each topic, and what's already on their calendar. Exam Prep HQ then builds spaced study sessions for every part of every study guide, finishing with a practice exam the day before each test.

**Built to be simple for students working on their own**

- **Guided setup (about 5 minutes):** five short screens, one question each.
  1. Name and grade
  2. How each class is going (letter grade and a 😵 to 😎 face)
  3. What's already on their calendar
  4. When they like to study (tap a choice, no typing times)
  5. Extended time and MindPrint (both optional)

  Then the site builds the plan and offers to put it on Google Calendar or print it.
- **Five tabs:**
  - **Today:** just today's sessions with big checkboxes, a progress bar, and badges. It also suggests at most two optional upgrades (add study guides, get Google Calendar reminders, plan a tutorial, add MindPrint) and shows a tip of the day.
  - **My plan:** this week is open and other weeks are folded away. One "Save my plan" button offers Google Calendar, print, and more formats. "Update my plan" rebuilds it and keeps finished sessions.
  - **My classes:** one row per class that opens to letter grade, feeling, study guide upload (PDF, Word, or pasted text), topic ratings, and questions for the teacher. It also has an optional, folded-away "What could my semester grade be?" section.
  - **My week:** tutorials (pick a class and a day; the time is always 3:15 to 3:40 p.m.), busy times, and study times. Detailed settings are under "More options."
  - **Tips:** short cards with one idea and one "Try it" each.
    - Study smarter, Get organized, Test day, Stay balanced, Exam week checklist, Myth or fact
    - Tutorials: before, during, and after, plus "Topics to ask about" from the student's lowest-rated topics, question starters, and a copyable email to a teacher
    - Extended time: a personal pacing plan
    - My MindPrint: upload the report or enter it by hand, then see a short playbook

There is no server and no database. Data is saved in the student's browser and, when they sign in, in a folder in their own Google Drive.

---

## 1. Put the site on GitHub Pages (about 10 minutes)

1. Sign in at [github.com](https://github.com) (or create a free account).
2. Click **+** (top right) and choose **New repository**. Name it something like `exam-prep`, set it to **Public**, and click **Create repository**.
3. On the new repository page, click **uploading an existing file**.
4. Unzip `exam-prep-hq.zip` on your computer. Open the `exam-prep-hq` folder, select **everything inside it** (`index.html`, `css`, `js`, `assets`, `README.md`, `.nojekyll`), and drag it onto the upload page. Click **Commit changes**.
   - On a Mac, press `Cmd + Shift + .` in Finder to see the hidden `.nojekyll` file.
5. Go to **Settings > Pages**. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose **main** and **/ (root)**, and click **Save**.
6. Wait a minute or two, then refresh. Your site link appears at the top of that page, like `https://YOUR-USERNAME.github.io/exam-prep/`.

The site already works at this point. Students save on their own device only until you finish step 2.

## 2. Turn on Google sign-in and Drive saving

Do these steps while signed in to Google with your **school** account.

**A. Create the Google Cloud project**

1. Go to [console.cloud.google.com](https://console.cloud.google.com). Create a new project (for example "Exam Prep HQ").
2. Open **APIs & Services > Library**. Search for and **Enable** both the **Google Drive API** and the **Google Calendar API**.

**B. Set up the consent screen**

1. Open **APIs & Services > OAuth consent screen** (it may be called **Google Auth Platform > Branding / Audience**).
2. Choose **Internal** as the user type. This limits sign-in to your school's Google accounts and avoids Google's public app review.
3. App name: `Exam Prep HQ`. Add your email as the support and developer contact.
4. Under **Data access / Scopes**, add: `.../auth/drive.file`, `.../auth/calendar.app.created`, `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
   - `drive.file` means the site can only see files **it created**. It can't see anything else in a student's Drive.
   - `calendar.app.created` lets the site make **one calendar of its own** (named "Exam Prep HQ") and manage the events on it. It can't see or change a student's other calendars. Students are only asked for this the first time they press **Add to Google Calendar**.

**C. Create the Client ID**

1. Open **APIs & Services > Credentials > Create credentials > OAuth client ID**.
2. Application type: **Web application**.
3. Under **Authorized JavaScript origins**, add your GitHub Pages origin with no path or trailing slash, for example `https://YOUR-USERNAME.github.io`.
4. Click **Create** and copy the **Client ID** (it ends in `.apps.googleusercontent.com`).

**D. Paste it into the site**

1. In your GitHub repository, open `js/config.js` and click the pencil icon to edit.
2. Paste the ID between the quotes: `GOOGLE_CLIENT_ID: "1234...apps.googleusercontent.com",`
3. Click **Commit changes**. The site updates in a minute or two.

**E. Ask your Google Workspace admin to allow it for students**

Google Workspace for Education blocks third-party apps for users under 18 unless an admin allows them. Ask your IT team to go to **Admin console > Security > Access and data control > API controls > Manage third-party app access**, add the app using the Client ID, and set it to **Trusted** (or **Limited**, with access to Google Drive and Google Calendar) for the student organizational units.

**What students see:** a "Sign in with Google" button. After signing in, Exam Prep HQ creates a folder in their Drive:

```
Exam Prep - Fall 2026/
├── prep-hq-data.json   (their plan; syncs across computers)
├── Study Guides/       (uploaded study guides)
├── My Schedules/       (Google Doc and Google Sheet versions of their plan)
└── MindPrint/          (their MindPrint report, if they upload it)
```

**Google Calendar:** pressing **Add to Google Calendar** on the My plan page creates a calendar called "Exam Prep HQ" in the student's Google Calendar with every upcoming study session, tutorial, and exam, color-coded by class. Reminders: 10 minutes before each study session, the night before and 15 minutes before each tutorial, and 6 p.m. the night before each exam. After a student rebuilds their plan or adds a tutorial, the site reminds them to press **Update Google Calendar**, which replaces the old events. Students can hide or delete that calendar any time without affecting anything else.

Sign-in lasts about an hour at a time. If it expires, a **Reconnect** button appears and nothing is lost: everything is also saved on the device.

## 3. Update it each semester

Everything you'll normally change is in `js/config.js`:

- `EXAMS`: names, dates (`YYYY-MM-DD`), colors, and icons.
- `EXAM_MINUTES`: standard exam length (currently 70).
- `TUTORIAL_START` / `TUTORIAL_END`: tutorial time (currently 3:15 to 3:40 p.m.).
- `GRADES`: the letter grade scale. Students only pick letters, and percentages are never shown. The lowest percentage for each letter is used only behind the scenes. **Check this against the official scale.**
- `EXAM_WEIGHT`: how much the exam counts toward the semester grade (currently 20%).
- `GRADE_PROJECTION`: set to `false` to hide the semester grade projection everywhere.
- `DRIVE_FOLDER_NAME`: use a new name each semester so students get a fresh folder.
- `SEMESTER_LABEL`

All reading content (home page steps, tips, tutorial guide, myths, MindPrint skill tips and strategy advice, extended time text, default topics). Keep additions short: students read two sentences far more often than ten is in `js/content.js` and can be edited without touching the app code.

## 4. Optional: add the official logo

The header shows "WOODWARD ACADEMY" as text so no logo is recreated. To use the official wordmark, get a white (knockout) PNG or SVG from Marketing & Communications, upload it to the `assets` folder, and set `LOGO_URL: "assets/your-file-name.png"` in `js/config.js`.

**Please don't upload the brand book PDF to this repository.** Public repositories are visible to anyone, and page 59 of the brand book includes a shared account login.

## 5. Privacy notes for families and staff

- GitHub only hosts the website files. It never receives student information.
- Student entries stay in their browser (`localStorage`) and, if they sign in, in their own Google Drive. Exam Prep HQ has no database, analytics, or tracking.
- Study guide files are read inside the browser. Text is never sent to another service.
- Fonts load from Google Fonts. The PDF and Word readers load from cdnjs.cloudflare.com.
- Exam Prep HQ isn't connected to MindPrint or any gradebook.
- An uploaded MindPrint report is read on the student's device and saved only in their own Drive folder (or nowhere, if they aren't signed in). The student's name and test date on the report are never stored by Exam Prep HQ.
- **How the MindPrint reader works:** it reads the "My Profile" section of the MindPrint Student Profile PDF. In each category box it records the skills in the order listed (strongest first) and the Top Strategy. From "Personalized Recommendations," it picks out strategies it knows how to apply to exam prep (listed in `js/content.js`, under `mindprint.strategies`). It ignores the glossary. The highlighted strongest box is a color the reader can't detect, so students pick it themselves. Students always see what was read and confirm it before it's saved. It was built and tested on a real MindPrint Student Profile PDF. If MindPrint changes its report layout, the reader may miss a box, and students are told to fill that box in by hand.
- **New MindPrint strategy names:** to add exam-prep advice for a strategy name that isn't recognized yet, add it to `mindprint.strategies` in `js/content.js` with its name exactly as it appears on the report.
- A student can erase everything from the bottom of the **My plan** page.

## 6. Testing on your own computer

In the `exam-prep-hq` folder, run `python3 -m http.server 8000` and open `http://localhost:8000`. To test Google sign-in locally, also add `http://localhost:8000` as an Authorized JavaScript origin.

## Grades and the semester projection

- **Letters only.** Students pick a letter grade from a list (A+ through F, or "Not sure"). They can't type a number, and no percentage is ever shown on screen, in printouts, or in calendar events. Number grades saved by an older version are converted to letters automatically.
- **Projection (optional).** In each class on My classes, a folded section called "What could my semester grade be?" shows what the semester grade could be with an A, B, C, or D on the exam. It uses (80% × current grade) + (20% × exam grade), converted back to a letter using the `GRADES` scale.
- **Disclaimer.** Every projection appears beside this note: "This is only a projection. It's based on the grade you entered today. It is not an official grade, and it doesn't guarantee any grade. Your teacher's gradebook is the only official grade."
- **Approximate by design.** Because only letters are used, results are approximate, often within one plus or minus step.

## How the study guide reader works

The reader runs entirely in the student's browser and looks at layout, not just words:

1. **Summary table.** If the guide has a table with a header like "Sections on the Exam," "Topics," or "Units," the first column becomes the topics and the second column becomes the details. A "How to study" column is ignored.
2. **Headings.** Text much bigger than the rest (like GRAMMAR) starts a section. Short lines at the left margin become subtopics, for example "Participles—Underline...", "Commas: Directions...", "Semicolons", or "Active/Passive Voice Indicate...".
3. **Skipped:** numbered practice items, fill-in blanks ("Fragment: ____"), answer keys ("A= ..."), directions, and worksheet labels ("Title:").
4. **Fallback:** if neither is found, it falls back to a simpler line-by-line guess.

Students always see what was found and can uncheck, rename, or add topics.

Big sections are split into smaller study sessions automatically. A topic with more than 4 parts becomes sessions of about 3 parts each, so "Grammar" with 7 parts becomes 3 sessions.

Study instructions change with the kind of topic: grammar, vocabulary, figures of speech, literature, writing, math, history, or science. To change the wording, edit `METHODS` in `js/planner.js`.

**Tested on:** the 8th Honors English (Lee) exam review packet, plus pasted text. Word (.docx) files are read the same way, using their tables and headings. Test a guide or two from each department before launch, since every teacher formats differently.

## How the plan is built

1. Open study time = the student's study windows minus their busy blocks, planned tutorials, days off, and free day. Sessions get a 10-minute break after them. Exam days get one fewer session.
2. Each study guide topic gets 1 to 4 sessions based on confidence (shakier topics get more) and the class letter grade (C+ or below adds one; A or A+ with high confidence needs only one).
3. Sessions for the same topic are spaced at least two days apart and move from **build it** (make a study tool) to **quiz yourself** (retrieval practice) to **mix and teach**.
4. Each class gets a **practice exam** as close to the day before the exam as possible.
5. If there's extra time, the shakiest topics get quick reviews, but about 1 in 5 open slots stays free for downtime.
6. MindPrint choices and extended time change the instructions inside each session.
7. **Rebuild my plan** keeps finished sessions and reschedules anything missed.
