import { EditableFields, ReviewItem } from './types';

/**
 * List of standard editable fields defined in requirements
 */
export const EDITABLE_FIELD_KEYS: (keyof EditableFields)[] = [
  'owner_matched_name',
  'confirmed_phone',
  'contact_email',
  'key_contact_name',
  'official_website',
  'linkedin_url',
  'contractor_name',
  'contractor_type',
  'contractor_website',
  'contractor_contact_name',
  'contractor_contact_email',
];

/**
 * Normalizes a key string into lowercase alphanumeric representation for easy comparison.
 * e.g. "Reference Number" -> "referencenumber", "reference_number" -> "referencenumber"
 */

export function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Retrieves a value from an item object trying multiple possible key variants.
 */
export function getRawValue(item: ReviewItem, ...possibleKeys: string[]): any {
  if (!item || typeof item !== 'object') return undefined;

  // 1. Direct key lookup
  for (const k of possibleKeys) {
    if (k in item && item[k] !== undefined) {
      return item[k];
    }
  }

  // 2. Normalized key lookup
  const normalizedTargets = new Set(possibleKeys.map(normalizeKey));
  for (const [key, value] of Object.entries(item)) {
    if (normalizedTargets.has(normalizeKey(key)) && value !== undefined) {
      return value;
    }
  }

  return undefined;
}

/**
 * Formats a value for display in the UI. Returns "N/A" if empty/null/undefined.
 */
export function formatDisplayValue(val: any): string {
  if (val === null || val === undefined) return 'N/A';
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return 'N/A';
    }
    return trimmed;
  }
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val);
    } catch {
      return 'N/A';
    }
  }
  return String(val);
}

/**
 * Checks whether a display string is considered empty/N/A.
 */
export function isValueEmpty(val: any): boolean {
  return formatDisplayValue(val) === 'N/A';
}

/**
 * Extracts initial editable values from a review item.
 */
export function extractEditableFields(item: ReviewItem): EditableFields {
  return {
    owner_matched_name: String(getRawValue(item, 'owner_matched_name', 'Owner Matched Name', 'Owners', 'Owner') ?? ''),
    confirmed_phone: String(getRawValue(item, 'confirmed_phone', 'Confirmed Phone', 'Owners Phone', 'Phone') ?? ''),
    contact_email: String(getRawValue(item, 'contact_email', 'Contact Email', 'Email') ?? ''),
    key_contact_name: String(getRawValue(item, 'key_contact_name', 'Key Contact Name', 'Owners Key Contact', 'Key Contact') ?? ''),
    official_website: String(getRawValue(item, 'official_website', 'Official Website', 'Website') ?? ''),
    linkedin_url: String(getRawValue(item, 'linkedin_url', 'LinkedIn URL', 'LinkedIn') ?? ''),
    contractor_name: String(getRawValue(item, 'contractor_name', 'Contractor Name', 'Contractor') ?? ''),
    contractor_type: String(getRawValue(item, 'contractor_type', 'Contractor Type') ?? ''),
    contractor_website: String(getRawValue(item, 'contractor_website', 'Contractor Website') ?? ''),
    contractor_contact_name: String(getRawValue(item, 'contractor_contact_name', 'Contractor Contact Name') ?? ''),
    contractor_contact_email: String(getRawValue(item, 'contractor_contact_email', 'Contractor Contact Email') ?? ''),
  };
}

/**
 * Constructs the `updated_data` payload for the "updated" decision action.
 * Standard rule:
 * - updated_data must contain ALL supported 11 editable fields.
 * - If a field was changed, send its new value.
 * - If a field was not changed, send an empty string "".
 */
export function buildUpdatedDataPayload(
  initial: EditableFields,
  current: EditableFields
): EditableFields {
  const result: Partial<EditableFields> = {};

  for (const key of EDITABLE_FIELD_KEYS) {
    const initialVal = (initial[key] || '').trim();
    const currentVal = (current[key] || '').trim();

    if (currentVal !== initialVal) {
      result[key] = currentVal;
    } else {
      result[key] = '';
    }
  }

  return result as EditableFields;
}

/**
 * Helper to extract main table row summary fields safely.
 */
