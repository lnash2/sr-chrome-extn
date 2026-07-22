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

      "phone_number": "+447123456789",
      "postcode": "M1 1AA"
    }
  ],
  "metadata": {
    "duration_ms": 42
  }
}
```

All fields except `candidate_id`, `confidence`, `name`, `active_status`, and `phone_number` are nullable. The panel must render gracefully with any subset present.

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
