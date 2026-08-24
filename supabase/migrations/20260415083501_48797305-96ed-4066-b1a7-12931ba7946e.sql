DROP TRIGGER IF EXISTS notify_push_discount_code ON discount_codes;

CREATE TRIGGER notify_push_discount_code
AFTER INSERT ON discount_codes
FOR EACH ROW
EXECUTE FUNCTION notify_push_discount_code();