import React, { useState, useEffect, useRef } from "react";
import Navbar from "./components/Navbar";
import ResidentPortal from "./components/ResidentPortal";
import MPDashboard from "./components/MPDashboard";
import AuthModal from "./components/AuthModal";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut, signInAnonymously } from "firebase/auth";
import { Lock, EyeOff, ShieldAlert, Sparkles } from "lucide-react";

export default function App() {
  const [role, setRole] = useState("resident"); // "resident" | "admin"
  const [selectedState, setSelectedState] = useState("Gujarat");
  const [currentUser, setCurrentUser] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState("resident"); 
  const [firebaseChecked, setFirebaseChecked] = useState(false);
  // Stores a submission callback to auto-fire after the user signs in
  const pendingSubmitRef = useRef(null);

  // Sync auth state
  useEffect(() => {
    // Check if firebase was configured
    if (!auth.config) {
      console.warn("Firebase config is empty. Active session will use local sandbox user.");
      setFirebaseChecked(true);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setFirebaseChecked(true);
    });

    return () => unsubscribe();
  }, []);

  // Standard safe logging out
  const handleLogOut = async () => {
    try {
      if (auth.config) {
        await signOut(auth);
      }
      setCurrentUser(null);
      // Reset role back to resident to guard data
      setRole("resident");
    } catch (err) {
      console.error("Sign Out Error:", err);
      setCurrentUser(null);
      setRole("resident");
    }
  };

  // onPendingSubmit: optional callback to fire automatically after auth succeeds
  const triggerAuthForResidentSubmit = (onPendingSubmit) => {
    if (onPendingSubmit) pendingSubmitRef.current = onPendingSubmit;
    setAuthModalTab("resident");
    setAuthModalOpen(true);
  };

  const triggerAuthForAdmin = () => {
    setAuthModalTab("admin");
    setAuthModalOpen(true);
  };

  // Simulating active sandbox developer bypass logins
  const simulateSandboxUser = (isAdminRole) => {
    const sandboxUser = {
      uid: isAdminRole ? "sandbox-admin-uid-101" : "sandbox-resident-uid-202",
      email: isAdminRole ? "admin@janx.gov.in" : null,
      isAnonymous: !isAdminRole,
      getIdToken: async (force) => "mock-jwt-sandbox-token-string-12345"
    };
    setCurrentUser(sandboxUser);
  };

  const isAdmin = role === "admin";
  const loginRequiredForAdmin = isAdmin && (!currentUser || currentUser.isAnonymous);

  return (
    <div
      className={`min-h-screen transition-colors duration-500 font-sans flex flex-col ${
        isAdmin 
          ? "bg-[#0D0F14] text-slate-100 selection:bg-blue-500 selection:text-white" 
          : "bg-[#F8F9FB] text-slate-800 selection:bg-indigo-500 selection:text-white"
      }`}
    >
      {/* Navbar */}
      <Navbar 
        role={role} 
        setRole={setRole} 
        selectedState={selectedState} 
        setSelectedState={setSelectedState} 
      />

      {/* Main Body view route container */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-2 py-4">
        
        {!isAdmin ? (
          /* VIEW A: RESIDENT PORTAL */
          <ResidentPortal 
            selectedState={selectedState} 
            currentUser={currentUser}
            onTriggerAuthModal={triggerAuthForResidentSubmit} 
          />
        ) : loginRequiredForAdmin ? (
          
          /* SECURE LOCKS ENTRY GATE SCREEN FOR MP DETAIL */
          <div className="max-w-md mx-auto my-16 p-8 border border-blue-500/20 bg-slate-950/80 backdrop-blur-md rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.15)] text-center animate-slide-up">
            
            <div className="h-16 w-16 mx-auto rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-6 animate-pulse">
              <Lock className="h-7 w-7" />
            </div>

            <h2 className="text-xl font-bold bg-gradient-to-r from-white to-slate-450 bg-clip-text text-transparent">
              MP Command Core Restricted
            </h2>
            
            <p className="text-slate-400 text-sm mt-3 leading-relaxed">
              Exposing constituent dashboard metrics requires high authority credentials. Anonymous visitor profiles cannot review census checklists.
            </p>

            <div className="mt-8 space-y-4">
              <button
                onClick={triggerAuthForAdmin}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]"
              >
                Unlock Administrator Desk
              </button>
              
              <button
                onClick={() => simulateSandboxUser(true)}
                className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 text-xs font-semibold rounded-lg transition-colors"
                title="Bypass Firebase service login for direct previewing"
              >
                🚧 Bypass Authentication (Sandbox Mode)
              </button>
            </div>

            <div className="mt-6 text-[10px] text-slate-500 font-mono">
              Demo bypass uses mock JSON Web Token credentials.
            </div>

          </div>
        ) : (
          /* VIEW B: MP COMMAND VIEW CORE */
          <MPDashboard 
            selectedState={selectedState} 
            currentUser={currentUser} 
            onLogOut={handleLogOut} 
          />
        )}

      </main>

      {/* Footer bar */}
      <footer className={`py-6 text-center text-[11px] font-medium border-t tracking-wide transition-colors duration-500 ${
        isAdmin 
          ? "border-slate-900 bg-slate-950/20 text-slate-500" 
          : "border-slate-200 bg-slate-100/30 text-slate-500"
      }`}>
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <span>
            © 2026 JanX Civic Desk. Built with React + Tailwind CSS.
          </span>
          <div className="flex items-center gap-4">
            <span className="cursor-help hover:underline">Privacy Charter</span>
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span className="cursor-help hover:underline">Code of Practice</span>
          </div>
        </div>
      </footer>

      {/* Authentication Popup Modal Portal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        defaultTab={authModalTab}
        onLoginSuccess={() => {
          // After modal closes, auth.currentUser may still be null if Firebase
          // rejected the credentials (e.g. fake API key in .env for local dev).
          // In that case we fall back to a local sandbox user so the UI stays functional.
          setTimeout(() => {
            let resolvedUser;
            if (!auth.currentUser) {
              const sandboxUser = {
                uid: authModalTab === "admin" ? "sandbox-admin-uid-101" : "sandbox-resident-uid-202",
                email: authModalTab === "admin" ? "admin@janx.gov.in" : null,
                isAnonymous: authModalTab !== "admin",
                getIdToken: async () => "mock-jwt-sandbox-token-string-12345"
              };
              setCurrentUser(sandboxUser);
              resolvedUser = sandboxUser;
            } else {
              setCurrentUser(auth.currentUser);
              resolvedUser = auth.currentUser;
            }
            // Auto-fire any pending form submission that triggered the auth prompt
            if (pendingSubmitRef.current) {
              const fn = pendingSubmitRef.current;
              pendingSubmitRef.current = null;
              // Give React one tick to update currentUser before re-running submit
              setTimeout(() => fn(resolvedUser), 50);
            }
          }, 200);
        }}
      />
    </div>
  );
}
