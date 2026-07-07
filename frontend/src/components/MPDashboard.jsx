import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { STATE_DASHBOARD_DATA } from "../data/mockData";
import { 
  Users, 
  AlertOctagon, 
  Activity, 
  MapPin, 
  Layers, 
  FileCheck2, 
  Cpu, 
  ChevronUp, 
  ChevronDown, 
  HelpCircle,
  FolderLock,
  CheckCircle,
  X,
  ImageOff,
  RefreshCw,
  Inbox,
  ShieldAlert,
  Clock
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function MPDashboard({ selectedState, currentUser, onLogOut }) {
  const stateData = STATE_DASHBOARD_DATA[selectedState];
  
  // Local priorities list state to handle interactive status modifications
  const [priorities, setPriorities] = useState([]);
  const [activeCardId, setActiveCardId] = useState(null);
  const [mapLayer, setMapLayer] = useState("hotspots"); // "hotspots" | "gaps" | "proposed"
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selectedSector, setSelectedSector] = useState("ALL");

  // 🔥 Live Complaint Feed from BigQuery (unified)
  const [complaints, setComplaints] = useState([]); // used by tab "feed" + map markers
  const [liveComplaints, setLiveComplaints] = useState([]); // used by bottom Live Feed section
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState("");

  // Complaint detail modal
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [activeTab, setActiveTab] = useState("analytics"); // "analytics" | "feed"

  // Refs for Leaflet instantiation
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerGroupRef = useRef(null);


  // Utility: format ISO date string → "06 Jul 2026 • ⏰ 03:17 PM"
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "N/A";
    const date = new Date(dateTimeString);
    const formattedDate = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const formattedTime = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${formattedDate} • ⏰ ${formattedTime}`;
  };

  const handleStatusChange = async (requestId, newStatus) => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
      await axios.patch(`${API_BASE_URL}/api/update-status`, {
        request_id: requestId,
        status: newStatus
      });
      
      setToastMessage(`Status updated to "${newStatus}" in BigQuery.`);
      setTimeout(() => setToastMessage(""), 4000);
    } catch (err) {
      console.error("Failed to update status in backend, updating locally:", err);
      setToastMessage(`Status updated to "${newStatus}" locally.`);
      setTimeout(() => setToastMessage(""), 4000);
    }
    
    // Always update local state for a smooth UI experience
    setComplaints(prev => prev.map(c => c.request_id === requestId ? { ...c, status: newStatus } : c));
    if (selectedComplaint && selectedComplaint.request_id === requestId) {
      setSelectedComplaint(prev => ({ ...prev, status: newStatus }));
    }
  };

  // Sync state data on state selection change
  useEffect(() => {
    if (stateData) {
      setPriorities(stateData.priorities.map(p => ({
        ...p,
        status: p.status || (p.rank === 1 ? "Pending" : p.rank === 2 ? "In Progress" : "Resolved")
      })));
      setActiveTab("analytics");
    } else {
      setPriorities([]);
      setActiveTab("feed");
    }
    setActiveCardId(null);
    setDrawerOpen(false);
  }, [selectedState, stateData]);

  // Leaflet Map Initialization Hook — depends only on selectedState to avoid
  // infinite re-renders from mapCenter array creating a new reference each render.
  // NOTE: React StrictMode double-invokes effects in dev; we guard against
  // "Map container is already initialized" by clearing _leaflet_id first.
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Compute center/zoom inside the effect so we don't put arrays in deps
    const center = STATE_DASHBOARD_DATA[selectedState]?.map?.center || [20.5937, 78.9629];
    const zoom   = STATE_DASHBOARD_DATA[selectedState]?.map?.zoom   || 5;

    // Fully destroy any existing Leaflet instance on the container
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Remove the Leaflet-injected attribute to prevent "already initialized" error
    // when React StrictMode double-invokes this effect in development
    delete mapContainerRef.current._leaflet_id;

    let map;
    try {
      map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
        scrollWheelZoom: false
      });
    } catch (err) {
      // If Leaflet still refuses (e.g. StrictMode timing), silently skip
      console.warn("Leaflet map init skipped:", err.message);
      return;
    }

    mapRef.current = map;

    // Add CartoDB Dark Matter tile layer
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 20
    }).addTo(map);

    // Create marker layers group
    const markerGroup = L.layerGroup().addTo(map);
    markerGroupRef.current = markerGroup;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerGroupRef.current = null;
    };
  }, [selectedState]); // Stable — selectedState is a string

  // Clean custom Div Icon creator
  const createCustomIcon = (severity, type, isClicked) => {
    let colorClass = "bg-blue-500 shadow-[0_0_10px_#3b82f6]";
    if (type === "hotspot") {
      colorClass = severity === "severe" 
        ? "bg-red-500 shadow-[0_0_12px_#ef4444] animate-pulse" 
        : "bg-amber-500 shadow-[0_0_10px_#f59e0b]";
    } else if (type === "gap") {
      colorClass = "bg-cyan-500 shadow-[0_0_10px_#06b6d4]";
    } else if (type === "proposed") {
      colorClass = "bg-emerald-500 shadow-[0_0_10px_#10b981]";
    }

    let borderClass = isClicked 
      ? "ring-4 ring-offset-4 ring-offset-[#0A0B10] ring-blue-400 scale-[1.3] z-[9999]" 
      : "";

    return L.divIcon({
      html: `<div class="h-4.5 w-4.5 rounded-full ${colorClass} ${borderClass} transition-all duration-300"></div>`,
      className: "custom-div-marker-wrapper",
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
  };

  // Re-draw markers when priorities, complaints, mapLayer, or selected active item changes
  useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup) return;

    // Clear previous markers
    markerGroup.clearLayers();

    if (mapLayer === "hotspots") {
      // 1. Draw static hotspots from stateData if it exists
      if (stateData && stateData.map && stateData.map.hotspots) {
        stateData.map.hotspots.forEach((hotspot) => {
          // Match hotspot to priority card based on label keywords
          const cleanLabel = hotspot.label.toLowerCase();
          const matchedPriority = priorities.find(p => p.title.toLowerCase().includes(cleanLabel.split(" ")[0]));
          const isActive = matchedPriority && matchedPriority.id === activeCardId;
          const currentStatus = matchedPriority ? matchedPriority.status : "Pending";

          const customIcon = createCustomIcon(hotspot.severity, "hotspot", isActive);
          const marker = L.marker([hotspot.lat, hotspot.lng], { icon: customIcon });

          // Popup coordinates showing Title, state/location, status on separate lines
          const popupContent = `
            <div class="p-1 font-sans">
              <h4 class="font-black text-xs text-white pb-1">${hotspot.label}</h4>
              <div class="text-[10px] text-slate-400 font-semibold">${selectedState}</div>
              <div class="text-[10px] font-extrabold text-blue-400 mt-1">Status: ${currentStatus}</div>
            </div>
          `;
          
          marker.bindPopup(popupContent, { className: "dark-popup" });
          
          marker.on("click", () => {
            if (matchedPriority) {
              handleCardClick(matchedPriority.id);
            }
          });

          marker.addTo(markerGroup);

          if (isActive) {
            // Relocate center and open popup automatically
            map.setView([hotspot.lat, hotspot.lng], map.getZoom(), { animate: true });
            setTimeout(() => marker.openPopup(), 200);
          }
        });
      }

      // 2. Draw live complaints hotspots
      complaints.forEach((complaint) => {
        if (complaint.geo_lat && complaint.geo_lng) {
          const isSelected = selectedComplaint && selectedComplaint.request_id === complaint.request_id;
          const customIcon = createCustomIcon(complaint.severity_index >= 7 ? "severe" : "moderate", "hotspot", isSelected);
          const marker = L.marker([complaint.geo_lat, complaint.geo_lng], { icon: customIcon });

          const popupContent = `
            <div class="p-1 font-sans">
              <h4 class="font-black text-xs text-white pb-1">${complaint.category || 'Complaint'}</h4>
              <div class="text-[10px] text-slate-400 font-semibold">${complaint.location_node || 'Unknown Ward'}, ${selectedState}</div>
              <div class="text-[10px] font-extrabold text-blue-400 mt-1">Status: ${complaint.status || 'Pending'}</div>
            </div>
          `;

          marker.bindPopup(popupContent, { className: "dark-popup" });
          marker.on("click", () => {
            setSelectedComplaint(complaint);
            setActiveTab("feed");
          });
          marker.addTo(markerGroup);

          if (isSelected) {
            map.setView([complaint.geo_lat, complaint.geo_lng], map.getZoom(), { animate: true });
            setTimeout(() => marker.openPopup(), 200);
          }
        }
      });
    } else if (mapLayer === "gaps" && stateData && stateData.map && stateData.map.gaps) {
      stateData.map.gaps.forEach((gap) => {
        const customIcon = createCustomIcon(null, "gap", false);
        const marker = L.marker([gap.lat, gap.lng], { icon: customIcon });
        
        const popupContent = `
          <div class="p-1 font-sans">
            <h4 class="font-black text-xs text-white pb-1">${gap.deficiency}</h4>
            <div class="text-[10px] text-slate-450 font-semibold">${selectedState}</div>
            <div class="text-[10px] font-extrabold text-cyan-400 mt-1">Urgency Gap: ${gap.gapScore}</div>
          </div>
        `;
        marker.bindPopup(popupContent, { className: "dark-popup" });
        marker.addTo(markerGroup);
      });
    } else if (mapLayer === "proposed" && stateData && stateData.map && stateData.map.proposed) {
      stateData.map.proposed.forEach((site) => {
        const customIcon = createCustomIcon(null, "proposed", false);
        const marker = L.marker([site.lat, site.lng], { icon: customIcon });
        
        const popupContent = `
          <div class="p-1 font-sans">
            <h4 class="font-black text-xs text-white pb-1">${site.project}</h4>
            <div class="text-[10px] text-slate-400 font-semibold">${selectedState}</div>
            <div class="text-[10px] font-extrabold text-emerald-400 mt-1">Est. Budget: ${site.budget}</div>
          </div>
        `;
        marker.bindPopup(popupContent, { className: "dark-popup" });
        marker.addTo(markerGroup);
      });
    }
  }, [mapLayer, activeCardId, priorities, complaints, selectedComplaint, selectedState, stateData]);

  // Handle active card selection
  const handleCardClick = (cardId) => {
    setActiveCardId(cardId);
    setDrawerOpen(true);
  };

  // Status Badge Updater buttons
  const changePriorityStatus = (newStatus) => {
    const active = priorities.find(p => p.id === activeCardId);
    if (!active) return;

    setPriorities(prev => prev.map(p => {
      if (p.id === activeCardId) {
        return { ...p, status: newStatus };
      }
      return p;
    }));

    // Toast message trigger
    setToastMessage(`Status updated to "${newStatus}"! Prioritization index synchronized.`);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Find currently active priority details
  const activePriority = priorities.find(p => p.id === activeCardId);

  // Compute stats dynamically
  const resolvedIssuesCount = priorities.filter(p => p.status === "Resolved").length;

  // Safe active metrics fallback
  const activeMetrics = stateData?.metrics || {
    totalRequests: complaints.length,
    activeHotspots: complaints.filter(c => c.severity_index >= 7 && c.status !== "Resolved").length,
    topSector: "General Grievance",
    topSectorColor: "text-blue-450 bg-blue-500/10 border-blue-500/30"
  };

  // Live severe hotspot calculations
  const baseHotspots = activeMetrics.activeHotspots;
  const currentHotspots = Math.max(0, baseHotspots - resolvedIssuesCount);
  const totalResolved = 3730 + resolvedIssuesCount;

  // Map mock data category strings to standardized sector codes
  const CATEGORY_TO_SECTOR = {
    "Water Supply": "WATER",
    "Water": "WATER",
    "Water Infrastructure": "WATER",
    "Roads & Transport": "ROAD",
    "Road": "ROAD",
    "Road Damage": "ROAD",
    "Infrastructure": "ROAD",
    "Healthcare": "HEALTH",
    "Health": "HEALTH",
    "Education & Jobs": "EDUCATION",
    "Education": "EDUCATION",
    "Electricity": "ELECTRICITY",
    "Power": "ELECTRICITY",
    "Sanitation": "SANITATION",
    "Public Sanitation": "SANITATION",
    "Waste Management": "WASTE",
    "Public Safety": "SAFETY",
    "Women & Child": "WOMEN_CHILD",
    "Environment": "ENVIRONMENT",
    "Agriculture": "AGRICULTURE",
    "General Grievance": "ALL"
  };

  // Dual-filtered + auto-ranked priority list
  const filteredPriorities = priorities
    .filter(p => selectedSector === "ALL" || (CATEGORY_TO_SECTOR[p.category] || "ALL") === selectedSector)
    .sort((a, b) => b.score - a.score);

  // Empty state fallback for states without mock database
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-2xl border text-center max-w-lg mx-auto my-12">
      <FolderLock className="h-16 w-16 text-blue-400 mb-4 animate-pulse" />
      <h3 className="text-xl font-bold text-white mb-2">Constituency Feed Offline</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-6">
        No development logs or telemetry indices are reported for <span className="text-blue-400 font-semibold font-mono">{selectedState}</span>. 
        Select a state with mock data records to preview priority command feeds.
      </p>
      <div className="text-xs bg-slate-900 border border-slate-800 p-4 rounded-lg text-slate-500 text-left font-mono">
        <span className="text-blue-400 font-bold block mb-1">💡 Sandbox Info:</span>
        Interactive datasets are configured for:
        <ul className="list-disc pl-4 mt-1.5 space-y-1">
          <li>Gujarat (Default)</li>
          <li>Maharashtra</li>
          <li>Delhi</li>
          <li>Uttar Pradesh</li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in text-white space-y-6 select-none">
      
      {/* Toast Notification for representative actions */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-[99999] p-4 bg-slate-900 border border-emerald-500/40 text-emerald-400 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-up">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <span className="text-xs font-bold font-sans">{toastMessage}</span>
        </div>
      )}

      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-350 bg-clip-text text-transparent">
              Welcome, MP Prioritization Desk
            </h1>
          </div>
          <p className="text-xs text-blue-400 font-mono tracking-widest uppercase mt-1">
            Constituency Dashboard Scoped: {selectedState} (Live Feed Active)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-300">
            {currentUser?.isAnonymous ? "Anonymous Sandbox Mode" : "Authorized Session: Admin"}
          </span>
          {currentUser && (
            <button 
              onClick={onLogOut} 
              className="text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 bg-red-950/20 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Command Filters Panel */}
      <div className="flex flex-wrap items-end gap-5 p-4 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md">
        <span className="text-xs font-black text-slate-400 uppercase tracking-widest self-center">
          🎛️ Command Filters
        </span>

        {/* State — driven by global nav selector, shown as read-only for context */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Constituency / State</span>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-slate-300 font-medium select-none">
            {selectedState}
          </div>
        </div>

        {/* Department / Sector */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Department / Sector</span>
          <div className="relative">
            <select
              value={selectedSector}
              onChange={(e) => {
                setSelectedSector(e.target.value);
                setActiveCardId(null);
                setDrawerOpen(false);
              }}
              className="appearance-none bg-slate-900 border border-white/10 rounded-xl pl-4 pr-9 py-2 text-sm text-slate-300 font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 cursor-pointer transition-all hover:border-white/25 shadow-inner"
            >
              <option value="ALL">🔍 All Sectors (Cross-Department)</option>
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

        {/* Active filter badge */}
        <div className="ml-auto self-center text-xs text-slate-500 bg-white/5 border border-white/5 px-3 py-1.5 rounded-lg font-mono">
          <span className="text-blue-400 font-bold">{filteredPriorities.length}</span> priorities active
        </div>
      </div>

      {/* Metrics Row (3 cards, 1-col mobile / 3-col desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Card 1: Severity hotspots with pulsing red dot icon */}
        <div className="glass-panel p-5 rounded-2xl border border-blue-500/10 flex items-center gap-4 hover:border-blue-500/35 transition-colors">
          <div className="p-3.5 rounded-md bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertOctagon className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold block">High Severity Hotspots</span>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-2xl font-extrabold tracking-tight text-white">
                {currentHotspots}
              </span>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-opacity-pulse" />
            </div>
          </div>
        </div>

        {/* Card 2: Top concern sector */}
        <div className="glass-panel p-5 rounded-2xl border border-blue-500/10 flex items-center gap-4 hover:border-blue-500/35 transition-colors">
          <div className="p-3.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold block">Top Concern Sector</span>
            <span className={`inline-block mt-2 text-xs font-bold px-2 py-0.5 rounded border ${activeMetrics.topSectorColor}`}>
              {activeMetrics.topSector}
            </span>
          </div>
        </div>

        {/* Card 3: Total issues resolved */}
        <div className="glass-panel p-5 rounded-2xl border border-blue-500/10 flex items-center gap-4 hover:border-blue-500/35 transition-colors">
          <div className="p-3.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-bold block">Total Issues Resolved</span>
            <span className="text-2xl font-extrabold tracking-tight text-white mt-1.5 block">
              {totalResolved.toLocaleString()}
            </span>
          </div>
        </div>

      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-white/10 pb-px">
        {stateData && (
          <button
            onClick={() => setActiveTab("analytics")}
            className={`pb-3 px-6 text-sm font-bold transition-all relative ${
              activeTab === "analytics"
                ? "text-blue-400 border-b-2 border-blue-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            📊 Prioritization Analytics
          </button>
        )}
        <button
          onClick={() => setActiveTab("feed")}
          className={`pb-3 px-6 text-sm font-bold transition-all relative flex items-center gap-2 ${
            activeTab === "feed"
              ? "text-blue-400 border-b-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          📢 Live Citizen Feed
          {complaints.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-blue-500/20 text-blue-405 border border-blue-500/30 font-bold font-mono">
              {complaints.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === "analytics" && stateData && (
        <>
          {/* Split-Screen main layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
            
            {/* Left Column queue list (2/5) */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Ranked Priorities
                  {selectedSector !== "ALL" && (
                    <span className="ml-2 text-blue-400 text-[10px] normal-case font-mono tracking-wide">
                      — {selectedSector}
                    </span>
                  )}
                </h3>
                <span className="text-[10px] text-blue-400 font-mono">
                  {filteredPriorities.length} found
                </span>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                {filteredPriorities.length === 0 ? (
                  <div className="p-8 rounded-xl text-center text-slate-500 italic bg-white/[0.01] border border-dashed border-white/10">
                    No live complaints under this sector for {selectedState}.
                  </div>
                ) : filteredPriorities.map((item, idx) => {
                  const isActive = activeCardId === item.id;
                  const dynamicRank = idx + 1;
                  let badgeColor = "text-blue-450 border-blue-500/25 bg-blue-500/10";
                  if (item.status === "In Progress") {
                    badgeColor = "text-amber-400 border-amber-500/25 bg-amber-500/10";
                  } else if (item.status === "Resolved") {
                    badgeColor = "text-emerald-400 border-emerald-500/25 bg-emerald-500/10";
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleCardClick(item.id)}
                      className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                        isActive
                          ? "bg-slate-900 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.30)] translate-x-1"
                          : "glass-panel hover:bg-slate-900/90"
                      }`}
                    >
                      {/* Top Row: status badge on left, rank chip on right */}
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase font-mono ${badgeColor}`}>
                          {item.status}
                        </span>
                        <div className="h-6 w-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-300">
                          {dynamicRank}
                        </div>
                      </div>

                      {/* Project Title */}
                      <h4 className={`text-sm font-bold mt-3 leading-snug ${
                        isActive ? "text-blue-400 font-extrabold" : "text-white"
                      }`}>
                        {item.title}
                      </h4>

                      {/* Sector tag */}
                      {selectedSector === "ALL" && item.category && (
                        <div className="mt-2">
                          <span className="text-[9px] bg-white/5 text-slate-400 px-2 py-0.5 rounded border border-white/5 uppercase tracking-wider font-mono">
                            📁 {CATEGORY_TO_SECTOR[item.category] || item.category}
                          </span>
                        </div>
                      )}

                      {/* Bottom Row showing score and complaint counts */}
                      <div className="mt-4 flex items-center justify-between border-t border-slate-900/40 pt-3 text-xs">
                        <span className="text-slate-400 font-semibold font-mono">
                          {item.score}/100 Score
                        </span>
                        <span className="text-slate-400 font-bold font-mono">
                          {item.complaints} complaints
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Geospatial Intel Map (3/5) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-slate-400 select-none">
                  <MapPin className="h-4 w-4 text-blue-400" />
                  <span className="text-sm font-bold uppercase tracking-wider">Geospatial Intel Map</span>
                </div>

                {/* Custom styled layer switcher */}
                <div className="flex p-0.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                  <button
                    onClick={() => setMapLayer("hotspots")}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      mapLayer === "hotspots" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Citizen Hotspots
                  </button>
                  <button
                    onClick={() => setMapLayer("gaps")}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      mapLayer === "gaps" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Infrastructure Gaps
                  </button>
                  <button
                    onClick={() => setMapLayer("proposed")}
                    className={`px-3 py-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                      mapLayer === "proposed" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Proposed Sites
                  </button>
                </div>
              </div>

              {/* Leaflet container canvas */}
              <div className="relative w-full h-[480px] rounded-2xl border border-blue-500/20 bg-slate-950 overflow-hidden shadow-2xl z-10">
                <div ref={mapContainerRef} className="w-full h-full" />
                
                {!activePriority && (
                  <div className="absolute bottom-4 right-4 bg-slate-950/90 border border-slate-800 p-3 rounded-lg shadow-xl text-center max-w-[200px] pointer-events-none z-[1000] animate-bounce">
                    <p className="text-[10px] text-slate-400 leading-snug">
                      🖱️ Click any queue item to locate telemetry markers automatically.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* 3. Bottom Detail Drawer */}
          {drawerOpen && activePriority && (
            <div className="bg-slate-950 border border-blue-500/20 shadow-2xl rounded-2xl p-6 relative animate-slide-up mt-4">
              <button 
                onClick={() => setDrawerOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 hover:bg-slate-900 border border-slate-800 rounded-lg cursor-pointer transition-colors"
                title="Close Drawer"
              >
                <X className="h-5 w-5" />
              </button>

              <span className="text-[10px] font-bold tracking-widest uppercase text-blue-400 font-mono block mb-1">
                Inspector Desk // Priority Score Card // Rank {activePriority.rank}
              </span>
              <h3 className="text-xl font-bold text-white mb-4 pr-10">
                {activePriority.title}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Full Description
                    </h4>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {activePriority.whyAI || "No description data provided."}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-2.5">
                    <button
                      onClick={() => changePriorityStatus("In Progress")}
                      className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      ⚙️ Mark In Progress
                    </button>
                    <button
                      onClick={() => changePriorityStatus("Resolved")}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      ✅ Mark Resolved
                    </button>
                  </div>
                </div>

                <div className="md:col-span-1 p-4 rounded-xl bg-blue-950/20 border border-blue-500/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="h-4 w-4 text-blue-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">
                      AI Justification (Why this is priority)
                    </h4>
                  </div>
                  <ul className="space-y-3.5 text-sm text-slate-300">
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                      <span>Severity index verified at <span className="font-bold text-blue-400">{activePriority.score}/100</span> based on proximity to active medical quarters and transit lanes.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                      <span>Constituency complaint volume generated <span className="font-bold text-blue-400">{activePriority.complaints} reports</span> within a consecutive 14-day window.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                      <span>Alternative service hubs operate beyond 15 kilometers, penalizing local accessibility limits.</span>
                    </li>
                  </ul>
                </div>

                <div className="md:col-span-1 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 mb-3">
                    <FileCheck2 className="h-4 w-4 text-slate-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Government Census Parameters
                    </h4>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs text-left divide-y divide-slate-800">
                      <thead>
                        <tr>
                          <th className="pb-2 text-slate-500 font-bold">Metric Variable</th>
                          <th className="pb-2 text-slate-500 font-bold text-right">Value Record</th>
                          <th className="pb-2 text-slate-500 font-bold text-right">Risk Index</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {activePriority.censusChecklist.map((check, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/40">
                            <td className="py-2 text-slate-300 font-medium">{check.label}</td>
                            <td className="py-2 text-slate-350 font-mono text-right font-semibold">{check.value}</td>
                            <td className="py-2 text-right">
                              <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                                check.status === "Critical" 
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20" 
                                  : check.status === "Warning"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-slate-800 text-slate-400"
                              }`}>
                                {check.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* activeTab === "feed" */}
      {activeTab === "feed" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          {complaints.filter(c => selectedSector === "ALL" || (CATEGORY_TO_SECTOR[c.category] || "ALL") === selectedSector).length === 0 ? (
            <div className="md:col-span-2 p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01] text-slate-405">
              <FolderLock className="h-16 w-16 text-blue-500/30 mx-auto mb-4 animate-pulse" />
              <h3 className="text-base font-bold text-white mb-1">No Active Complaints</h3>
              <p className="text-xs text-slate-500">
                No resident complaints match the selected sector filters in {selectedState}.
              </p>
            </div>
          ) : (
            complaints
              .filter(c => selectedSector === "ALL" || (CATEGORY_TO_SECTOR[c.category] || "ALL") === selectedSector)
              .map((complaint) => (
                <div 
                  key={complaint.request_id}
                  onClick={() => setSelectedComplaint(complaint)}
                  className="cursor-pointer border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-md rounded-2xl p-5 hover:border-cyan-500/50 transition-all duration-300 flex flex-col justify-between h-full group"
                >
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {complaint.category || "General"}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formatDateTime(complaint.submitted_at)}
                      </span>
                    </div>
                    
                    <p className="mt-3.5 text-sm font-semibold text-slate-200 line-clamp-2 leading-relaxed">
                      {complaint.english_translation || "No description provided."}
                    </p>

                    {complaint.image_url && (
                      <div className="relative overflow-hidden rounded-lg border border-white/10 my-3 h-32 bg-slate-950">
                        <img 
                          src={complaint.image_url} 
                          alt="Complaint Evidence" 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => { e.target.src = 'https://placehold.co/600x400/1a1a1a/ffffff?text=Image+Load+Failed'; }} 
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Severity:</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        complaint.severity_index >= 7 
                          ? "bg-red-500/10 text-red-400 border border-red-500/25" 
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                      }`}>
                        {complaint.severity_index}/10
                      </span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                      complaint.status === "In Progress"
                        ? "text-amber-400 border-amber-500/25 bg-amber-500/10"
                        : complaint.status === "Resolved"
                          ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/10"
                          : "text-blue-400 border-blue-500/25 bg-blue-500/10"
                    }`}>
                      {complaint.status || "Pending"}
                    </span>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Sleek Glassmorphic Modal with AI Justification & Status Update Actions */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl border border-white/20 bg-[#121216]/95 backdrop-blur-xl rounded-2xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            
            {/* Close Button */}
            <button 
              onClick={() => setSelectedComplaint(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-400/10 px-2.5 py-1 rounded border border-cyan-400/20">
                {selectedComplaint.category || "General"}
              </span>
              <h2 className="text-2xl font-bold text-white mt-2">Complaint Details</h2>
              <p className="text-xs text-gray-450 mt-1">
                {formatDateTime(selectedComplaint.submitted_at)} | Location: {selectedComplaint.location_node || "Local Area"}, {selectedComplaint.state}
              </p>
            </div>

            <hr className="border-white/10 my-4" />

            {/* Content & Evidence Photo */}
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Resident Statement</h4>
                <p className="text-gray-200 text-sm mt-1.5 leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/5">
                  {selectedComplaint.english_translation || "No description provided."}
                </p>
              </div>

              {selectedComplaint.image_url && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Evidence Photo</h4>
                  <div className="relative overflow-hidden rounded-xl border border-white/10 bg-slate-950 max-h-64 flex items-center justify-center">
                    <img 
                      src={selectedComplaint.image_url} 
                      alt="Evidence" 
                      className="max-h-64 object-contain" 
                      onError={(e) => { 
                        e.target.src = 'https://placehold.co/600x400/1a1a1a/ffffff?text=Image+Load+Failed'; 
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ✨ AI Justification Panel (Cyber Neon Border) */}
              <div className="border border-purple-500/30 bg-purple-500/5 rounded-xl p-4">
                <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm mb-1.5">
                  <ShieldAlert size={16} />
                  <span>AI Valuation & Justification</span>
                </div>
                <p className="text-gray-300 text-xs leading-relaxed">
                  {selectedComplaint.ai_justification}
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="text-[10px] text-purple-305">Calculated Severity Index:</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    {selectedComplaint.severity_index}/10
                  </span>
                </div>
              </div>
            </div>

            <hr className="border-white/10 my-5" />

            {/* 🔥 Status Management Buttons */}
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Update Progress Status</h4>
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={() => handleStatusChange(selectedComplaint.request_id, 'In Progress')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    selectedComplaint.status === 'In Progress' 
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-amber-500/10 hover:text-amber-400'
                  }`}
                >
                  <Clock size={14} />
                  In Progress
                </button>

                <button 
                  onClick={() => handleStatusChange(selectedComplaint.request_id, 'Resolved')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    selectedComplaint.status === 'Resolved' 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)]' 
                    : 'bg-white/5 text-gray-300 border-white/10 hover:bg-emerald-500/10 hover:text-emerald-400'
                  }`}
                >
                  <CheckCircle size={14} />
                  Mark Resolved
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─────────── LIVE COMPLAINT FEED (BigQuery real data) ─────────── */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Live Complaint Feed
            </h3>
            <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded ml-1">
              BigQuery Live
            </span>
          </div>
          <button
            onClick={() => {
              setFeedLoading(true);
              setFeedError(""); // Reset any prior errors
              const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
              const params = { state: selectedState, limit: 30 };
              if (selectedSector !== "ALL") params.sector = selectedSector;
              axios.get(`${API_BASE_URL}/api/get-complaints/`, { params, timeout: 15000 })
                .then(r => {
                  setLiveComplaints(r.data || []);
                  setFeedError("");
                })
                .catch(() => setFeedError("Live feed unavailable."))
                .finally(() => setFeedLoading(false));
            }}
            className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-white border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${feedLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {feedLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 animate-pulse space-y-3">
                <div className="h-3 bg-slate-800 rounded w-1/3" />
                <div className="h-32 bg-slate-800/60 rounded-lg" />
                <div className="h-3 bg-slate-800 rounded w-3/4" />
                <div className="h-3 bg-slate-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {!feedLoading && feedError && (
          <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 font-mono">
            ⚠️ {feedError}
          </div>
        )}

        {!feedLoading && !feedError && liveComplaints.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-2xl text-center text-slate-500">
            <Inbox className="h-10 w-10 mb-3 text-slate-700" />
            <p className="text-sm font-semibold">No complaints recorded yet for <span className="text-blue-400">{selectedState}</span></p>
            <p className="text-xs mt-1">Submit a complaint via the Resident Portal to see it here.</p>
          </div>
        )}

        {!feedLoading && liveComplaints.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveComplaints.map((complaint) => {
              const severityColor =
                complaint.severity_index >= 8 ? "border-red-500/40 text-red-400 bg-red-500/10"
                : complaint.severity_index >= 5 ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                : "border-blue-500/40 text-blue-400 bg-blue-500/10";

              const sectorEmoji = {
                WATER:"🚰",ROAD:"🛣️",HEALTH:"🏥",EDUCATION:"📚",
                ELECTRICITY:"⚡",SANITATION:"🧹",WASTE:"🗑️",
                SAFETY:"🛡️",WOMEN_CHILD:"👶",ENVIRONMENT:"🌱",AGRICULTURE:"🌾"
              }[complaint.sector] || "📋";

              return (
                <div
                  key={complaint.request_id}
                  className="flex flex-col glass-panel border border-white/5 hover:border-blue-500/30 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.10)]"
                >
                  {complaint.image_url ? (
                    <div className="relative h-40 bg-slate-900 overflow-hidden shrink-0">
                      <img
                        src={complaint.image_url}
                        alt="Complaint evidence"
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                      <span className="absolute bottom-2 left-3 text-[10px] font-bold text-white/70 font-mono bg-slate-950/60 px-2 py-0.5 rounded">
                        📷 Photo Evidence
                      </span>
                    </div>
                  ) : (
                    <div className="h-10 flex items-center justify-center bg-slate-900/40 border-b border-white/5 shrink-0">
                      <span className="text-[10px] text-slate-600 flex items-center gap-1.5">
                        <ImageOff className="h-3 w-3" /> No photo attached
                      </span>
                    </div>
                  )}

                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold bg-white/5 text-slate-300 border border-white/10 px-2 py-0.5 rounded uppercase tracking-wide">
                        {sectorEmoji} {complaint.sector || complaint.category || "General"}
                      </span>
                      {complaint.severity_index != null && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border font-mono ${severityColor}`}>
                          SEV {complaint.severity_index}/10
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                      {complaint.english_translation || "No description provided."}
                    </p>

                    <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-600" />
                        {complaint.location_node || "Unknown"}
                      </span>
                      <span>
                        {complaint.submitted_at
                          ? new Date(complaint.submitted_at).toLocaleDateString("en-IN", {day:"2-digit",month:"short",year:"2-digit"})
                          : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