export function getTableRowSummary(item: ReviewItem, index: number) {
  const refNum = formatDisplayValue(getRawValue(item, 'reference_number', 'Reference Number', 'ref_num'));
  const projName = formatDisplayValue(getRawValue(item, 'project_name', 'Project Name', 'name'));

  const city = getRawValue(item, 'city', 'City');
  const country = getRawValue(item, 'country', 'Country');
  const rawLoc = getRawValue(item, 'location', 'Location');
  let locationStr = 'N/A';
  if (city || country) {
    locationStr = [city, country].filter(Boolean).join(', ');
  } else if (rawLoc) {
    locationStr = formatDisplayValue(rawLoc);
  }

  const owner = formatDisplayValue(
    getRawValue(item, 'owner_matched_name', 'Owner Matched Name', 'Owners', 'Owner')
  );

  const contractor = formatDisplayValue(
    getRawValue(item, 'contractor_name', 'Contractor Name', 'Contractor')
  );

  const confidence = formatDisplayValue(
    getRawValue(
      item,
      'enrichment_confidence',
      'Enrichment Confidence',
      'confidence',
      'Math Confidence Tier',
      'Math Confidence Score'
    )
  );

  const needsReview = formatDisplayValue(
    getRawValue(item, 'needs_review', 'Needs Review', 'status', 'Status')
  );

  return {
    sNo: index + 1,
    referenceNumber: refNum,
    projectName: projName,
    location: locationStr,
    owner,
    contractor,
    confidence,
    needsReview,
  };
}

/**
 * Returns structured key-value pairs for modal sections.
 */
export interface SectionField {
  key: string;
  label: string;
  value: any;
  formatted: string;
  isUrl?: boolean;
  isEmail?: boolean;
}

export function getProjectDetailsSection(item: ReviewItem): SectionField[] {
  const fields = [
    { key: 'reference_number', label: 'Reference Number', possible: ['reference_number', 'Reference Number'] },
    { key: 'project_name', label: 'Project Name', possible: ['project_name', 'Project Name'] },
    { key: 'project_type', label: 'Project Type', possible: ['project_type', 'Project Type', 'Profile Type'] },
    { key: 'location', label: 'Location', possible: ['location', 'Location'] },
    { key: 'city', label: 'City', possible: ['city', 'City'] },
    { key: 'country', label: 'Country', possible: ['country', 'Country'] },
    { key: 'stage', label: 'Stage', possible: ['stage', 'Stage'] },
    { key: 'industry', label: 'Industry', possible: ['industry', 'Industry'] },
    { key: 'completion_percentage', label: 'Completion Percentage', possible: ['completion_percentage', 'Completion Percentage'] },
    { key: 'estimated_completion_date', label: 'Est. Completion Date', possible: ['estimated_completion_date', 'Estimated Completion Date'] },
    { key: 'updated_date', label: 'Updated Date', possible: ['updated_date', 'Updated Date', 'updation date'] },
    { key: 'value_usd', label: 'Value (USD)', possible: ['value_usd', 'Value(USD)', 'Value (USD)', 'construction_value', 'Construction Value'] },
    { key: 'construction_value_spent', label: 'Construction Value Spent', possible: ['construction_value_spent', 'Construction Value Spent'] },
    { key: 'est_contractor_award_date', label: 'Est. Contractor Award Date', possible: ['est_main_infra_epc_contractor_award_date', 'Est. Main/Infra/EPC Contractor Award Date'] },
    { key: 'contractor_award_value', label: 'Contractor Award Value', possible: ['main_infra_epc_contractor_award_value', 'Main/Infra/EPC Contractor Award Value'] },
  ];

  return fields.map((f) => {
    const raw = getRawValue(item, ...f.possible);
    return {
      key: f.key,
      label: f.label,
      value: raw,
      formatted: formatDisplayValue(raw),
    };
  });
}

export function getOwnerDetailsSection(item: ReviewItem): SectionField[] {
  const fields = [
    { key: 'recent_news_signal', label: 'Recent News Signal', possible: ['recent_news_signal', 'Recent News Signal'] },
    { key: 'math_confidence_score', label: 'Math Confidence Score', possible: ['math_confidence_score', 'Math Confidence Score'] },
    { key: 'math_confidence_tier', label: 'Math Confidence Tier', possible: ['math_confidence_tier', 'Math Confidence Tier', 'enrichment_confidence', 'Enrichment Confidence'] },
    { key: 'math_confidence_reasoning', label: 'Math Confidence Reasoning', possible: ['math_confidence_reasoning', 'Math Confidence Reasoning', 'confidence_reason', 'Confidence Reason'] },
    { key: 'needs_review', label: 'Needs Review', possible: ['needs_review', 'Needs Review'] },
  ];

  return fields.map((f) => {
    const raw = getRawValue(item, ...f.possible);
    let formatted = formatDisplayValue(raw);
    if (typeof raw === 'boolean') {
      formatted = raw ? 'True' : 'False';
    }
    return {
      key: f.key,
      label: f.label,
      value: raw,
      formatted,
    };
  });
}

