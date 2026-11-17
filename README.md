# Exam Prep HQ: Middle School Exam Prep

A study-planning website for Woodward Academy 7th and 8th graders. Students add their grades, study guides, confidence for each topic, and what's already on their calendar. Exam Prep HQ then builds spaced study sessions for every part of every study guide, finishing with a practice exam the day before each test.

**Built to be simple for students working on their own.** Input stays minimal (the 5-question setup, plus optional study guides). Everything else is one tap.

- **Guided setup (about 5 minutes):** five short screens, one question each.
  1. Name and grade
  2. Letter grade and a 😵 to 😎 face for each class
  3. What's already on their calendar
  4. When they like to study
  5. Extended time and MindPrint (both optional)
- **Today:** the home page shows the student's sessions for the day.
  - A 3-tip first-visit tour.
  - **Catch me up** when sessions were missed. It reschedules them and lists what to do first if time is short.
  - **Night-before and exam-day screens** with a short checklist and the student's own pacing plan.
  - A **Feeling overwhelmed?** button.
  - At most two suggestions at a time, such as "Add your Spanish study guide."
- **▶ Start on any session** opens a focus screen.
  - It shows a timer, the one thing to do, the teacher's materials ("Use: Review sheets pgs. 2-5"), and 🔊 read-aloud.
  - Then comes a one-tap check-in: "How does this topic feel now?" The answer updates the topic's rating, and the plan adjusts automatically.
  - Then a 10-minute break timer.
  - **"Stuck? Ask my teacher"** adds the topic to that class's questions for tutorials and links to planning one.
- **Feeling overwhelmed?** opens four calm options: one minute of guided breathing, talk to someone (parent, advisor, teacher, or counselor), extra breaks, and "just start."
  - **Extra breaks never reduce study time.** Each session is split into 15-minute sprints with 5-minute breaks in between, and the schedule adds room for them.
- **Every class gets at least 5 study sessions** plus a practice exam, even without a study guide.
- **Three always-visible buttons** on Today and at the top of My plan:
  - **🖨️ Print my plan:** the whole schedule as a checklist.
  - **📅 Add to my calendar:** syncs directly to Google Calendar when Google sign-in is on. Otherwise it downloads a calendar file, with steps to import it into Google Calendar, Apple Calendar, or Outlook.
  - **🔁 Make up missed sessions:** shows how many were missed and moves them to new times.
- **Missed sessions** appear at the top of Today with **Do it now** and **Move to a new time** buttons.
- **"Can't do it? Move it"** on every session asks "Later today" or "Another day," then finds the next open time.
- **➕ Add a session today** (on Today): one tap adds a quick practice session, starting now, on the shakiest topic for the soonest exam.
- **One-tap tutorial suggestions** on Today, for example "Science feels shaky. Add a tutorial?" with the next open school day already chosen.
- **Undo:** right after marking something done, moving a session, removing a busy time, tutorial, day off, or topic, adding a session or tutorial, or loading a backup, the message at the bottom offers **Undo**.
- **Readiness on My classes:** each class shows "6 of 15 done" with a bar, plus how the faces have changed since the first check-in (for example 😬 → 🙂). No grades or numbers.
- **"How do I…?" help page** (Help button at the top, and in Tips): 15 quick answers, each with a button that does it.
- **Print my exam week page:** one page with each exam's day, practice exam, and tutorials, the pacing plan, and night-before and exam-morning checklists. It's under the plan buttons, in "More ways to save or share," and on the night-before screen.
- **Backup file:** "Save a backup file" and "Load a backup" (in "More ways to save or share" and Help) move a plan to another device without Google sign-in. Loading a backup can be undone.
- **Five tabs:** Today, **My Study Plan**, **My Weekly Schedule**, My classes, and Tips. On phones, the tabs sit at the bottom of the screen, with short names ("Study plan," "Schedule").
  - **My Study Plan:** every session until exams, as short cards grouped by week. **Tap any session** to open its details: when it is, what to do (with read-aloud), the materials to use, why it's happening now, and **Start**, **Move it**, **Mark done**, and **Stuck? Ask my teacher** buttons.
  - **My Weekly Schedule:** a week calendar (with arrows through exam week) showing study sessions, tutorials, busy times, days off, and exams. Tap anything to see or change it. **+ Add** on any day adds a tutorial, a busy time (just that day or every week), or a day off. "My study times" sits below the calendar.
  - **The plan updates on its own** whenever classes or the schedule change. Finished sessions always stay checked off.
- **More ways to save or share** (link under the three buttons): share with a parent or advisor as a read-only Google Doc, or download a Google Doc, Google Sheet, Word, calendar, or spreadsheet file.
- **Text and display (Aa button):** larger text, an easier-to-read font (Atkinson Hyperlegible), and high contrast. Saved on each device.
- **Accessibility:** every page and pop-up passes automated WCAG 2.1 AA checks (axe-core). Labels are shown under the face ratings, everything works with a keyboard, and reduced-motion settings are respected.
- **Demo mode for advisory:** add `?demo` to the site address (for example `https://YOUR-USERNAME.github.io/Exam-Prep-HQ/?demo`) to show a made-up student, Maya, on a projector. Demo data is kept separately, rebuilt with dates starting from today, and never saved to anyone's account. There's also a link in **Start over**.

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
- **Start over:** the **Start over** button in the header (on every page) offers two choices. **Redo setup** walks through the 5 setup questions again with the current answers filled in. **Erase everything** clears all classes, study guides, busy times, tutorials, MindPrint, and the plan, and asks for confirmation first. If the student is signed in, their Google Drive copy is cleared too.
- **Testing as several students:** each browser keeps its own saved plan. To try the site as different sample students on one computer, use a private/incognito window for each one, or use **Start over > Erase everything** between them.

## 6. Testing on your own computer

In the `exam-prep-hq` folder, run `python3 -m http.server 8000` and open `http://localhost:8000`. To test Google sign-in locally, also add `http://localhost:8000` as an Authorized JavaScript origin.

## Grades

- **Letters only.** Students pick a letter grade from a list (A+ through F, or "Not sure"). They can't type a number, and no percentage is ever shown on screen, in printouts, or in calendar events. Number grades saved by an older version are converted to letters automatically.
- **How grades are used:** only to decide how much study time each class gets. A lower grade adds sessions, and an A with high confidence needs fewer. There is no grade projection or prediction anywhere on the site.

## How the study guide reader works

The reader runs entirely in the student's browser and looks at layout, not just words:

1. **Summary table.** If the guide has a table with a header like "Sections on the Exam," "Topics," or "Units," the first column becomes the topics and the second column becomes the details. A third "How to study" column becomes each topic's **Use:** list, which shows up in every study session for that topic.
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


## iPad notes

Exam Prep HQ is laid out and tested for iPad sizes, in both portrait and landscape:

- **Portrait (768 to 834 pixels wide):** Today uses two columns, and My Weekly Schedule shows one row per day.
- **Landscape (1024 pixels and wider):** My Weekly Schedule shows the full 7-day grid.
- **Touch targets** are at least 44 pixels. Text fields don't make the iPad zoom in.
- **Printing** happens inside the page, which works reliably in iPad Safari. Students can pick a printer, or tap Share to save a PDF.
- **"Add to my calendar"** on an iPad offers to add every session to the iPad's Calendar app ("Add All"). Importing a file into Google Calendar requires a computer, so for Google Calendar on iPads, turn on Google sign-in and the site adds events directly.
- **Read-aloud** uses the iPad's built-in voice.
- **Testing:** layouts were checked with iPad screen sizes and touch input in a Chromium browser. Please do a final check on a real iPad in Safari before launch.
