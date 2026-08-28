export const TN_DEPARTMENTS = {
  HIGHWAYS: { id: "HIGHWAYS", nameTa: "நெடுஞ்சாலைத் துறை", nameEn: "Highways Dept", color: "#3b82f6" },
  SWM: { id: "SWM", nameTa: "திடக்கழிவு மேலாண்மை", nameEn: "Solid Waste Mgmt (SWM)", color: "#10b981" },
  TNEB: { id: "TNEB", nameTa: "தமிழ்நாடு மின்சார வாரியம் (TANGEDCO)", nameEn: "TNEB / TANGEDCO", color: "#f59e0b" },
  CMWSSB: { id: "CMWSSB", nameTa: "குடிநீர் & கழிவுநீர் வாரியம்", nameEn: "Water & Sewerage Board", color: "#0ea5e9" },
  CORPORATION: { id: "CORPORATION", nameTa: "மாநகராட்சி பொதுச் சுகாதாரம்", nameEn: "Municipal Corporation", color: "#8b5cf6" }
};

export const ESCALATION_LEVELS = [
  { level: 1, role: "Ward Assistant Engineer (AE)", timeoutHours: 24, label: "L1 - Ward Officer", titleEn: "L1 - Ward Assistant Engineer", titleTa: "நிலை 1 - வார்டு உதவி பொறியாளர்" },
  { level: 2, role: "Zonal Executive Engineer (EE)", timeoutHours: 48, label: "L2 - Zonal Executive", titleEn: "L2 - Zonal Executive Engineer", titleTa: "நிலை 2 - மண்டல செயற் பொறியாளர்" },
  { level: 3, role: "City Deputy Commissioner (DC)", timeoutHours: 72, label: "L3 - Deputy Commissioner", titleEn: "L3 - City Deputy Commissioner", titleTa: "நிலை 3 - துணை ஆணையர்" },
  { level: 4, role: "Municipal Commissioner / Collector", timeoutHours: 96, label: "L4 - Municipal Collector", titleEn: "L4 - District Collector / Commissioner", titleTa: "நிலை 4 - மாவட்ட ஆட்சியர் / ஆணையர்" },
  { level: 5, role: "Chief Minister Special Cell", timeoutHours: 120, label: "L5 - CM Cell", titleEn: "L5 - Chief Minister Special Cell", titleTa: "நிலை 5 - முதலமைச்சர் தனிப்பிரிவு" }
];

export const TN_DISTRICTS_WARDS = [
  { name: "Greater Chennai Corporation (Ward 120 - Velachery)", lat: 12.9815, lon: 80.2180 },
  { name: "Greater Chennai Corporation (Ward 109 - T. Nagar)", lat: 13.0418, lon: 80.2341 },
  { name: "Madurai Corporation (Ward 45 - Mattuthavani)", lat: 9.9482, lon: 78.1560 },
  { name: "Coimbatore Corporation (Ward 14 - Gandhipuram)", lat: 11.0183, lon: 76.9644 },
  { name: "Salem Corporation (Ward 22 - Junction Area)", lat: 11.6643, lon: 78.1460 },
  { name: "Tiruchirappalli Corporation (Ward 8 - Thillai Nagar)", lat: 10.8240, lon: 78.6860 }
];

