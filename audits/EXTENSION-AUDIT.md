# Chrome Extension CRM Integration Audit
**sr-crm-green Read-Only Audit**
**Date: 2026-07-21**

---

## 1. CANDIDATE SCHEMA

**Primary Table:** `public.candidates`  
**Location:** `supabase/migrations/20250722000000_baseline_schema.sql:21853-22014`

### Key Columns
| Field | Type | Notes |
|-------|------|-------|
| `id` | integer | Primary key, auto-increment |
| `name` | text | Combined full name |
| `forename` | text | First name (split field) |
| `surname` | text | Last name (split field) |
| `email` | text | Email address |
| `phone_number` | text | E.164 format (+44...) |
| `active_status` | text | Default: 'inactive'; values: 'active'/'inactive' |
| `recruiter_id` | integer | FK to users table (recruiter assignment) |
| `resourcer_id` | integer | FK to users table (resourcer assignment) |
| `created_at` | integer | Unix epoch seconds (not timestamptz) |
| `updated_at` | integer | Unix epoch seconds |
| `registered_at` | integer | Epoch—initial registration timestamp |
| `marked_unsuitable` | boolean | Compliance flag |
| `unsuitable_reason` | text | Reason for unsuitability marking |
| `marked_for_deletion` | boolean | Soft-delete flag |
| `job_category_ids` | text | Comma-separated list (also array generated column) |
| `job_category_ids_array` | integer[] | Generated column for easier filtering |
| `department_tag_ids` | text | Comma-separated department IDs |
| `address_id` | integer | FK to addresses table |
| `compliance_override` | boolean | Admin flag to bypass compliance checks |
| `compliance_override_by` | uuid | Auth user who applied override |
| `compliance_override_at` | integer | Epoch timestamp of override |
| `licence_points` | integer | 0-12; driving licence penalty points |

### Related Tables for Recruiter & Activity Summary

**Table: `public.addresses`**
- Location: `supabase/migrations/20250722000000_baseline_schema.sql:21045-21075`
- Contains: `id`, `postal_code`, `city`, `county`, `formatted_address`, `lat`, `lng`, `phone_number`, `address1`, `address2`, `country_code`
- Joined via `candidates.address_id = addresses.id`

**Table: `public.users`**
- Location: `supabase/migrations/20250722000000_baseline_schema.sql:29760-29784`
- Contains: `id`, `name`, `email`, `phone_number`, `is_active`
- Recruiters identified via:
  - `candidates.recruiter_id` → `users.id`
  - Then check `user_roles(user_id, role)` where `role` = 'recruiter'

**Table: `public.unified_bookings`**
- Location: `supabase/migrations/20250722000000_baseline_schema.sql:22208-22293`
- Contains: `id`, `candidate_id`, `date` (epoch), `booking_status`, `created_at`, `updated_at`
- Join: `candidates.id = unified_bookings.candidate_id`
- Filter for **last booking:** `WHERE booking_status = 'approved' ORDER BY date DESC LIMIT 1`

**Table: `public.user_roles`**
- Location: `supabase/migrations/20250722000000_baseline_schema.sql:29734-29739`
- Schema: `id` (uuid), `user_id` (uuid), `role` (app_role enum), `created_at`
- Auth mapping: `user_roles.user_id` links to `auth.users.id` (Supabase auth UUID)
- Note: `users.id` in the old table is integer; recruiter lookups should use auth UUID if available

**Table: `public.candidate_licence_categories`**
- Contains licence info: `candidate_id`, `category`, `expiry_date`, `extracted_at`
- Tracks driving licence categories (A, B, C1, C, D1, D, etc.)

---

## 2. PHONE/EMAIL STORAGE FORMAT

### Phone Numbers
**Format:** E.164 standard (`+44XXXXXXXXX`)  
**Storage Location:** `candidates.phone_number` (text field)  
**Normalization Rules** (from `src/lib/phoneNormalization.ts:1-54`):
- Input: `07xxxxxxxxx`, `+447xxxxxxxxx`, `447xxxxxxxxx`, with/without spaces
- Output: `+44XXXXXXXXX` (where X = digit)
- Leading `0` stripped, replaced with `+44`
- Example: `07123 456789` → `+4471234567​89`

**Deduplication/Search Logic:**  
- Phone number variations generated via `ringover-match-phones` edge function (`supabase/functions/ringover-match-phones/index.ts:47-76`)
- Handles: leading 0, +44 prefix, stripped +, just digits
- Variations matched against `candidates.phone_number` using `.in()` query (lines 128-133)

### Email
**Storage:** Plain text, case-sensitive in DB  
**No normalization in migration code**—stored as entered by user  
**Search:** Exact or case-insensitive substring match (app layer handles lower-casing on compare)

---

## 3. EXISTING SEARCH/MATCH LOGIC

### Edge Functions

