# Edge Function Contract: `candidate-match`

**Supabase project:** `twfvwcldqxusxgqwbcwi` (Green)  
**Endpoint:** `POST /functions/v1/candidate-match`  
**Auth:** Bearer `<recruiter JWT>` — verified via `supabase.auth.getUser()` (Pattern A from audit §4). RLS passthrough with `has_crm_role()` — no service role key needed.

---

## Request

```http
POST /functions/v1/candidate-match
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "phone": "string | null",
  "email": "string | null",
  "name": "string | null",
  "location": "string | null"
}
```

- **phone** — raw as scraped from the page (e.g. `07123 456789`, `+44 7123 456789`). The edge function normalises using the CRM's existing variation logic (`ringover-match-phones` approach).
- **email** — raw as scraped.
- **name** — full name string as displayed.
- **location** — town name, city, or UK postcode as displayed (e.g. `"Saffron Walden"`, `"M1 1AA"`).
- At least one of: `phone`, `email`, or (`name` AND `location`) must be non-null.

## Response — 200 OK

```json
{
  "matches": [
    {
      "candidate_id": 12345,
      "confidence": "exact_phone | exact_email | fuzzy_name_postcode | name_location",

      "name": "John Smith",
      "active_status": "active | inactive",
      "registered_at": "ISO | null",
      "recruiter_name": "string | null",
      "resourcer_name": "string | null",

      "marked_unsuitable": false,
      "unsuitable_reason": null,
      "marked_for_deletion": false,

      "licence_categories": [
        { "category": "C+E", "expiry_date": "ISO | null" }
      ],
      "licence_points": 0,
      "job_categories": ["HGV Class 2", "HIAB"],

      "last_booking": {
        "date": "ISO",
        "client_name": "string | null",
        "status": "approved"
      },
      "company_booking_count": 0,
      "agency_booking_count": 0,
      "last_note": {
        "text": "string (truncate server-side to 200 chars)",
        "created_at": "ISO",
        "author": "string | null"
      },
      "last_contact_date": "ISO | null",

      "available_this_week": true,
      "next_availability_date": "ISO | null",
      "engagement": {
        "health": "string | null",
        "funnel_stage": "string | null",
        "response_rate": 0.0
      },

      "recent_notes": [
        { "text": "string (truncate 200 chars)", "created_at": "ISO", "author": "string | null" }
      ],
      "next_booking": { "date": "ISO", "client_name": "string | null", "status": "string" },
      "recent_booking_count_90d": 0,
      "open_tasks": [
        { "title": "string", "due_date": "ISO | null", "owner": "string | null", "overdue": false }
      ],

      "phone_number": "+447123456789",
      "postcode": "M1 1AA"
    }
  ],
  "metadata": {
    "duration_ms": 42
  }
}
```

All fields except `candidate_id`, `confidence`, `name`, `active_status`, and `phone_number` are nullable or optional. New v1.1 fields (`recent_notes`, `next_booking`, `recent_booking_count_90d`, `open_tasks`) are additive — absent from older responses; the panel renders gracefully with any subset present.

### Matching precedence (tiered, exclusive)

The edge function attempts match tiers in strict order and **returns only the highest tier that produces results** — weaker tiers are never mixed in:

1. **Phone tier** (`exact_phone`) — phone variation match against `candidates.phone_number`. If any phone match exists, return ONLY phone-tier results. Do not attempt email or name+location.
2. **Email tier** (`exact_email`) — case-insensitive email match against `candidates.email`. Attempted only when phone tier produces zero results. If any email match exists, return ONLY email-tier results. Do not attempt name+location.
3. **Suggestion tier** (`fuzzy_name_postcode` / `name_location`) — surname ILIKE + postcode district match, or surname ILIKE + city match. Attempted only when both phone and email tiers produce zero results. These are **unconfirmed suggestions**, not verified matches.

Within a tier, matches are ordered highest-confidence first.

The extension client classifies results into three certainty tiers for presentation:

| Tier | Confidence values | Extension treatment |
|------|-------------------|---------------------|
| **CONFIRMED** | `exact_phone`, `exact_email` | Full match display — "In CRM" |
| **UNCONFIRMED SUGGESTION** | `fuzzy_name_postcode`, `name_location` | Amber warning treatment — "Possible match — NOT confirmed" |
| **NOT IN CRM** | (no matches) | Prominent "Not in Swift Recruit" strip |

**Phone-not-on-file note:** When the request included a phone number but the match came back on email only (`exact_email`), the extension surfaces an amber note: "Phone not on file — matched by email". This alerts the recruiter that the CRM phone number may need updating.

### Deletion flag behaviour

Candidates with `marked_for_deletion = true` are excluded unless they are the only match, in which case they are returned with the flag set so the extension can display a warning.

## Error Responses

