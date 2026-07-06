import React from "react";
import { STATES_AND_UTS } from "../data/mockData";
import { Sparkles, Shield, User, Globe } from "lucide-react";

export default function Navbar({ role, setRole, selectedState, setSelectedState }) {
  const isAdmin = role === "admin";

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-300 border-b select-none ${
        isAdmin
          ? "bg-slate-950/80 backdrop-blur-md border-blue-500/20 text-white"
          : "bg-white/90 backdrop-blur-md border-slate-200 text-slate-800"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 sm:py-0 sm:h-16 gap-3">
          
          {/* Logo and Mobile Switcher Row */}
          <div className="flex items-center justify-between w-full sm:w-auto gap-4 min-w-0">
            {/* Left: Brand logo */}
            <div className="flex items-center gap-2 min-w-0">
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center font-black text-white text-base select-none shrink-0 shadow-md ${
                isAdmin
                  ? "bg-gradient-to-tr from-blue-600 to-cyan-500 ring-1 ring-blue-500/40 shadow-blue-500/20"
                  : "bg-gradient-to-tr from-indigo-900 to-indigo-650 shadow-indigo-600/10"
              }`}>
                JX
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-[17px] font-extrabold tracking-tight leading-none ${
                  isAdmin 
                    ? "bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent" 
                    : "text-indigo-950"
                }`}>
                  JanX
                </span>
                <span className={`text-[9px] font-medium tracking-wide truncate mt-1 ${
                  isAdmin ? "text-slate-400" : "text-slate-500"
                }`}>
                  Citizens • Representatives • Results
                </span>
              </div>
            </div>

            {/* Mobile Switcher (shown on phone screen) */}
            <div className={`flex sm:hidden items-center p-0.5 rounded-xl shrink-0 ${
              isAdmin ? "bg-slate-900 border border-slate-800" : "bg-slate-100 border border-slate-205"
            }`}>
              <button
                onClick={() => setRole("resident")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  !isAdmin
                    ? "bg-white text-indigo-805 shadow-sm"
                    : "text-slate-400"
                }`}
                title="View as Citizen"
              >
                Citizen
              </button>
              <button
                onClick={() => setRole("admin")}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  isAdmin
                    ? "bg-blue-600 text-white shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                    : "text-slate-600"
                }`}
                title="View as Representative"
              >
                MP Repo
              </button>
            </div>
          </div>

          {/* Center: State Selector */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto max-w-none sm:max-w-xs justify-center md:flex-1 md:max-w-sm">
            <Globe className={`h-4 w-4 shrink-0 ${isAdmin ? "text-blue-400" : "text-indigo-650"}`} />
            <div className="relative w-full">
              <select
                id="state-selector"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className={`w-full text-xs sm:text-sm pl-2.5 pr-8 py-1.5 rounded-lg border appearance-none font-semibold focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all cursor-pointer ${
                  isAdmin
                    ? "bg-slate-900/60 border-blue-500/20 text-slate-100 hover:border-blue-400/40 focus:ring-blue-500 focus:ring-offset-slate-900"
                    : "bg-slate-50 border-slate-300 text-slate-800 hover:border-indigo-500/50 focus:ring-indigo-650 focus:ring-offset-white"
                }`}
              >
                {STATES_AND_UTS.map((state) => (
                  <option key={state} value={state} className={isAdmin ? "bg-slate-950 text-white" : "bg-white text-slate-800"}>
                    {state}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Desktop Switcher: Segmented switch (hidden on mobile) */}
          <div className={`hidden sm:flex items-center p-0.5 rounded-xl shrink-0 ${
            isAdmin ? "bg-slate-900 border border-slate-800/80" : "bg-slate-100 border border-slate-200"
          }`}>
            <button
              onClick={() => setRole("resident")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isAdmin
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              <span>View as Citizen</span>
            </button>
            <button
              onClick={() => setRole("admin")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isAdmin
                  ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>View as Representative</span>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}
