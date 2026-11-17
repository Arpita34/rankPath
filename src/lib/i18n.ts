import type { Language } from "./store";

export interface UiStrings {
  tagline: string;
  title: string;
  subtitle: string;
  name: string;
  phone: string;
  iam: string;
  student: string;
  parent: string;
  exam: string;
  rank: string;
  rankHint: string;
  category: string;
  state: string;
  start: string;
  placeholder: string;
  send: string;
  thinking: string;
  firstMessage: (rank: number | null) => string;
  privacy: string;
  quick: string[];
}

export const UI: Record<Language, UiStrings> = {
  en: {
    tagline: "Results are out. Now what?",
    title: "Find out exactly where your rank can take you",
    subtitle: "Free AI counsellor. Real cutoffs, honest advice, in your language. Takes 2 minutes.",
    name: "Student's name", phone: "WhatsApp number", iam: "I am the", student: "Student", parent: "Parent",
    exam: "Exam", rank: "Rank", rankHint: "Leave empty if results aren't out yet", category: "Category", state: "Home state",
    start: "Show my options →", placeholder: "Ask anything: colleges, branches, fees, NIAT…", send: "Send", thinking: "Checking cutoffs…",
    firstMessage: (r) => (r ? `My rank is ${r}. Which colleges can I get?` : "My results aren't out yet. How should I plan?"),
    privacy: "We'll only use your number to send your results summary on WhatsApp.",
    quick: ["Is CSE possible?", "What is NIAT?", "Is it a real degree?", "Book a callback"],
  },
  hi: {
    tagline: "रिज़ल्ट आ गया। अब आगे क्या?",
    title: "जानिए आपकी रैंक से आपको कौन-से कॉलेज मिल सकते हैं",
    subtitle: "मुफ़्त AI काउंसलर। असली कटऑफ़, ईमानदार सलाह, आपकी भाषा में। सिर्फ़ 2 मिनट।",
    name: "छात्र का नाम", phone: "WhatsApp नंबर", iam: "मैं हूँ", student: "छात्र", parent: "अभिभावक",
    exam: "परीक्षा", rank: "रैंक", rankHint: "रिज़ल्ट नहीं आया हो तो खाली छोड़ें", category: "श्रेणी", state: "राज्य",
    start: "मेरे विकल्प दिखाएँ →", placeholder: "कुछ भी पूछें: कॉलेज, ब्रांच, फ़ीस, NIAT…", send: "भेजें", thinking: "कटऑफ़ देख रहे हैं…",
    firstMessage: (r) => (r ? `मेरी रैंक ${r} है। मुझे कौन-से कॉलेज मिल सकते हैं?` : "मेरा रिज़ल्ट अभी नहीं आया। मैं कैसे प्लान करूँ?"),
    privacy: "आपका नंबर सिर्फ़ WhatsApp पर आपका सारांश भेजने के लिए इस्तेमाल होगा।",
    quick: ["क्या CSE मिल सकता है?", "NIAT क्या है?", "क्या यह असली डिग्री है?", "कॉलबैक बुक करें"],
  },
  te: {
    tagline: "ఫలితాలు వచ్చేశాయి. ఇప్పుడు ఏం చేయాలి?",
    title: "మీ ర్యాంక్‌తో ఏ కాలేజీలు వస్తాయో ఖచ్చితంగా తెలుసుకోండి",
    subtitle: "ఉచిత AI కౌన్సెలర్. నిజమైన కటాఫ్‌లు, నిజాయితీ సలహా, మీ భాషలో. 2 నిమిషాలు చాలు.",
    name: "విద్యార్థి పేరు", phone: "WhatsApp నంబర్", iam: "నేను", student: "విద్యార్థి", parent: "తల్లిదండ్రులు",
    exam: "పరీక్ష", rank: "ర్యాంక్", rankHint: "ఫలితాలు రాకపోతే ఖాళీగా ఉంచండి", category: "కేటగిరీ", state: "రాష్ట్రం",
    start: "నా ఆప్షన్లు చూపించు →", placeholder: "ఏదైనా అడగండి: కాలేజీలు, బ్రాంచ్‌లు, ఫీజులు, NIAT…", send: "పంపు", thinking: "కటాఫ్‌లు చూస్తున్నాం…",
    firstMessage: (r) => (r ? `నా ర్యాంక్ ${r}. నాకు ఏ కాలేజీలు వస్తాయి?` : "నా ఫలితాలు ఇంకా రాలేదు. ఎలా ప్లాన్ చేయాలి?"),
    privacy: "మీ నంబర్‌ను WhatsApp లో మీ సారాంశం పంపడానికి మాత్రమే ఉపయోగిస్తాం.",
    quick: ["CSE వస్తుందా?", "NIAT అంటే ఏమిటి?", "ఇది నిజమైన డిగ్రీనా?", "కాల్‌బ్యాక్ బుక్ చేయండి"],
  },
  ta: {
    tagline: "முடிவுகள் வந்துவிட்டன. இப்போது என்ன?",
    title: "உங்கள் ரேங்கிற்கு எந்தக் கல்லூரிகள் கிடைக்கும் என்று சரியாகத் தெரிந்துகொள்ளுங்கள்",
    subtitle: "இலவச AI ஆலோசகர். உண்மையான கட்ஆஃப்கள், நேர்மையான ஆலோசனை, உங்கள் மொழியில். 2 நிமிடங்கள் போதும்.",
    name: "மாணவர் பெயர்", phone: "WhatsApp எண்", iam: "நான்", student: "மாணவர்", parent: "பெற்றோர்",
    exam: "தேர்வு", rank: "ரேங்க்", rankHint: "முடிவுகள் வரவில்லை என்றால் காலியாக விடவும்", category: "பிரிவு", state: "மாநிலம்",
    start: "என் வாய்ப்புகளைக் காட்டு →", placeholder: "எதையும் கேளுங்கள்: கல்லூரிகள், பிரிவுகள், கட்டணம், NIAT…", send: "அனுப்பு", thinking: "கட்ஆஃப்களைப் பார்க்கிறோம்…",
    firstMessage: (r) => (r ? `என் ரேங்க் ${r}. எனக்கு எந்தக் கல்லூரிகள் கிடைக்கும்?` : "என் முடிவுகள் இன்னும் வரவில்லை. எப்படித் திட்டமிடுவது?"),
    privacy: "உங்கள் எண் WhatsApp இல் சுருக்கத்தை அனுப்ப மட்டுமே பயன்படுத்தப்படும்.",
    quick: ["CSE கிடைக்குமா?", "NIAT என்றால் என்ன?", "இது உண்மையான பட்டமா?", "அழைப்பை முன்பதிவு செய்"],
  },
  kn: {
    tagline: "ಫಲಿತಾಂಶ ಬಂದಿದೆ. ಈಗ ಮುಂದೇನು?",
    title: "ನಿಮ್ಮ ರ‍್ಯಾಂಕ್‌ಗೆ ಯಾವ ಕಾಲೇಜುಗಳು ಸಿಗುತ್ತವೆ ಎಂದು ನಿಖರವಾಗಿ ತಿಳಿಯಿರಿ",
    subtitle: "ಉಚಿತ AI ಸಲಹೆಗಾರ. ನಿಜವಾದ ಕಟ್‌ಆಫ್‌ಗಳು, ಪ್ರಾಮಾಣಿಕ ಸಲಹೆ, ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ. ಕೇವಲ 2 ನಿಮಿಷ.",
    name: "ವಿದ್ಯಾರ್ಥಿಯ ಹೆಸರು", phone: "WhatsApp ಸಂಖ್ಯೆ", iam: "ನಾನು", student: "ವಿದ್ಯಾರ್ಥಿ", parent: "ಪೋಷಕರು",
    exam: "ಪರೀಕ್ಷೆ", rank: "ರ‍್ಯಾಂಕ್", rankHint: "ಫಲಿತಾಂಶ ಬಂದಿಲ್ಲದಿದ್ದರೆ ಖಾಲಿ ಬಿಡಿ", category: "ವರ್ಗ", state: "ರಾಜ್ಯ",
    start: "ನನ್ನ ಆಯ್ಕೆಗಳನ್ನು ತೋರಿಸಿ →", placeholder: "ಏನಾದರೂ ಕೇಳಿ: ಕಾಲೇಜು, ಬ್ರಾಂಚ್, ಶುಲ್ಕ, NIAT…", send: "ಕಳುಹಿಸಿ", thinking: "ಕಟ್‌ಆಫ್ ನೋಡುತ್ತಿದ್ದೇವೆ…",
    firstMessage: (r) => (r ? `ನನ್ನ ರ‍್ಯಾಂಕ್ ${r}. ನನಗೆ ಯಾವ ಕಾಲೇಜುಗಳು ಸಿಗುತ್ತವೆ?` : "ನನ್ನ ಫಲಿತಾಂಶ ಇನ್ನೂ ಬಂದಿಲ್ಲ. ಹೇಗೆ ಯೋಜಿಸಲಿ?"),
    privacy: "ನಿಮ್ಮ ಸಂಖ್ಯೆಯನ್ನು WhatsApp ನಲ್ಲಿ ಸಾರಾಂಶ ಕಳುಹಿಸಲು ಮಾತ್ರ ಬಳಸುತ್ತೇವೆ.",
    quick: ["CSE ಸಿಗುತ್ತದೆಯೇ?", "NIAT ಎಂದರೇನು?", "ಇದು ನಿಜವಾದ ಪದವಿಯೇ?", "ಕಾಲ್‌ಬ್ಯಾಕ್ ಬುಕ್ ಮಾಡಿ"],
  },
  ml: {
    tagline: "ഫലം വന്നു. ഇനി എന്ത്?",
    title: "നിങ്ങളുടെ റാങ്കിന് ഏതൊക്കെ കോളേജുകൾ കിട്ടുമെന്ന് കൃത്യമായി അറിയൂ",
    subtitle: "സൗജന്യ AI കൗൺസിലർ. യഥാർത്ഥ കട്ട്ഓഫുകൾ, സത്യസന്ധമായ ഉപദേശം, നിങ്ങളുടെ ഭാഷയിൽ. 2 മിനിറ്റ് മതി.",
    name: "വിദ്യാർത്ഥിയുടെ പേര്", phone: "WhatsApp നമ്പർ", iam: "ഞാൻ", student: "വിദ്യാർത്ഥി", parent: "രക്ഷിതാവ്",
    exam: "പരീക്ഷ", rank: "റാങ്ക്", rankHint: "ഫലം വന്നിട്ടില്ലെങ്കിൽ ഒഴിച്ചിടുക", category: "വിഭാഗം", state: "സംസ്ഥാനം",
    start: "എന്റെ ഓപ്ഷനുകൾ കാണിക്കൂ →", placeholder: "എന്തും ചോദിക്കൂ: കോളേജ്, ബ്രാഞ്ച്, ഫീസ്, NIAT…", send: "അയയ്ക്കുക", thinking: "കട്ട്ഓഫുകൾ നോക്കുന്നു…",
    firstMessage: (r) => (r ? `എന്റെ റാങ്ക് ${r} ആണ്. എനിക്ക് ഏതൊക്കെ കോളേജുകൾ കിട്ടും?` : "എന്റെ ഫലം ഇതുവരെ വന്നിട്ടില്ല. എങ്ങനെ പ്ലാൻ ചെയ്യണം?"),
    privacy: "നിങ്ങളുടെ നമ്പർ WhatsApp-ൽ സംഗ്രഹം അയയ്ക്കാൻ മാത്രമേ ഉപയോഗിക്കൂ.",
    quick: ["CSE കിട്ടുമോ?", "NIAT എന്താണ്?", "ഇത് യഥാർത്ഥ ബിരുദമാണോ?", "കോൾബാക്ക് ബുക്ക് ചെയ്യൂ"],
  },
};
