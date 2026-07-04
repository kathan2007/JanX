import React, { useState, useEffect } from "react";
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
  CheckCircle
} from "lucide-react";

export default function MPDashboard({ selectedState, currentUser, onLogOut }) {
  const stateData = STATE_DASHBOARD_DATA[selectedState];
  
  // Selection States
  const [activeCardId, setActiveCardId] = useState(null);
  const [mapLayer, setMapLayer] = useState("hotspots"); // "hotspots" | "gaps" | "proposed"
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Reset card selection on state change
  useEffect(() => {
    setActiveCardId(null);
    setDrawerOpen(false);
  }, [selectedState]);

  // Handle priority card click
  const handleCardClick = (cardId) => {
    setActiveCardId(cardId);
    setDrawerOpen(true);
  };

  // Find currently active priority details
  const activePriority = stateData?.priorities.find(p => p.id === activeCardId);

  // If state matches a blank list (e.g. no data loaded in mock)
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center p-12 glass-panel rounded-2xl border text-center max-w-lg mx-auto my-12">
      <FolderLock className="h-16 w-16 text-blue-400 mb-4 animate-pulse" />
      <h3 className="text-xl font-bold text-white mb-2">Constituency Feed Offline</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-6">
        No development logs or telemetry indices are reported for <span className="text-blue-405 font-semibold font-mono">{selectedState}</span>. 
        Select a state with mock data records to preview priority command feeds.
      </p>
      <div className="text-xs bg-slate-900 border border-slate-800 p-3 rounded-lg text-slate-500 text-left font-mono">
        <span className="text-blue-400 font-bold block mb-1">💡 Sandbox Info:</span>
        Interactive demo datasets are mapped for:
        <ul className="list-disc pl-4 mt-1 space-y-0.5">
          <li>Gujarat (Default)</li>
          <li>Maharashtra</li>
          <li>Delhi</li>
          <li>Uttar Pradesh</li>
        </ul>
      </div>
    </div>
  );

  if (!stateData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in text-white">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Welcome, MP Kathan Darji
            </h1>
            <p className="text-xs text-blue-400 font-mono tracking-wider uppercase mt-1">
              Constituency Telemetry System Scoped: {selectedState}
            </p>
          </div>
          {currentUser && (
            <button 
              onClick={onLogOut} 
              className="text-xs tracking-wider font-bold text-red-400 border border-red-500/30 hover:border-red-500 bg-red-500/10 px-3.5 py-1.5 rounded-lg transition-all"
            >
              Secure Lockout
            </button>
          )}
        </div>
        {renderEmptyState()}
      </div>
    );
  }

  // Calculate coordinates for mapped markers based on priority card
  // This helps center/glow markers that represent the selected card!
  const getMarkerClass = (markerLabel, severity) => {
    const isMatched = activePriority && activePriority.title.toLowerCase().includes(markerLabel.split(" ")[0].toLowerCase());
    
    if (isMatched) {
      return "ring-4 ring-offset-4 ring-offset-slate-950 ring-cyan-400 bg-cyan-400 scale-125 z-10 shadow-[0_0_15px_#22d3ee]";
    }
    
    if (severity === "severe") {
      return "bg-red-500 shadow-[0_0_10px_#ef4444] hover:scale-110";
    }
    return "bg-amber-500 shadow-[0_0_10px_#f59e0b] hover:scale-110";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in text-white space-y-6 select-none">
      
      {/* 1. Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              Welcome, MP Kathan Darji
            </h1>
          </div>
          <p className="text-xs text-blue-450 font-mono tracking-widest uppercase mt-1">
            Constituency Dashboard Scoped: {selectedState} (Live Feed Active)
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded border border-blue-500/20 bg-blue-500/5 text-blue-300">
            {currentUser?.isAnonymous ? "Resident Demo Token" : "Authorized Session: Admin"}
          </span>
          {currentUser && (
            <button 
              onClick={onLogOut} 
              className="text-xs font-bold text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 bg-red-950/20 px-3.5 py-1.5 rounded-lg transition-all"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Row of 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        
        {/* Card 1: Citizen Requests */}
        <div className="glass-panel p-5 rounded-2xl border flex items-center gap-4 hover:border-blue-500/45 transition-colors">
          <div className="p-3.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold block">Total Citizen Requests</span>
            <span className="text-2xl font-bold tracking-tight text-white line-clamp-1">
              {stateData.metrics.totalRequests.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Card 2: Severity Hotspots */}
        <div className="glass-panel p-5 rounded-2xl border flex items-center gap-4 hover:border-blue-500/45 transition-colors">
          <div className="p-3.5 rounded-xl bg-red-500/10 text-red-405 border border-red-500/20">
            <AlertOctagon className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold block">High Severity Hotspots</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-white">
                {stateData.metrics.activeHotspots}
              </span>
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Active</span>
            </div>
          </div>
        </div>

        {/* Card 3: Top Sector */}
        <div className="glass-panel p-5 rounded-2xl border flex items-center gap-4 hover:border-blue-500/45 transition-colors">
          <div className="p-3.5 rounded-xl bg-cyan-500/10 text-cyan-405 border border-cyan-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <span className="text-slate-400 text-xs font-semibold block">Top Priority Sector</span>
            <span className={`inline-block mt-0.5 text-xs font-bold px-2 py-0.5 rounded border ${stateData.metrics.topSectorColor}`}>
              {stateData.metrics.topSector}
            </span>
          </div>
        </div>

      </div>

      {/* 2. Split-Screen Main Body */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
        
        {/* Left Column — Ranked Priorities List (2/5 = 40%) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Severity Ranking List
            </h3>
            <span className="text-[10px] text-blue-450 font-mono">Sorted by urgency</span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
            {stateData.priorities.map((item, index) => {
              const isActive = activeCardId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item.id)}
                  className={`p-4 rounded-xl border transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? "glass-panel-active transform translate-x-1" 
                      : "glass-panel hover:bg-slate-900/90"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`text-[10px] font-bold tracking-widest uppercase font-mono px-2 py-0.5 rounded ${
                      isActive 
                        ? "bg-blue-600 text-white" 
                        : "bg-slate-900 border border-slate-800 text-slate-400"
                    }`}>
                      Rank {item.rank}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400 font-semibold">{item.complaints} Reports</span>
                    </div>
                  </div>

                  <h4 className={`text-sm font-bold mt-2.5 leading-snug ${
                    isActive ? "text-cyan-300" : "text-white group-hover:text-cyan-200"
                  }`}>
                    {item.title}
                  </h4>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
                    <span className="text-slate-450 font-medium">Score: <b className="text-cyan-400 font-mono">{item.score}/100</b></span>
                    <span className="text-slate-400 italic text-[11px] underline underline-offset-2">Click to inspect</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column — Geospatial Intel Map (3/5 = 60%) */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Map canvas header layers switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-slate-400">
              <Layers className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Geospatial Telemetry</span>
            </div>

            <div className="flex p-0.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
              <button
                onClick={() => setMapLayer("hotspots")}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                  mapLayer === "hotspots" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Hotspots
              </button>
              <button
                onClick={() => setMapLayer("gaps")}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                  mapLayer === "gaps" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Infra Gaps
              </button>
              <button
                onClick={() => setMapLayer("proposed")}
                className={`px-3 py-1 rounded text-[11px] font-bold transition-all ${
                  mapLayer === "proposed" ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Proposed Sites
              </button>
            </div>
          </div>

          {/* Map Canvas body (Styled Google Maps placeholder) */}
          <div className="w-full relative h-[480px] rounded-2xl border border-blue-500/20 bg-slate-950 overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] flex items-center justify-center">
            
            {/* Styled Map Background Grid */}
            <div className="absolute inset-0 opacity-[0.07]" 
                 style={{ 
                   backgroundImage: `radial-gradient(circle, #3b82f6 1px, transparent 1px)`, 
                   backgroundSize: '24px 24px' 
                 }} 
            />
            
            {/* Draw styled outline vectors placeholder */}
            <svg className="absolute inset-0 h-full w-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              {/* Fake state boundary shape vector lines */}
              <path d="M50 100 Q150 50 300 120 T500 200 T600 350 T400 450 T150 400 Z" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="6 4" />
              <path d="M120 180 C200 180 320 220 400 150" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 3" />
              <path d="M220 280 L350 320 L280 410" fill="none" stroke="#3b82f6" strokeWidth="1.5" />
            </svg>

            {/* Scale meter indicator bottom-left */}
            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur border border-slate-800/80 px-2 py-1 rounded font-mono text-[9px] text-slate-500 z-10">
              MOCK GPS CONSTITUENCY BOUNDARY | SCALE 1 : 25,000
            </div>

            {/* Compass rose top-right */}
            <div className="absolute top-4 right-4 h-10 w-10 border border-slate-805 bg-slate-900/60 rounded-full flex items-center justify-center font-mono text-[8px] text-slate-500">
              N ▲
            </div>

            {/* Render markers dynamic list based on selected layer */}
            {mapLayer === "hotspots" && stateData.map.hotspots.map((hotspot) => (
              <div
                key={hotspot.id}
                style={{ top: `${hotspot.lat}%`, left: `${hotspot.lng}%` }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              >
                <div className={`h-4.5 w-4.5 rounded-full transition-all duration-300 flex items-center justify-center relative ${
                  getMarkerClass(hotspot.label, hotspot.severity)
                }`}>
                  <span className="absolute inset-0 rounded-full bg-inherit animate-ping opacity-60 scale-150" />
                  <MapPin className="h-3 w-3 text-white" />
                </div>
                
                {/* Tooltip drawer on hover */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-36 hidden group-hover:block bg-slate-950/95 border border-blue-500/40 p-2.5 rounded-lg shadow-xl text-center z-30 pointer-events-none">
                  <span className="block text-[8px] font-bold text-red-400 uppercase tracking-widest">
                    Hotspot ({hotspot.severity})
                  </span>
                  <span className="block font-bold text-[10px] text-white mt-0.5 truncate">
                    {hotspot.label}
                  </span>
                  <span className="block text-[9px] text-slate-400 font-mono mt-1">
                    {hotspot.complaints} reports logged
                  </span>
                </div>
              </div>
            ))}

            {mapLayer === "gaps" && stateData.map.gaps.map((gap) => (
              <div
                key={gap.id}
                style={{ top: `${gap.lat}%`, left: `${gap.lng}%` }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              >
                <div className="h-4.5 w-4.5 rounded-xl bg-cyan-500 shadow-[0_0_10px_#06b6d4] hover:scale-110 flex items-center justify-center relative">
                  <span className="absolute inset-0 rounded-xl bg-cyan-400 animate-ping opacity-30" />
                  <Layers className="h-2.5 w-2.5 text-white" />
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-40 hidden group-hover:block bg-slate-950/95 border border-cyan-500/40 p-2.5 rounded-lg shadow-xl text-center z-30 pointer-events-none">
                  <span className="block text-[8px] font-bold text-cyan-400 uppercase tracking-widest">
                    INFRASTRUCTURE GAP
                  </span>
                  <span className="block font-bold text-[10px] text-white mt-0.5 truncate">
                    {gap.deficiency}
                  </span>
                  <span className="block text-[9px] text-slate-405 mt-1 font-mono">
                    Urgency: {gap.gapScore}
                  </span>
                </div>
              </div>
            ))}

            {mapLayer === "proposed" && stateData.map.proposed.map((site) => (
              <div
                key={site.id}
                style={{ top: `${site.lat}%`, left: `${site.lng}%` }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
              >
                <div className="h-4.5 w-4.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] hover:scale-110 flex items-center justify-center relative">
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-35" />
                  <CheckCircle className="h-2.5 w-2.5 text-white" />
                </div>

                <div className="absolute left-1/2 -translate-x-1/2 bottom-6 w-44 hidden group-hover:block bg-slate-950/95 border border-emerald-500/40 p-2.5 rounded-lg shadow-xl text-center z-30 pointer-events-none">
                  <span className="block text-[8px] font-bold text-emerald-400 uppercase tracking-widest">
                    PROPOSED SOLUTION
                  </span>
                  <span className="block font-bold text-[10px] text-white mt-0.5 truncate">
                    {site.project}
                  </span>
                  <span className="block text-[9px] text-emerald-300 font-semibold mt-1 font-mono">
                    Est. Budget: {site.budget}
                  </span>
                </div>
              </div>
            ))}

            {/* Instruction layer when no card selected */}
            {!activePriority && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-950/90 border border-slate-800 p-4 rounded-xl shadow-2xl text-center max-w-xs select-none pointer-events-none">
                <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                  🖱️ Click any item in the Priorities List to lock onto its coordinate telemetry and open metrics.
                </p>
              </div>
            )}
            
          </div>
        </div>

      </div>

      {/* 3. Bottom Detail Drawer */}
      <div 
        className={`fixed bottom-0 left-0 right-0 z-40 bg-slate-950 border-t border-blue-500/35 shadow-[0_-12px_24px_rgba(0,0,0,0.6)] transition-transform duration-300 select-none ${
          drawerOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {activePriority ? (
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between border-b border-slate-900 pb-4 mb-4">
              <div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-blue-450 font-mono block">
                  INSPECTOR DESK // RANK {activePriority.rank} // {activePriority.category}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">
                  {activePriority.title}
                </h3>
              </div>
              
              <button
                onClick={() => setDrawerOpen(false)}
                className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800"
              >
                <ChevronDown className="h-4 w-4" />
                Minimize Drawer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left detail: AI summary */}
              <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className="h-4 w-4 text-cyan-405" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-305">
                    The Why (AI Justification)
                  </h4>
                </div>
                <p className="text-sm text-slate-350 leading-relaxed font-medium">
                  {activePriority.whyAI}
                </p>
              </div>

              {/* Right detail: Government check table */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-805">
                <div className="flex items-center gap-2 mb-3">
                  <FileCheck2 className="h-4 w-4 text-blue-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Government Census Parameters
                  </h4>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs text-left divide-y divide-slate-805">
                    <thead>
                      <tr>
                        <th className="pb-2 text-slate-500 font-bold">Metric Variable</th>
                        <th className="pb-2 text-slate-500 font-bold text-right">Value Record</th>
                        <th className="pb-2 text-slate-500 font-bold text-right">Risk Index</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-950">
                      {activePriority.censusChecklist.map((check, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          <td className="py-2 text-slate-350 font-medium">{check.label}</td>
                          <td className="py-2 text-slate-350 font-mono text-right font-medium">{check.value}</td>
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
        ) : (
          <div className="p-6 text-center text-slate-500 text-sm">
            Please select a priority scorecard to load census checklist telemetry.
          </div>
        )}
      </div>

    </div>
  );
}
