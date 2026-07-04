import React, { useState } from "react";
import { auth } from "../firebase";
import { signInAnonymously, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { Shield, User, Loader2, X, Lock, CheckCircle } from "lucide-react";

export default function AuthModal({ isOpen, onClose, defaultTab = "resident", onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState(defaultTab); // "resident" | "admin"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      // Try real Firebase anonymous sign-in first
      await signInAnonymously(auth);
      if (onLoginSuccess) onLoginSuccess();
      onClose();
    } catch (err) {
      // Firebase rejected (e.g. mock API key in local dev) — use sandbox session instead
      console.warn("Firebase unavailable, using local sandbox session.");
      // Brief visual delay so the spinner shows the action happened
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (onLoginSuccess) onLoginSuccess();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !password) {
      setError("Please fill out all fields.");
      setLoading(false);
      return;
    }

    // Local credential check first (works in sandbox / local dev without Firebase)
    const isValidDemo = email === "admin@janx.gov.in" && password === "admin123";

    try {
      if (isValidDemo) {
        // Try Firebase first; if it fails (mock keys), still allow entry
        await signInWithEmailAndPassword(auth, email, password).catch(() => {
          console.warn("Firebase admin auth failed, accepting demo credentials locally.");
        });
        if (onLoginSuccess) onLoginSuccess();
        onClose();
      } else {
        // Wrong credentials — show a clear error
        setError("Invalid credentials. Demo login: admin@janx.gov.in / admin123");
      }
    } catch (err) {
      setError("Login failed. Use admin@janx.gov.in / admin123 for demo access.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div 
        className={`w-full max-w-md overflow-hidden rounded-2xl border transition-all duration-300 ${
          activeTab === "admin" 
            ? "bg-slate-900 border-blue-500/30 text-white shadow-[0_0_24px_rgba(59,130,246,0.15)]" 
            : "bg-white border-slate-200 text-slate-800 shadow-xl"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-inherit">
          <div className="flex items-center gap-2">
            <Lock className={`h-5 w-5 ${activeTab === "admin" ? "text-blue-400" : "text-indigo-600"}`} />
            <h3 className="text-lg font-bold">Account Verification</h3>
          </div>
          <button 
            onClick={onClose} 
            className={`p-1.5 rounded-lg hover:bg-slate-500/10 transition-colors ${
              activeTab === "admin" ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 m-4 rounded-xl bg-slate-500/10 border border-slate-500/5">
          <button
            onClick={() => { setActiveTab("resident"); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "resident" 
                ? "bg-white text-indigo-700 shadow-sm" 
                : "text-slate-400 hover:text-slate-350"
            }`}
          >
            <User className="h-3.5 w-3.5" />
            Resident Portal
          </button>
          <button
            onClick={() => { setActiveTab("admin"); setError(""); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "admin" 
                ? "bg-blue-600 text-white shadow-sm" 
                : "text-slate-500 hover:text-slate-350"
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            MP Office Admin
          </button>
        </div>

        {/* Form Body */}
        <div className="px-6 pb-6 pt-2">
          {error && (
            <div className={`p-3 mb-4 text-xs font-semibold rounded-lg border ${
              activeTab === "admin" 
                ? "bg-red-500/10 border-red-500/35 text-red-300" 
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {error}
            </div>
          )}

          {activeTab === "resident" ? (
            <div className="space-y-4">
              <p className="text-sm text-slate-500 leading-relaxed">
                Submissions are logged securely. You can sign in instantly to file your development requests to your local MP's prioritize desk.
              </p>
              
              <button
                onClick={handleAnonymousSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 rounded-xl transition-all shadow-md hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in Anonymously...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Instant Resident Sign-In
                  </>
                )}
              </button>
              
              <p className="text-[10px] text-center text-slate-400">
                No email or password needed. Auto-claims an anonymous session.
              </p>
            </div>
          ) : (
            <form onSubmit={handleAdminSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  MP/Admin Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@janx.gov.in"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Security Access Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-650 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <span className="block text-[10px] mt-1 text-slate-500">
                  Demo auth: <b>admin@janx.gov.in</b> / <b>admin123</b>
                </span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 font-semibold text-white bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-950"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Checking Credentials...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    Authorize Admin Access
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
