export type DecisionAction = 'accepted' | 'rejected' | 'updated' | 'discarded';

export interface EditableFields {
  owner_matched_name: string;
  confirmed_phone: string;
  contact_email: string;
  key_contact_name: string;
  official_website: string;
  linkedin_url: string;
  contractor_name: string;
  contractor_type: string;
  contractor_website: string;
  contractor_contact_name: string;
  contractor_contact_email: string;
}

export type ReviewItem = Record<string, any>;

export interface PendingReviewsResponse {
  success: boolean;
  count: number;
  reviews: ReviewItem[];
  error?: string;
}

export interface ReviewActionPayload {
  reference_number: string;
  decision: DecisionAction;
  feedback: string;
  updated_data: Partial<EditableFields> | Record<string, never>;
}

export interface ReviewActionResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// Legacy types for backwards compatibility with pre-existing store/validation
export interface SourceUrl {
  url: string;
  type: string;
}

export interface OwnerEnrichment {
  owner_matched_name?: string;
  official_website?: string;
  confirmed_phone?: string;
  contact_email?: string;
  key_contact_name?: string;
  linkedin_url?: string;
  recent_news_signal?: string;
  source_urls?: SourceUrl[];
}

export interface ReviewPayload {
  review_id: string;
  review_type?: 'owner' | 'tender' | string;
  attempt: number;
  resume_url: string;
  reference_number: string;
  project_name: string;
  owner?: OwnerEnrichment;
  data?: Record<string, any>;
  confidence: 'high' | 'medium' | 'low' | string;
  confidence_reason: string;
}