export const INITIAL_MOCK_COMPLAINTS = [
  {
    id: "TN-2026-8801",
    titleTa: "அண்ணா நகர் சாலையில் பெரிய சாக்கடை அடைப்பு",
    titleEn: "Main Road Pothole & Water Logging Near Junction",
    original_description: "அண்ணா நகர் சாலையில் பெரிய சாக்கடை அடைப்பு",
    processed_description: "Main Road Pothole & Water Logging Near Junction",
    original_language: "Tamil",
    categoryTa: "நெடுஞ்சாலைத் துறை",
    categoryEn: "Roads & Infrastructure",
    department: "HIGHWAYS",
    lat: 13.0827,
    lon: 80.2707,
    ward: "Ward 104, Anna Nagar, Chennai",
    photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80",
    voiceTranscriptTa: "அண்ணா நகர் மெயின் ரோட்டுல பெரிய சாக்கடை உடைஞ்சு தண்ணி நிக்குது.",
    reporterName: "Karthik (App Intake)",
    reporterPhone: "98401*****",
    reporterCount: 3,
    status: "OPEN",
    priority: "HIGH",
    priorityScore: 92,
    escalationLevel: 1,
    slaExpiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    slaDaysRemaining: 3,
    history: [
      { step: "Submitted", note: "Reported via Citizen Mobile App", timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString() },
      { step: "Sarvam AI", note: "Translated Tamil Voice transcript to English", timestamp: new Date(Date.now() - 35 * 3600 * 1000).toISOString() },
      { step: "Gemini AI", note: "Categorized defect as ROADS / POTHOLE (High Severity)", timestamp: new Date(Date.now() - 35 * 3600 * 1000).toISOString() }
    ]
  },
  {
    id: "TN-2026-8802",
    titleTa: "தெரு விளக்குகள் எரியவில்லை மற்றும் மின்சார கம்பி சேதம்",
    titleEn: "Streetlight Power Fault & Cable Damage",
    original_description: "தெரு விளக்குகள் எரியவில்லை மற்றும் மின்சார கம்பி சேதம்",
    processed_description: "Streetlight Power Fault & Cable Damage",
    original_language: "Tamil",
    categoryTa: "மின்சார வாரியம்",
    categoryEn: "Street Lighting (TNEB)",
    department: "TNEB",
    lat: 9.9482,
    lon: 78.1560,
    ward: "Ward 45, K.K. Nagar, Madurai",
    photoUrl: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=600&q=80",
    voiceTranscriptTa: "கேகே நகர் தெரு விளக்குகள் எதுவும் எரியல இருட்டா இருக்கு.",
    reporterName: "Selvi (Voice Intake)",
    reporterPhone: "94432*****",
    reporterCount: 6,
    status: "PROCESSING",
    priority: "MEDIUM",
    priorityScore: 78,
    escalationLevel: 2,
    slaExpiresAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    slaDaysRemaining: 2,
    history: [
      { step: "Submitted", note: "Reported via Voice Recording Intake", timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString() },
      { step: "Processing", note: "Assigned to Ward Line Superintendent Er. S. Kumar", timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString() }
    ]
  },
  {
    id: "TN-2026-8803",
    titleTa: "பேருந்து நிறுத்தம் அருகே குப்பை சேகரிப்பு மந்தம்",
    titleEn: "Uncleaned Garbage Dump near Bus Stop",
    original_description: "பேருந்து நிறுத்தம் அருகே குப்பை சேகரிப்பு மந்தம்",
    processed_description: "Uncleaned Garbage Dump near Bus Stop",
    original_language: "Tamil",
    categoryTa: "திடக்கழிவு மேலாண்மை",
    categoryEn: "Solid Waste Management",
    department: "SWM",
    lat: 11.0183,
    lon: 76.9644,
    ward: "Ward 12, Gandhipuram, Coimbatore",
    photoUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80",
    voiceTranscriptTa: "காந்திபுரம் பஸ் ஸ்டாப் பக்கத்துல ரெண்டு நாளா குப்பை அள்ளல.",
    reporterName: "Ramesh (App Intake)",
    reporterPhone: "97890*****",
    reporterCount: 11,
    status: "RESOLVED",
    priority: "LOW",
    priorityScore: 45,
    escalationLevel: 1,
    slaExpiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    slaDaysRemaining: 0,
    history: [
      { step: "Submitted", note: "Reported via App", timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString() },
      { step: "Resolved", note: "SWM compactor truck cleared dump site", timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString() }
    ]
  }
];
