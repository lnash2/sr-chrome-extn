# Candidate Creation Audit Report

**Generated:** 2026-07-22  
**Scope:** SR-CRM-SUITE candidate creation pipeline, CV parsing, and related systems  
**Read-only audit of:** `/Users/lewisnash/sr-crm-suite/sr-crm-green`

---

## 1. CV PARSING PIPELINE

### Overview
CV parsing is handled by the edge function `parse-cv-to-candidate` which accepts PDF, DOCX, and DOC files and uses Google Gemini 2.5 Flash via Lovable AI Gateway for structured extraction.

### Edge Function
- **Path:** `/supabase/functions/parse-cv-to-candidate/index.ts`
- **Method:** POST
- **Authentication:** Bearer JWT token (required)
- **CORS:** Enabled

### Input Format
**Request body (JSON):**
```json
{
  "fileContent": "base64-encoded-file-content",
  "fileType": "pdf" | "docx" | "doc",
  "fileName": "string"
}
```

**File format support:**
- **PDF:** Base64-encoded. Sent directly to Gemini as `data:application/pdf;base64,{content}`
- **DOCX:** Base64-encoded. Extracted to text using `mammoth` library, then sent as text
- **DOC:** Base64-encoded. Minimal support; binary decoded and filtered to ASCII, sent as text. Requires conversion to DOCX/PDF for best results

