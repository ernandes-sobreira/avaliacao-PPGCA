ALTER TABLE offers ADD COLUMN roster_required INTEGER NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE roster (offer TEXT NOT NULL REFERENCES offers(id), email TEXT NOT NULL, name TEXT NOT NULL, PRIMARY KEY(offer,email));
