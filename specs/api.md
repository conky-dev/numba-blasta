# 📘 SMSBlaster API


Everything is **gated behind APIs**, and **Twilio messaging is webhook-driven** for inbound and status updates.

---

## 🔧 Global Conventions

* **API routes:** `app/api/<domain>/<resource>/route.ts`
* **Ownership:** every query uses `WHERE orgId = auth.orgId`
* **Error codes:**

  * `401` unauthenticated
  * `403` forbidden / cross-org access
  * `402` insufficient balance
  * `422` validation / bad input
* **Testing expectations:** each story implies unit + basic integration coverage.

---

# 💳 Billing & Balance Management

* [ ] **Track SMS balance per user**

  * **API:** `GET /api/billing/balance` → `{ balanceCents, currency }`
  * **DB:** `user_balances(userId PK, orgId, balanceCents int, updatedAt)`
  * **Auth & Scope:** require JWT; only own balance for current user/org
  * **Behavior:** read from `user_balances`; if no row, treat as `0`
  * **Notes:** cache on frontend with SWR/React Query (e.g. 30s)

* [ ] **Add funds to SMS balance (Stripe)**

  * **API:**

    * `POST /api/billing/stripe/checkout` → `{ sessionUrl }`
    * `POST /api/webhooks/stripe` (Stripe → us)
  * **DB:** `billing_transactions(id, orgId, userId, type enum('credit','debit'), amountCents, source enum('stripe','sms','admin_adjust'), externalId, createdAt)`
  * **Auth & Scope:**

    * Checkout creation: JWT required, org-scoped
    * Webhook: Stripe signature validation
  * **Behavior:**

    * Client hits `/checkout`, backend creates Stripe Checkout Session for amount, returns URL.
    * On `checkout.session.completed` / `payment_intent.succeeded`, webhook:

      * Validates signature
      * In a transaction:

        * `user_balances.balanceCents += amountCents`
        * Inserts `billing_transactions` of type `credit`
      * Uses `externalId` (Stripe payment id) for idempotency.
  * **Env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

* [ ] **Balance deduction on SMS send**

  * **Internal util:** `chargeForMessage({ orgId, userId, unitPriceCents })`
  * **DB:** same `user_balances` and `billing_transactions`
  * **Behavior:**

    * Wrap in DB transaction
    * Check `balanceCents >= unitPriceCents`
    * If not, throw 402
    * Otherwise decrement balance + insert `billing_transactions` (type='debit', source='sms')
  * **Notes:** used by all send flows (quick SMS + campaigns)

* [ ] **Transaction history**

  * **API:** `GET /api/billing/transactions?limit=&cursor=`
  * **DB:** `billing_transactions` paginated by `id DESC`
  * **Auth & Scope:** org-scoped, only show current org’s records
  * **Behavior:** returns list with type, amount, source, createdAt, plus external reference URLs when applicable (Stripe receipt, etc.)

* [ ] **Low balance alerts**

  * **Infra:** cron / queue worker (e.g. daily)
  * **DB:**

    * `billing_settings(orgId PK, minBalanceCents, notifyEmails text[])`
    * `notifications(id, orgId, type, payload, sentAt)`
  * **Behavior:**

    * Periodically check org balances
    * If `balanceCents < minBalanceCents` and no alert in last 24h:

      * Send email via Postmark to `notifyEmails`
      * Optional: SMS alert if enough balance to send one
      * Insert `notifications` record
  * **Notes:** per-org configurable threshold

---

# 📱 Twilio Integration — Subaccounts

* [ ] **Create Twilio subaccount per org**

  * **API:** `POST /api/twilio/subaccount`
  * **Twilio:** `POST /Accounts.json` using master credentials
  * **DB:** `twilio_subaccounts(orgId unique, subAccountSid, authTokenEncrypted, createdAt)`
  * **Auth & Scope:** admin / org owner only
  * **Behavior:**

    * If org already has subaccount, return existing record
    * Otherwise create Twilio subaccount with `FriendlyName = orgName`
    * Encrypt `authToken` at rest
  * **Notes:** support future key rotation

