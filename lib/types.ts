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

export interface DecisionPayload {
  decision: 'accepted' | 'rejected';
  feedback: string;
}
