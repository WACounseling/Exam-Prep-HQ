/* ==========================================================================
   PREP HQ: SETTINGS YOU CAN CHANGE
   This is the only file most people will ever need to edit.
   ========================================================================== */
window.PREP_CONFIG = {
  // 1) Paste your Google OAuth Client ID here (see README.md, "Turn on Google sign-in").
  //    Leave it empty and the site still works; students save on their own device only.
  GOOGLE_CLIENT_ID: "",

  // 2) Name of the folder the site creates in each student's Google Drive.
  DRIVE_FOLDER_NAME: "Exam Prep - Fall 2026",

  // 3) Optional: path to an official logo file you add to the /assets folder
  //    (for example "assets/wordmark-white.png"). Leave empty to show the school name as text.
  LOGO_URL: "",

  SCHOOL_NAME: "Woodward Academy",
  DIVISION: "Middle School",
  SEMESTER_LABEL: "Fall 2026 semester exams",

  // Tutorial time with teachers (school days only). Students just pick the class and day.
  TUTORIAL_START: "15:15",
  TUTORIAL_END: "15:40",

  // Letter grades. Students only ever pick a letter; percentages are never shown.
  // "min" is the lowest percentage for each letter and is used only behind the scenes
  // to plan study time and to project semester grades. Change it to match the official scale.
  GRADES: [
    { letter: "A+", min: 97 }, { letter: "A", min: 93 }, { letter: "A-", min: 90 },
    { letter: "B+", min: 87 }, { letter: "B", min: 83 }, { letter: "B-", min: 80 },
    { letter: "C+", min: 77 }, { letter: "C", min: 73 }, { letter: "C-", min: 70 },
    { letter: "D+", min: 67 }, { letter: "D", min: 63 }, { letter: "D-", min: 60 },
    { letter: "F", min: 0 }
  ],

  // Semester exams count for this share of the semester grade.
  EXAM_WEIGHT: 0.20,

  // Show the optional "What could my semester grade be?" projection on My classes.
  // Set to false to hide it everywhere.
  GRADE_PROJECTION: true,

  // 4) Exam length in minutes (standard time).
  EXAM_MINUTES: 70,

  // 5) The exam schedule. Dates are YYYY-MM-DD. Update these each semester.
  //    Keep the "id" values the same.
  EXAMS: [
    { id: "english", name: "English",                      short: "English",  date: "2026-12-11", color: "#006097", tint: "#e3eef6", icon: "📖" },
    { id: "science", name: "Science",                      short: "Science",  date: "2026-12-14", color: "#2f7d52", tint: "#e4f3ea", icon: "🔬" },
    { id: "social",  name: "Social Studies / History",     short: "History",  date: "2026-12-15", color: "#a14f0f", tint: "#fbeadb", icon: "🌎" },
    { id: "math",    name: "Math",                         short: "Math",     date: "2026-12-16", color: "#007380", tint: "#dff3f4", icon: "📐" },
    { id: "lang",    name: "World Language or Literature", short: "Lang/Lit", date: "2026-12-18", color: "#5a0207", tint: "#f6e3e1", icon: "🗣️" }
  ]
};