**1. `candidate-matching` (supabase/functions/candidate-matching/index.ts)**
- **Auth:** JWT Bearer token required (lines 127-144)
  - Checks `Authorization: Bearer <token>`
  - Verifies via `supabase.auth.getUser(token)` with SERVICE_ROLE_KEY
- **Purpose:** Spatial & category-based candidate matching for bookings/vacancies
- **Search Logic:**
  - Radius-based (haversine distance from job address)
  - Job category ID filter (hard filter for bookings, bonus for vacancies)
  - Candidate grades (A-E) based on `candidate_grade_config` table
  - Scoring model (distance, registration, active status, experience, availability)
- **Candidate Fields Returned:** id, name, email, phone_number, city, state, postal_code, distance_miles, registered_at, active_status, grade, company_booking_count, agency_booking_count, is_registered, is_active, match_score, sms_status
- **Key DB Queries:**
  - RPC: `find_candidates_by_job_category()` (vacancy mode)
  - RPC: `find_candidates_near_location()` (radius search)
  - Table: `addresses` (for coordinates)
  - Table: `unified_bookings` (last booking date, availability on target date)
  - Table: `candidate_availability` (explicit availability entries)
  - Table: `candidate_engagement_summary` (engagement health for vacancy mode)

**2. `ringover-match-phones` (supabase/functions/ringover-match-phones/index.ts)**
- **Auth:** NONE—uses SERVICE_ROLE_KEY directly; no JWT check
- **Purpose:** Phone number lookup across candidates & contacts
- **Search Logic:**
  - Normalizes input phone to E.164
  - Generates variations (different formats)
  - Matches via `.in('phone_number', variations)` on candidates table
  - Also searches contacts table (v_contacts_enriched or contacts table fallback)
- **Return:** candidate_id, name; or contact_id, name, company_name
- **Candidate Query:** `SELECT id, name, phone_number FROM candidates WHERE phone_number IN (variations)`

**3. `match-candidates` (supabase/functions/match-candidates/index.ts)**
- **Auth:** Passes Authorization header to Supabase client but doesn't explicitly verify JWT in function code; relies on RLS
- **Purpose:** Vacancy-based candidate matching (calls RPC `get_vacancy_candidates_simple`)
- **RPC Call:** `supabase.rpc('get_vacancy_candidates_simple', { p_vacancy_id, p_limit, p_radius_miles })`
- **Engagement Integration:** Fetches from `candidate_engagement_summary` for vacancy mode
- **Return Fields:** candidate_id, name, email, phone_number, postal_code, city, state, distance_miles, match_score, match_reasons, job_category_ids, engagement_health, funnel_stage, response_rate

**4. `search-suggestions` (supabase/functions/search-suggestions/index.ts)**
- **Auth:** JWT Bearer token required (lines 31-48)
- **Purpose:** Autocomplete suggestions for company/industry/city searches
- **Logic:** Client-side matching against hardcoded UK cities & industries

### Duplicate Detection
**No explicit cross-candidate deduplication found** in schema or edge functions  
**Implicit deduplication in searches:**
- Phone matching uses exact variation matching
- Email would require exact/case-insensitive match (no built-in dedup)

---

## 4. EDGE FUNCTION CONVENTIONS

### Auth Pattern
**Location:** `candidate-matching` (supabase/functions/candidate-matching/index.ts:127-144) & `search-suggestions` (index.ts:31-48)

```typescript
// Pattern A: JWT Verification
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: corsHeaders
  });
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const { data: { user }, error: authError } = await supabase.auth.getUser(
  authHeader.replace('Bearer ', '')
);
if (authError || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401, headers: corsHeaders
  });
}
```

**Pattern B: No JWT (Service Role Only)**
- `ringover-match-phones` directly uses SERVICE_ROLE_KEY without JWT validation
- Assumes backend-to-backend calls or relies on network isolation

### CORS Headers
**Standard (from `_shared/cors.ts`):**
```typescript
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-correlation-id, x-ringover-signature',
}
```
- Allows all origins (`*`)
- Permits authorization, apikey, custom headers

### Error Response Shape
**Consistency:**
- Success: `{ matches: [...], metadata: { count, duration_ms, ... } }` or `{ success: true, matches: {...}, stats: {...} }`
- Error: `{ error: "message", code?: "...", details?: "...", request_id?: "..." }` (HTTP 400/401/500)

### Client Creation
**Service Role (Default for matching):**
```typescript
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
```
**With Bearer Token (For RLS Passthrough):**
```typescript
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: { headers: { Authorization: authHeader } },
});
```

### Folder Structure
```
supabase/functions/
├── _shared/
│   └── cors.ts                 # Shared CORS headers
├── candidate-matching/
│   └── index.ts               # ~880 lines, complex matching logic
├── ringover-match-phones/
│   └── index.ts               # ~240 lines, phone matching
├── match-candidates/
│   └── index.ts               # ~420 lines, vacancy matching
└── search-suggestions/
    └── index.ts               # ~125 lines, autocomplete
```