### External AI/API
- **Provider:** Google Gemini 2.5 Flash (via Lovable AI Gateway)
- **Endpoint:** `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Auth:** Bearer token from `LOVABLE_API_KEY` environment variable
- **Model:** `google/gemini-2.5-flash`
- **Max tokens:** 2000

### Extracted Data (Response Schema)
The function uses structured tool calling to extract this exact schema:

```typescript
interface ParsedCandidateData {
  name: string;                          // Required
  email: string | null;                  // Optional
  phone: string | null;                  // Optional (UK format preferred)
  address: {
    line1: string | null;                // Street address
    city: string | null;                 // City/town
    postcode: string | null;             // UK postal code
  };
  skills: string[];                      // Array of technical and soft skills
  experience_years: number | null;       // Estimated from work history
  job_titles: string[];                  // Array of previous/current roles
  confidence: number;                    // Score 0-1 for extraction quality
}
```

**Gemini tool definition:**
- Function name: `extract_candidate_data`
- Required fields: `name`, `skills`, `job_titles`, `confidence`
- Optional fields: `email`, `phone`, `address_line1`, `address_city`, `address_postcode`, `experience_years`

### Response Format
```json
{
  "success": true,
  "data": {
    "name": "string",
    "email": "string|null",
    "phone": "string|null",
    "address": {
      "line1": "string|null",
      "city": "string|null",
      "postcode": "string|null"
    },
    "skills": ["string"],
    "experience_years": "number|null",
    "job_titles": ["string"],
    "confidence": "number"
  }
}
```

### Error Handling
- **401:** Unauthorized (missing/invalid JWT)
- **400:** Missing file content or unsupported file type
- **429:** Rate limit exceeded (AI API)
- **402:** AI credits exhausted
- **500:** Parse failure or AI API error

### Frontend Integration
**Component:** `/src/components/candidates/CVDropZone.tsx`
- **Supported formats:** PDF, DOCX, DOC
- **Accepted MIME types:** Inferred from file extension if browser doesn't provide `content_type`
- **Upload flow:** Drag-and-drop interface
- **Overlay:** Shows parsing progress with spinner

**Related components:**
- `/src/components/candidates/CVDropZone.tsx` – Drag-and-drop wrapper and overlay
- `/src/pages/EmbeddedSoftphone.tsx` – May have CV upload integration (implicit from dropzone placement)

---

## 2. CANDIDATE CREATION FLOW

### Primary Candidate Creation Method
**Edge Function:** `submit-supplier-candidate`  
**Path:** `/supabase/functions/submit-supplier-candidate/index.ts`  
**Method:** POST  
**Authentication:** Bearer JWT (supplier portal user)  
**Flow:** Supplier portal submission with duplicate check and audit trail

### Request Schema
```typescript
interface CandidateSubmission {
  supplier_id: number;                   // Required
  first_name: string;                    // Required
  last_name: string;                     // Required
  email: string;                         // Required (lowercase stored)
  phone: string;                         // Required (normalized to +44 format)
  ni_number: string;                     // Required (spaces removed, uppercase)
  date_of_birth: string;                 // Required (ISO date format, stored as epoch)
  registration_type: string;             // Required
  notes?: string;                        // Optional
  resubmit_candidate_id?: number;        // Optional (for resubmission)
}
```

### Candidates Table Schema (Insert fields)

**File:** `/src/integrations/supabase/types.ts`  
**Primary key:** `id` (auto-generated sequence)

**All fields optional on Insert (no NOT NULL constraints enforced at insert time):**

Key fields at creation:
- `id` – Auto-generated integer (sequence)
- `created_at` – Default: current UNIX timestamp
- `created_by_user_id` – Default: 0
- `name` – Text (concatenated from forename + surname)
- `forename` – Text
- `surname` – Text
- `email` – Text (nullable, lowercased)
- `phone_number` – Text (nullable, normalized)
- `dob` – Integer (UNIX epoch, nullable)
- `ni_number` – Text (nullable)
- `registration_type` – Text (nullable)
- `active_status` – Text (default: 'inactive')
- `onboarding_status` – Text (nullable)
- `origin_source` – Text (nullable) **[SOURCE ORIGIN TRACKING]**
- `supplier_id` – Integer (nullable) **[SUPPLIER REFERENCE]**
- `source_id` – Integer (nullable) **[SOURCE ID REFERENCE]**
- `recruiter_id` – Integer (nullable)
- `resourcer_id` – Integer (nullable)
- `address_id` – Integer (nullable)
- `job_category_ids` – Text (nullable, comma-separated or array JSON)
- `hear_about_us` – Text (nullable)

**Database location:** `/supabase/migrations/20250722000000_baseline_schema.sql`

### Candidates Table – Required/NOT NULL Constraints at DB level
Analysis of baseline migration shows:
- `id` – NOT NULL (has default sequence)
- `created_at` – NOT NULL (has default UNIX timestamp)
- `created_by_user_id` – NOT NULL (default: 0)
- `added_to_loader` – NOT NULL (default: false)

**All other fields are nullable at INSERT time.**

### Candidate Creation Process (Supplier Portal Flow)

**Step 1: Authentication**
- Validates Bearer JWT token via `supabase.auth.getUser()`
- Returns 401 if missing or invalid

**Step 2: Input Validation**
- Checks required fields: `supplier_id`, `first_name`, `last_name`, `email`, `phone`, `ni_number`, `date_of_birth`, `registration_type`
- Returns 400 if any missing

**Step 3: Authorization Check (RLS-based)**
- Calls RPC: `has_supplier_portal_access(p_supplier_id: supplier_id)`
- Returns 403 if user lacks access to supplier

**Step 4: Duplicate Detection**
- Calls RPC: `check_candidate_duplicate(p_email, p_ni_number, p_phone, p_forename, p_surname, p_dob_epoch, p_supplier_id)`
- Returns 200 with `duplicate: true` if match found (not blocking, but flagged)
- Allows resubmission if `is_own: true` (same supplier)

**Step 5a: Resubmission Path (if `resubmit_candidate_id` provided)**
- Updates existing candidate row with new data
- Resets `supplier_candidates` audit row to `status: 'pending'`

**Step 5b: New Candidate Insert Path**
- Calls `.insert()` on candidates table with:
  ```typescript
  {
    forename: first_name.trim(),
    surname: last_name.trim(),
    name: `${first_name.trim()} ${last_name.trim()}`,
    email: email.toLowerCase().trim(),
    phone_number: normalizePhone(phone),  // +44 format
    ni_number: normalizedNI,              // uppercase, no spaces
    dob: dobToEpoch(date_of_birth),       // UNIX epoch seconds
    registration_type,
    active_status: 'pending_approval',
    onboarding_status: 'supplier_submitted',
    origin_source: 'supplier_portal',     // ← SOURCE ORIGIN
    supplier_id,                          // ← SUPPLIER REFERENCE
    notes: notes || null,
    created_by_user_id: 0,
  }
  ```
- Returns newly created candidate with `id, forename, surname, email`

**Step 6: Audit Trail Creation**
- Inserts row into `supplier_candidates` table (audit/reference table)
- Fields: `supplier_id`, `created_by_user_id` (current user), `candidate_id`, `first_name`, `last_name`, `email`, `phone`, `ni_number`, `date_of_birth`, `registration_type`, `notes`, `status: 'pending'`

### Related Rows Created on Candidate Insert
- **`supplier_candidates` audit row** – Mandatory (see Step 6 above)
- **`addresses` row** – NOT created automatically (optional, created later during registration wizard)
- **`candidate_licence_categories` rows** – NOT created automatically (extracted from uploaded documents later)
- **Initial note** – NOT created automatically
- **Registration status fields** – Populated at insert time: `active_status`, `onboarding_status`

### Recruiter Assignment
- Assigned via `recruiter_id` column (nullable at create time)
- Can be NULL or set during creation (not enforced by supplier portal flow)
- Later assigned/changed via other CRM functions

### Job Category Assignment at Creation
- Not assigned at creation in supplier portal flow
- Stored in `job_category_ids` as text (comma-separated or JSON array)
- Assigned separately through other CRM workflows

---

## 3. DEDUPE ON CREATE

### Duplicate Detection Method
**RPC Function:** `check_candidate_duplicate(p_email, p_ni_number, p_phone, p_forename, p_surname, p_dob_epoch, p_supplier_id)`

**File:** `/supabase/migrations/20250722000000_baseline_schema.sql`

**Return Schema:**
```json
{
  "duplicate": boolean,
  "is_own": boolean,
  "match_field": string | null,
  "matches": jsonb array
}
```

- `duplicate` – True if match found
- `is_own` – True if match belongs to same supplier (allows resubmission)
- `match_field` – Which field caused the match (email, phone, ni_number, name+dob)
- `matches` – Array of matching candidate records

**Current Implementation Note:**  
The baseline migration defines the function signature but returns a stub response:
```sql
BEGIN
  RETURN jsonb_build_object(
    'duplicate', false,
    'is_own', false,
    'match_field', null,
    'matches', '[]'::jsonb
  );