* [ ] **Store subaccount reference in `user_profiles`**

  * **DB:** `user_profiles(userId PK, orgId, role, twilioSubAccountSid)`
  * **Behavior:** link all users in org to same subaccount (no per-user subaccounts for now)
  * **Use:** server-side Twilio calls fetch subaccount via `orgId`

  * **DB:** `twilio_account_balance(orgId PK, balance numeric, currency, fetchedAt)`
  * **API:** `GET /api/twilio/balance`
  * **Behavior:** call Twilio usage/balance endpoint; upsert into table; API exposes latest value
  * **Notes:** throttle Twilio calls; handle Twilio API errors gracefully

* [ ] **Provision phone numbers via API**

  * **API:** `POST /api/twilio/numbers/provision` `{ areaCode?, country='US', capabilities=['sms'], quantity=1 }`
  * **Twilio:** `AvailablePhoneNumbers` → `IncomingPhoneNumbers` on subaccount
  * **DB:** `twilio_numbers(id, orgId, phoneNumber, sid, country, capabilities jsonb, messagingServiceSid?, purchasedAt, releasedAt?)`
  * **Auth & Scope:** org-scoped; only provision into org’s subaccount
  * **Behavior:** search numbers, provision one or many, store records; optionally auto-attach to default Messaging Service

* [ ] **Release/delete phone numbers**

  * **API:** `POST /api/twilio/numbers/:sid/release`
  * **Twilio:** delete incoming number on subaccount
  * **DB:** set `releasedAt` and keep row for audit
  * **Guard:** prevent releasing numbers used in active campaigns unless forced with explicit flag

---

# 📱 Twilio Integration — Messaging Services

* [ ] **Create Messaging Service per org**

  * **API:** `POST /api/twilio/messaging-services`
  * **Twilio:** `POST /Messaging/Services.json` (subaccount)
  * **DB:** `twilio_messaging_services(orgId PK, sid, friendlyName, statusCallbackUrl, inboundRequestUrl, campaignSid?)`
  * **Auth & Scope:** admin / org owner
  * **Behavior:** create Messaging Service, set:

    * `StatusCallback` → `/api/webhooks/twilio-status`
    * `InboundRequestUrl` → `/api/webhooks/twilio-incoming`
    * store in DB; enforce one primary service per org

* [ ] **Add phone numbers to Messaging Service**

  * **API:** `POST /api/twilio/messaging-services/:sid/numbers` `{ phoneSid }`
  * **Twilio:** `POST /Services/{sid}/PhoneNumbers`
  * **DB:** update `twilio_numbers.messagingServiceSid`
  * **Guard:** phone must belong to same org/subaccount

* [ ] **Configure sender pool settings**

  * **API:** `PATCH /api/twilio/messaging-services/:sid` `{ stickySender?: boolean, smartEncoding?: boolean }`
  * **Behavior:** patch Twilio service, persist config locally

* [ ] **Handle opt-out keywords (STOP/START/HELP)**

  * **Twilio:** enable built-in compliance features on Messaging Service
  * **DB:** `contact_opt_status(contactId PK, status enum('opted_in','opted_out'), updatedAt)`
  * **Behavior:**

    * Twilio auto-handles STOP/START/HELP responses
    * Inbound STOP: still stored; mark `status='opted_out'`
    * START: mark `opted_in`
    * Sending endpoints check opt status, reject `opted_out` with 422

---

# 📱 A2P 10DLC Compliance

* [ ] **Brand registration workflow**

  * **API:** `POST /api/a2p/brand` `{ legalName, ein, address, contact }`
  * **Twilio:** Trust Hub — create customer profile & brand
  * **DB:** `a2p_brand(orgId PK, brandSid, status, submittedAt, approvedAt, payload jsonb)`
  * **UI:** step-by-step wizard with validation and ability to save drafts
  * **Behavior:** store submitted payload, send to Twilio, track status