---

## 5. AUTHENTICATION & RECRUITER IDENTIFICATION

### Supabase Auth Model
**Recruiter Login Flow:**
1. User authenticates via Supabase Auth (`auth.users` table, UUID-based)
2. Recruiter role assigned in `user_roles` table: `{ user_id: uuid, role: 'recruiter' }`
3. RLS policy checks `has_crm_role()` function (defined at `supabase/migrations/20250722000000_baseline_schema.sql:43956+`)

**Function Definition (`has_crm_role()`):**
```sql
CREATE FUNCTION public.has_crm_role() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles 
         WHERE user_id = (SELECT auth.uid()) 
         AND role IN ('root_admin', 'admin', 'recruiter', 'resourcer')) $$;
```

### RLS on Candidates Table
**Status:** RLS ENABLED  
**Policies:**
- `"Candidate portal users can view own profile"` → `id = public.get_candidate_portal_id()` (candidates only see themselves)
- `internal_users_full_access` → `public.has_crm_role()` (ALL CRM users—recruiters, admins, resourcers—see all candidates)

**Key Finding:** **No territorial restrictions.** A logged-in recruiter can read **any candidate** via RLS, regardless of territory or assignment.

### Extension Requirement
**Current RLS does NOT restrict by territory.** If the extension needs to:
1. **Show all candidates to any recruiter:** Use authenticated recruiter's JWT, leverage RLS (recruiter sees all via `has_crm_role()`)
2. **Bypass RLS entirely:** Use SERVICE_ROLE_KEY inside edge function (no auth token needed)

---

## 6. DEEP LINK FORMAT

**Candidate Portal URL Pattern:** `<BASE_URL>/swift/candidates/<CANDIDATE_ID>`

**Evidence:**
- File: `src/components/AppContent.tsx`
- Route definition: `<Route path="/swift/candidates/:id" element={<AuthGuard><DashboardLayout title="Candidate Detail"><SwiftCandidateDetail /></DashboardLayout></AuthGuard>} />`

**Base URL Examples (from test config):**
- Dev: `https://dev.portal.swift-recruit.com` (playwright.config.ts)
- Production likely: `https://portal.swift-recruit.com` (inferred)

**Full Deep Link Example:**
```
https://portal.swift-recruit.com/swift/candidates/12345
```

**IBMG Alternative (if candidate is IBMG-linked):**
```
https://portal.swift-recruit.com/ibmg-portal/candidates/12345
```

---

## SUMMARY TABLE

| Aspect | Finding |
|--------|---------|
| **Candidate PK** | `candidates.id` (integer) |
| **Full Name** | `candidates.name` (text) or `forename`+`surname` |
| **Email** | `candidates.email` (text, case-sensitive as stored) |
| **Phone** | `candidates.phone_number` (E.164: `+44XXXXXXXXX`) |
| **Postcode** | `addresses.postal_code` (via `candidates.address_id`) |
| **Recruiter Name** | `users.name` (via `candidates.recruiter_id` → `users.id`) |
| **Status** | `candidates.active_status` ('active'/'inactive') |
| **Licence Categories** | `candidate_licence_categories` table |
| **Compliance Flags** | `compliance_override`, `marked_unsuitable`, `marked_for_deletion` |
| **Last Contact** | `unified_bookings.date` (approved bookings, epoch seconds) |
| **Auth Model** | Supabase JWT (auth.users UUID) + user_roles lookup |
| **RLS Scope** | All CRM-role recruiters see all candidates (no territory filter) |
| **Deep Link** | `/swift/candidates/{id}` |
| **Phone Normalization** | E.164 with +44 prefix; variations handled in `ringover-match-phones` |
| **Email Dedupe** | No explicit logic; case-sensitive as stored |
| **Search Functions** | `candidate-matching` (spatial), `ringover-match-phones` (phone), `match-candidates` (vacancy) |

---

## NOTES FOR EXTENSION DEVELOPMENT

1. **Phone matching:** Use `ringover-match-phones` RPC directly or replicate normalization logic from `src/lib/phoneNormalization.ts`
2. **Auth:** If extension requires recruiter context, pass JWT token. Edge function can verify or rely on RLS.
3. **Postcode lookup:** Join candidates → addresses → `postal_code` field
4. **Recruiter assignment:** Check `candidates.recruiter_id` against `users.id` and cross-reference `user_roles` for confirmation
5. **Compliance:** Check `marked_unsuitable`, `marked_for_deletion`, `compliance_override` flags before displaying matches
6. **Activity timestamp:** Use `unified_bookings.date` (epoch) for "last booking"; stored as integer (not timestamptz)
7. **RLS bypass:** If extension needs all candidates visible to any recruiter regardless of assignment, use SERVICE_ROLE_KEY or rely on `has_crm_role()` RLS
