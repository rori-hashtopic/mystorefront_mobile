DROP TRIGGER IF EXISTS notify_push_discount_code ON discount_codes;
DROP TRIGGER IF EXISTS notify_push_discount_code_insert ON discount_codes;

CREATE TRIGGER notify_push_discount_code
AFTER INSERT OR UPDATE ON discount_codes
FOR EACH ROW
WHEN (NEW.needs_sync = true)
EXECUTE FUNCTION notify_push_discount_code();