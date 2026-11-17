// NIAT knowledge base. Facts were taken from https://www.niatindia.com/ (fetched Nov 2026).
// Anything not published on the site is marked so the agent tells the user that a
// counsellor will confirm it, instead of making something up.

export const NIAT_TOPICS = [
  "overview",
  "degree_and_recognition",
  "admission_process",
  "fees_and_scholarships",
  "outcomes_and_placements",
  "curriculum",
  "campuses_and_partner_universities",
  "contact_and_next_steps",
] as const;

export type NiatTopic = (typeof NIAT_TOPICS)[number];

export const NIAT_FACTS: Record<NiatTopic, string> = {
  overview:
    "NIAT (NxtWave Institute of Advanced Technologies) is an upskilling programme by NxtWave that runs alongside a 4-year B.Tech. It works with 35+ partner universities across India. The student studies for a B.Tech at a partner university while NIAT delivers an industry-focused tech curriculum (AI/ML, Robotics, Data Science and more) on top.",
  degree_and_recognition:
    "Important and stated plainly on NIAT's own website: NIAT is NOT a university and does NOT award degrees. The B.Tech is a UGC-recognised / AICTE-approved degree awarded by the partner university. NIAT separately awards an 'Industry Ready Certification'. Students can also earn IIT Kharagpur micro-specialisations (Foundations of Generative AI; Generative and Agentic AI) through IIT Kharagpur's Outreach Course Network. Admission to the partner university is at that university's discretion.",
  admission_process:
    "Admission starts with the NAT (NIAT's assessment test), applied for on the NIAT website via 'Apply Now'. Exact test dates, eligibility cut-offs and the step-by-step process are NOT published on the homepage. A counsellor confirms these.",
  fees_and_scholarships:
    "Fees and scholarship amounts are NOT published on NIAT's website. They depend on the partner university and campus. Do not quote a number; offer a counsellor callback to get the exact fee and any scholarship for this student.",
  outcomes_and_placements:
    "Claims on NIAT's site (with its own disclaimers): 2500+ companies have hired from NxtWave programmes; 200+ NIATians have secured stipend internships; ₹2.92 crore total internship stipends; 1,200+ AI-powered projects built; example top packages of 80 LPA (SDE) and 35 LPA (AI Engineer). The site clearly states these outcomes come from multiple NxtWave programmes and that enrolling in NIAT does NOT guarantee a job or internship. Always pass on that disclaimer.",
  curriculum:
    "The curriculum runs in phases: Decode → Develop → Architect → Ship. Decode covers AI essentials, no-code automation and Python foundations; later phases move to building and shipping real products. Focus areas: AI/ML, Robotics, Data Science. Students build real projects from year 1.",
  campuses_and_partner_universities:
    "NIAT runs with partner universities in Telangana, Andhra Pradesh, Karnataka, Tamil Nadu, Maharashtra, Haryana, Rajasthan, Delhi NCR, Madhya Pradesh, Uttar Pradesh and Odisha. Named partners include Chalapathi University (Guntur), GMR Institute of Technology (Vizianagaram) and Ajeenkya DY Patil University (Pune). NIAT's office: Financial District, Nanakramguda, Hyderabad, Telangana.",
  contact_and_next_steps:
    "Next steps: (1) a free counsellor callback, (2) a chat with current NIAT students (via 'Book your slot' on niatinsider.com), (3) download the brochure, (4) apply for NAT. WhatsApp: +91 8008 9009 08. Email: support@niatindia.com.",
};