END;
```

**This indicates the actual duplicate check logic is likely implemented in a separate migration or via trigger function `trg_candidate_duplicate_check`.**

### DB Constraints on Uniqueness

**Searched entire baseline migration:** No UNIQUE constraints found on:
- `email` column (not unique)
- `phone_number` column (not unique)
- Combination of email + supplier_id
- Combination of phone + supplier_id
- Combination of ni_number + dob

**Found:** Only PRIMARY KEY on `id` column.

**Duplicate checking is enforced via RPC/trigger, NOT via database constraints.**

### Trigger Function
**Name:** `trg_candidate_duplicate_check`  
**Type:** BEFORE INSERT OR UPDATE on `candidates` table  
**Action:** Calls `check_candidate_duplicate()` trigger function (stub in baseline)

**Conclusion:**
- **Email/phone uniqueness:** NOT enforced by DB constraints
- **Pre-insert duplicate check:** YES, via RPC call in edge function
- **DB constraints:** NO unique indexes on candidates table (only PK)
- **Duplicate handling:** Soft check (warns/returns flag, doesn't block)

---

## 4. CV STORAGE

### Storage Buckets
**Supabase Storage (document-type-specific buckets)**

**Bucket naming convention:**
- Bucket name = document `type_code` value
- Example: `driving_license_front`, `passport`, `cpc`, etc.

**File path structure:**
```
{candidate_id}/{type_code}{_side}/{timestamp}_{filename}
```

Example:
```
12345/driving_license_front/1719562400000_smith_license.pdf
12345/passport_back/1719562410000_john_smith_passport.pdf
```

**Side suffix:** Added if `document_side` is 'front' or 'back'
- Single-sided uploads: no side suffix
- Two-sided documents: separate buckets or side indicator

### Document Upload Functions

**Edge Function 1: Create Upload (presigned URL generation)**
- **Path:** `/supabase/functions/candidate-doc-create-upload/index.ts`
- **Purpose:** Generate presigned upload URL and create document record
- **Auth:** JWT (staff) OR invite token (candidate self-service)
- **Request:**
  ```json
  {
    "token": "numeric-candidate-id OR invite-token-string",
    "type_code": "document-type",
    "file_name": "filename.pdf",
    "content_type": "application/pdf",
    "document_side": "front|back|single",
    "expires_on": "ISO-date-string"
  }
  ```
- **Response:** Presigned upload URL, document ID, bucket name, file path

**Edge Function 2: Complete Upload**
- **Path:** `/supabase/functions/candidate-doc-complete-upload/index.ts`
- **Purpose:** Mark upload complete, compute SHA-256 hash, record upload metadata
- **Auth:** JWT (staff) OR invite token (candidate self-service)
- **Request:**
  ```json
  {
    "token": "numeric-candidate-id OR invite-token-string",
    "doc_id": "document-uuid",
    "expires_on": "ISO-date-string|null"
  }
  ```
- **Response:** `{ "ok": true }`

### Document Table Schema
**Table:** `candidate_documents`  
**File:** `/supabase/migrations/20250722000000_baseline_schema.sql`

**Key columns:**
- `id` – UUID (primary key)
- `candidate_id` – Integer (FK to candidates)
- `invite_id` – UUID (optional, nullable)
- `type_code` – Text (document type, becomes bucket name)
- `status` – Text (pending, uploaded, approved, rejected)
- `file_path` – Text (full path in bucket)
- `file_name` – Text (original filename)
- `content_type` – Text (MIME type)
- `file_size` – Integer (bytes, nullable)
- `provider` – Text (default: 'supabase')
- `side` – Text (front, back, single; default: single)
- `document_side` – Text (front, back, single; nullable)
- `expires_on` – Date (expiry date, nullable)
- `uploaded_at` – Timestamp (when upload completed)
- `uploaded_by_user_id` – UUID (staff user ID, if staff upload)
- `hash_sha256` – Text (file hash for deduplication, nullable)
- `approved_by` – UUID (approving user, nullable)
- `approved_at` – Timestamp (approval time, nullable)
- `rejection_reason` – Text (if rejected, nullable)

### CV/Document Linking
- **Link:** `candidate_documents.candidate_id` (FK to `candidates.id`)
- **Required:** YES, documents must be linked to candidate
- **Upsert logic:** On create, checks for existing document by `(candidate_id, type_code, side)` combination
  - If exists and status is NOT 'approved': updates existing record
  - If exists and status is 'approved': returns 409 Conflict (contact support)
  - If new: creates document record

### Optional vs Required
- **CV storage:** OPTIONAL (not required for candidate creation)
- **Document upload:** Can be done before/after candidate registration
- **Self-service flow:** Candidate invites can trigger document uploads

---

## 5. WRITE AUTH PATTERNS

### Example 1: Supplier Candidate Submission

**Edge Function:** `/supabase/functions/submit-supplier-candidate/index.ts`

**Auth Pattern:**
1. **Receive JWT:** Extract Bearer token from `Authorization` header
2. **User client (RLS-aware):** Create Supabase client with user's JWT
   ```typescript
   const userClient = createClient(supabaseUrl, supabaseAnonKey, {
     global: { headers: { Authorization: authHeader } },
   });
   const { data: { user }, error } = await userClient.auth.getUser();
   ```
3. **Auth verification:** Validate user exists (401 if not)
4. **Permission check (RLS):** Call RPC with user client:
   ```typescript
   const { data: hasAccess } = await userClient.rpc('has_supplier_portal_access', {
     p_supplier_id: supplier_id,
   });
   ```
5. **Admin client (bypass RLS):** Switch to service role for data writes
   ```typescript
   const adminClient = createClient(supabaseUrl, supabaseServiceKey);
   ```
6. **Write operations:** Use admin client for candidates/supplier_candidates inserts
7. **Audit trail:** Always insert into `supplier_candidates` table with:
   - `created_by_user_id` – Current authenticated user ID
   - `status` – Set to 'pending'
   - All submitted data fields copied

**Pattern summary:**
- User JWT for auth verification + RLS checks
- Service role JWT for actual writes
- Explicit audit row creation with `created_by_user_id`

### Example 2: Document Upload

**Edge Function:** `/supabase/functions/candidate-doc-create-upload/index.ts`

**Auth Pattern:**
1. **Dual-mode auth:**
   - **Mode A (Staff upload):** Numeric `candidate_id` in request
     - Requires Bearer JWT header
     - Validates JWT → get user ID
     - Checks user has CRM role (root_admin, admin, user, recruiter, resourcer)
     - Verifies candidate exists
   - **Mode B (Candidate self-service):** Invite token in request
     - No JWT required
     - Validates invite token exists
     - Checks invite status (not revoked/expired/used)
     - Gets candidate_id from invite
2. **Permission check:** Role-based (staff) or token-based (candidate)
3. **Bucket management:** Ensures document-specific bucket exists
4. **Signed URL generation:** Uses service role key
5. **Audit fields on document record:**
   - `invite_id` – Set for self-service uploads
   - `uploaded_by_user_id` – Set for staff uploads (from JWT)
   - `uploaded_via` – Would be 'staff', 'candidate', or 'api'

**Pattern summary:**
- JWT-based auth for staff (role check via `user_roles` table)
- Token-based auth for candidates (invite validation)
- Audit fields track who uploaded (user_id or invite_id)

### Example 3: Extract Licence Categories

**Edge Function:** `/supabase/functions/extract-licence-categories/index.ts`

**Auth Pattern:**
1. **No direct auth required** (endpoint is public CORS)
2. **Service role key used:** Create Supabase client with `SUPABASE_SERVICE_ROLE_KEY`
3. **Lookup validation:** Fetches document from `candidate_documents` table to validate document exists and get file path
4. **Write operations:** Upsert to `candidate_licence_categories` using service role
5. **Audit fields:**
   - `extracted_at` – Timestamp (when extraction happened)
   - `extraction_confidence` – AI confidence score
   - `document_id` – Optional reference to source document

**Pattern summary:**
- Service role JWT for all DB operations
- No user identification (function is backend-triggered)
- Document validation ensures data consistency

---

## 6. EMBEDDED SOFTPHONE STATE

### File Location
`/src/pages/EmbeddedSoftphone.tsx`

### PostMessage Session Listener
**YES – Present and active**

**Implementation (lines 52–76):**
```typescript
useEffect(() => {
  if (session) return; // Skip if already authenticated

  const timer = setTimeout(() => setHandoffExpired(true), HANDOFF_TIMEOUT_MS);

  const handleMessage = (event: MessageEvent) => {
    // Only accept messages from Chrome extensions
    if (typeof event.origin !== 'string' || !event.origin.startsWith('chrome-extension://')) return;
    if (!isSessionMessage(event.data)) return;
    if (handoffDone.current) return;
    handoffDone.current = true;

    supabase.auth.setSession({
      access_token: event.data.access_token,
      refresh_token: event.data.refresh_token,
    });
  };

  window.addEventListener('message', handleMessage);
  return () => {
    clearTimeout(timer);
    window.removeEventListener('message', handleMessage);
  };
}, [session]);
```

**Message Contract:**
```typescript
interface SessionMessage {
  type: 'SR_SESSION';
  access_token: string;
  refresh_token: string;
}
```

**Handoff Timeout:** 3000ms (3 seconds)

### Current State Summary
The Chrome extension side panel iframe embedded at `/embedded/softphone` listens for SR_SESSION messages from the extension context to perform cross-origin session handoff. Once authenticated, it shows the softphone panel with candidate context pre-loaded from query parameter `?candidate={id}`. The component forces the phone panel visible on mount and pre-fetches candidate data (id, name, phone_number, active_status) to pre-fill the dialer caller context. No user authentication UI is shown if the extension successfully completes the handoff within the 3-second window.

---

## Summary of Key Files Referenced

### Edge Functions
- `/supabase/functions/parse-cv-to-candidate/index.ts` – CV parsing (PDF/DOCX/DOC)
- `/supabase/functions/submit-supplier-candidate/index.ts` – Candidate creation (supplier portal)
- `/supabase/functions/candidate-doc-create-upload/index.ts` – Document upload presigned URL
- `/supabase/functions/candidate-doc-complete-upload/index.ts` – Document upload completion
- `/supabase/functions/extract-licence-categories/index.ts` – Licence category extraction from images

### Database Migrations
- `/supabase/migrations/20250722000000_baseline_schema.sql` – Baseline schema (candidates, candidate_documents, candidate_licence_categories, addresses tables)

### Frontend Components
- `/src/components/candidates/CVDropZone.tsx` – CV drag-and-drop interface
- `/src/components/candidate/registration/CandidateRegistrationWizard.tsx` – Candidate registration flow
- `/src/pages/EmbeddedSoftphone.tsx` – Chrome extension embedded softphone page

### Type Definitions
- `/src/integrations/supabase/types.ts` – Auto-generated Supabase types (candidates Insert type, candidates table schema)

---

## Audit Notes

- **No UNIQUE constraints** on email or phone_number in candidates table (only PK on id)
- **Duplicate detection** enforced via RPC and trigger function, not DB constraints
- **Origin source tracking** via `origin_source` and `supplier_id` columns on candidates table
- **CV storage** is optional; linked via `candidate_documents.candidate_id` foreign key
- **Authentication pattern** varies: JWT + role check for staff, token-based for candidate self-service
- **Audit trail** created via dedicated tables (e.g., `supplier_candidates` for supplier submissions)
- **Address creation** is NOT automatic on candidate insert; created separately during registration wizard
- **Licence categories** extracted post-upload via AI (Gemini 2.5) and stored in `candidate_licence_categories` table