* [ ] **Campaign registration workflow**

  * **API:** `POST /api/a2p/campaign` `{ brandSid, useCase, sampleMessages[], optInDesc }`
  * **Twilio:** create A2P campaign under brand
  * **DB:** `a2p_campaign(id, orgId, campaignSid, status, useCase, approvedAt, payload jsonb)`
  * **Guard:** require approved brand before campaign creation

* [ ] **Store brand/campaign SIDs**

  * **API:** `GET /api/a2p/status`
  * **Behavior:** return brand + campaigns + statuses for current org

* [ ] **Link campaigns to Messaging Services**

  * **API:** `POST /api/a2p/campaign/:campaignSid/link` `{ messagingServiceSid }`
  * **Behavior:** attach campaign to Messaging Service via Twilio, update `twilio_messaging_services.campaignSid`

* [ ] **Handle compliance status updates**

  * **Webhook:** `POST /api/webhooks/twilio-compliance`
  * **Behavior:** validate Twilio signature, update brand / campaign `status`, log in `audit_logs`

---

# 📧 SMS Operations — Quick SMS

* [ ] **Send single SMS to one number**

  * **API:** `POST /api/sms/send` `{ to, message, templateId?, variables? }`
  * **DB:** `sms_messages(id, orgId, contactId?, to, fromNumber?, body, direction enum('in','out'), status, priceCents, providerSid, campaignId?, errorCode?, errorMessage?, createdAt)`
  * **Auth & Scope:** user must belong to org; enforce opt-in
  * **Behavior:**

    * Validate input (zod), phone via `libphonenumber-js`
    * Resolve `message` from template if `templateId` provided
    * Check contact opt-out; if opted-out, 422
    * Call `chargeForMessage` (billing)
    * Send via Twilio Messaging Service (subaccount)
    * Insert `sms_messages` with `status='queued'`
    * Delivery/status updated later via webhook

* [ ] **Send SMS to multiple numbers (batch)**

  * **API:** `POST /api/sms/batch` `{ numbers: string[], message }`
  * **Behavior:**

    * Validate numbers, dedupe
    * Optional: chunk into manageable groups (e.g. 100)
    * Rate limit Twilio send concurrency
    * Per-successful billing or reserved credit pool
    * Return `{ total, sent, failed, errors[] }`

* [ ] **Validate phone numbers**

  * **Util:** `validatePhone(to, country = 'US')`
  * **Optional:** integrate Twilio Lookup as paid feature, cached per number (24h)

* [ ] **Track message status (sent/delivered/failed)**

  * **Webhook:** `POST /api/webhooks/twilio-status`
  * **DB:** `delivery_events(id, messageId, eventType, payload jsonb, receivedAt)`
  * **Behavior:** update `sms_messages.status` and error info; append event row for history

* [ ] **Store sent messages in database**

  * Already done via `sms_messages`; add job to archive or soft-delete very old data (e.g. > 18 months) into cold storage.

---

# 📊 SMS Operations — Campaigns

* [ ] **Create SMS campaign**

  * **API:** `POST /api/campaigns` `{ name, message?|templateId, listId, scheduleAt? }`
  * **DB:** `sms_campaigns(id, orgId, name, message, templateId?, listId, status enum('draft','scheduled','running','paused','done','failed'), scheduleAt, createdBy)`
  * **Behavior:** create campaign in `draft` or `scheduled` state, enqueue job if `scheduleAt` in future

* [ ] **Update campaign details**

  * **API:** `PATCH /api/campaigns/:id`
  * **Guard:** editable only if status is `draft` or `scheduled` (not `running` or `done`)

* [ ] **Delete campaign**

  * **API:** `DELETE /api/campaigns/:id`
  * **Behavior:** soft-delete via `deletedAt`, only if not `running`

* [ ] **Schedule campaign for later**

  * **Behavior:**

    * If `scheduleAt` is in future: create delayed job (e.g. BullMQ) at `scheduleAt`
    * If `scheduleAt` is now or past: refuse or immediately enqueue depending on product decision

