CREATE TABLE offers (id TEXT PRIMARY KEY, course INTEGER NOT NULL, term TEXT NOT NULL, section TEXT NOT NULL, teachers TEXT NOT NULL, modality TEXT NOT NULL, enrolled INTEGER NOT NULL, active INTEGER NOT NULL DEFAULT 1, UNIQUE(course,term,section));
--> statement-breakpoint
CREATE TABLE tickets (hash TEXT PRIMARY KEY, offer TEXT NOT NULL REFERENCES offers(id));
--> statement-breakpoint
CREATE TABLE answers (ticket TEXT PRIMARY KEY REFERENCES tickets(hash), offer TEXT NOT NULL REFERENCES offers(id), data TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX answers_offer ON answers(offer);
--> statement-breakpoint
CREATE TABLE shares (hash TEXT PRIMARY KEY, offer TEXT NOT NULL REFERENCES offers(id), expires INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE actions (offer TEXT PRIMARY KEY REFERENCES offers(id), data TEXT NOT NULL);
