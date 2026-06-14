import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(process.cwd(), "applyblitz.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL CHECK(category IN ('internships','accommodation','parttime')),
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      source TEXT NOT NULL,
      url TEXT NOT NULL,
      url_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('sent','pending','failed','duplicate','manual')),
      language TEXT NOT NULL DEFAULT 'en' CHECK(language IN ('fr','en')),
      applied_at TEXT NOT NULL DEFAULT (datetime('now')),
      notes TEXT,
      is_priority INTEGER NOT NULL DEFAULT 0,
      badge TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_url_hash ON applications(url_hash);
    CREATE INDEX IF NOT EXISTS idx_applications_category ON applications(category);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at);

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS priority_targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      careers_url TEXT NOT NULL,
      last_checked TEXT,
      status TEXT NOT NULL DEFAULT 'unchecked',
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS run_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      total_found INTEGER DEFAULT 0,
      total_applied INTEGER DEFAULT 0,
      total_manual INTEGER DEFAULT 0,
      total_failed INTEGER DEFAULT 0,
      total_duped INTEGER DEFAULT 0
    );
  `);

  seedDefaults(db);
}

function seedDefaults(db: Database.Database) {
  const defaults: Record<string, string> = {
    onboarding_complete: "false",
    schedule_time: "08:00",
    schedule_enabled: "true",
    cover_letter_fr: `Objet : Candidature pour un stage en {{role}} — Ahmed Ben Kilani, RT3 INSAT

Madame, Monsieur,

Étudiant en 3ème année Réseaux & Télécommunications à l'INSAT Tunis, je me permets de vous adresser ma candidature pour un stage en {{role}} au sein de {{company}}.

Mon parcours m'a permis de développer des compétences solides en administration réseau (expérience chez Groupe IBITEK), IoT (ESP32, protocoles 802.11), DevOps et Cloud. J'ai également publié un package Python open-source de classification de malwares sur PyPI, combinant ResNet-18 et SVM.

Disponible à partir de mi-juin {{year}}, je suis motivé à contribuer concrètement à vos projets techniques.

Veuillez trouver ci-joint mon CV. Je reste disponible pour un entretien à votre convenance.

Cordialement,
Ahmed Ben Kilani
ahmedbenkilani3@gmail.com | ahmedbk3.github.io | github.com/ahmedbk3`,
    cover_letter_en: `Subject: Internship Application — {{role}} | Ahmed Ben Kilani, INSAT Tunis (Networks & Telecom)

Dear Hiring Team,

I am a 3rd-year Networks & Telecommunications engineering student at INSAT Tunis, Tunisia, applying for the {{role}} position at {{company}}.

My background covers network administration (internship at Groupe IBITEK), IoT hardware development (ESP32, custom 802.11 frame parsing, MIDI-over-UDP protocol with sub-10ms latency), DevOps, cloud infrastructure, and applied ML — including malviz, a published PyPI package for malware classification using ResNet-18 and SVM. I am also an active IEEE PES INSAT member.

I am available full-time from mid-June {{year}} and am open to remote or on-site positions worldwide. My CV and portfolio are linked below.

Best regards,
Ahmed Ben Kilani
ahmedbenkilani3@gmail.com | ahmedbk3.github.io | github.com/ahmedbk3`,
    user_name: "Ahmed Ben Kilani",
    user_email: "ahmedbenkilani3@gmail.com",
    user_phone: "",
    user_location: "Tunis, Tunisia",
    user_university: "INSAT Tunis — 3rd year Networks & Telecommunications (RT3)",
    user_specialization: "IoT, DevOps, Cloud",
    user_prior_experience: "Network Administrator @ Groupe IBITEK",
    user_skills: "ESP32, Python, Node.js, Docker, Linux, Networking, Cybersecurity, ML (PyTorch/ONNX), Video Editing",
    user_portfolio: "ahmedbk3.github.io",
    user_github: "github.com/ahmedbk3",
    user_languages: "Arabic (native), French (fluent), English (fluent)",
    user_availability: "Mid-June 2025, full-time internship or part-time remote",
  };

  const insert = db.prepare(`INSERT OR IGNORE INTO config (key, value) VALUES (?, ?)`);
  for (const [key, value] of Object.entries(defaults)) {
    insert.run(key, value);
  }

  const countTargets = db.prepare(`SELECT COUNT(*) as c FROM priority_targets`).get() as { c: number };
  if (countTargets.c === 0) {
    const insertTarget = db.prepare(`INSERT INTO priority_targets (company, careers_url, status, notes) VALUES (?, ?, ?, ?)`);
    insertTarget.run("Telnet Holding", "https://telnet.eu/carrieres", "unchecked", "Priority target — apply manually with tailored message");
    insertTarget.run("Vermeg", "https://vermeg.com/careers", "unchecked", "Priority target — apply manually with tailored message");
    insertTarget.run("Sofrecom Tunisia", "https://sofrecom.com/fr/nous-rejoindre", "unchecked", "Priority target — apply manually with tailored message");
  }
}

export function getConfig(key: string): string | null {
  const db = getDb();
  const row = db.prepare(`SELECT value FROM config WHERE key = ?`).get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setConfig(key: string, value: string) {
  getDb().prepare(`INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)`).run(key, value);
}

export function getAllConfig(): Record<string, string> {
  const rows = getDb().prepare(`SELECT key, value FROM config`).all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

export function hashUrl(url: string, title: string): string {
  const str = `${url}::${title}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export function isDuplicate(urlHash: string): boolean {
  const db = getDb();
  const row = db.prepare(`
    SELECT id FROM applications 
    WHERE url_hash = ? 
    AND applied_at > datetime('now', '-30 days')
  `).get(urlHash) as { id: number } | undefined;
  return !!row;
}