* [ ] **Send campaign to contact list**

  * **Worker (campaign dispatch):**

    * Fetch contacts from `contact_list_members` in batches
    * Filter out opted-out or invalid numbers
    * Send via same send flow as quick SMS but attach `campaignId`
    * Respect Twilio + carrier TPS limits
  * **Billing:** per message via `chargeForMessage`

* [ ] **Track campaign metrics**

  * **API:** `GET /api/campaigns/:id/metrics`
  * **Behavior:** aggregate from `sms_messages`:

    * `sent`, `delivered`, `failed`, `replied`
    * derived metrics: `deliveryRate`, `failRate`, `replyRate`

* [ ] **Pause/resume campaign**

  * **API:** `PATCH /api/campaigns/:id/pause` / `.../resume`
  * **Behavior:** influence worker job processing (e.g., pause queue; resume from remaining recipients)

* [ ] **Duplicate campaign**

  * **API:** `POST /api/campaigns/:id/duplicate`
  * **Behavior:** copy core fields into new `draft` campaign; do not copy statuses or metrics

---

# 📝 Templates Management

* [ ] **Create SMS template**

  * **API:** `POST /api/templates` `{ name, content }`
  * **DB:** `sms_templates(id, orgId, name, content, createdBy, createdAt, deletedAt?)`
  * **Behavior:** store content with placeholders like `{{firstName}}` using `mustache`/similar

* [ ] **Update template**

  * **API:** `PATCH /api/templates/:id`
  * **Guard:** optionally block edits if template is used in active/running campaigns

* [ ] **Delete template**

  * **API:** `DELETE /api/templates/:id`
  * **Behavior:** soft delete via `deletedAt`

* [ ] **List user/org templates**

  * **API:** `GET /api/templates?search=&limit=&cursor=`
  * **Behavior:** text search on name/content; paginate

* [ ] **Template variables/placeholders**

  * **Util:** `renderTemplate(content, variables)` with HTML-escaping safety
  * **Validation:** detect missing or extra variables and surface warnings / 422 if strict mode

* [ ] **Template preview with sample data**

  * **API:** `POST /api/templates/preview` `{ content, sampleData }` → `{ preview }`

---

# 👥 Contact Management

* [ ] **Add single contact**

  * **API:** `POST /api/contacts` `{ firstName?, lastName?, phone, email?, tags?[] }`
  * **DB:** `contacts(id, orgId, phone, firstName, lastName, email, optedOutAt?, createdAt, deletedAt?)`
  * **Behavior:** normalize phone to E.164; enforce uniqueness on `(orgId, phone)`; create optional tags relation if needed

* [ ] **Update contact details**

  * **API:** `PATCH /api/contacts/:id`
  * **Scope:** contact must belong to current org

* [ ] **Delete contact**

  * **API:** `DELETE /api/contacts/:id`
  * **Behavior:** soft delete; retain for message history integrity

* [ ] **Import contacts from CSV**

  * **API:** `POST /api/contacts/import` (multipart file)
  * **Behavior:**

    * Upload → parse on server (e.g., PapaParse)
    * Column mapping step (client-driven)
    * Bulk upsert contacts by `(orgId, phone)` in chunks
    * Return import summary `{ created, updated, skipped }`

* [ ] **Export contacts to CSV**

  * **API:** `GET /api/contacts/export?listId=&search=`
  * **Behavior:** stream CSV back to client; include header row

* [ ] **Create contact lists/groups**

  * **API:** `POST /api/contact-lists` `{ name }`
  * **DB:** `contact_lists(id, orgId, name, createdAt)`, `contact_list_members(listId, contactId, createdAt)`

* [ ] **Add contacts to lists**

  * **API:** `POST /api/contact-lists/:id/members` `{ contactIds[] }`

* [ ] **Remove contacts from lists**

  * **API:** `DELETE /api/contact-lists/:id/members` `{ contactIds[] }`

* [ ] **Search/filter contacts**

  * **API:** `GET /api/contacts?search=&tag=&listId=&page=&pageSize=`
  * **Behavior:** free-text on name/phone/email; filter by tags/list

