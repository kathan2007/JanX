import React, { useState, useRef, useEffect } from "react";
import { auth } from "../firebase";
import axios from "axios";
import {
  HelpCircle,
  Mic,
  MicOff,
  FileText,
  Image as ImageIcon,
  Upload,
  Send,
  CheckCircle,
  FileCode,
  Flame,
  AlertTriangle,
  Clock,
  Trash2,
  Camera
} from "lucide-react";
import { INITIAL_SUBMISSIONS } from "../data/mockData";

export default function ResidentPortal({ selectedState, onTriggerAuthModal, currentUser }) {
  // Form State
  const [textInput, setTextInput] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [audioFile, setAudioFile] = useState(null);
  const [selectedSector, setSelectedSector] = useState("WATER");

  // UI Indicators
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tokenPreview, setTokenPreview] = useState("");
  const [showTokenDebug, setShowTokenDebug] = useState(false);

  // Grievances tracker sector filter
  const [trackSectorFilter, setTrackSectorFilter] = useState("ALL");

  // Local state tracking submissions for this session
  const [mySubmissions, setMySubmissions] = useState({});

  // Audio recording timer ref
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load initial submissions from mock data
  useEffect(() => {
    setMySubmissions(INITIAL_SUBMISSIONS);
  }, []);

  // Voice recording toggle simulator
  const toggleRecording = () => {
    if (isRecording) {
      clearInterval(timerRef.current);
      setIsRecording(false);
      // Create a mock audio file for the payload
      const mockAudio = new File(["mock-audio-data"], `${selectedState.toLowerCase()}-voice-request.wav`, {
        type: "audio/wav",
      });
      setAudioFile(mockAudio);
    } else {
      setRecordTime(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        setRecordTime((prev) => prev + 1);
      }, 1000);
    }
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Image upload handling
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAudio = () => {
    setAudioFile(null);
    setRecordTime(0);
  };

  const handleFormSubmit = async (e, injectedUser = null) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMessage("");
    setToastMessage("");

    // Validation
    if (!textInput && !audioFile && !imageFile) {
      setErrorMessage("Please input some content (Type text, record voice, or attach an image).");
      return;
    }

    const user = injectedUser || auth.currentUser || currentUser;
    if (!user) {
      // Pass a callback so after sign-in the request auto-fires with the resolved user
      onTriggerAuthModal((resolvedUser) => handleFormSubmit(null, resolvedUser));
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch fresh Firebase ID Token (force refresh)
      // Sandbox fallback: use the backend's accepted bypass token when real Firebase is unavailable
      const SANDBOX_TOKEN = "mock-jwt-sandbox-token-string-12345";
      let firebaseIdToken = SANDBOX_TOKEN;
      if (user.getIdToken) {
        try {
          firebaseIdToken = await user.getIdToken(true);
          setTokenPreview(firebaseIdToken.substring(0, 32) + "...");
        } catch (tokErr) {
          console.warn("Token fetch failed, using sandbox bypass token.");
          firebaseIdToken = SANDBOX_TOKEN;
          setTokenPreview("sandbox-bypass-active");
        }
      }

      // 2. Prepare FormData payload
      const formData = new FormData();
      formData.append("state", selectedState);
      formData.append("sector", selectedSector);
      if (textInput) formData.append("text", textInput);
      if (audioFile) formData.append("audio", audioFile);
      if (imageFile) formData.append("image", imageFile);

      // Image is sent directly to Django as multipart — backend saves to media/complaints/
      // and returns image_url in the response. Use base64 preview for instant local UI only.
      let uploadedImageUrl = imagePreview || null;
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://janx.onrender.com";
      let categoryResponse = "Infrastructure Gap";

      try {
        // 3. Axios POST call directly to live Render server
        const response = await axios.post(`${API_BASE_URL}/api/submit-request/`, formData, {
          headers: {
            Authorization: `Bearer ${firebaseIdToken}`,
            "Content-Type": "multipart/form-data",
          },
          timeout: 60000, // ⏱️ 60 seconds backup for Render spin-up
        });

        categoryResponse = response.data?.category || "Request Accepted";
        if (response.data?.image_url) uploadedImageUrl = response.data.image_url;

        // 4. Trigger success notification (If API Call succeeds)
        setToastMessage("Thank you! Your request has been analyzed and routed to the MP's Prioritization Desk.");

        // 5. Reset form elements after a delay
        setTimeout(() => {
          setTextInput("");
          setImageFile(null);
          setImagePreview(null);
          setAudioFile(null);
          setRecordTime(0);
        }, 500);

      } catch (axiosError) {
        console.warn("Axios API Call Failed. Simulating local routing fallback since backend server is not active.", axiosError);

        // 6. Fallback local categorizer logic based on input keywords
        const lowerText = textInput.toLowerCase();
        if (lowerText.includes("water") || lowerText.includes("canal") || lowerText.includes("pipe")) {
          categoryResponse = "Water Supply";
        } else if (lowerText.includes("road") || lowerText.includes("pothole") || lowerText.includes("highway")) {
          categoryResponse = "Roads & Transport";
        } else if (lowerText.includes("school") || lowerText.includes("study") || lowerText.includes("roof") || lowerText.includes("education")) {
          categoryResponse = "Education";
        } else if (lowerText.includes("clinic") || lowerText.includes("health") || lowerText.includes("doctor") || lowerText.includes("hospital")) {
          categoryResponse = "Healthcare";
        } else {
          categoryResponse = "General Grievance";
        }

        setErrorMessage(axiosError.message || "Failed to submit request to server. Used local fallback.");
      }

    } catch (outerError) {
      console.error("Outer submission block error:", outerError);
      setErrorMessage("An unexpected error occurred during preparation.");
    } finally {
      setLoading(false);
    }
  };


  const currentIssuesList = mySubmissions[selectedState] || [];
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in text-slate-800">

      {/* Toast Success Notifier */}
      {toastMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-250 text-emerald-800 shadow-md flex items-start gap-3 animate-slide-up">
          <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Submission Successful</h4>
            <p className="text-xs text-slate-700 mt-0.5">{toastMessage}</p>
            {tokenPreview && (
              <span className="inline-block mt-2 text-[10px] bg-emerald-100 px-2 py-0.5 rounded font-mono text-emerald-850">
                JWT Auth Token Sent: {tokenPreview}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-250 text-amber-900 shadow-md flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm font-semibold">
            {errorMessage}
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Submit a New Development Request
        </h1>
        <p className="mt-3 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Voice, Text, or Photo — share what your constituency needs in <span className="font-bold text-indigo-850">{selectedState}</span>.
        </p>
        <span className="inline-flex mt-4 items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700">
          Submitting for: <span className="underline">{selectedState}</span>
        </span>
      </div>

      {/* Multimodal Ingestion Card Section Heading */}
      <h2 className="text-lg font-bold text-indigo-900 mb-3 ml-1 tracking-tight">
        Multi-Modal Ingest Card
      </h2>

      {/* Multimodal Ingestion Card */}
      <form onSubmit={handleFormSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden mb-12">
        <div className="p-6 sm:p-8 space-y-8">

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Direct Voice Input Panel */}
            <div className="flex flex-col items-center justify-center p-6 border border-slate-100 rounded-xl bg-slate-50 relative group min-h-[220px]">
              <div className="text-center mb-4">
                <span className="text-sm font-bold text-slate-800 block">Tap to Speak (Any Language/Hinglish)</span>
              </div>

              {/* Record Button Container with pulsating ring */}
              <div className="relative flex items-center justify-center h-28 w-28 mb-3">
                {isRecording && (
                  <>
                    <div className="absolute inset-0 rounded-full bg-rose-500/30 animate-ping opacity-75 pointer-events-none" />
                    <div className="absolute inset-2 rounded-full bg-rose-405/20 animate-pulse pointer-events-none" />
                  </>
                )}

                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`h-20 w-20 rounded-full flex items-center justify-center shadow-lg transition-all focus:outline-none cursor-pointer ${isRecording
                    ? "bg-gradient-to-tr from-rose-600 to-rose-500 text-white ring-4 ring-rose-350/50 animate-pulse scale-105 shadow-rose-300/40"
                    : audioFile
                      ? "bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white focus:ring-2 focus:ring-emerald-500 shadow-emerald-200/50"
                      : "bg-gradient-to-tr from-indigo-900 via-indigo-850 to-indigo-650 text-white hover:scale-105 shadow-indigo-600/25"
                    }`}
                >
                  {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </button>
              </div>

              <div className="text-center">
                {isRecording ? (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-rose-600 animate-pulse block">RECORDING NOW</span>
                    <span className="text-sm font-mono text-slate-700 font-bold">{formatTime(recordTime)}</span>
                  </div>
                ) : audioFile ? (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-emerald-650 block">VOICE CAPTURED</span>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <span className="text-xs text-slate-500 truncate max-w-[120px] font-mono">
                        {audioFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={removeAudio}
                        className="text-red-500 hover:text-red-700 cursor-pointer"
                        title="Delete voice recording"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 max-w-[170px] leading-relaxed">
                    Tap the microphone icon above and start recording.
                  </p>
                )}
              </div>
            </div>

            {/* Direct Text Input Panel */}
            <div className="md:col-span-2 flex flex-col p-6 border border-slate-105 rounded-xl bg-slate-50 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800">Type Complaint Description</span>
                <FileText className="h-5 w-5 text-indigo-900" />
              </div>

              {/* Sector / Department Dropdown */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wide">
                  Concerned Department / Sector
                </label>
                <div className="relative">
                  <select
                    value={selectedSector}
                    onChange={(e) => setSelectedSector(e.target.value)}
                    className="w-full appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-8 py-2.5 text-sm text-slate-700 font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 cursor-pointer transition-all hover:border-indigo-300 shadow-sm"
                  >
                    <option value="WATER">🚰 Water Infrastructure &amp; Supply</option>
                    <option value="ROAD">🛣️ Road Damage &amp; Public Transport</option>
                    <option value="HEALTH">🏥 Public Health &amp; Medical Centers</option>
                    <option value="EDUCATION">📚 Education, Literacy &amp; Schools</option>
                    <option value="ELECTRICITY">⚡ Power Supply &amp; Grid Management</option>
                    <option value="SANITATION">🧹 Public Sanitation &amp; Cleanliness</option>
                    <option value="WASTE">🗑️ Waste Management &amp; Garbage Disposal</option>
                    <option value="SAFETY">🛡️ Public Safety &amp; Law Enforcement</option>
                    <option value="WOMEN_CHILD">👶 Women &amp; Child Development</option>
                    <option value="ENVIRONMENT">🌱 Environment, Parks &amp; Pollution</option>
                    <option value="AGRICULTURE">🌾 Agriculture &amp; Rural Development</option>
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
                </div>
              </div>

              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type here in detail... E.g., Major pothole at the crossroad leading to MG Road is causing daily traffic jams and recent minor vehicle crashes."
                className="w-full flex-1 p-3 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none min-h-[96px] placeholder-slate-400 font-medium transition-all"
              />
            </div>

          </div>

          {/* Photo upload zone panel */}
          <div className="space-y-2">
            <span className="text-sm font-bold text-slate-800 block ml-1">Attach Photo/Evidence</span>
            <div className="border border-dashed border-slate-300 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
                id="request-image-upload"
              />
              {imagePreview ? (
                <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-20 w-28 rounded-lg overflow-hidden border border-slate-200 shadow-sm shrink-0">
                      <img src={imagePreview} alt="Attached Preview" className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold truncate max-w-[200px] text-slate-800">
                        {imageFile?.name}
                      </h5>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {(imageFile?.size / 1024).toFixed(1)} KB image loaded
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="flex items-center gap-1 text-xs font-bold text-red-655 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Photo
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="request-image-upload"
                  className="flex flex-col items-center justify-center p-8 cursor-pointer group"
                >
                  <div className="p-3 bg-white rounded-full shadow-sm border border-slate-202 group-hover:scale-105 transition-transform duration-300">
                    <Camera className="h-6 w-6 text-indigo-900" />
                  </div>
                  <span className="block mt-4 text-sm font-semibold text-slate-705 group-hover:text-indigo-900">
                    drag & drop or click to upload
                  </span>
                  <span className="block mt-1 text-xs text-slate-500">
                    Supports JPG, PNG evidence photos of local infrastructural concerns
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Full-width solid indigo Submit Complaint action */}
          <div className="border-t border-slate-100 pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-indigo-900 hover:bg-indigo-950 text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.99] disabled:bg-indigo-300 flex items-center justify-center gap-2 cursor-pointer text-base"
            >
              <Send className="h-5 w-5" />
              {loading ? "Analyzing and Routing..." : "Submit Complaint"}
            </button>

            <div className="flex items-center justify-center gap-2 mt-4 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium">
                {currentUser
                  ? `Session active: ${currentUser.isAnonymous ? "Anonymous Resident Portal" : currentUser.email}`
                  : "Requires one-click resident authentication"}
              </span>
            </div>
          </div>

        </div>

        {/* Debug Token View Accordion */}
        {currentUser && (
          <div className="bg-slate-50 border-t border-slate-100 text-xs px-6 py-3">
            <button
              type="button"
              onClick={() => setShowTokenDebug(!showTokenDebug)}
              className="flex items-center gap-1.5 text-slate-550 hover:text-indigo-900 font-semibold cursor-pointer"
            >
              <FileCode className="h-3.5 w-3.5" />
              {showTokenDebug ? "Hide API Auth Payload Details" : "View JWT Bearer Token Payload"}
            </button>

            {showTokenDebug && (
              <div className="mt-3 p-3 bg-slate-900 text-slate-350 font-mono text-[10px] rounded-lg border border-slate-800 leading-relaxed overflow-x-auto">
                <p className="text-blue-400 font-bold mb-1">// API REQUEST HEADERS</p>
                <p>Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6InRva2VuX21vY2sifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vamFueC1jaXZpYyIsInN1YiI6InVzZXJfYW5vbnltdW91c19pZCIsImF1ZCI6ImphbngtY2l2aWMiLCJpYXQiOjE3NDIwMDAwMDB9...</p>

                <p className="text-blue-400 font-bold mt-3 mb-1">// API FORM DATA PAYLOAD</p>
                <p>{"{"}</p>
                <p className="pl-4">"state": "{selectedState}",</p>
                <p className="pl-4">"text": "{textInput || "None Provided"}",</p>
                <p className="pl-4">"audio": {audioFile ? `File(${audioFile.name})` : "null"},</p>
                <p className="pl-4">"image": {imageFile ? `File(${imageFile.name})` : "null"}</p>
                <p>{"}"}</p>
              </div>
            )}
          </div>
        )}
      </form>

      {/* 3. My Tracked Issues Panel */}
      <div className="space-y-4">
        {/* Header row with filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Your Recent Submissions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-updated for <span className="font-semibold text-indigo-700">{selectedState}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter by Sector:</label>
            <div className="relative">
              <select
                value={trackSectorFilter}
                onChange={(e) => setTrackSectorFilter(e.target.value)}
                className="appearance-none bg-white border border-slate-300 rounded-lg pl-3 pr-7 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-indigo-400 cursor-pointer shadow-sm"
              >
                <option value="ALL">All Departments</option>
                <option value="WATER">🚰 Water</option>
                <option value="ROAD">🛣️ Roads</option>
                <option value="HEALTH">🏥 Health</option>
                <option value="EDUCATION">📚 Education</option>
                <option value="ELECTRICITY">⚡ Electricity</option>
                <option value="SANITATION">🧹 Sanitation</option>
                <option value="WASTE">🗑️ Waste</option>
                <option value="SAFETY">🛡️ Safety</option>
                <option value="WOMEN_CHILD">👶 Women &amp; Child</option>
                <option value="ENVIRONMENT">🌱 Environment</option>
                <option value="AGRICULTURE">🌾 Agriculture</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">▾</span>
            </div>
          </div>
        </div>

        {(() => {
          const filteredIssues = currentIssuesList.filter(
            (issue) => trackSectorFilter === "ALL" || issue.sector === trackSectorFilter
          );

          if (filteredIssues.length === 0) return (
            <div className="p-8 text-center border-2 border-dashed border-slate-205 rounded-2xl bg-white/50 text-slate-455">
              <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-sm">
                {currentIssuesList.length === 0
                  ? `No issues tracked yet in ${selectedState}.`
                  : "No submissions match this sector filter."}
              </p>
              <p className="text-xs text-slate-450 mt-1">
                {currentIssuesList.length === 0
                  ? "Submit your first complaint above to watch it reflect here."
                  : "Try selecting a different department from the filter above."}
              </p>
            </div>
          );

          return (
            <>
              {/* Desktop Table: Sector | Title | Date | Status */}
              <div className="hidden md:block overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50/75 select-none">
                    <tr>
                      <th className="px-5 py-3.5 font-bold text-slate-600">Sector</th>
                      <th className="px-5 py-3.5 font-bold text-slate-600">Title</th>
                      <th className="px-5 py-3.5 font-bold text-slate-600">Date</th>
                      <th className="px-5 py-3.5 font-bold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredIssues.map((issue) => (
                      <tr key={issue.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4">
                          <span className="inline-block text-[10px] font-bold uppercase tracking-wide bg-indigo-50 border border-indigo-100 text-indigo-600 px-2 py-0.5 rounded whitespace-nowrap">
                            {issue.sector || issue.category || "General"}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900">{issue.title}</td>
                        <td className="px-5 py-4 text-slate-500 font-medium whitespace-nowrap">{issue.date}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-block px-3 py-1 text-xs font-bold rounded-full border ${issue.status === "In Progress"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : issue.status === "Under Review"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}>
                            {issue.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View: Stacked Card List */}
              <div className="block md:hidden space-y-4">
                {filteredIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded">
                          {issue.sector || issue.category || "General"}
                        </span>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${issue.status === "In Progress"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : issue.status === "Under Review"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}>
                          {issue.status}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                        {issue.title}
                      </h4>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Filed in: <b>{selectedState}</b></span>
                      <span>{issue.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}
      </div>

    </div>
  );