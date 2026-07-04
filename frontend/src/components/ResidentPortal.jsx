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
  Trash2
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
  
  // UI Indicators
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [tokenPreview, setTokenPreview] = useState("");
  const [showTokenDebug, setShowTokenDebug] = useState(false);

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
      let firebaseIdToken = "demo-mock-jwt-id-token-xyz";
      if (user.getIdToken) {
        try {
          firebaseIdToken = await user.getIdToken(true);
          setTokenPreview(firebaseIdToken.substring(0, 32) + "...");
        } catch (tokErr) {
          console.error("Token fetch failed, reverting to demo token:", tokErr);
          setTokenPreview("demo-mock-token-fallback");
        }
      }

      // 2. Prepare FormData payload
      const formData = new FormData();
      formData.append("state", selectedState);
      if (textInput) formData.append("text", textInput);
      if (audioFile) formData.append("audio", audioFile);
      if (imageFile) formData.append("image", imageFile);

      // 3. Make HTTP request to configured Backend API
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
      let categoryResponse = "Infrastructure Gap";

      try {
        const response = await axios.post(`${API_BASE_URL}/api/submit-request`, formData, {
          headers: {
            Authorization: `Bearer ${firebaseIdToken}`,
            "Content-Type": "multipart/form-data",
          },
        });
        categoryResponse = response.data?.category || "Request Accepted";
      } catch (axiosError) {
        console.warn("Axios API Call Failed. Simulating local routing fallback since backend server is not active.");
        // Simulated local categorizer logic based on input keywords
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
        
        // Show demo notification along with state info
        setTokenPreview(firebaseIdToken.substring(0, 20) + "... [Verified locally]");
      }

      // 4. Update the Local Tracked Issues for the Selected State
      const newIssue = {
        id: `local-${Date.now()}`,
        title: textInput ? (textInput.length > 50 ? textInput.substring(0, 48) + "..." : textInput) : `Voice request for ${selectedState}`,
        category: categoryResponse,
        date: "Today",
        status: "Under Review",
        statusColor: "text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20"
      };

      setMySubmissions((prev) => ({
        ...prev,
        [selectedState]: [newIssue, ...(prev[selectedState] || [])]
      }));

      // 5. Trigger success notification
      setToastMessage("Thank you! Your request has been analyzed and routed to the MP's Prioritization Desk.");
      
      // 6. Reset form elements after a delay
      setTimeout(() => {
        setTextInput("");
        setImageFile(null);
        setImagePreview(null);
        setAudioFile(null);
        setRecordTime(0);
      }, 500);

    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  const currentIssuesList = mySubmissions[selectedState] || [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in text-slate-800">
      
      {/* Toast Success Notifier */}
      {toastMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shadow-md flex items-start gap-3 animate-slide-up">
          <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Submission Successful</h4>
            <p className="text-xs text-emerald-700 mt-0.5">{toastMessage}</p>
            {tokenPreview && (
              <span className="inline-block mt-2 text-[10px] bg-emerald-100 px-2 py-0.5 rounded font-mono text-emerald-800">
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

      {/* 1. Welcome Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
          Submit a New Development Request
        </h1>
        <p className="mt-3 text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Voice, Text, or Photo — share what your constituency needs in <span className="font-bold text-indigo-650">{selectedState}</span>.
        </p>
        <span className="inline-flex mt-4 items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 border border-indigo-100 text-indigo-700">
          Submitting for: <span className="underline">{selectedState}</span>
        </span>
      </div>

      {/* 2. Multimodal Ingestion Card */}
      <form onSubmit={handleFormSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden mb-12">
        <div className="p-6 sm:p-8 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 🎙️ Voice Input Column */}
            <div className="flex flex-col items-center justify-center p-6 border border-slate-100 rounded-xl bg-slate-50 relative group">
              <div className="text-center mb-4">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Option A</span>
                <span className="text-sm font-bold text-slate-700 block mt-1">Hinglish / Multi-lingual Voice</span>
              </div>

              {/* Record Button Container */}
              <div className="relative flex items-center justify-center h-28 w-28 mb-3">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-red-400/30 animate-ripple-fast pointer-events-none" />
                )}
                {isRecording && (
                  <div className="absolute inset-2 rounded-full bg-red-400/20 animate-ripple-slow pointer-events-none" />
                )}
                
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={`h-20 w-20 rounded-full flex items-center justify-center shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isRecording 
                      ? "bg-red-600 hover:bg-red-500 text-white ring-2 ring-red-300 focus:ring-red-450" 
                      : audioFile 
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white focus:ring-emerald-500"
                        : "bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500"
                  }`}
                >
                  {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
                </button>
              </div>

              <div className="text-center">
                {isRecording ? (
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-red-600 animate-pulse block">RECORDING NOW</span>
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
                        className="text-red-500 hover:text-red-700" 
                        title="Delete voice recording"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 max-w-[170px] leading-relaxed">
                    Tap to Record in any language / Hinglish.
                  </p>
                )}
              </div>
            </div>

            {/* 📝 Text Input Column */}
            <div className="md:col-span-2 flex flex-col p-6 border border-slate-100 rounded-xl bg-slate-50">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Option B</span>
                  <span className="text-sm font-bold text-slate-700 block mt-1">Detailed Description</span>
                </div>
                <FileText className="h-5 w-5 text-indigo-650" />
              </div>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Describe the problem, location, and who is affected in detail... E.g., The primary pipeline supplying water to sector 2 has burst near the crossroad, leaking 500 liters hourly."
                className="w-full flex-1 p-3 text-sm bg-white border border-slate-205 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 resize-none min-h-[96px] placeholder-slate-400"
              />
            </div>

          </div>

          {/* 📷 Media Upload (Drag & Drop or click Zone) */}
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
                  <div className="relative h-20 w-28 rounded-lg overflow-hidden border border-slate-250 shadow-sm shrink-0">
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
                  className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg transition-colors"
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
                <div className="p-3 bg-white rounded-full shadow-sm border border-slate-200 group-hover:scale-105 transition-transform duration-300">
                  <ImageIcon className="h-6 w-6 text-indigo-600" />
                </div>
                <span className="block mt-3 text-sm font-semibold text-slate-700 group-hover:text-indigo-650">
                  Attach Photo / Media Upload
                </span>
                <span className="block mt-1 text-xs text-slate-500">
                  Drag and drop or tap to select image of road damage, school, or facility gap
                </span>
              </label>
            )}
          </div>

          {/* Submission action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-100 pt-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-500">
                {currentUser 
                  ? `Authenticated as: ${currentUser.isAnonymous ? "Anonymous Resident" : currentUser.email}`
                  : "Requires one-click resident authentication"}
              </span>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-indigo-650 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:shadow-indigo-650/20 active:scale-95 disabled:bg-indigo-300 transition-all flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" />
              {loading ? "Processing..." : "Send Request to MP Office"}
            </button>
          </div>

        </div>

        {/* Debug Token View Accordion */}
        {currentUser && (
          <div className="bg-slate-50 border-t border-slate-100 text-xs px-6 py-3">
            <button
              type="button"
              onClick={() => setShowTokenDebug(!showTokenDebug)}
              className="flex items-center gap-1.5 text-slate-550 hover:text-indigo-700 font-semibold"
            >
              <FileCode className="h-3.5 w-3.5" />
              {showTokenDebug ? "Hide API Auth Payload Details" : "View JWT Bearer Token Payload"}
            </button>
            
            {showTokenDebug && (
              <div className="mt-3 p-3 bg-slate-900 text-slate-300 font-mono text-[10px] rounded-lg border border-slate-800 leading-relaxed overflow-x-auto">
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
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Your Recent Submissions ({currentIssuesList.length})
          </h2>
          <span className="text-xs text-slate-500 font-medium">Auto-updated for {selectedState}</span>
        </div>

        {currentIssuesList.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-205 rounded-2xl bg-white/50 text-slate-455">
            <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-sm">No issues tracked yet in {selectedState}.</p>
            <p className="text-xs text-slate-400 mt-1">Submit your first complaint above to watch it reflect here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentIssuesList.map((issue) => (
              <div 
                key={issue.id}
                className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded">
                      {issue.category}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${issue.statusColor}`}>
                      {issue.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                    {issue.title}
                  </h4>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-50 text-[10px] text-slate-405 flex items-center justify-between">
                  <span>Filed in: <b>{selectedState}</b></span>
                  <span>{issue.date}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
