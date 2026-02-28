-- Remove any existing duplicates before adding constraint
DELETE FROM "meeting_attendees" ma1
USING "meeting_attendees" ma2
WHERE ma1.id > ma2.id
  AND ma1.meeting_id = ma2.meeting_id
  AND ma1.name = ma2.name;
--> statement-breakpoint
ALTER TABLE "meeting_attendees" ADD CONSTRAINT "meeting_attendees_meeting_id_name_unique" UNIQUE("meeting_id","name");
