CREATE TABLE invites (offer TEXT PRIMARY KEY REFERENCES offers(id), hash TEXT NOT NULL UNIQUE);
--> statement-breakpoint
ALTER TABLE offers ADD COLUMN title TEXT;
--> statement-breakpoint
ALTER TABLE offers ADD COLUMN sigaa_code TEXT;
--> statement-breakpoint
ALTER TABLE offers ADD COLUMN schedule TEXT;
--> statement-breakpoint
ALTER TABLE offers ADD COLUMN draft INTEGER NOT NULL DEFAULT 0;