* [ ] **Handle opt-out status per contact**

  * **Behavior:**

    * Inbound STOP from a number → set `optedOutAt=now()` on associated contact
    * START clears `optedOutAt`
    * sending endpoints enforce that `optedOutAt` is null

---

# 💬 Messenger / Inbox

* [ ] **Receive incoming SMS via Twilio webhook**

  * **Webhook:** `POST /api/webhooks/twilio-incoming`
  * **Behavior:**

    * Validate Twilio signature
    * Extract `From`, `To`, `Body`, `MessageSid`, etc.
    * Map `To`/subaccount to org
    * Find or create contact for `From`
    * Insert `sms_messages` row (`direction='in'`, status='received')
    * Update or create `message_threads(contactId, orgId, lastMessageAt, unreadCount, archivedAt?)`

* [ ] **Store incoming messages in database**

  * **DB:** same `sms_messages` table + `webhook_logs(id, source, orgId?, payload, signature, processedAt, success)`
  * **Behavior:** log payload + minimal metadata for debugging

* [ ] **Mark messages as read/unread**

  * **API:** `PATCH /api/messages/:id/read` `{ read: boolean }`
  * **Behavior:** set/clear `readAt`, recompute thread `unreadCount`

* [ ] **Reply to incoming messages**

  * **API:** `POST /api/messages/reply` `{ contactId, message }`
  * **Behavior:**

    * Validate contact belongs to org & not opted-out
    * Choose appropriate `fromNumber` for org
    * Send via Twilio Messaging Service
    * Store outgoing message linked to thread

* [ ] **View conversation thread with contact**

  * **API:** `GET /api/messages/thread/:contactId?cursor=&limit=`
  * **Behavior:** return chronological list of both in/out messages with pagination cursor based on createdAt/id

* [ ] **Archive conversations**

  * **API:** `POST /api/messages/threads/:contactId/archive`
  * **DB:** set `message_threads.archivedAt`
  * **Behavior:** archived threads hidden by default in Inbox views

* [ ] **Search messages**

  * **API:** `GET /api/messages/search?q=&contactId=`
  * **DB:** full-text search index on `sms_messages.body` (tsvector)

---

# 📈 History & Reporting

* [ ] **List all sent messages with filters**

  * **API:** `GET /api/history/messages?from=&to=&status=&campaignId=&page=&pageSize=`
  * **Behavior:** filter + paginate messages for org, direction='out'

* [ ] **Filter by date range, status, campaign**

  * **DB:** indexes on `(orgId, createdAt)` and `(orgId, status, campaignId)`

* [ ] **Export message history to CSV**

  * **API:** `GET /api/history/messages/export?from=&to=&campaignId=`
  * **Behavior:** streaming export; for very large ranges, enqueue async export job and return downloadable link

* [ ] **Delivery reports per message**

  * **API:** `GET /api/messages/:id`
  * **Behavior:** include base message fields + delivery events timeline (e.g., queued → sent → delivered/failed) from `delivery_events`

* [ ] **Campaign analytics dashboard**

  * **API:** `GET /api/analytics/campaigns/:id`
  * **Behavior:** return aggregated metrics used by frontend charts only (counts, rates, timeseries per day)

* [ ] **Usage statistics (SMS sent per day/week/month)**

  * **API:** `GET /api/analytics/usage?granularity=day|week|month&from=&to=`
  * **Behavior:** group by `date_trunc()` and return `[ { bucketStart, sentCount } ]`

---

# 🔔 Webhooks & Real-time Updates

* [ ] **Twilio webhook endpoint for incoming SMS**

  * **Route:** `POST /api/webhooks/twilio-incoming`
  * **Behavior:** described above; must be fast, offload heavy work to queue

* [ ] **Twilio webhook for delivery status updates**

  * **Route:** `POST /api/webhooks/twilio-status`
  * **Behavior:** map `MessageSid` → `sms_messages`, update status + insert `delivery_events`

* [ ] **Process webhook events and update database**

  * **Queue:** generic `webhooks` queue
  * **DB:** `webhook_logs` for incoming payload + outcome

