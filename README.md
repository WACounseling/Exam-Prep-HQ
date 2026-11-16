# Exam Prep HQ: Middle School Exam Prep

A study-planning website for Woodward Academy 7th and 8th graders. Students add their grades, study guides, confidence for each topic, and what's already on their calendar. Exam Prep HQ then builds spaced study sessions for every part of every study guide, finishing with a practice exam the day before each test.

**What's inside**

- **My classes:** grade (number or letter), overall confidence, study guide upload (PDF, Word, or photo), and a topic list rated 😵 to 😎. Topics are pulled from PDFs and Word files automatically; students check and edit them.
- **My calendar:** weekly and one-time commitments, study windows, session length, a weekly free day, and days off.
- **Home:** exam countdown, "Up next" sessions, progress and badges, and a **How to use Exam Prep HQ** routine (set up once, check in daily, prep before tutorials, rebuild on Sundays, rest before exams).
- **My plan:** sessions linked to each study guide topic, checkboxes, progress, badges, and downloads: **Add to Google Calendar** (with reminders), print/PDF, Google Doc, Google Sheet, Word, calendar file (.ics), and CSV.
- **Tutorials:** how to prepare for, use, and follow up on tutorials with teachers; a planner for tutorial times (they appear on the plan and calendar, and study sessions are never scheduled on top of them); question starters; and a per-class "hit list" of each student's shakiest topics with space to write questions.
- **MindPrint:** matches the MindPrint Student Profile: three categories (Complex Reasoning, Memory, Executive Functions), skills listed strongest first, and one highlighted strongest category. Students either **upload their MindPrint Student Profile PDF** or **arrange their skills by hand** in boxes laid out like the report. Exam Prep HQ then shows:
  - their "superpower" (the strongest skill in their strongest category),
  - how to lean on the first skill in each category and work around the last one (a possible "blocker"),
  - their top strategies, and
  - how to use each of their report's recommended strategies for exam prep.

  Their profile also changes the instructions inside their study sessions (for example, "Talk through each step out loud" or "Make a test plan").
- **Strategy lab:** studying, organizing, test-taking, balance and perspective, asking for help, an exam-week checklist, and myth-or-fact cards.
- **Extended time:** why it matters, a pacing plan for the student's own exam length, and how to slow down.

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
- `DRIVE_FOLDER_NAME`: use a new name each semester so students get a fresh folder.
- `SEMESTER_LABEL`

All reading content (how-to routine, tutorial guide, strategies, myths, MindPrint skill tips and strategy advice, extended time text, default topics) is in `js/content.js` and can be edited without touching the app code.

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

## How the plan is built

1. Open study time = the student's study windows minus their busy blocks, planned tutorials, days off, and free day. Sessions get a 10-minute break after them. Exam days get one fewer session.
2. Each study guide topic gets 1 to 4 sessions based on confidence (shakier topics get more) and the class grade (below 80 adds one; 93+ with high confidence needs only one).
3. Sessions for the same topic are spaced at least two days apart and move from **build it** (make a study tool) to **quiz yourself** (retrieval practice) to **mix and teach**.
4. Each class gets a **practice exam** as close to the day before the exam as possible.
5. If there's extra time, the shakiest topics get quick reviews, but about 1 in 5 open slots stays free for downtime.
6. MindPrint choices and extended time change the instructions inside each session.
7. **Rebuild my plan** keeps finished sessions and reschedules anything missed.
