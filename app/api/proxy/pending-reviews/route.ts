import { NextResponse } from 'next/server';

const TARGET_URL = 'https://ai-automation-stage.oomnieye.com/webhook-test/pending-reviews';

const DUMMY_REVIEWS = [
  {
    "Reference Number": "PRJAE26739250",
    "Project Name": "Dubai Creek Harbour Tower Expansion",
    "Project Type": "Commercial & Infrastructure",
    "Location": "Dubai Creek, Dubai",
    "City": "Dubai",
    "Country": "United Arab Emirates",
    "Stage": "Under Construction",
    "Industry": "Real Estate & Construction",
    "Completion Percentage": "45%",
    "Estimated Completion Date": "2027-12-31",
    "Updated Date": "2026-09-10",
    "Construction Value": "$1,200,000,000",
    "Owner Matched Name": "Emaar Properties PJSC",
    "Official Website": "https://www.emaar.com",
    "Confirmed Phone": "+971 4 367 3333",
    "Contact Email": "info@emaar.com",
    "Key Contact Name": "Mohamed Alabbar",
    "LinkedIn URL": "https://www.linkedin.com/company/emaar-properties",
    "Recent News Signal": "Emaar awarded new structural phase for Dubai Creek harbour expansion project.",
    "Enrichment Confidence": "High",
    "Confidence Reason": "Confirmed matching registration records and verified corporate contact email.",
    "Needs Review": "Pending Review",
    "Contractor Found": "Yes",
    "Contractor Name": "Al Habtoor Leighton Group",
    "Contractor Type": "Main Contractor",
    "Contractor Website": "https://www.hlgroup.com",
    "Contractor Contact Name": "Riad Al Sadek",
    "Contractor Contact Email": "contact@hlgroup.com",
    "Contractor Confidence": "High",
    "Contractor Confidence Reason": "Primary tender win document published in official press release.",
    "Source URLs": [
      { "url": "https://www.emaar.com/en/press-release/dubai-creek", "type": "Official Press Release" },
      { "url": "https://www.constructionweekonline.com/projects/emaar-creek", "type": "Industry News" }
    ]
  },
  {
    "Reference Number": "PRJSA88291034",
    "Project Name": "NEOM Green Hydrogen Plant Phase 2",
    "Project Type": "Renewable Energy & Infrastructure",
    "Location": "Tabuk Province",
    "City": "NEOM",
    "Country": "Saudi Arabia",
    "Stage": "Tender / Bidding",
    "Industry": "Clean Energy",
    "Completion Percentage": "20%",
    "Estimated Completion Date": "2028-06-30",
    "Updated Date": "2026-09-08",
    "Construction Value": "$850,000,000",
    "Owner Matched Name": "NEOM Green Hydrogen Company",
    "Official Website": "https://www.neom.com",
    "Confirmed Phone": "+966 12 345 6789",
    "Contact Email": "procurement@neom.com",
    "Key Contact Name": "Nadhmi Al-Nasr",
    "LinkedIn URL": "https://www.linkedin.com/company/neom-green-hydrogen",
    "Recent News Signal": "EPIC contract awarded for electrolysis unit installation.",
    "Enrichment Confidence": "Medium",
    "Confidence Reason": "Key contact email requires manual domain validation.",
    "Needs Review": "Pending Review",
    "Contractor Found": "Yes",
    "Contractor Name": "Air Products & Chemicals Inc",
    "Contractor Type": "EPC Contractor",
    "Contractor Website": "https://www.airproducts.com",
    "Contractor Contact Name": "Seifi Ghasemi",
    "Contractor Contact Email": "investors@airproducts.com",
    "Contractor Confidence": "High",
    "Contractor Confidence Reason": "Joint venture partner listed in SEC filings.",
    "Source URLs": [
      { "url": "https://www.neom.com/en-us/newsroom/green-hydrogen", "type": "Official Portal" }
    ]
  },
  {
    "Reference Number": "PRJQA44102981",
    "Project Name": "Doha Metro Extension Line 3",
    "Project Type": "Transportation & Rail",
    "Location": "Doha",
    "City": "Doha",
    "Country": "Qatar",
    "Stage": "Detailed Engineering",
    "Industry": "Public Infrastructure",
    "Completion Percentage": "10%",
    "Estimated Completion Date": "2029-03-31",
    "Updated Date": "2026-09-05",
    "Construction Value": "$2,100,000,000",
    "Owner Matched Name": "Qatar Rail (RAIL)",
    "Official Website": "https://www.qr.com.qa",
    "Confirmed Phone": "+974 4433 2211",
    "Contact Email": "tender@qr.com.qa",
    "Key Contact Name": "Abdulla Abdulaziz Al Subaie",
    "LinkedIn URL": "https://www.linkedin.com/company/qatar-rail",
    "Recent News Signal": "Tender pre-qualification announced for tunneling package.",
    "Enrichment Confidence": "Low",
    "Confidence Reason": "Contractor contact info unverified in initial web scrapings.",
    "Needs Review": "Needs Review",
    "Contractor Found": "No",
    "Contractor Name": "",
    "Contractor Type": "Main Contractor",
    "Contractor Website": "",
    "Contractor Contact Name": "",
    "Contractor Contact Email": "",
    "Contractor Confidence": "Low",
    "Contractor Confidence Reason": "No contractor yet awarded for tunneling package.",
    "Source URLs": [
      { "url": "https://www.qr.com.qa/tenders", "type": "Tender Portal" }
    ]
  }
];

export async function GET() {
  try {
    const res = await fetch(TARGET_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        if (data && (Array.isArray(data.reviews) || Array.isArray(data))) {
          return NextResponse.json(data, { status: 200 });
        }
      } catch {
        // Fallthrough if invalid JSON
      }
    }
  } catch (err) {
    console.warn('Proxy GET to n8n failed or inactive. Returning fallback dummy reviews for live testing:', err);
  }

  // Fallback to rich dummy reviews so UI flow can always be tested end-to-end
  return NextResponse.json(
    {
      success: true,
      count: DUMMY_REVIEWS.length,
      reviews: DUMMY_REVIEWS,
      isDemoFallback: true,
    },
    { status: 200 }
  );
}
