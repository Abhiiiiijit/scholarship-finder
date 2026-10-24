-- Second publish gate (the first is the server action): a published scheme can never hold a rule
-- without a quote and an official link. Deferred to commit, so a save that replaces all of a
-- scheme's rules in one transaction is checked once, on the final rows.
CREATE FUNCTION refuse_unquoted_published_rules() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  sid bigint;
BEGIN
  IF TG_TABLE_NAME = 'rules' THEN
    sid := NEW.scholarship_id;
  ELSE
    sid := NEW.id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM scholarships s JOIN rules r ON r.scholarship_id = s.id
    WHERE s.id = sid AND s.status = 'PUBLISHED'
      AND (btrim(r.quote) = '' OR btrim(r.source_url) = '')
  ) THEN
    RAISE EXCEPTION 'Published scheme % has a rule without a quote or official link', sid
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER rules_publish_gate
  AFTER INSERT OR UPDATE ON rules
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION refuse_unquoted_published_rules();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER scholarships_publish_gate
  AFTER INSERT OR UPDATE OF status ON scholarships
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION refuse_unquoted_published_rules();
