// Indian States & Union Territories of India
export const STATES_AND_UTS = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// Active mock data is populated for Gujarat, Maharashtra, Delhi, and Uttar Pradesh.
// The others will fall back to an empty state mockup to simulate a live database mapping.
export const STATE_DASHBOARD_DATA = {
  "Gujarat": {
    metrics: {
      totalRequests: 3824,
      activeHotspots: 18,
      topSector: "Water Infrastructure",
      topSectorColor: "text-blue-400 bg-blue-500/10 border-blue-500/30"
    },
    priorities: [
      {
        id: "guj-1",
        rank: 1,
        title: "Saurashtra Water Canal Blockage & Leakage",
        score: 95,
        complaints: 342,
        category: "Water Supply",
        whyAI: "Critical pipeline damage has cut off potable water supply to 14 villages in the Morbi district. Alternative water source is 16 kilometers away, causing residents to purchase privatized water tankers.",
        censusChecklist: [
          { label: "Population Impact Density", value: "850 people/sq km", status: "Critical" },
          { label: "Water Scarcity Index", value: "9.2/10", status: "Critical" },
          { label: "Health Index parameter (waterborne disease cases)", value: "32 reported (last 14 days)", status: "Warning" },
          { label: "Alternative Source Distance", value: "16 km", status: "Critical" }
        ]
      },
      {
        id: "guj-2",
        rank: 2,
        title: "Ahmedabad-Rajkot Highway Potholes & Lane Gaps",
        score: 87,
        complaints: 198,
        category: "Roads & Transport",
        whyAI: "Severe potholes on the arterial highway connecting twin business hubs have caused 3 major accidents in the past week. Impedes local transport of raw industrial materials.",
        censusChecklist: [
          { label: "Daily Traffic Volume", value: "12,500+ commercial vehicles", status: "High" },
          { label: "Accident Rate Metric", value: "4.5x regional baseline", status: "Critical" },
          { label: "Average Commute Delay", value: "35 minutes", status: "Warning" },
          { label: "Pavement Condition Index (PCI)", value: "28/100", status: "Critical" }
        ]
      },
      {
        id: "guj-3",
        rank: 3,
        title: "Primary Health Center Staff Shortage - Anand Constituency",
        score: 79,
        complaints: 112,
        category: "Healthcare",
        whyAI: "Nearest secondary care facility is 26km away. The local center currently runs with 1 Nurse and no attending Doctor, leaving maternal care services severely restricted.",
        censusChecklist: [
          { label: "Doctor-to-Patient Ratio", value: "1 : 7,500 (ideal is 1 : 1,000)", status: "Critical" },
          { label: "Maternal Health Scoping", value: "Zero active prenatal facilities", status: "Critical" },
          { label: "Infant Care Rank", value: "Lower 20% in State Index", status: "Warning" }
        ]
      }
    ],
    map: {
      center: [22.2587, 71.1924], // Center coordinates of Gujarat roughly
      zoom: 7,
      hotspots: [
        { id: "h1", lat: 35, lng: 25, severity: "severe", label: "Saurashtra Pipe Leak", complaints: 342 },
        { id: "h2", lat: 48, lng: 32, severity: "severe", label: "Highway Pits (NH-8)", complaints: 198 },
        { id: "h3", lat: 55, lng: 60, severity: "moderate", label: "Anand PHC Staff", complaints: 112 },
        { id: "h4", lat: 20, lng: 45, severity: "moderate", label: "Vadodara Power Fluctuations", complaints: 88 }
      ],
      gaps: [
        { id: "g1", lat: 30, lng: 20, deficiency: "Water Filtration Plant", gapScore: "92/100" },
        { id: "g2", lat: 45, lng: 70, deficiency: "Maternal Care Clinic", gapScore: "81/100" }
      ],
      proposed: [
        { id: "p1", lat: 40, lng: 50, project: "Smart RO Drinking Station", budget: "₹18 Lakhs" },
        { id: "p2", lat: 60, lng: 30, project: "Anand PHC Medical Quarter", budget: "₹35 Lakhs" }
      ]
    }
  },
  "Maharashtra": {
    metrics: {
      totalRequests: 5490,
      activeHotspots: 26,
      topSector: "Urban Sanitation",
      topSectorColor: "text-amber-400 bg-amber-500/10 border-amber-500/30"
    },
    priorities: [
      {
        id: "mah-1",
        rank: 1,
        title: "Kurla Transit Water Pipeline Fracture",
        score: 94,
        complaints: 520,
        category: "Water Supply",
        whyAI: "Water main rupture on Kurla Road has flooded surrounding alleys, disrupting fresh water supply to 8,000 households. Highly dense ward requires instant excavation and restoration.",
        censusChecklist: [
          { label: "Population Impact Density", value: "24,000 people/sq km", status: "Critical" },
          { label: "Daily Water Supply Failure", value: "2.4 Million Liters Lost", status: "Critical" },
          { label: "Gastrointestinal cases rising", value: "18 hospitalizations (last 5 days)", status: "Warning" }
        ]
      },
      {
        id: "mah-2",
        rank: 2,
        title: "Sion Skilling and Vocational Training Hub Upgrade",
        score: 88,
        complaints: 285,
        category: "Education & Jobs",
        whyAI: "Youth unemployment in the local ward stands at 14%. The existing Industrial Training Institute (ITI) has outdated machinery (1995 vintage) and zero active placements with modern companies.",
        censusChecklist: [
          { label: "Youth Unemployment", value: "14.2% (state average is 6%)", status: "Critical" },
          { label: "Lab Equipment Efficiency", value: "12% diagnostic test standard", status: "Critical" },
          { label: "Annual Graduating Students", value: "480 tech apprentices", status: "Normal" }
        ]
      },
      {
        id: "mah-3",
        rank: 3,
        title: "Dharavi Primary School Roof & Structural Failure",
        score: 81,
        complaints: 180,
        category: "Education",
        whyAI: "Monsoon leakage has compromised structural integrity of 4 major classrooms in Block B. Rainwater logging forces children to study in shifts or under plastic sheets.",
        censusChecklist: [
          { label: "Child Density per Class", value: "54 kids (limit is 30)", status: "Critical" },
          { label: "Roof Damage Index", value: "Grade IV Corrosive Damage", status: "Critical" },
          { label: "Sanitation Safety Index", value: "Zero functional toilets in Block B", status: "Critical" }
        ]
      }
    ],
    map: {
      center: [19.0760, 72.8777],
      zoom: 10,
      hotspots: [
        { id: "h10", lat: 30, lng: 32, severity: "severe", label: "Kurla Pipeline Leak", complaints: 520 },
        { id: "h11", lat: 45, lng: 48, severity: "severe", label: "Sion ITI Hub Outdates", complaints: 285 },
        { id: "h12", lat: 50, lng: 20, severity: "severe", label: "Dharavi School Hazard", complaints: 180 },
        { id: "h13", lat: 25, lng: 55, severity: "moderate", label: "Chembur Nallah Overflow", complaints: 92 }
      ],
      gaps: [
        { id: "g10", lat: 38, lng: 26, deficiency: "Sewerage Pump Station", gapScore: "95/100" },
        { id: "g11", lat: 60, lng: 60, deficiency: "Pedestrian Skywalk", gapScore: "78/100" }
      ],
      proposed: [
        { id: "p10", lat: 33, lng: 40, project: "Stormwater Drainage Vault", budget: "₹1.2 Crores" },
        { id: "p11", lat: 52, lng: 18, project: "Green Primary School Block", budget: "₹45 Lakhs" }
      ]
    }
  },
  "Delhi": {
    metrics: {
      totalRequests: 4120,
      activeHotspots: 21,
      topSector: "Air & Public Health",
      topSectorColor: "text-red-400 bg-red-500/10 border-red-500/30"
    },
    priorities: [
      {
        id: "del-1",
        rank: 1,
        title: "Smog Tower Maintenance & Filter Replacement (Dwarka)",
        score: 93,
        complaints: 410,
        category: "Environment",
        whyAI: "Smog purification filters have been clogged for 3 months. Local AQI averages 320 (Very Poor). Restoring it reduces particulate concentration in a 1km radius affecting 50,000 residents.",
        censusChecklist: [
          { label: "AQI Measurement", value: "320 PM2.5 avg", status: "Critical" },
          { label: "Population Intake Cohort", value: "50,000 residents", status: "Warning" },
          { label: "Respiratory Illness Cases", value: "+300% in local clinics", status: "Critical" }
        ]
      },
      {
        id: "del-2",
        rank: 2,
        title: "Waste Landfill Drainage Overflow - Ghazipur Border",
        score: 89,
        complaints: 312,
        category: "Sanitation",
        whyAI: "Toxic leachate from the Ghazipur landfill has seeped into nearby groundwater supply channels. Acidic drainage overflows onto main market roads during local rain showers.",
        censusChecklist: [
          { label: "Groundwater Toxicity Index", value: "pH 5.1, Lead counts high", status: "Critical" },
          { label: "Local Traders Impact", value: "1,200 shops daily disrupted", status: "Warning" },
          { label: "Heavy Metal Residue", value: "Detected in domestic borewells", status: "Critical" }
        ]
      }
    ],
    map: {
      center: [28.6139, 77.2090],
      zoom: 11,
      hotspots: [
        { id: "h20", lat: 40, lng: 30, severity: "severe", label: "Dwarka Filter Clog", complaints: 410 },
        { id: "h21", lat: 60, lng: 55, severity: "severe", label: "Ghazipur Seepage", complaints: 312 },
        { id: "h22", lat: 30, lng: 50, severity: "moderate", label: "Karol Bagh Parking Choke", complaints: 140 }
      ],
      gaps: [
        { id: "g20", lat: 50, lng: 40, deficiency: "Toxic Filtration Barrier", gapScore: "90/100" }
      ],
      proposed: [
        { id: "p20", lat: 43, lng: 33, project: "Modernized Gas Flare Tower", budget: "₹85 Lakhs" }
      ]
    }
  },
  "Uttar Pradesh": {
    metrics: {
      totalRequests: 7890,
      activeHotspots: 32,
      topSector: "Rural Roads & Access",
      topSectorColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
    },
    priorities: [
      {
        id: "up-1",
        rank: 1,
        title: "Un-electrified Primary School - Ballia District",
        score: 96,
        complaints: 620,
        category: "Electricity",
        whyAI: "Students endure extreme heat (44°C) without fans. Digital literacy lab funded under government grant cannot be used, leading to wasted tech resources.",
        censusChecklist: [
          { label: "Temperature Peak", value: "44.5°C in Classrooms", status: "Critical" },
          { label: "Digital Hardware Status", value: "10 computer terminals locked", status: "Warning" },
          { label: "Student Dropout Rate", value: "24% year-on-year", status: "Critical" }
        ]
      },
      {
        id: "up-2",
        rank: 2,
        title: "Ganga River Bridge Approach Collapse - Unnao Rural Route",
        score: 91,
        complaints: 480,
        category: "Roads & Bridges",
        whyAI: "Bridge link was washed away by floods, forcing a detour of 22km. Inhibits agricultural transport of fresh grains to central mandis.",
        censusChecklist: [
          { label: "Detour Penalty", value: "22 km additional distance", status: "Critical" },
          { label: "Logistical Cost Increase", value: "+30% per quintal weight", status: "Warning" },
          { label: "Affected Villages", value: "18 Gram Panchayats", status: "Critical" }
        ]
      }
    ],
    map: {
      center: [26.8467, 80.9462],
      zoom: 7,
      hotspots: [
        { id: "h30", lat: 40, lng: 60, severity: "severe", label: "Ballia School Blackout", complaints: 620 },
        { id: "h31", lat: 45, lng: 30, severity: "severe", label: "Unnao Bridge approach washed Out", complaints: 480 }
      ],
      gaps: [
        { id: "g30", lat: 38, lng: 55, deficiency: "Electric Grid Extension", gapScore: "96/100" }
      ],
      proposed: [
        { id: "p30", lat: 44, lng: 28, project: "Reinforced Approach Causeway", budget: "₹1.4 Crores" }
      ]
    }
  }
};