All errors follow the CRM house style:

```json
{ "error": "Human-readable message" }
```

| Status | Meaning |
|--------|---------|
| 400 | Invalid request body (missing all identifiers) |
| 401 | Missing or invalid JWT |
| 500 | Internal server error |

## Server-side data assembly

For each matched candidate, the function joins the following CRM tables:

| Response field | Source table(s) | Notes |
|---|---|---|
| `name`, `active_status`, `licence_points`, `marked_unsuitable`, `unsuitable_reason`, `marked_for_deletion` | `candidates` | Direct columns |
| `registered_at` | `candidates.registered_at` | Epoch seconds → ISO conversion server-side |
| `recruiter_name` | `users.name` via `candidates.recruiter_id` | FK join |
| `resourcer_name` | `users.name` via `candidates.resourcer_id` | FK join |
| `licence_categories` | `candidate_licence_categories` | `candidate_id` join; `expiry_date` converted from epoch to ISO |
| `job_categories` | `candidates.job_category_ids_array` → job category lookup table | Resolve IDs to human-readable names |
| `last_booking` | `unified_bookings` | `WHERE booking_status = 'approved' ORDER BY date DESC LIMIT 1`; epoch → ISO; join client name if available |
| `company_booking_count`, `agency_booking_count` | `unified_bookings` | Reuse `candidate-matching`'s existing count logic |
| `last_note` | `notes` table | `ORDER BY created_at DESC LIMIT 1`; server-side truncate text to 200 chars |
| `last_contact_date` | `unified_bookings` or activity log | Most recent interaction date; epoch → ISO |
| `available_this_week` | `candidate_availability` | Check if availability entry exists for current week |
| `next_availability_date` | `candidate_availability` | Next future availability entry; epoch → ISO |
| `engagement` | `candidate_engagement_summary` | `health`, `funnel_stage`, `response_rate` |
| `phone_number` | `candidates.phone_number` | E.164 format |
| `postcode` | `addresses.postal_code` via `candidates.address_id` | FK join |

### Phone matching

Reuses the `ringover-match-phones` normalisation approach:
- Strip spaces, dashes, parens
- Generate variations: `07...`, `+447...`, `447...`, `7...`
- Query `candidates.phone_number` with `.in(variations)`

### Email matching

- `LOWER(candidates.email) = LOWER(input_email)`
- DB stores case-sensitive; compare case-insensitively at query time

### Fuzzy name + postcode

- Split input location, check if it matches a UK postcode pattern
- If postcode: `candidates.surname ILIKE '%' || surname || '%'` + `addresses.postal_code` district match (first segment before space)
- Join via `candidates.address_id = addresses.id`
- Confidence: `fuzzy_name_postcode`

### Name + location (city/town)

- If the location field is NOT a UK postcode (i.e. a town/city name like `"Saffron Walden"`):
- `candidates.surname ILIKE '%' || surname || '%'`
- `LOWER(TRIM(addresses.city)) = LOWER(TRIM(input_location))`
- Join via `candidates.address_id = addresses.id`
- Confidence: `name_location` (lowest tier — city matching is less precise than postcode)

---

# Edge Function Contract: `initiate-call` *(unused — retained for future)*

**Endpoint:** `POST /functions/v1/initiate-call`  
**Auth:** Bearer `<recruiter JWT>` — same auth pattern as `candidate-match`.

## Request

```http
POST /functions/v1/initiate-call
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "candidate_id": 12345,
  "phone": "+447123456789"
}
```

- **candidate_id** — CRM candidate ID (for logging/audit)
- **phone** — E.164 phone number to call

## Response — 200 OK

```json
{ "ok": true }
```

## Behaviour

The server calls the Ringover API to initiate a click-to-call using the authenticated recruiter's Ringover identity. The recruiter's phone rings first; when answered, the candidate's number is dialled.

## Error Responses

| Status | Meaning |
|--------|---------|
| 401 | Missing or invalid JWT |
| 404 | Endpoint not deployed yet (extension handles gracefully) |
| 500 | Internal server error / Ringover API failure |

---

# Edge Function Contract: `candidate-create-from-extension`

**Endpoint:** `POST /functions/v1/candidate-create-from-extension`  
**Auth:** Bearer `<recruiter JWT>` — Pattern A (same as `candidate-match`).  
**Writes:** Yes — creates `candidates` row + optional `addresses` row + optional `notes` row. No other tables touched.

## Request

```http
POST /functions/v1/candidate-create-from-extension
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "name": "string",
  "phone": "string | null",
  "email": "string | null",
  "location": "string | null",
  "cv_text": "string | null"
}
```

