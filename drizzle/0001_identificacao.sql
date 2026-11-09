ALTER TABLE answers ADD COLUMN voter_key TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX answers_one_per_account ON answers(offer,voter_key);
