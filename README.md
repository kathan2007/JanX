# 🏛️ JanX — AI-Powered Civic Ingestion & Priority Decision Engine

JanX is a next-generation, multi-modal civic grievance platform that bridges the communication and data gap between citizens and government representatives (MPs)[span_1](start_span)[span_1](end_span). By leveraging state-of-the-art Generative AI pipelines and cloud data warehousing, JanX converts unstructured, multi-lingual civic complaints (text, audio, image) into structured, mathematically prioritized, and data-driven action items for public administrators[span_2](start_span)[span_2](end_span).

---

## 🔴 The Core Problem It Solves
* **Language Barriers:** Over 820 million non-English speakers face exclusion as legacy systems primarily accept English text inputs[span_3](start_span)[span_3](end_span).
* **Administrative Chaos:** Public representatives (MPs) get flooded with millions of unorganized complaints daily via WhatsApp or letters with zero triage capabilities[span_4](start_span)[span_4](end_span).
* **The Accountability Gap:** Citizens remain entirely in the dark regarding the progress or live status of their submitted complaints[span_5](start_span)[span_5](end_span).
* **Rural Infrastructure Gaps:** Remote areas are consistently neglected due to a lack of structural data and geographic proximity multipliers[span_6](start_span)[span_6](end_span).

---

## ✅ JanX 3-Layer Architecture

### 1. Multi-Modal Ingestion (Resident Portal)
Citizens can effortlessly report localized infrastructure issues without any tech or language barriers[span_7](start_span)[span_7](end_span):
* **Multilingual Text & Hinglish:** Localized text processing[span_8](start_span)[span_8](end_span).
* **Voice Notes:** Real-time audio recordings in Hindi, Marathi, Tamil, and regional dialects, transcribed via **Google Cloud Speech-to-Text**[span_9](start_span)[span_9](end_span).
* **Photo Evidence:** Image uploads processed natively via **Gemini 1.5 Flash Vision** to extract contextual damage severity directly from visual assets[span_10](start_span)[span_10](end_span).

### 2. Intelligent AI Processing Pipeline (The Brain)
Every raw ingestion is processed sequentially through an automated, asynchronous backend pipeline[span_11](start_span)[span_11](end_span):
* **Structuring & Translation:** **Gemini 1.5 Pro** parses the unstructured input and maps it into a strict, validated English JSON schema containing the `category`, `location_node`, `state`, and an automated `severity_index` (1-10)[span_12](start_span)[span_12](end_span).
* **Vector Embeddings:** Summarized strings are vectorized using Google's **Text Embedding 004** into a 768-dimensional space for semantic clustering and duplicate checking[span_13](start_span)[span_13](end_span).
* **Cloud Streaming:** Data is securely streamed straight into a **Google BigQuery** data warehouse with automated Load Job API fallbacks to ensure zero data loss[span_14](start_span)[span_14](end_span).

### 3. MP Command Dashboard (Decision Engine)
A robust React analytics dashboard that aggregates individual entries into macro-level projects ordered by an objective optimization engine[span_15](start_span)[span_15](end_span):
* **Algorithmic Project Prioritization:** 
  $$\text{Priority Score} = 0.40 \times (\text{Complaint Density}) + 0.30 \times (\text{Distance to Facility}) + 0.30 \times (\text{Population Impact})$$
  * *Complaint Density:* Sourced from `citizen_complaints` ($\text{Volume} \times \text{Mean Severity}$)[span_16](start_span)[span_16](end_span).
  * *Distance to Facility:* Sourced from `infrastructure_gaps` to elevate remote zones[span_17](start_span)[span_17](end_span).
  * *Population Impact Factor:* Driven by dynamic regional `census_demographics`[span_18](start_span)[span_18](end_span).
* **AI Justification:** Gemini interprets the prioritizations and auto-generates a plain-English narrative explaining *why* a specific project demands immediate budget allocation[span_19](start_span)[span_19](end_span).
* **Geospatial Intelligence:** Interactive map utilizing **Leaflet.js** plotting dynamic layers: Hotspots (Red/Orange), Gaps (Cyan), and Proposed Sites (Green)[span_20](start_span)[span_20](end_span).

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, Vite 8, TailwindCSS v4, Leaflet.js, Firebase Auth, Lucide Icons, Axios[span_21](start_span)[span_21](end_span) |
| **Backend** | Django 4.2, Django REST Framework (DRF), Firebase Admin SDK, Gunicorn[span_22](start_span)[span_22](end_span) |
| **AI / ML** | Gemini 1.5 Pro, Gemini 1.5 Flash, Text Embedding 004, Google Cloud Speech-to-Text[span_23](start_span)[span_23](end_span) |
| **Data / DevOps** | Google BigQuery, Firebase Storage, Docker, Google Cloud Run[span_24](start_span)[span_24](end_span) |

---

## 🔐 Security Hardening
* **Identity Management:** State transitions and complaint submissions are strictly guarded via **Firebase JWT Authentication** to prevent malicious spamming[span_25](start_span)[span_25](end_span).
* **Database Security:** Cloud database operations inside BigQuery leverage parameterized SQL logic to completely mitigate injection vulnerabilities.

---

## 🚀 Future Roadmap
* **Phase 2 (Scale):** WhatsApp/SMS integration layer and expansion to 22 official regional languages[span_26](start_span)[span_26](end_span).
* **Phase 3 (AI):** Predictive analytics for infrastructural decay, satellite computer vision, and budget optimization AI[span_27](start_span)[span_27](end_span).
* **Phase 4 (Gov Integration):** Deep integrations with eDistrict, NITI Aayog, and localized Panchayats[span_28](start_span)[span_28](end_span).
* 