- **name** — required. Full name as displayed on the job board.
- **phone** — raw as scraped. At least one of `phone` or `email` must be non-null.
- **email** — raw as scraped. Emails ending `@indeedemail.com` are silently discarded (treated as absent).
- **location** — town/city name or UK postcode. Used to create an `addresses` row.
- **cv_text** — optional. Raw text scraped from the Indeed CV page. When provided, parsed server-side via Gemini to extract skills, job titles, address detail, and additional contact info. Parsed fields fill gaps only — scraped fields always win on conflict. If parsing fails, creation proceeds with scraped data alone.

Validation: `name` AND (`phone` OR `email`) required; 400 otherwise.

## Behaviour

### Step 1 — Mandatory dedupe

Before any insert, runs the same matching as `candidate-match`:

1. Phone variation match against `candidates.phone_number` (all UK format variations).
2. If no phone hit: case-insensitive email match against `candidates.email`.

If CV parsing reveals a phone or email not in the original request, those are also checked.

**Any exact match → 409 with the existing records. No candidate created.**

### Step 2 — CV parse (when `cv_text` provided)

Calls Gemini 2.5 Flash (`LOVABLE_API_KEY`) with the raw text to extract:

| Field | Type |
|-------|------|
| `name` | string |
| `email` | string \| null |
| `phone` | string \| null |
| `address_line1` | string \| null |
| `address_city` | string \| null |
| `address_postcode` | string \| null |
| `skills` | string[] |
| `experience_years` | number \| null |
| `job_titles` | string[] |
| `confidence` | number (0–1) |

Merge rule: scraped fields win; parsed data fills nulls. Parsing failure is non-fatal.

### Step 3 — Create

1. **`candidates` row:** `forename`/`surname` split from name, phone normalised to E.164 `+44`, email lowercased, `active_status = 'inactive'`, `origin_source = 'indeed_extension'`, `created_by_user_id` + `recruiter_id` = authenticated CRM user.
2. **`addresses` row** (if location or parsed address available): linked via `candidates.address_id`. Location interpreted as city (text) or `postal_code` (if UK postcode pattern).
3. **`notes` row** (if parsing yielded skills/job-titles): content = `"Created from Indeed via extension\n\n"` + summary of roles, experience, skills.

No `candidate_licence_categories` rows are created — licence data requires verification via qualifying call.

## Response — 201 Created

```json
{
  "ok": true,
  "candidate_id": 12345,
  "created": true,
  "parsed": true
}
```

- **parsed** — `true` if CV text was successfully parsed by Gemini; `false` if not provided or parsing failed.
- **warnings** — optional `string[]`, present only if address or note creation failed after the candidate was inserted. The `candidate_id` is still valid.

## Response — 409 Conflict (duplicate)

```json
{
  "error": "duplicate",
  "existing": [
    { "candidate_id": 12345, "name": "John Smith", "confidence": "exact_phone" }
  ]
}
```

The extension should display the existing record(s) instead of offering creation.

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Missing name, or missing both phone and email |
| 401 | Missing or invalid JWT |
| 409 | Duplicate candidate found (phone or email match) |
| 500 | Internal server error |

---

# Edge Function Contract: `note-create-from-extension`

**Endpoint:** `POST /functions/v1/note-create-from-extension`  
**Auth:** Bearer `<recruiter JWT>` — Pattern A.  
**Writes:** One `notes` row. No other tables touched.

## Request

```http
POST /functions/v1/note-create-from-extension
Authorization: Bearer <jwt>
Content-Type: application/json
```

```json
{
  "candidate_id": 12345,
  "text": "Spoke to candidate, available next week for C+E work.",
  "type": 4
}
```

- **candidate_id** — required. Must reference an existing candidate (404 if not found).
- **text** — required, non-empty, max 2000 characters.
- **type** — optional integer (`note_type_id` from the CRM's `note_types` table). When omitted, the note has no type (matches the CRM's default behaviour for manual notes). Allowed values:

| `type` | Label |
|--------|-------|
| 4 | Recruiting Call |
| 5 | BD Call |
| 6 | Cold Call |
| 7 | Prospect Call |
| 13 | Candidate First Call - New Starter |
| 17 | Candidate First Contact |
| 20 | Email |
| 21 | Other |
| 23 | Telephone Registration |
| 26 | First Day Call |
| 71 | Candidate Spec |
| 113 | Unsuccessful Call |
| 329 | Spec Candidate |
| 330 | CV Sent |
| 336 | Key Call |
| 375 | Registration call |

The extension should render these as a dropdown (default label: "No type" / unset). Any value not in this list returns 400.

## Response — 201 Created

```json
{ "ok": true }
```

## Error Responses

| Status | Meaning |
|--------|---------|
| 400 | Missing or invalid `candidate_id`, empty `text`, `text` exceeds 2000 chars, or invalid `type` |
| 401 | Missing or invalid JWT |
| 404 | Candidate not found |
| 500 | Internal server error |
