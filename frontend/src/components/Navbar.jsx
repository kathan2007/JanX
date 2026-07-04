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
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Brand logo */}
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-2 rounded-lg flex items-center justify-center transition-all ${
              isAdmin
                ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/40"
                : "bg-indigo-600/10 text-indigo-600"
            }`}>
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`text-xl font-bold tracking-tight leading-none ${
                isAdmin 
                  ? "bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent" 
                  : "text-indigo-900"
              }`}>
                JanX
              </span>
              <span className={`text-[10px] font-medium tracking-wide truncate ${
                isAdmin ? "text-slate-400" : "text-slate-500"
              }`}>
                Code for Communities
              </span>
            </div>
          </div>

          {/* Center: State Selector */}
          <div className="flex items-center gap-1.5 flex-1 max-w-xs sm:max-w-sm justify-center">
            <Globe className={`h-4 w-4 shrink-0 ${isAdmin ? "text-blue-400" : "text-indigo-600"}`} />
            <div className="relative w-full">
              <select
                id="state-selector"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className={`w-full text-xs sm:text-sm pl-2.5 pr-8 py-1.5 rounded-lg border appearance-none font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all cursor-pointer ${
                  isAdmin
                    ? "bg-slate-900/60 border-blue-500/20 text-slate-100 hover:border-blue-400/40 focus:ring-blue-500 focus:ring-offset-slate-900"
                    : "bg-slate-50 border-slate-300 text-slate-800 hover:border-indigo-500/50 focus:ring-indigo-600 focus:ring-offset-white"
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

          {/* Right: segmented switch */}
          <div className={`flex items-center p-0.5 rounded-xl shrink-0 ${
            isAdmin ? "bg-slate-900 border border-slate-800/80" : "bg-slate-100 border border-slate-200"
          }`}>
            <button
              onClick={() => setRole("resident")}
              className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                !isAdmin
                  ? "bg-white text-indigo-700 shadow-sm border border-slate-200/50"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
              title="Resident Portal"
            >
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Resident</span>
            </button>
            <button
              onClick={() => setRole("admin")}
              className={`flex items-center gap-1.5 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                isAdmin
                  ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
              }`}
              title="MP / Admin Panel"
            >
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">MP / Admin</span>
            </button>
          </div>

        </div>
      </div>
    </nav>
  );
}