// Initial Mock Recent Submissions for Resident Tracking
export const INITIAL_SUBMISSIONS = {
  "Gujarat": [
    { id: "sub-1", title: "Streetlight repair near Sector 4 (Morbi)", icon: "light", category: "Electricity", date: "July 2, 2026", status: "In Progress", statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20" },
    { id: "sub-2", title: "Primary Health Center staff shortage (Anand)", icon: "health", category: "Healthcare", date: "June 28, 2026", status: "Under Review", statusColor: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20" }
  ],
  "Maharashtra": [
    { id: "sub-3", title: "Water line garbage clutter (Sion ITI lane)", icon: "water", category: "Sanitation", date: "July 3, 2026", status: "In Progress", statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20" },
    { id: "sub-4", title: "Open manhole hazard (Kurla Link Rd)", icon: "safety", category: "Sanitation", date: "June 25, 2026", status: "Under Review", statusColor: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20" }
  ],
  "Delhi": [
    { id: "sub-5", title: "Smog tower filter check request", icon: "air", category: "Environment", date: "July 1, 2026", status: "Under Review", statusColor: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20" }
  ],
  "Uttar Pradesh": [
    { id: "sub-6", title: "Pothole repair at school gate (Ballia)", icon: "road", category: "Roads", date: "July 2, 2026", status: "In Progress", statusColor: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20" }
  ]
};