* [ ] **Handle webhook signatures for security**

  * **Behavior:** verify `X-Twilio-Signature`, reject invalid with `401`
  * **Env:** Twilio auth tokens or dedicated webhook secret per org/subaccount

* [ ] **Retry failed webhook processing**

  * **Behavior:** exponential backoff retries (e.g., 5 attempts) and `webhook_dead_letters` for hard failures

---

# 🛡️ Security & Permissions

* [ ] **JWT validation middleware**

  * **Location:** shared utility (e.g. `lib/auth.ts`) + App Router `middleware.ts`
  * **Behavior:** verify JWT (RS256), attach `{ userId, orgId, roles }` to request context or pass into handlers

* [ ] **Rate limiting per user/endpoint**

  * **Infra:** Redis/Upstash or similar
  * **Behavior:** per user + IP, with stricter limits on “send”/write endpoints

* [ ] **Validate user owns resource before access**

  * **Pattern:** helper `assertOrg(resourceOrgId, auth.orgId)`
  * **Behavior:** all queries have explicit `orgId` predicate

* [ ] **API key rotation for Twilio**

  * **DB:** store subaccount API keys (SID/Secret) per org, encrypted
  * **Behavior:** rotation job:

    * create new key
    * update app to use it
    * revoke old key
    * log in `audit_logs`

* [ ] **Encrypt sensitive Twilio credentials**

  * **At rest:** AES-GCM using KMS/wrapped keys
  * **In code:** decrypt on-demand per request; never send to client

* [ ] **CORS configuration**

  * **Behavior:** allow only known frontend origins, restrict headers to essentials, support `GET,POST,PATCH,DELETE,OPTIONS`

---

# 🔧 Admin Features

* [ ] **View all users**

  * **API:** `GET /api/admin/users`
  * **Auth:** require `ADMIN` role
  * **Behavior:** list users with email, org, status

* [ ] **Manage user accounts (activate/deactivate)**

  * **API:** `PATCH /api/admin/users/:id` `{ status: 'active' | 'disabled' }`
  * **Guard:** cannot deactivate self; actions logged

* [ ] **Manually adjust user SMS balance**

  * **API:** `POST /api/admin/billing/adjust` `{ userId, amountCents, reason }`
  * **Behavior:** adjust in transaction, insert `billing_transactions` (source='admin_adjust')

* [ ] **View system-wide statistics**

  * **API:** `GET /api/admin/stats`
  * **Behavior:** aggregated metrics (total messages/day, failures, global spend), cached for a few minutes

* [ ] **Manage Twilio subaccounts**

  * **API:** `GET /api/admin/twilio/subaccounts` (+ limited management actions)
  * **Behavior:** view mapping org ↔ Twilio subaccount; log any modifications

* [ ] **View audit logs for all users**

  * **API:** `GET /api/admin/audit?from=&to=&userId=`
  * **DB:** `audit_logs(id, actorUserId, orgId, action, entityType, entityId, meta jsonb, createdAt)`

---

# 🔐 Auth (remaining)

* [ ] **Password reset via email (Postmark)**

  * **API:**

    * `POST /api/auth/request-reset` `{ email }`
    * `POST /api/auth/reset` `{ token, newPassword }`
  * **DB:** `password_resets(userId, tokenHash, expiresAt, usedAt?)`
  * **Behavior:**

    * Request reset: create token, email Postmark template with link
    * Reset: verify token (by hash), expiry, usedAt, then set new password and mark used
  * **Security:** throttle requests by IP/email; single-use tokens

* [ ] **Email verification (Postmark)**

  * **API:**

    * `POST /api/auth/send-verify`
    * `POST /api/auth/verify` `{ token }`
  * **DB:** `users.emailVerifiedAt`
  * **Behavior:** send verification link, mark verified on success; optionally required for sending SMS

* [ ] **User profile updates (name, phone, etc.)**

  * **API:** `PATCH /api/me` `{ name?, phone? }`
  * **Behavior:** update own profile only; validate phone format; log changes to `audit_logs`
