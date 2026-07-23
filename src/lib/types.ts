export interface LookupRequest {
  phone: string | null;
  email: string | null;
  name: string | null;
  location: string | null;
}

export interface LicenceCategory {
  category: string;
  expiry_date: string | null;
}

export interface LastBooking {
  date: string;
  client_name: string | null;
  status: string;
}

export interface LastNote {
  text: string;
  created_at: string;
  author: string | null;
}

export interface Engagement {
  health: string | null;
  funnel_stage: string | null;
  response_rate: number;
}

export interface OpenTask {
  title: string;
  due_date: string | null;
  owner: string | null;
  overdue: boolean;
}

export interface CandidateMatch {
  candidate_id: number;
  confidence: 'exact_phone' | 'exact_email' | 'fuzzy_name_postcode' | 'name_location';

  name: string;
  active_status: 'active' | 'inactive';
  registered_at: string | null;
  recruiter_name: string | null;
  resourcer_name: string | null;

  marked_unsuitable: boolean;
  unsuitable_reason: string | null;
  marked_for_deletion: boolean;

  licence_categories: LicenceCategory[];
  licence_points: number;
  job_categories: string[];

  last_booking: LastBooking | null;
  company_booking_count: number;
  agency_booking_count: number;
  last_note: LastNote | null;
  last_contact_date: string | null;

  available_this_week: boolean;
  next_availability_date: string | null;
  engagement: Engagement | null;

  recent_notes?: LastNote[];
  next_booking?: LastBooking | null;
  recent_booking_count_90d?: number;
  open_tasks?: OpenTask[];

  phone_number: string;
  postcode: string | null;
}

export interface MatchResponse {
  matches: CandidateMatch[];
  metadata: { duration_ms: number };
}

export interface LookupMessage {
  type: 'CANDIDATE_LOOKUP';
  payload: LookupRequest;
}

export type BackgroundResponse =
  | { ok: true; data: MatchResponse }
  | { ok: false; error: string };

// --- Create candidate ---

export interface CreateRequest {
  name: string;
  phone: string | null;
  email: string | null;
  location: string | null;
  cv_text: string | null;
}

export interface CreateResponse {
  ok: true;
  candidate_id: number;
  created: true;
  parsed: boolean;
  warnings?: string[];
}

export interface DuplicateResponse {
  error: 'duplicate';
  existing: Array<{ candidate_id: number; name: string; confidence: string }>;
}

export type CreateBackgroundResponse =
  | CreateResponse
  | { ok: false; error: string; duplicate?: DuplicateResponse };

// --- Note create ---

export interface NoteCreateRequest {
  candidate_id: number;
  text: string;
}

export type NoteCreateResponse =
  | { ok: true }
  | { ok: false; error: string };
