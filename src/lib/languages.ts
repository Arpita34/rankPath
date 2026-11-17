import type { Language } from "./store";

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  te: "Telugu (తెలుగు)",
  ta: "Tamil (தமிழ்)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
};

export const EXAM_LABELS: Record<string, string> = {
  JEE_MAIN: "JEE Main (JoSAA - NITs/IIITs)",
  TG_EAPCET: "TG EAPCET (Telangana)",
  AP_EAPCET: "AP EAPCET (Andhra Pradesh)",
  KCET: "KCET (Karnataka)",
};
