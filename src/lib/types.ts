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

export interface CandidateMatch {
  candidate_id: number;
  confidence: 'exact_phone' | 'exact_email' | 'fuzzy_name_postcode' | 'name_location';
  name: string;
  active_status: 'active' | 'inactive';
  recruiter_name: string | null;
  licence_categories: LicenceCategory[];
  licence_points: number;
  last_booking_date: string | null;
  phone_number: string;
  postcode: string | null;
  marked_unsuitable: boolean;
  unsuitable_reason: string | null;
  marked_for_deletion: boolean;
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
