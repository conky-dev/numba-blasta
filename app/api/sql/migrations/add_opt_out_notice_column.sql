-- Track whether we've already appended the standard STOP verbiage
-- to a contact's outbound SMS (per org/contact), so we only do it once.

ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS opt_out_notice_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN contacts.opt_out_notice_sent_at IS 'Timestamp when the first outbound SMS with STOP/opt-out footer was sent to this contact.';


