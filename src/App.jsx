import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Header from "./components/Header";
import Gateway from "./pages/Gateway";
import LandingPage from "./pages/LandingPage";
import SubmitDispute from "./pages/SubmitDispute";
import OpenDisputes from "./pages/OpenDisputes";
import DisputeDetail from "./pages/DisputeDetail";
import MyDisputes from "./pages/MyDisputes";
import MyEarnings from "./pages/MyEarnings";
import WalletConnect from "./pages/WalletConnect";
import BecomeReviewer from "./pages/BecomeReviewer";
import EscalationQueue from "./pages/EscalationQueue";
import ReviewDispute from "./pages/ReviewDispute";

function App() {
  // Use sessionStorage so that refresh during development doesn't force re-entry
  const [hasEntered, setHasEntered] = useState(() => {
    return sessionStorage.getItem("verdict_entered") === "true";
  });

  const handleEnter = () => {
    sessionStorage.setItem("verdict_entered", "true");
    setHasEntered(true);
  };

  if (!hasEntered) {
    return <Gateway onEnter={handleEnter} />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#0d0f1a] dark:bg-base flex flex-col md:flex-row text-textMain transition-all duration-250 relative">
        {/* Ambient Glow Blobs - GPU Composite Optimized */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" style={{ transform: "translate3d(0, 0, 0)" }}>
          {/* Deep blue blob, bottom-left corner */}
          <div 
            className="absolute -bottom-40 -left-40 w-[550px] h-[550px] bg-[#1a3a8f] opacity-12 rounded-full filter blur-[140px]" 
            style={{ transform: "translate3d(0, 0, 0)", willChange: "transform" }}
          />
          {/* Purple blob, top-right corner */}
          <div 
            className="absolute -top-40 -right-40 w-[550px] h-[550px] bg-[#6b21a8] opacity-8 rounded-full filter blur-[140px]" 
            style={{ transform: "translate3d(0, 0, 0)", willChange: "transform" }}
          />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row w-full min-h-screen">
          <Navbar />
          {/* Main Content Column */}
          <div className="flex-1 md:pl-[240px] flex flex-col min-h-screen relative z-10">
            <Header />
            <main className="flex-1 w-full relative z-10">
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/submit" element={<SubmitDispute />} />
                <Route path="/disputes" element={<OpenDisputes />} />
                <Route path="/disputes/:id" element={<DisputeDetail />} />
                <Route path="/my-disputes" element={<MyDisputes />} />
                <Route path="/earnings" element={<MyEarnings />} />
                <Route path="/wallet" element={<WalletConnect />} />
                <Route path="/become-reviewer" element={<BecomeReviewer />} />
                <Route path="/escalation-queue" element={<EscalationQueue />} />
                <Route path="/review/:id" element={<ReviewDispute />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