export function getContractorDetailsSection(item: ReviewItem): SectionField[] {
  const fields = [
    { key: 'contractor_found', label: 'Contractor Found', possible: ['contractor_found', 'Contractor Found'] },
    { key: 'contractor_contact_position', label: 'Contractor Contact Position', possible: ['contractor_contact_position', 'Contractor Contact Position'] },
    { key: 'contractor_contact_number', label: 'Contractor Contact Number', possible: ['contractor_contact_number', 'Contractor Contact Number'] },
    { key: 'contractor_math_confidence_score', label: 'Contractor Math Confidence Score', possible: ['contractor_math_confidence_score', 'Contractor Math Confidence Score'] },
    { key: 'contractor_math_confidence_tier', label: 'Contractor Math Confidence Tier', possible: ['contractor_math_confidence_tier', 'Contractor Math Confidence Tier', 'contractor_confidence', 'Contractor Confidence'] },
    { key: 'contractor_math_confidence_reasoning', label: 'Contractor Math Confidence Reasoning', possible: ['contractor_math_confidence_reasoning', 'Contractor Math Confidence Reasoning', 'contractor_confidence_reason', 'Contractor Confidence Reason'] },
    { key: 'needs_review_for_contractor', label: 'Needs Review for Contractor', possible: ['needs_review_for_contractor', 'Needs Review for Contractor'] },
  ];

  return fields.map((f) => {
    const raw = getRawValue(item, ...f.possible);
    let formatted = formatDisplayValue(raw);
    if (typeof raw === 'boolean') {
      formatted = raw ? 'True' : 'False';
    }
    return {
      key: f.key,
      label: f.label,
      value: raw,
      formatted,
    };
  });
}

/**
 * Returns any unrecognized fields returned by API for "Other Fields" section.
 */
export function getOtherFieldsSection(item: ReviewItem): SectionField[] {
  const recognizedNormalizedKeys = new Set([
    'referencenumber', 'projectname', 'projecttype', 'profiletype', 'location', 'city',
    'country', 'stage', 'industry', 'completionpercentage', 'estimatedcompletiondate',
    'updateddate', 'updationdate', 'creationdate', 'constructionvalue', 'constructionvaluespent',
    'valueusd', 'estmaininfraepccontractorawarddate', 'maininfraepccontractorawardvalue',
    'datasets', 'ownermatchedname', 'owners', 'owner', 'officialwebsite', 'website',
    'confirmedphone', 'ownersphone', 'phone', 'contactemail', 'email', 'keycontactname',
    'ownerskeycontact', 'keycontact', 'linkedinurl', 'linkedin', 'recentnewssignal',
    'sourceurls', 'enrichmentconfidence', 'confidencereason', 'mathconfidencescore',
    'mathconfidencetier', 'mathconfidencereasoning', 'needsreview', 'contractorfound',
    'contractorname', 'contractor', 'contractortype', 'contractorwebsite', 'contractorcontactname',
    'contractorcontactposition', 'contractorcontactemail', 'contractorcontactnumber',
    'contractormathconfidencescore', 'contractormathconfidencetier', 'contractormathconfidencereasoning',
    'contractorconfidence', 'contractorconfidencereason', 'needsreviewforcontractor',
    'contractorsourceurls', 'statusforreview', 'emailstatus', 'feedback', 'slno', 'rownumber'
  ]);

  const otherFields: SectionField[] = [];

  for (const [key, val] of Object.entries(item)) {
    const norm = normalizeKey(key);
    if (!recognizedNormalizedKeys.has(norm)) {
      const isUrl = typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'));
      const isEmail = typeof val === 'string' && val.includes('@') && !val.includes(' ');
      otherFields.push({
        key,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: val,
        formatted: formatDisplayValue(val),
        isUrl,
        isEmail,
      });
    }
  }

  return otherFields;
}

/**
 * Extracts list of source URLs safely (handling strings or objects).
 */
export function extractSourceUrls(item: ReviewItem, keyName: string): { url: string; label?: string }[] {
  if (!item || typeof item !== 'object') return [];

  let raw: any;
  if (keyName === 'contractor_source_urls' || keyName.toLowerCase().includes('contractor')) {
    raw = getRawValue(item, 'contractor_source_urls', 'Contractor Source URLs');
  } else {
    raw = getRawValue(item, 'source_urls', 'Source URLs');
  }

  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (typeof entry === 'string') return { url: entry.trim() };
        if (typeof entry === 'object' && entry !== null) {
          return {
            url: (entry.url || entry.link || String(entry)).trim(),
            label: entry.type || entry.label || entry.title || undefined,
          };
        }
        return { url: String(entry).trim() };
      })
      .filter((s) => Boolean(s.url) && (s.url.startsWith('http://') || s.url.startsWith('https://')));
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed
            .map((u) => ({ url: String(u).trim() }))
            .filter((s) => s.url.startsWith('http://') || s.url.startsWith('https://'));
        }
      } catch {}
    }
    return trimmed
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.startsWith('http://') || s.startsWith('https://'))
      .map((url) => ({ url }));
  }

  return [];
}
