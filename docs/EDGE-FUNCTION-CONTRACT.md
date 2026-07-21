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
  "postcode": "string | null"
}
```

- **phone** — raw as scraped from the page (e.g. `07123 456789`, `+44 7123 456789`). The edge function normalises using the CRM's existing variation logic (`ringover-match-phones` approach).
- **email** — raw as scraped.
- **name** — full name string as displayed.
- **postcode** — UK postcode as displayed.
- At least one of: `phone`, `email`, or (`name` AND `postcode`) must be non-null.

## Response — 200 OK

```json
{
  "matches": [
    {
      "candidate_id": 12345,
      "confidence": "exact_phone | exact_email | fuzzy_name_postcode",
      "name": "John Smith",
      "active_status": "active",
      "recruiter_name": "Jane Doe",
      "licence_categories": [
        { "category": "C+E", "expiry_date": "2027-03-15" }
      ],
      "licence_points": 0,
      "last_booking_date": "2026-06-10T00:00:00Z",
      "phone_number": "+447123456789",
      "postcode": "M1 1AA",
      "marked_unsuitable": false,
      "unsuitable_reason": null,
      "marked_for_deletion": false
    }
  ],
  "metadata": {
    "duration_ms": 42
  }
}
```

### Match ordering

Matches are returned highest-confidence first:

1. `exact_phone` — phone variation match against `candidates.phone_number`
2. `exact_email` — case-insensitive email match against `candidates.email`
3. `fuzzy_name_postcode` — surname `ILIKE` match + postcode district match (first part, e.g. `M1` from `M1 1AA`)

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

## Server-side matching notes

### Phone matching
Reuses the `ringover-match-phones` normalisation approach:
- Strip spaces, dashes, parens
- Generate variations: `07...`, `+447...`, `447...`, `7...`
- Query `candidates.phone_number` with `.in(variations)`

### Email matching
- `LOWER(candidates.email) = LOWER(input_email)`
- DB stores case-sensitive; compare case-insensitively at query time

### Fuzzy name + postcode
- Split input name, take last token as surname
- `candidates.surname ILIKE '%' || surname || '%'`
- `addresses.postal_code` district match (first segment before space)
- Join via `candidates.address_id = addresses.id`

### Data assembly
For each matched candidate, the function joins:
- `users.name` via `candidates.recruiter_id` for `recruiter_name`
- `candidate_licence_categories` for `licence_categories`
- `candidates.licence_points`
- `unified_bookings` where `booking_status = 'approved'`, `MAX(date)` → convert epoch to ISO for `last_booking_date`
- `addresses.postal_code` via `candidates.address_id` for `postcode`
