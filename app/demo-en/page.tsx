"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useState as useStateNav } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Link from "next/link";
import {
  Facebook,
  Instagram,
  Youtube,
  Linkedin,
  Lock,
  Star,
  Zap,
} from "lucide-react";

// Screen identifiers
const SCREENS = ["job", "candidate", "interview", "assessment"] as const;

type Screen = (typeof SCREENS)[number];

const defaultJobDescription = `Key Responsibilities:
- Design and develop RPA bots using UiPath/Automation Anywhere.
- Analyze business processes for automation opportunities.
- Deploy, monitor and maintain production bots.
- Collaborate with business teams to gather requirements.`

const initialScores = {
  technical: 7,
  communication: 8,
  problemSolving: 7,
  leadership: 6,
  cultural: 8,
  conduct: 8,
};

const initialNotes = `Based on the interview evaluation, here are the key observations:

• Strong communication skills and professional conduct
• Good understanding of RPA fundamentals and UiPath
• Shows enthusiasm and cultural alignment
• Areas for growth in advanced technical skills`;

function buildQuestionPlan(jobTitle: string, jobDescription: string, resume: string) {
  const title = jobTitle.trim() || "the open role";
  const sentences = jobDescription
    .split(/\r?\n|•|\u2022|\-/)
    .map((line) => line.replace(/^[^a-zA-Z0-9]+/, "").trim())
    .filter((line) => line.length > 0);
  const unique: string[] = [];
  sentences.forEach((line) => {
    const normalized = line.toLowerCase();
    if (!unique.some((existing) => existing.toLowerCase() === normalized)) {
      unique.push(line);
    }
  });

  const baseQuestions = unique.slice(0, 5).map((line) => {
    return `Can you walk me through a recent project where you ${line.toLowerCase()}?`;
  });

  if (baseQuestions.length < 3) {
    baseQuestions.push(
      `What makes you a strong fit for the ${title}, and how does your background align with the key responsibilities?`
    );
    baseQuestions.push(`How do you stay current with trends that impact success in a ${title}?`);
  }

  if (resume.trim()) {
    baseQuestions.push(
      `I noticed in your resume: ${resume.trim().split(/\r?\n/)[0]}. Can you elaborate on how that experience prepares you for this ${title}?`
    );
  }

  return baseQuestions.slice(0, 6);
}

export default function DemoEnPage() {
  const router = useRouter();
  // ALL hooks must be called at the top before any conditional returns
  const [screen, setScreen] = useState<Screen>("job");
  const { user, loading } = useAuth();
  
  // Job + candidate state
  const [jobTitle, setJobTitle] = useState("RPA Developer");
  const [jobDescription, setJobDescription] = useState(defaultJobDescription);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Resume state
  const [resumeFileName, setResumeFileName] = useState<string>("");
  const [resumeText, setResumeText] = useState<string>("");

  // WebRTC state
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const [pc, setPc] = useState<RTCPeerConnection | null>(null);
  const [dc, setDc] = useState<RTCDataChannel | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [sharingScreen, setSharingScreen] = useState(false);
  const [running, setRunning] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  // Transcript state
  const [transcript, setTranscript] = useState<string[]>([]);
  const questionElRef = useRef<HTMLDivElement | null>(null);
  const currentBufferRef = useRef<string>("");

  // Assessment state
  const [scores, setScores] = useState(initialScores);
  const [generalNotes, setGeneralNotes] = useState(initialNotes);

  const [initialLoading, setInitialLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  
  // Job Details tabs state and refs
  const [activeJobTab, setActiveJobTab] = useState(0);
  const basicInfoRef = useRef<HTMLDivElement>(null);
  const requirementsRef = useRef<HTMLDivElement>(null);
  const responsibilitiesRef = useRef<HTMLDivElement>(null);
  const compensationRef = useRef<HTMLDivElement>(null);
  const visaRef = useRef<HTMLDivElement>(null);
  const resumeScreeningRef = useRef<HTMLDivElement>(null);
  const interviewProcessRef = useRef<HTMLDivElement>(null);
  
  const jobTabRefs = [basicInfoRef, requirementsRef, responsibilitiesRef, compensationRef, visaRef, resumeScreeningRef, interviewProcessRef];
  
  const scrollToSection = (index: number) => {
    setActiveJobTab(index);
    const ref = jobTabRefs[index];
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  // useMemo hooks must also be called before conditional returns
  const questionPlan = useMemo(
    () => buildQuestionPlan(jobTitle, jobDescription, resumeText),
    [jobTitle, jobDescription, resumeText]
  );

  const totalScore = useMemo(() => {
    const vals = Object.values(scores);
    if (!vals.length) return 0;
    return Math.round((vals.reduce((a, b) => a + b, 0) * 10) / vals.length);
  }, [scores]);

  const candidateName = useMemo(() => {
    const n = `${firstName} ${lastName}`.trim();
    return n || "Candidate";
  }, [firstName, lastName]);
  
  useEffect(() => {
    setHydrated(true);
    const timer = window.setTimeout(() => setInitialLoading(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // Early returns after all hooks are called
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  function resetInterview() {
    setTranscript([]);
    currentBufferRef.current = "";
    if (questionElRef.current) {
      const content = questionElRef.current.querySelector(
        ".message-content"
      ) as HTMLDivElement | null;
      if (content) {
        const introRole = jobTitle.trim() || "this role";
        content.textContent = `Welcome to your ${introRole} interview. I'll be asking you some questions about your experience and skills. Ready to begin?`;
      }
    }
  }

  function appendTranscript(line: string) {
    setTranscript((prev) => [...prev, line]);
  }

  function handleResume(file: File) {
    setResumeFileName(file.name);
    if (file.type?.startsWith("text")) {
      const reader = new FileReader();
      reader.onload = (e) => setResumeText(String(e.target?.result || ""));
      reader.readAsText(file);
    } else {
      setResumeText("");
    }
  }

  async function startSession() {
    setRunning(true);
    try {
      const resp = await fetch("/api/azure/session", { method: "POST" });
      if (!resp.ok) throw new Error("Failed to create session");
      const data = await resp.json();
      const clientSecret: string | undefined = data?.client_secret?.value;
      if (!clientSecret) throw new Error("No client_secret returned");

      const roleLabel = jobTitle.trim() || "the open role";
      const normalizedDescription = jobDescription.trim().replace(/\s+/g, " ");
      const truncatedDescription = normalizedDescription.slice(0, 1200);
      const resumeSummary = resumeText.trim()
        ? resumeText.trim().replace(/\s+/g, " ").slice(0, 600)
        : "No resume text provided.";
      const planString = questionPlan.map((q, idx) => `${idx + 1}. ${q}`).join(" ");
      const interviewInstructions = `You are an English-speaking AI interviewer evaluating a candidate for the ${roleLabel}. Base every question on the responsibilities and skills in this job description: ${truncatedDescription}. Use the candidate resume summary as supporting context: ${resumeSummary}. Your planned questioning outline is: ${planString}. Ask one question at a time, reference concrete responsibilities, probe for examples, and stay professional throughout. Do not deviate from the plan unless the candidate's answer requires a follow-up about the same responsibility.`;
      const kickoffPrompt = `Interview focus: ${roleLabel}. Responsibilities: ${truncatedDescription}. Use this question plan: ${planString}. Start by greeting the candidate, then ask question 1 from the plan. After each answer, ask the next question, adapting only if you need a clarification tied to the same responsibility.`;

      const peer = new RTCPeerConnection();
      setPc(peer);

      const channel = peer.createDataChannel("realtime-channel");
      setDc(channel);

      channel.onopen = () => {
        console.log("Data channel open");
        channel.send(
          JSON.stringify({
            type: "session.update",
            session: {
              instructions: interviewInstructions,
            },
          })
        );
        channel.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "message",
              role: "system",
              content: [
                {
                  type: "input_text",
                  text: kickoffPrompt,
                },
              ],
            },
          })
        );
        channel.send(
          JSON.stringify({
            type: "response.create",
          })
        );
      };
      channel.onmessage = (event) => {
        try {
          const obj = JSON.parse(event.data);
          const type = String(obj?.type || "");

          const delta = extractEventText(obj);
          if (
            type.includes(".delta") ||
            type.includes("content_part") ||
            type.includes("audio_transcript")
          ) {
            if (delta?.trim()) {
              currentBufferRef.current += delta;
              renderQuestion(currentBufferRef.current);
            }
            return;
          }

          if (
            type.endsWith(".done") ||
            type === "response" ||
            type === "response.output_text" ||
            type === "response.done" ||
            type.includes("output_item")
          ) {
            const finalText = delta || currentBufferRef.current;
            if (finalText?.trim()) {
              renderQuestion(finalText);
              const trimmed = String(finalText).trim();
              const last = transcript[transcript.length - 1];
              if (!last || !last.endsWith(trimmed)) {
                appendTranscript(`AI: ${trimmed}`);
              }
            }
            currentBufferRef.current = "";
            return;
          }

          if (delta?.trim()) {
            renderQuestion(delta);
            appendTranscript(`AI: ${String(delta)}`);
            currentBufferRef.current = "";
            return;
          }
        } catch {
          const text = String(event.data);
          renderQuestion(text);
          appendTranscript(`AI: ${text}`);
          currentBufferRef.current = "";
        }
      };

      peer.ontrack = (event) => {
        const stream = event.streams[0];
        if (!stream) return;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
      };

      const local = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      local.getAudioTracks().forEach((track) => (track.enabled = true));
      local.getVideoTracks().forEach((track) => (track.enabled = true));
      setMicMuted(false);
      setCameraOff(false);
      setLocalStream(local);
      if (localVideoRef.current) localVideoRef.current.srcObject = local;
      local.getTracks().forEach((t) => peer.addTrack(t, local));

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);

      const rtcUrl = process.env.NEXT_PUBLIC_AZURE_REALTIME_RTC_URL!;
      const model = process.env.NEXT_PUBLIC_AZURE_REALTIME_DEPLOYMENT!;

      const sdpResp = await fetch(`${rtcUrl}?model=${encodeURIComponent(model)}`, {
        method: "POST",
        body: offer.sdp!,
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          "Content-Type": "application/sdp",
        },
      });
      if (!sdpResp.ok) {
        throw new Error(`Azure RTC negotiation failed: ${await sdpResp.text()}`);
      }
      const answer = { type: "answer" as const, sdp: await sdpResp.text() };
      await peer.setRemoteDescription(answer);

      setScreen("interview");
      resetInterview();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to start interview");
      setRunning(false);
    setMicMuted(false);
    setCameraOff(false);
    }
  }

  function renderQuestion(text: string) {
    if (!questionElRef.current) return;
    const content = questionElRef.current.querySelector(
      ".message-content"
    ) as HTMLDivElement | null;
    if (content) content.textContent = text;
  }

  function stopSession() {
    try {
      dc?.close();
    } catch {}
    try {
      pc?.close();
    } catch {}
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop());
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setDc(null);
    setPc(null);
    setLocalStream(null);
    setScreenStream(null);
    setSharingScreen(false);
    setRunning(false);

    setScreen("assessment");
  }

  async function toggleScreenShare(peer: RTCPeerConnection | null) {
    if (!peer || !localStream) return;
    const cameraTrack = localStream.getVideoTracks()[0];

    if (sharingScreen) {
      screenStream?.getTracks().forEach((track) => {
        track.stop();
      });

      peer.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "video" && cameraTrack) {
          sender.replaceTrack(cameraTrack);
        }
      });

      setScreenStream(null);
      setSharingScreen(false);

      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      return;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const [screenTrack] = displayStream.getVideoTracks();
      if (!screenTrack) return;

      peer.getSenders().forEach((sender) => {
        if (sender.track && sender.track.kind === "video") {
          sender.replaceTrack(screenTrack);
        }
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = displayStream;
      }

      screenTrack.onended = () => {
        toggleScreenShare(peer).catch(() => undefined);
      };

      setScreenStream(displayStream);
      setSharingScreen(true);
    } catch (error) {
      console.error("Screen share error", error);
    }
  }

  async function exportPdf() {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF("p", "pt", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const addTitle = (txt: string) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(txt, margin, y);
        y += 28;
      };
      const addText = (txt: string, fs = 12) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(fs);
        const lines = doc.splitTextToSize(txt, contentWidth);
        doc.text(lines, margin, y);
        y += lines.length * (fs * 1.2) + 10;
      };

      addTitle("AI Recruiter - Interview Report");
      addText(`Report Generated: ${new Date().toLocaleString()}`);

      addTitle("Job Details");
      addText(`Position: ${jobTitle || "-"}`);
      addText("Job Description:");
      addText(jobDescription || "-");

      addTitle("Candidate Information");
      addText(`Name: ${candidateName}`);
      if (resumeFileName) addText(`Resume: ${resumeFileName}`);
      if (resumeText) {
        addText("Resume Content:");
        addText(resumeText);
      }

      addTitle("Evaluation Summary");
      addText(generalNotes);

      const blocks: Array<[string, number]> = [
        ["Technical Expertise", scores.technical],
        ["Communication Skills", scores.communication],
        ["Problem Solving", scores.problemSolving],
        ["Leadership Potential", scores.leadership],
        ["Cultural Fit", scores.cultural],
        ["Professional Conduct", scores.conduct],
      ];
      for (const [label, val] of blocks) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(`${label} - ${val}/10`, margin, y);
        y += 20;
      }

      doc.addPage();
      y = margin;
      addTitle("Interview Transcript");
      for (const line of transcript) {
        addText(line, 11);
      }

      const safeName = (firstName || lastName
        ? `${firstName}_${lastName}`
        : "candidate").replace(/\s+/g, "_");
      doc.save(`${safeName}_interview_report.pdf`);
    } catch (error) {
      console.error("PDF export error:", error);
      alert("Failed to export PDF. Please try again.");
    }
  }

  function extractEventText(obj: any): string {
    if (!obj) return "";
    if (typeof obj === "string") return obj;
    if (obj.delta) return obj.delta;
    if (obj.output_text) return obj.output_text;
    if (obj.transcript) return obj.transcript;
    if (obj.item?.content) {
      const c = obj.item.content;
      if (typeof c === "string") return c;
      if (Array.isArray(c))
        return c.map((x) => x?.text || x?.content || "").join(" ");
      if (c?.text) return c.text;
    }
    if (obj.item?.text) return obj.item.text;
    try {
      const found = JSON.stringify(obj).match(/"text":"([^"]+)"/g);
      if (found)
        return found.map((s) => s.replace(/\"text\":\"|\"/g, "")).join(" ");
    } catch {}
    return "";
  }

  const canNextFromJob = jobTitle.trim().length > 0;

  function goToNext(next: Screen) {
    setScreen(next);
    if (next === "interview") resetInterview();
  }

  if (!hydrated) {
    return (
      <div className="page-wrap page-wrap--loading">
        <div className="initial-loading">
          <div className="initial-loading__spinner" />
          <p className="initial-loading__text">Preparing demo experience…</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`page-wrap ${initialLoading ? "page-wrap--loading" : ""}`}>
      <Navbar />
      
      {/* Announcement Banner */}
      <div className="bg-emerald-50 border-b border-emerald-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-2 text-emerald-800">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">HireGenAI Launches All-New AI-Powered Recruitment Suite</span>
            </div>
          </div>
        </div>
      </div>
      {initialLoading && (
        <div className="initial-loading">
          <div className="initial-loading__spinner" />
          <p className="initial-loading__text">Preparing demo experience…</p>
        </div>
      )}
      <div className="bg-ornament bg-ornament-1" />
      <div className="bg-ornament bg-ornament-2" />
      <div className="content-shell">
        {/* progress */}
        <div className="progress-bar">
          {SCREENS.map((s, i) => {
            const idx = i + 1;
            const current = SCREENS.indexOf(screen) + 1;
            const cls = idx === current ? "active" : idx < current ? "completed" : "";
            return (
              <div key={s} className={`progress-step ${cls}`} data-step={idx}>
                <div className="step-number">{idx}</div>
                <div className="step-label">
                  {s === "job" && (
                    <>
                      Job Details
                      <br />
                      (as a recruiter)
                    </>
                  )}
                  {s === "candidate" && (
                    <>
                      Candidate Details
                      <br />
                      (as a candidate)
                    </>
                  )}
                  {s === "interview" && (
                    <>
                      AI Interview
                      <br />
                      (as a candidate)
                    </>
                  )}
                  {s === "assessment" && (
                    <>
                      Assessment Report
                      <br />
                      (as a recruiter)
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* header */}
        <div className="app-header">
          <p className="badge">Interactive Demo</p>
          <h1>Hello HireGenAI</h1>
          <p className="subtitle">
            Experience the end-to-end AI interview with real-time voice, dynamic questions,
            and instant evaluation insights.
          </p>
        </div>

        {/* job screen */}
        {screen === "job" && (
          <section className="screen" style={{ maxWidth: 1000 }}>
            <div className="card" style={{ padding: "28px 32px" }}>
              <h2>Job Details</h2>
              
              {/* Demo Preview Notice and Next Button */}
              <div className="demo-notice-box">
                <div className="demo-notice-content">
                  <span style={{ fontSize: 16 }}>ℹ️</span>
                  <span style={{ fontSize: 13, color: "#92400e" }}>
                    This is a demo preview. All fields are pre-filled and read-only for the RPA Developer position.
                  </span>
                </div>
                <button
                  className="btn btn-next"
                  disabled={!canNextFromJob}
                  onClick={() => goToNext("candidate")}
                >
                  Next
                </button>
              </div>
              
              {/* Job Status Bar */}
              <div className="job-status-bar">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>Job Status</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>Set whether the job is open, on hold, or closed</div>
                </div>
                <div style={{ 
                  padding: "6px 16px", 
                  background: "#dcfce7", 
                  color: "#166534", 
                  borderRadius: 6, 
                  fontSize: 13, 
                  fontWeight: 600 
                }}>
                  Open
                </div>
              </div>

              {/* Tabs */}
              <div className="job-tabs-container">
                {["Basic Info", "Requirements", "Responsibilities", "Compensation", "Visa & Others", "Resume Screening", "Interview Process"].map((tab, idx) => (
                  <div 
                    key={tab}
                    onClick={() => scrollToSection(idx)}
                    className={`job-tab ${activeJobTab === idx ? 'active' : ''}`}
                  >
                    {tab}
                  </div>
                ))}
              </div>

              {/* Basic Information Section */}
              <div ref={basicInfoRef} className="form-section">
                <div className="section-header">
                  <span className="section-header-icon">💼</span>
                  <div>
                    <div className="section-header-title">Basic Information</div>
                    <div className="section-header-subtitle">Enter the fundamental details about the job position</div>
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="input-label">Job Title *</label>
                    <input
                      className="form-input"
                      value="RPA Developer"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Company *</label>
                    <input
                      className="form-input"
                      value="HireGenAI Demo"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="input-label">Location *</label>
                    <input
                      className="form-input"
                      value="Remote / San Francisco, CA"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Work Arrangement *</label>
                    <input
                      className="form-input"
                      value="Full-time"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Job Level / Seniority</label>
                  <input
                    className="form-input"
                    value="Mid-level"
                    readOnly
                    style={{ background: "#f8fafc", cursor: "default" }}
                  />
                </div>
              </div>

              {/* Requirements Section */}
              <div ref={requirementsRef} style={{ marginBottom: 24, scrollMarginTop: 100 }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8, 
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: "1px solid #e2e8f0"
                }}>
                  <span style={{ fontSize: 18 }}>🎯</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: "#1e293b" }}>Requirements</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Describe the background and skills expected</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label className="input-label">Educational Background</label>
                    <input
                      className="form-input"
                      value="Bachelor's in Computer Science, IT, or related field"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Years of Experience</label>
                    <input
                      className="form-input"
                      value="3-5 years"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="input-label">Technical Skills</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value="UiPath, Automation Anywhere, Blue Prism, Python, .NET, SQL, REST APIs, Process Mining Tools"
                    readOnly
                    style={{ background: "#f8fafc", cursor: "default", resize: "none" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="input-label">Must-Have Skills</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value="UiPath Studio development&#10;Process analysis and documentation&#10;Bot deployment and monitoring&#10;Exception handling and logging"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default", resize: "none" }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Nice-to-Have Skills</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value="Blue Prism or Automation Anywhere&#10;Machine Learning integration&#10;OCR and Document Understanding&#10;Orchestrator administration"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default", resize: "none" }}
                    />
                  </div>
                </div>
              </div>

              {/* Responsibilities Section */}
              <div ref={responsibilitiesRef} style={{ marginBottom: 24, scrollMarginTop: 100 }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8, 
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: "1px solid #e2e8f0"
                }}>
                  <span style={{ fontSize: 18 }}>👥</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: "#1e293b" }}>Responsibilities</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Outline what the role will do</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="input-label">Day-to-Day Duties</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    value="Design and develop RPA bots using UiPath/Automation Anywhere&#10;Analyze business processes for automation opportunities&#10;Deploy, monitor and maintain production bots&#10;Collaborate with business teams to gather requirements"
                    readOnly
                    style={{ background: "#f8fafc", cursor: "default", resize: "none" }}
                  />
                </div>

                <div>
                  <label className="input-label">Team Collaboration / Stakeholders</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value="Business Analysts, IT Infrastructure team, Process Owners, QA team"
                    readOnly
                    style={{ background: "#f8fafc", cursor: "default", resize: "none" }}
                  />
                </div>
              </div>

              {/* Compensation Section */}
              <div ref={compensationRef} style={{ marginBottom: 24, scrollMarginTop: 100 }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8, 
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: "1px solid #e2e8f0"
                }}>
                  <span style={{ fontSize: 18 }}>🏢</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: "#1e293b" }}>Compensation & Benefits</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Share ranges only if you intend to publish them</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label className="input-label">Salary Min</label>
                    <input
                      className="form-input"
                      value="$85,000"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Salary Max</label>
                    <input
                      className="form-input"
                      value="$120,000"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Period</label>
                    <input
                      className="form-input"
                      value="Yearly"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Perks & Benefits</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value="Health insurance, 401(k) matching, Remote work flexibility, Professional development budget, Wellness programs"
                    readOnly
                    style={{ background: "#f8fafc", cursor: "default", resize: "none" }}
                  />
                </div>
              </div>

              {/* Visa & Others Section */}
              <div ref={visaRef} style={{ marginBottom: 24, scrollMarginTop: 100 }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8, 
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: "1px solid #e2e8f0"
                }}>
                  <span style={{ fontSize: 18 }}>🌍</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: "#1e293b" }}>Visa & Others</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Specify visa sponsorship and other requirements</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div>
                    <label className="input-label">Visa Sponsorship</label>
                    <input
                      className="form-input"
                      value="Available for qualified candidates"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Work Authorization</label>
                    <input
                      className="form-input"
                      value="US work authorization required"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                </div>
              </div>

              {/* Resume Screening Section */}
              <div ref={resumeScreeningRef} style={{ marginBottom: 24, scrollMarginTop: 100 }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8, 
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: "1px solid #e2e8f0"
                }}>
                  <span style={{ fontSize: 18 }}>📋</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: "#1e293b" }}>Resume Screening</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>AI-powered resume screening criteria</div>
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="input-label">Screening Criteria</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    value="Minimum 3 years RPA development experience&#10;UiPath Advanced Developer Certification&#10;Strong problem-solving skills&#10;Experience with enterprise automation projects"
                    readOnly
                    style={{ background: "#f8fafc", cursor: "default", resize: "none" }}
                  />
                </div>

                <div>
                  <label className="input-label">Auto-Reject Criteria</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    value="No RPA tool experience&#10;Unable to work in specified timezone"
                    readOnly
                    style={{ background: "#f8fafc", cursor: "default", resize: "none" }}
                  />
                </div>
              </div>

              {/* Interview Process Section */}
              <div ref={interviewProcessRef} style={{ marginBottom: 24, scrollMarginTop: 100 }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8, 
                  marginBottom: 16,
                  paddingBottom: 12,
                  borderBottom: "1px solid #e2e8f0"
                }}>
                  <span style={{ fontSize: 18 }}>🤖</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16, color: "#1e293b" }}>Interview Process</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Configure the interview rounds and process for this position</div>
                  </div>
                </div>

                <div style={{ 
                  border: "2px solid #3b82f6", 
                  borderRadius: 12, 
                  padding: 16, 
                  background: "#eff6ff"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    <input type="checkbox" checked readOnly style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 18 }}>🤖</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: "#1e293b" }}>Screening Agent</div>
                      <div style={{ fontSize: 11, color: "#64748b" }}>Initial candidate screening and basic qualification assessment</div>
                    </div>
                    <div style={{ marginLeft: "auto", fontSize: 11, color: "#64748b" }}>Phone/Video • 30 min • Pass/Fail + notes</div>
                  </div>

                  <div style={{ 
                    background: "#fff", 
                    borderRadius: 8, 
                    padding: 16,
                    borderTop: "1px solid #e2e8f0"
                  }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#1e293b" }}>Interview Questions (5)</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          "Can you walk me through your experience with UiPath and Automation Anywhere?",
                          "How do you approach analyzing a business process for automation feasibility?",
                          "Describe a complex RPA bot you've developed and the challenges you faced.",
                          "How do you handle exceptions and error logging in your automation workflows?",
                          "What is your experience with Orchestrator and bot deployment in production?"
                        ].map((q, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 12, color: "#64748b", minWidth: 20 }}>{i + 1}.</span>
                            <input
                              className="form-input"
                              value={q}
                              readOnly
                              style={{ background: "#f8fafc", cursor: "default", fontSize: 13, padding: "8px 12px" }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: "#1e293b" }}>Evaluation Criteria</div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {["Technical Skills", "Problem Solving", "Communication", "Process Analysis", "Team Collaboration"].map((c) => (
                          <span 
                            key={c}
                            style={{
                              padding: "4px 12px",
                              background: "#f1f5f9",
                              borderRadius: 999,
                              fontSize: 12,
                              color: "#475569",
                              fontWeight: 500
                            }}
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>
        )}

        {/* candidate screen */}
        {screen === "candidate" && (
          <section className="screen" style={{ maxWidth: 1000 }}>
            <div className="card">
              <h2>Candidate Details</h2>
              
              {/* Demo Preview Notice and Navigation Buttons */}
              <div className="demo-notice-box">
                <div className="demo-notice-content">
                  <span style={{ fontSize: 16 }}>ℹ️</span>
                  <span style={{ fontSize: 13, color: "#92400e" }}>
                    This is a demo preview. All fields are pre-filled and read-only for the candidate application.
                  </span>
                </div>
                <div className="demo-notice-buttons">
                  <button 
                    className="btn btn-back" 
                    onClick={() => goToNext("job")}
                  >
                    Back
                  </button>
                  <button 
                    className="btn btn-next" 
                    onClick={() => goToNext("interview")}
                  >
                    Next
                  </button>
                </div>
              </div>
              
              {/* General Information Section */}
              <div className="form-section">
                <div className="section-header">
                  <span className="section-header-icon">👤</span>
                  <div>
                    <div className="section-header-title">General Information (all required)</div>
                    <div className="section-header-subtitle">Enter your personal and contact details</div>
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="input-label">First name *</label>
                    <input
                      className="form-input"
                      value="John"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Last name *</label>
                    <input
                      className="form-input"
                      value="Anderson"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="input-label">Email *</label>
                    <input
                      className="form-input"
                      type="email"
                      value="john.anderson@email.com"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Phone *</label>
                    <input
                      className="form-input"
                      type="tel"
                      value="+1 555 123 4567"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label className="input-label">Expected salary *</label>
                  <div className="salary-grid">
                    <input
                      className="form-input"
                      value="USD"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                    <input
                      className="form-input"
                      value="8500"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                    <div style={{ color: "#64748b", fontSize: 14 }}>/month</div>
                  </div>
                </div>

                <div>
                  <label className="input-label">Location *</label>
                  <input
                    className="form-input"
                    value="San Francisco, CA"
                    readOnly
                    style={{ background: "#f8fafc", cursor: "default" }}
                  />
                </div>
              </div>

              {/* Resume & Documents Section */}
              <div className="form-section">
                <div className="section-header">
                  <span className="section-header-icon">📄</span>
                  <div>
                    <div className="section-header-title">Resume & Documents (required)</div>
                    <div className="section-header-subtitle">Upload your resume for AI evaluation</div>
                  </div>
                </div>

                <div style={{
                  border: "2px dashed #3b82f6",
                  borderRadius: 8,
                  padding: 24,
                  textAlign: "center",
                  background: "#eff6ff",
                  cursor: "default"
                }}>
                  <div style={{ marginBottom: 12, fontSize: 24, color: "#3b82f6" }}>📄</div>
                  <div style={{ marginBottom: 8, color: "#64748b", fontSize: 14 }}>Drag & drop file here</div>
                  <div style={{ 
                    display: "inline-block", 
                    background: "#059669", 
                    color: "white", 
                    padding: "6px 16px", 
                    borderRadius: 6, 
                    fontSize: 14, 
                    fontWeight: 600 
                  }}>
                    Resume uploaded successfully
                  </div>
                  <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
                    <span style={{ background: "#dcfce7", color: "#166534", padding: "4px 8px", borderRadius: 4 }}>
                      john_anderson_rpa_resume.pdf
                    </span>
                    <span style={{ margin: "0 8px", color: "#94a3b8" }}>•</span>
                    <span>245 KB</span>
                  </div>
                </div>
              </div>

              {/* Cover Letter Section */}
              <div className="form-section">
                <div className="section-header">
                  <span className="section-header-icon">✉️</span>
                  <div>
                    <div className="section-header-title">Cover Letter</div>
                    <div className="section-header-subtitle">Tell us why you're interested in this role</div>
                  </div>
                </div>

                <textarea
                  className="form-input"
                  rows={5}
                  value="I am excited to apply for the RPA Developer position at HireGenAI. With over 4 years of experience in robotic process automation and a proven track record of implementing enterprise-grade automation solutions, I believe my skills in UiPath development, process analysis, and bot deployment align perfectly with your requirements. I have successfully automated 50+ business processes that resulted in 60% reduction in manual effort and 40% improvement in operational efficiency. My expertise with UiPath Studio, Orchestrator, and process mining tools, combined with my UiPath Advanced Developer Certification and passion for optimizing business workflows, makes me confident in my ability to contribute significantly to your team's success."
                  readOnly
                  style={{ background: "#f8fafc", cursor: "default", resize: "none" }}
                />
              </div>

              {/* Language and Proficiency Section */}
              <div className="form-section">
                <div className="section-header">
                  <span className="section-header-icon">🌐</span>
                  <div>
                    <div className="section-header-title">Language and Proficiency Levels</div>
                    <div className="section-header-subtitle">Select languages you speak and your proficiency</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="form-grid">
                    <div>
                      <label className="input-label">Language</label>
                      <input
                        className="form-input"
                        value="English"
                        readOnly
                        style={{ background: "#f8fafc", cursor: "default" }}
                      />
                    </div>
                    <div>
                      <label className="input-label">Proficiency Level</label>
                      <input
                        className="form-input"
                        value="Native / Bilingual"
                        readOnly
                        style={{ background: "#f8fafc", cursor: "default" }}
                      />
                    </div>
                  </div>
                  
                  <div className="form-grid">
                    <div>
                      <label className="input-label">Language</label>
                      <input
                        className="form-input"
                        value="Spanish"
                        readOnly
                        style={{ background: "#f8fafc", cursor: "default" }}
                      />
                    </div>
                    <div>
                      <label className="input-label">Proficiency Level</label>
                      <input
                        className="form-input"
                        value="Fluent"
                        readOnly
                        style={{ background: "#f8fafc", cursor: "default" }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="form-section">
                <div className="section-header">
                  <span className="section-header-icon">📋</span>
                  <div>
                    <div className="section-header-title">Additional Information</div>
                    <div className="section-header-subtitle">Professional links and availability</div>
                  </div>
                </div>

                <div className="form-grid">
                  <div>
                    <label className="input-label">LinkedIn URL</label>
                    <input
                      className="form-input"
                      value="https://linkedin.com/in/johnanderson"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                  <div>
                    <label className="input-label">Portfolio/Website</label>
                    <input
                      className="form-input"
                      value="https://johnanderson-rpa.com"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label className="input-label">Available Start Date *</label>
                    <input
                      className="form-input"
                      type="date"
                      value="2024-02-01"
                      readOnly
                      style={{ background: "#f8fafc", cursor: "default" }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 24 }}>
                    <input type="checkbox" checked readOnly style={{ width: 16, height: 16 }} />
                    <label style={{ fontSize: 14, color: "#475569", cursor: "default" }}>
                      I am willing to relocate for this position
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* interview screen */}
        {screen === "interview" && (
          <section className="interview-container" style={{ position: 'relative' }}>
            <div className="main-video-container">
              <video ref={localVideoRef} autoPlay muted playsInline id="localVideo" />
              <div className="control-bar">
                <div className="controls-wrapper">
                  <button
                    className={`ctrl-btn ${micMuted ? "muted" : ""}`}
                    title={micMuted ? "Unmute microphone" : "Mute microphone"}
                    onClick={() => {
                      if (!localStream) return;
                      const track = localStream.getAudioTracks()[0];
                      if (!track) return;
                      const nextState = !track.enabled;
                      track.enabled = nextState;
                      setMicMuted(!nextState);
                    }}
                    disabled={!running || !localStream}
                  >
                    🎤
                  </button>
                  <button
                    className={`ctrl-btn ${cameraOff ? "muted" : ""}`}
                    title={cameraOff ? "Resume camera" : "Turn camera off"}
                    onClick={() => {
                      if (!localStream) return;
                      const track = localStream.getVideoTracks()[0];
                      if (!track) return;
                      const nextState = !track.enabled;
                      track.enabled = nextState;
                      setCameraOff(!nextState);
                      if (localVideoRef.current && !sharingScreen) {
                        localVideoRef.current.srcObject = nextState ? localStream : null;
                      }
                    }}
                    disabled={!running || !localStream}
                  >
                    📷
                  </button>
                  <button
                    className={`ctrl-btn ${sharingScreen ? "active" : ""}`}
                    title={sharingScreen ? "Stop sharing screen" : "Share screen"}
                    onClick={() => toggleScreenShare(pc)}
                    disabled={!running || !pc}
                  >
                    🖥️
                  </button>
                </div>
                {!running ? (
                  <button className="ctrl-btn primary" onClick={startSession}>
                    Start
                  </button>
                ) : (
                  <button className="ctrl-btn danger" onClick={stopSession}>
                    End
                  </button>
                )}
              </div>
            </div>

            {/* Avatar Video Container */}
            <div className="avatar-video-container" style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '200px',
              height: '200px',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#1e293b',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              border: '2px solid #3b82f6',
              zIndex: 10
            }}>
              <video
                autoPlay
                loop
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
                src="https://storage.googleapis.com/ai_recruiter_bucket_prod/assets/videos/olivia_character_no_audio.mp4"
              />
            </div>
          </section>
        )}

        {/* assessment screen */}
        {screen === "assessment" && (
          <section className="screen" style={{ 
            maxWidth: 1100, 
            margin: "0 auto", 
            padding: "0 16px",
            width: "100%",
            boxSizing: "border-box"
          }}>
            {/* Header */}
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "flex-start", 
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12
            }}>
              <h1 style={{ 
                fontSize: "clamp(16px, 5vw, 20px)", 
                fontWeight: 700, 
                color: "#1e293b", 
                lineHeight: 1.3,
                flex: 1,
                minWidth: 0,
                wordBreak: "break-word"
              }}>
                Interview Report: <span style={{ color: "#059669" }}>{candidateName || "John Anderson"}</span> — <span style={{ color: "#6366f1" }}>{jobTitle || "SEO Specialist"}</span>
              </h1>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button style={{ 
                  padding: "8px 12px", 
                  background: "#059669", 
                  color: "white", 
                  border: "none", 
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}>
                  Evaluation
                </button>
              </div>
            </div>

            {/* Overall Score Hero Card */}
            <div style={{ 
              background: "linear-gradient(135deg, #059669 0%, #047857 50%, #065f46 100%)",
              borderRadius: 12,
              padding: "clamp(16px, 4vw, 24px)",
              color: "white",
              marginBottom: 20,
              boxShadow: "0 4px 20px rgba(5, 150, 105, 0.3)",
              width: "100%",
              boxSizing: "border-box"
            }}>
              <div style={{ 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "space-between", 
                flexWrap: "wrap", 
                gap: "clamp(12px, 3vw, 16px)"
              }}>
                <div style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: "clamp(12px, 3vw, 16px)", 
                  flex: 1, 
                  minWidth: 0 
                }}>
                  <div style={{ 
                    width: "clamp(60px, 15vw, 80px)", 
                    height: "clamp(60px, 15vw, 80px)", 
                    borderRadius: "50%", 
                    background: "rgba(255,255,255,0.2)", 
                    display: "flex", 
                    flexDirection: "column",
                    alignItems: "center", 
                    justifyContent: "center",
                    border: "3px solid rgba(255,255,255,0.3)",
                    flexShrink: 0
                  }}>
                    <div style={{ fontSize: "clamp(18px, 5vw, 24px)", fontWeight: 700 }}>70</div>
                    <div style={{ fontSize: "clamp(8px, 2vw, 10px)", opacity: 0.8 }}>out of 100</div>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 style={{ 
                      fontSize: "clamp(14px, 4vw, 18px)", 
                      fontWeight: 700, 
                      marginBottom: "clamp(4px, 1vw, 6px)" 
                    }}>Interview Evaluation</h2>
                    <p style={{ 
                      opacity: 0.9, 
                      fontSize: "clamp(10px, 3vw, 12px)", 
                      marginBottom: "clamp(4px, 1vw, 6px)",
                      lineHeight: 1.4
                    }}>Score calculated based on all 10 configured questions</p>
                    <div style={{ 
                      display: "flex", 
                      gap: "clamp(8px, 2vw, 12px)", 
                      fontSize: "clamp(9px, 2.5vw, 11px)", 
                      opacity: 0.8, 
                      flexWrap: "wrap" 
                    }}>
                      <span>Questions Asked: 10</span>
                      <span>|</span>
                      <span>Answered: 10</span>
                    </div>
                    <div style={{ 
                      marginTop: "clamp(6px, 1.5vw, 8px)", 
                      display: "inline-block", 
                      background: "rgba(255,255,255,0.2)", 
                      padding: "clamp(3px, 1vw, 4px) clamp(8px, 2vw, 12px)", 
                      borderRadius: 20,
                      fontSize: "clamp(10px, 3vw, 12px)",
                      fontWeight: 600
                    }}>
                      ✓ Qualified
                    </div>
                  </div>
                </div>
                <div style={{ 
                  textAlign: "right", 
                  flexShrink: 0,
                  minWidth: "fit-content"
                }}>
                  <div style={{ 
                    fontSize: "clamp(10px, 3vw, 12px)", 
                    opacity: 0.8, 
                    marginBottom: 2 
                  }}>Recommendation</div>
                  <div style={{ 
                    fontSize: "clamp(14px, 4vw, 16px)", 
                    fontWeight: 600 
                  }}>Hire</div>
                </div>
              </div>
            </div>

            {/* Criteria Breakdown */}
            <div style={{ 
              background: "white", 
              borderRadius: 12, 
              border: "2px solid #e5e7eb", 
              marginBottom: 20,
              boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
              width: "100%",
              boxSizing: "border-box"
            }}>
              <div style={{ 
                padding: "clamp(12px, 3vw, 16px) clamp(16px, 4vw, 20px)", 
                borderBottom: "1px solid #e5e7eb",
                background: "linear-gradient(to right, #f9fafb, #f3f4f6)"
              }}>
                <h3 style={{ 
                  fontSize: "clamp(14px, 4vw, 16px)", 
                  fontWeight: 700, 
                  color: "#1e293b", 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 8,
                  lineHeight: 1.3
                }}>
                  📊 Criteria-Based Score Breakdown
                </h3>
                <p style={{ 
                  fontSize: "clamp(10px, 3vw, 12px)", 
                  color: "#64748b", 
                  marginTop: 4,
                  lineHeight: 1.4
                }}>All configured criteria with their evaluation scores</p>
              </div>
              <div style={{ padding: "clamp(12px, 3vw, 16px)" }}>
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "1fr", 
                  gap: "clamp(12px, 3vw, 16px)",
                  width: "100%"
                }}>
                  {/* Technical */}
                  <div style={{ 
                    padding: "clamp(12px, 3vw, 16px)", 
                    borderRadius: 12, 
                    border: "2px solid #93c5fd",
                    background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                    width: "100%",
                    boxSizing: "border-box"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "flex-start", 
                      marginBottom: "clamp(8px, 2vw, 12px)" 
                    }}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "clamp(8px, 2vw, 10px)", 
                        flex: 1, 
                        minWidth: 0 
                      }}>
                        <div style={{ 
                          padding: "clamp(6px, 1.5vw, 8px)", 
                          background: "white", 
                          borderRadius: 8, 
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)", 
                          flexShrink: 0 
                        }}>
                          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)" }}>💻</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: 700, 
                            color: "#1e40af", 
                            fontSize: "clamp(12px, 3vw, 14px)" 
                          }}>Technical</div>
                          <div style={{ 
                            fontSize: "clamp(9px, 2.5vw, 11px)", 
                            color: "#64748b" 
                          }}>4 questions</div>
                        </div>
                      </div>
                      <div style={{ 
                        textAlign: "right", 
                        flexShrink: 0 
                      }}>
                        <div style={{ 
                          fontSize: "clamp(16px, 4vw, 20px)", 
                          fontWeight: 700, 
                          color: "#1e40af" 
                        }}>70</div>
                        <div style={{ 
                          fontSize: "clamp(8px, 2vw, 10px)", 
                          color: "#94a3b8" 
                        }}>score</div>
                      </div>
                    </div>
                    <div style={{ 
                      height: "clamp(6px, 1.5vw, 8px)", 
                      background: "white", 
                      borderRadius: 4, 
                      marginBottom: "clamp(6px, 1.5vw, 10px)" 
                    }}>
                      <div style={{ 
                        height: "100%", 
                        width: "70%", 
                        background: "linear-gradient(to right, #3b82f6, #6366f1)", 
                        borderRadius: 4 
                      }}></div>
                    </div>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      fontSize: "clamp(9px, 2.5vw, 11px)", 
                      paddingTop: "clamp(4px, 1vw, 6px)", 
                      borderTop: "1px solid rgba(255,255,255,0.5)" 
                    }}>
                      <span style={{ color: "#475569" }}>Weight: 50%</span>
                      <span style={{ fontWeight: 700, color: "#1e40af" }}>+35 pts</span>
                    </div>
                  </div>

                  {/* Communication */}
                  <div style={{ 
                    padding: "clamp(12px, 3vw, 16px)", 
                    borderRadius: 12, 
                    border: "2px solid #86efac",
                    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                    width: "100%",
                    boxSizing: "border-box"
                  }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "flex-start", 
                      marginBottom: "clamp(8px, 2vw, 12px)" 
                    }}>
                      <div style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "clamp(8px, 2vw, 10px)", 
                        flex: 1, 
                        minWidth: 0 
                      }}>
                        <div style={{ 
                          padding: "clamp(6px, 1.5vw, 8px)", 
                          background: "white", 
                          borderRadius: 8, 
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)", 
                          flexShrink: 0 
                        }}>
                          <span style={{ fontSize: "clamp(14px, 3.5vw, 16px)" }}>💬</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ 
                            fontWeight: 700, 
                            color: "#166534", 
                            fontSize: "clamp(12px, 3vw, 14px)" 
                          }}>Communication</div>
                          <div style={{ 
                            fontSize: "clamp(9px, 2.5vw, 11px)", 
                            color: "#64748b" 
                          }}>2 questions</div>
                        </div>
                      </div>
                      <div style={{ 
                        textAlign: "right", 
                        flexShrink: 0 
                      }}>
                        <div style={{ 
                          fontSize: "clamp(16px, 4vw, 20px)", 
                          fontWeight: 700, 
                          color: "#166534" 
                        }}>75</div>
                        <div style={{ 
                          fontSize: "clamp(8px, 2vw, 10px)", 
                          color: "#94a3b8" 
                        }}>score</div>
                      </div>
                    </div>
                    <div style={{ 
                      height: "clamp(6px, 1.5vw, 8px)", 
                      background: "white", 
                      borderRadius: 4, 
                      marginBottom: "clamp(6px, 1.5vw, 10px)" 
                    }}>
                      <div style={{ 
                        height: "100%", 
                        width: "75%", 
                        background: "linear-gradient(to right, #22c55e, #10b981)", 
                        borderRadius: 4 
                      }}></div>
                    </div>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      fontSize: "clamp(9px, 2.5vw, 11px)", 
                      paddingTop: "clamp(4px, 1vw, 6px)", 
                      borderTop: "1px solid rgba(255,255,255,0.5)" 
                    }}>
                      <span style={{ color: "#475569" }}>Weight: 20%</span>
                      <span style={{ fontWeight: 700, color: "#166534" }}>+15 pts</span>
                    </div>
                  </div>

                  {/* Team Player */}
                  <div style={{ 
                    padding: 16, 
                    borderRadius: 16, 
                    border: "2px solid #5eead4",
                    background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ padding: 8, background: "white", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", flexShrink: 0 }}>
                          <span style={{ fontSize: 16 }}>👥</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: "#0f766e", fontSize: 14 }}>Team Player</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>2 questions</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#0f766e" }}>68</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>score</div>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "white", borderRadius: 4, marginBottom: 10 }}>
                      <div style={{ height: "100%", width: "68%", background: "linear-gradient(to right, #14b8a6, #06b6d4)", borderRadius: 4 }}></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.5)" }}>
                      <span style={{ color: "#475569" }}>Weight: 15%</span>
                      <span style={{ fontWeight: 700, color: "#0f766e" }}>+10 pts</span>
                    </div>
                  </div>

                  {/* Culture Fit */}
                  <div style={{ 
                    padding: 16, 
                    borderRadius: 16, 
                    border: "2px solid #fdba74",
                    background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        <div style={{ padding: 8, background: "white", borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", flexShrink: 0 }}>
                          <span style={{ fontSize: 16 }}>🤝</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, color: "#c2410c", fontSize: 14 }}>Culture Fit</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>2 questions</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: "#c2410c" }}>65</div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>score</div>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "white", borderRadius: 4, marginBottom: 10 }}>
                      <div style={{ height: "100%", width: "65%", background: "linear-gradient(to right, #f97316, #fb923c)", borderRadius: 4 }}></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.5)" }}>
                      <span style={{ color: "#475569" }}>Weight: 15%</span>
                      <span style={{ fontWeight: 700, color: "#c2410c" }}>+10 pts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Question-by-Question Breakdown */}
            <div style={{ 
              background: "white", 
              borderRadius: 16, 
              border: "2px solid #e5e7eb", 
              marginBottom: 24,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              overflow: "hidden"
            }}>
              <div style={{ 
                padding: "20px 24px", 
                borderBottom: "1px solid #e5e7eb",
                background: "linear-gradient(to right, #eef2ff, #faf5ff, #fdf2f8)"
              }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                  ❓ Interview Responses & Scores
                </h3>
                <p style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>Detailed evaluation of each question with AI-powered scoring</p>
              </div>
              <div style={{ padding: 24 }}>
                {/* Question 1 - Technical */}
                <div style={{ 
                  borderRadius: 16, 
                  border: "1px solid #e5e7eb", 
                  marginBottom: 24,
                  overflow: "hidden",
                  background: "white",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
                }}>
                  <div style={{ height: 4, background: "linear-gradient(to right, #3b82f6, #6366f1)" }}></div>
                  <div style={{ padding: 24 }}>
                    {/* Question Header */}
                    <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: "50%", 
                        background: "#eff6ff", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#1e40af" }}>1</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", lineHeight: 1.5, marginBottom: 12 }}>
                          How do your skills and experience with UiPath and Automation Anywhere align with the requirements of this role?
                        </p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ 
                            padding: "4px 12px", 
                            background: "#dbeafe", 
                            color: "#1e40af", 
                            borderRadius: 20, 
                            fontSize: 12, 
                            fontWeight: 600 
                          }}>Technical</span>
                          <span style={{ 
                            padding: "4px 12px", 
                            background: "#dcfce7", 
                            color: "#166534", 
                            borderRadius: 20, 
                            fontSize: 12, 
                            fontWeight: 600 
                          }}>✓ Complete</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 32, fontWeight: 700, color: "#059669" }}>70</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>/ 100 pts</div>
                        <span style={{ 
                          display: "inline-block",
                          marginTop: 4,
                          padding: "2px 10px", 
                          background: "#dbeafe", 
                          color: "#1e40af", 
                          borderRadius: 12, 
                          fontSize: 11, 
                          fontWeight: 600 
                        }}>Good</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, marginBottom: 20 }}>
                      <div style={{ height: "100%", width: "70%", background: "#3b82f6", borderRadius: 4 }}></div>
                    </div>

                    {/* Candidate Response */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>💬</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Candidate Response</span>
                      </div>
                      <div style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                        <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                          I have 6 years of IT experience, out of which 4 years are hands-on RP development and support using automation anywhere. My work covers the complete IP lifecycle, requirement gathering, creating PDD, SD, deployment, testing and post-production support. I have automated web applications, desktop, app, SAP, Excel, PDS, database and worked on both deployment and bot support projects. This aligns strongly with the responsibility of this role, especially because I am already experienced in debugging, handling bot failures and monitoring schedules and providing fixes.
                        </p>
                      </div>
                    </div>

                    {/* Evaluation Reason */}
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>🧠</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Evaluation Reason</span>
                      </div>
                      <div style={{ background: "#eff6ff", padding: 20, borderRadius: 12, border: "1px solid #bfdbfe" }}>
                        <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                          The candidate demonstrates a good understanding of technical aspects related to Automation Anywhere, mentioning various applications and processes involved in automation. However, the lack of specific examples of tools or technologies used limits the depth of the response.
                        </p>
                      </div>
                    </div>

                    {/* Strengths & Gaps */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={{ background: "#f0fdf4", padding: 16, borderRadius: 12, border: "1px solid #bbf7d0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span style={{ color: "#16a34a" }}>✓</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>Strengths</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                          <li style={{ fontSize: 13, color: "#166534", marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ color: "#22c55e" }}>✓</span>
                            <span>Comprehensive overview of relevant experience and tasks</span>
                          </li>
                        </ul>
                      </div>
                      <div style={{ background: "#fffbeb", padding: 16, borderRadius: 12, border: "1px solid #fde68a" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span style={{ color: "#d97706" }}>⚠</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>Areas to Improve</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                          <li style={{ fontSize: 13, color: "#92400e", marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ color: "#f59e0b" }}>•</span>
                            <span>Lack of specific examples and mention of UiPath</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question 2 - Team Player */}
                <div style={{ 
                  borderRadius: 16, 
                  border: "1px solid #e5e7eb", 
                  marginBottom: 24,
                  overflow: "hidden",
                  background: "white",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
                }}>
                  <div style={{ height: 4, background: "linear-gradient(to right, #14b8a6, #06b6d4)" }}></div>
                  <div style={{ padding: 24 }}>
                    <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: "50%", 
                        background: "#f0fdfa", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#0f766e" }}>2</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", lineHeight: 1.5, marginBottom: 12 }}>
                          Describe a situation where you collaborated with business analysts to understand requirements. How did you ensure effective communication?
                        </p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ 
                            padding: "4px 12px", 
                            background: "#ccfbf1", 
                            color: "#0f766e", 
                            borderRadius: 20, 
                            fontSize: 12, 
                            fontWeight: 600 
                          }}>Team Player</span>
                          <span style={{ 
                            padding: "4px 12px", 
                            background: "#dcfce7", 
                            color: "#166534", 
                            borderRadius: 20, 
                            fontSize: 12, 
                            fontWeight: 600 
                          }}>✓ Complete</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 32, fontWeight: 700, color: "#059669" }}>68</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>/ 100 pts</div>
                        <span style={{ 
                          display: "inline-block",
                          marginTop: 4,
                          padding: "2px 10px", 
                          background: "#dbeafe", 
                          color: "#1e40af", 
                          borderRadius: 12, 
                          fontSize: 11, 
                          fontWeight: 600 
                        }}>Good</span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, marginBottom: 20 }}>
                      <div style={{ height: "100%", width: "68%", background: "#14b8a6", borderRadius: 4 }}></div>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>💬</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Candidate Response</span>
                      </div>
                      <div style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                        <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                          In my previous role, I worked closely with business analysts to gather requirements for automation projects. I scheduled regular meetings to discuss process flows and documented everything in shared documents. I also created visual diagrams to ensure both technical and non-technical stakeholders understood the proposed solutions.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={{ background: "#f0fdf4", padding: 16, borderRadius: 12, border: "1px solid #bbf7d0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span style={{ color: "#16a34a" }}>✓</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>Strengths</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                          <li style={{ fontSize: 13, color: "#166534", marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ color: "#22c55e" }}>✓</span>
                            <span>Good collaboration approach with stakeholders</span>
                          </li>
                        </ul>
                      </div>
                      <div style={{ background: "#fffbeb", padding: 16, borderRadius: 12, border: "1px solid #fde68a" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span style={{ color: "#d97706" }}>⚠</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>Areas to Improve</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                          <li style={{ fontSize: 13, color: "#92400e", marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ color: "#f59e0b" }}>•</span>
                            <span>Could provide more specific examples of challenges faced</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question 3 - Culture Fit */}
                <div style={{ 
                  borderRadius: 16, 
                  border: "1px solid #e5e7eb", 
                  marginBottom: 24,
                  overflow: "hidden",
                  background: "white",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
                }}>
                  <div style={{ height: 4, background: "linear-gradient(to right, #f97316, #fb923c)" }}></div>
                  <div style={{ padding: 24 }}>
                    <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                      <div style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: "50%", 
                        background: "#fff7ed", 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "#c2410c" }}>3</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 16, fontWeight: 600, color: "#1e293b", lineHeight: 1.5, marginBottom: 12 }}>
                          Are you interested in working onsite in Bangalore? What are your salary expectations for this role?
                        </p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ 
                            padding: "4px 12px", 
                            background: "#ffedd5", 
                            color: "#c2410c", 
                            borderRadius: 20, 
                            fontSize: 12, 
                            fontWeight: 600 
                          }}>Culture Fit</span>
                          <span style={{ 
                            padding: "4px 12px", 
                            background: "#dcfce7", 
                            color: "#166534", 
                            borderRadius: 20, 
                            fontSize: 12, 
                            fontWeight: 600 
                          }}>✓ Complete</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 32, fontWeight: 700, color: "#059669" }}>65</div>
                        <div style={{ fontSize: 12, color: "#94a3b8" }}>/ 100 pts</div>
                        <span style={{ 
                          display: "inline-block",
                          marginTop: 4,
                          padding: "2px 10px", 
                          background: "#dbeafe", 
                          color: "#1e40af", 
                          borderRadius: 12, 
                          fontSize: 11, 
                          fontWeight: 600 
                        }}>Good</span>
                      </div>
                    </div>
                    <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, marginBottom: 20 }}>
                      <div style={{ height: "100%", width: "65%", background: "#f97316", borderRadius: 4 }}></div>
                    </div>
                    <div style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>💬</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>Candidate Response</span>
                      </div>
                      <div style={{ background: "#f8fafc", padding: 20, borderRadius: 12, border: "1px solid #e2e8f0" }}>
                        <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.7 }}>
                          Yes, I am open to working onsite in Bangalore. I am currently based in Hyderabad but willing to relocate. Regarding salary, I am expecting around 12-15 LPA based on my experience and the market standards for this role.
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      <div style={{ background: "#f0fdf4", padding: 16, borderRadius: 12, border: "1px solid #bbf7d0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span style={{ color: "#16a34a" }}>✓</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>Strengths</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                          <li style={{ fontSize: 13, color: "#166534", marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ color: "#22c55e" }}>✓</span>
                            <span>Flexible with location and willing to relocate</span>
                          </li>
                        </ul>
                      </div>
                      <div style={{ background: "#fffbeb", padding: 16, borderRadius: 12, border: "1px solid #fde68a" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                          <span style={{ color: "#d97706" }}>⚠</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#92400e" }}>Areas to Improve</span>
                        </div>
                        <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                          <li style={{ fontSize: 13, color: "#92400e", marginBottom: 6, display: "flex", alignItems: "flex-start", gap: 8 }}>
                            <span style={{ color: "#f59e0b" }}>•</span>
                            <span>Salary expectation may be above budget range</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Read-only notice */}
                <div style={{ 
                  background: "#fef3c7", 
                  border: "1px solid #fcd34d", 
                  borderRadius: 12, 
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12
                }}>
                  <span style={{ fontSize: 20 }}>ℹ️</span>
                  <div>
                    <span style={{ fontSize: 14, color: "#92400e", fontWeight: 500 }}>
                      This is a demo preview showing 3 of 10 questions. The full report includes all interview questions with detailed AI-powered evaluation.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <button 
                className="btn btn-back" 
                onClick={() => goToNext("interview")}
                style={{ padding: "12px 24px", borderRadius: 8 }}
              >
                Back to Interview
              </button>
              <button 
                className="btn btn-next" 
                onClick={() => router.push("/")}
                style={{ padding: "12px 24px", borderRadius: 8, background: "#059669", color: "white" }}
              >
                Back to Home
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-12">
            {/* Left Section - Brand Block */}
            <div className="md:col-span-3">
              <h3 className="text-2xl font-bold mb-2">
                <span className="text-white">Hire</span>
                <span className="text-emerald-400">GenAI</span>
              </h3>
              <p className="text-sm text-slate-400 mb-4">By SKYGENAI</p>
              <p className="text-slate-400 mb-6 text-sm leading-relaxed">
                HireGenAI pre-screens and interviews candidates, helping you shortlist talent 20x faster and more efficiently.
              </p>
              <p className="text-slate-400 mb-6 text-sm font-medium">
                Email: <a href="mailto:support@hire-genai.com" className="text-emerald-400 hover:text-emerald-300 transition-colors">support@hire-genai.com</a>
              </p>
              {/* Social Icons */}
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
                <a href="https://www.linkedin.com/company/hire-genai" className="text-slate-400 hover:text-emerald-400 transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Product Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Product</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/demo-en" className="hover:text-emerald-400 transition-colors">
                    Try the Demo
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-emerald-400 transition-colors">
                    Pricing
                  </Link>
                </li>
                <li>
                  <a href="#assessment" className="hover:text-emerald-400 transition-colors">
                    Assessment
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-emerald-400 transition-colors">
                    FAQs
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Company</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/about" className="hover:text-emerald-400 transition-colors">
                    About us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/book-meeting" className="hover:text-emerald-400 transition-colors">
                    Book a Meeting
                  </Link>
                </li>
                <li>
                  <Link href="/owner-login" className="hover:text-emerald-400 transition-colors">
                    Admin
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal Section */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-white text-sm uppercase tracking-wide">Legal</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li>
                  <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                    Terms and Conditions
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-emerald-400 transition-colors">
                    Imprint
                  </a>
                </li>
              </ul>
            </div>

            {/* Right Section - Badges Block */}
            <div className="md:col-span-3">
              <div className="space-y-4">
                {/* Trustpilot Badge */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <p className="text-xs text-slate-400 mb-2 font-semibold">Trustpilot</p>
                  <div className="flex items-center gap-2 mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-white">TrustScore 4.5</p>
                </div>

                {/* GDPR Compliant Badge */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-white">GDPR COMPLIANT</p>
                  </div>
                  <p className="text-xs text-slate-400">Your data is secure and compliant</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Bottom */}
          <div className="border-t border-slate-800 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; 2025 HireGenAI. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        :global(body) {
          background: #ffffff;
          color: #0f172a;
          font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }
        .page-wrap {
          position: relative;
          min-height: 100vh;
          padding: 0;
          background: #ffffff;
        }
        .page-wrap--loading .content-shell {
          opacity: 0;
        }
        .page-wrap--loading .content-shell,
        .page-wrap--loading .progress-bar,
        .page-wrap--loading .app-header,
        .page-wrap--loading .screen,
        .page-wrap--loading .assessment-container {
          pointer-events: none;
          user-select: none;
        }
        .initial-loading {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(248, 250, 252, 0.92);
          z-index: 50;
          backdrop-filter: blur(6px);
        }
        .initial-loading__spinner {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 4px solid rgba(16, 185, 129, 0.25);
          border-top-color: #10b981;
          animation: spin 0.9s linear infinite;
          margin-bottom: 18px;
        }
        .initial-loading__text {
          font-size: 16px;
          color: #047857;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .bg-ornament {
          display: none;
        }
        .content-shell {
          position: relative;
          z-index: 1;
          max-width: 1120px;
          margin: 0 auto;
          padding: 64px 24px 96px;
          background: transparent;
          border-radius: 0;
          box-shadow: none;
          border: none;
        }
        .app-header {
          text-align: center;
          margin-bottom: 56px;
        }
        .app-header .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 16px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          font-weight: 600;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 18px;
        }
        .app-header h1 {
          color: #0f172a;
          font-size: 44px;
          margin: 0 0 18px;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .app-header .subtitle {
          max-width: 640px;
          margin: 0 auto;
          color: #475569;
          font-size: 18px;
          line-height: 1.7;
        }
        .screen {
          max-width: 820px;
          margin: 0 auto;
        }
        .card {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 24px 40px -18px rgba(15, 23, 42, 0.18);
          padding: 36px;
          margin-bottom: 28px;
          border: 1px solid #e2e8f0;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .card:hover {
          transform: translateY(-3px);
          box-shadow: 0 32px 60px rgba(15, 23, 42, 0.15);
        }
        h2 {
          color: #0f172a;
          font-size: 22px;
          margin: 0 0 32px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        h2::before {
          content: "";
          width: 6px;
          height: 18px;
          border-radius: 999px;
          background: linear-gradient(180deg, #8b5cf6 0%, #22d3ee 100%);
        }
        .form-group {
          margin-bottom: 24px;
        }
        .form-row {
          display: flex;
          gap: 24px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        .form-col {
          flex: 1;
          min-width: 220px;
        }
        .input-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .form-input {
          width: 100%;
          padding: 14px 16px;
          border: 1px solid rgba(148, 163, 184, 0.3);
          border-radius: 12px;
          font-size: 16px;
          color: #1f2937;
          background: rgba(255, 255, 255, 0.9);
          transition: box-shadow 0.2s ease, border 0.2s ease;
        }
        .form-input:focus {
          outline: none;
          border-color: rgba(99, 102, 241, 0.8);
          box-shadow: 0 10px 28px rgba(99, 102, 241, 0.16);
        }
        .button-row {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 32px;
          flex-wrap: wrap;
        }
        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          border: none;
          font-weight: 500;
          font-size: 15px;
          cursor: pointer;
          min-width: 100px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .btn-back {
          background: #f8fafc;
          border: 1px solid #cbd5f5;
          color: #475569;
        }
        .btn-next {
          background: linear-gradient(135deg, #059669 0%, #10b981 100%);
          color: #fff;
          box-shadow: 0 15px 30px rgba(16, 185, 129, 0.2);
        }
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .btn:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 36px rgba(99, 102, 241, 0.26);
        }
        .upload-box {
          border: 1px dashed rgba(148, 163, 184, 0.45);
          border-radius: 16px;
          padding: 44px 24px;
          text-align: center;
          margin: 24px 0;
          cursor: pointer;
          transition: all 0.2s;
          background: #f8fafc;
        }
        .upload-box:hover {
          border-color: rgba(5, 150, 105, 0.8);
          background: rgba(236, 253, 245, 0.9);
          box-shadow: inset 0 0 0 1px rgba(16, 185, 129, 0.2);
        }
        .upload-message {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .upload-icon {
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
          border-radius: 18px;
          box-shadow: 0 12px 30px rgba(16, 185, 129, 0.15);
          font-size: 34px;
          color: #059669;
        }
        .upload-text {
          color: #4a5568;
          text-align: center;
        }
        .drag-text {
          font-weight: 500;
          margin-bottom: 4px;
        }
        .or-text {
          font-size: 14px;
          color: #64748b;
          font-style: italic;
        }
        .file-hint {
          font-size: 12px;
           color: #94a3b8;
          margin-top: 4px;
        }
        .info-message {
          margin-top: 10px;
          color: #1f2937;
          font-size: 14px;
          padding: 14px;
          background: rgba(236, 253, 245, 0.6);
          border-radius: 12px;
          border: 1px solid rgba(16, 185, 129, 0.25);
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }
        .interview-container {
          display: grid;
          gap: 16px;
          max-width: 980px;
          margin: 0 auto;
        }
        .main-video-container {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          background: #000;
          aspect-ratio: 16 / 9;
        }
        #localVideo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .control-bar {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          bottom: 22px;
          display: flex;
          gap: 16px;
          align-items: center;
          z-index: 10;
          flex-wrap: wrap;
          padding: 10px 16px;
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.26);
          backdrop-filter: blur(14px);
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.28);
        }
        .controls-wrapper {
          display: flex;
          gap: 12px;
        }
        .ctrl-btn {
          width: 54px;
          height: 54px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: linear-gradient(160deg, rgba(248, 250, 252, 0.95) 0%, rgba(226, 232, 240, 0.85) 100%);
          color: #1f2937;
          cursor: pointer;
          font-size: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 12px 24px rgba(15, 23, 42, 0.18);
          transition: transform 0.18s ease, box-shadow 0.18s ease, border 0.18s ease;
        }
        .ctrl-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 36px rgba(15, 23, 42, 0.24);
          border-color: rgba(99, 102, 241, 0.7);
        }
        .ctrl-btn.active {
          background: linear-gradient(160deg, #22c55e 0%, #16a34a 100%);
          color: #fff;
          border-color: rgba(22, 163, 74, 0.5);
        }
        .ctrl-btn.muted {
          background: linear-gradient(160deg, #f87171 0%, #ef4444 100%);
          color: #fff;
          border-color: rgba(239, 68, 68, 0.55);
        }
        .ctrl-btn:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }
        .ctrl-btn.primary {
          background: linear-gradient(160deg, #22c55e 0%, #16a34a 100%);
          color: #fff;
          font-weight: 600;
          padding: 0 28px;
          width: auto;
          border-color: rgba(22, 163, 74, 0.55);
        }
        .ctrl-btn.primary:hover {
          background: linear-gradient(160deg, #16a34a 0%, #15803d 100%);
        }
        .ctrl-btn.danger {
          background: #e24b4b;
          color: #fff;
          padding: 0 22px;
          width: auto;
        }
        .ctrl-btn.danger:hover {
          background: #d43f3f;
        }
        .question-box {
          margin-top: 12px;
          display: flex;
          justify-content: center;
        }
        .ai-message {
          display: flex;
          gap: 12px;
          background: #fff;
          padding: 12px 16px;
          border-radius: 10px;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
          max-width: 980px;
          width: calc(100% - 48px);
        }
        .ai-avatar {
          width: 40px;
          height: 40px;
          border-radius: 20px;
          background: #6b46ff;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        }
        .message-content {
          color: #2d3748;
          font-size: 16px;
          line-height: 1.4;
        }
        .ai-avatar-container {
          height: 120px;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
        }
        #remoteVideo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .assessment-header {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          padding: 2rem;
          margin-bottom: 2rem;
          border-radius: 24px;
          background: linear-gradient(135deg, rgba(236, 253, 245, 0.9) 0%, rgba(209, 250, 229, 0.9) 100%);
          border: 1px solid rgba(16, 185, 129, 0.25);
          box-shadow: 0 16px 32px -18px rgba(16, 185, 129, 0.35);
        }
        .assessment-title {
          text-align: center;
          margin: 0.5rem 0 1rem;
        }
        .assessment-title h1 {
          font-size: 1.75rem;
          color: #065f46;
          margin: 0;
          font-weight: 700;
        }
        .assessment-title span {
          color: #047857;
        }
        .assessment-tabs {
          display: flex;
          align-items: center;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .tab-btn {
          padding: 8px 18px;
          border-radius: 999px;
          border: 1px solid rgba(16, 185, 129, 0.45);
          background: #ffffff;
          color: #047857;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: background 0.2s ease, color 0.2s ease, border 0.2s ease, box-shadow 0.2s ease;
        }
        .tab-btn:hover {
          background: rgba(236, 253, 245, 0.9);
          box-shadow: 0 12px 24px rgba(16, 185, 129, 0.18);
        }
        .tab-btn.active {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #fff;
          border-color: transparent;
          box-shadow: 0 14px 28px rgba(16, 185, 129, 0.2);
        }
        .score-section {
          display: flex;
          justify-content: center;
          margin-bottom: 2rem;
        }
        .score-circle {
          display: inline-block;
          position: relative;
          width: 120px;
          height: 120px;
        }
        .score-circle svg {
          transform: rotate(-90deg);
          width: 120px;
          height: 120px;
        }
        .score-label {
          position: absolute;
          bottom: -4px;
          right: -24px;
          color: #718096;
        }
        .evaluation-sections {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-top: 1rem;
        }
        .eval-section {
          padding: 1.5rem;
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }
        .eval-section h3 {
          margin: 0 0 12px;
          color: #1a202c;
          font-size: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .eval-section p {
          margin: 0;
          color: #4a5568;
          font-size: 14px;
          line-height: 1.6;
        }
        .eval-score {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b46ff;
          background: #f8f9fa;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          white-space: nowrap;
        }
        .chat-transcript {
          padding: 20px;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          max-height: 500px;
          overflow: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .chat-message {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          max-width: 80%;
        }
        .chat-message.ai {
          margin-right: auto;
        }
        .chat-message.user {
          margin-left: auto;
          flex-direction: row-reverse;
        }
        .chat-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .chat-message.ai .chat-avatar {
          background: #6b46ff;
          color: #fff;
        }
        .chat-message.user .chat-avatar {
          background: #22c55e;
          color: #fff;
        }
        .chat-bubble {
          background: #f8f9fa;
          padding: 12px 16px;
          border-radius: 12px;
          color: #1f2937;
        }
        .progress-bar {
          display: flex;
          justify-content: center;
          padding: 40px 20px;
          max-width: 820px;
          margin: 0 auto;
          position: relative;
          gap: 16px;
        }
        .progress-step {
          flex: 1;
          text-align: center;
          position: relative;
        }
        .progress-step::before {
          content: "";
          height: 2px;
          width: 100%;
          background: #e2e8f0;
          position: absolute;
          top: 18px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1;
          transition: background 0.3s ease;
        }
        .progress-step.completed::before {
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
        }
        .progress-step:last-child::before {
          display: none;
        }
        .step-number {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #cbd5f5;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 8px;
          position: relative;
          z-index: 2;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08);
          transition: all 0.2s ease;
        }
        .progress-step.active .step-number,
        .progress-step.completed .step-number {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 10px 20px rgba(16, 185, 129, 0.28);
        }
        .step-label {
          font-size: 14px;
          color: #64748b;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        .progress-step.active .step-label,
        .progress-step.completed .step-label {
          color: #047857;
          font-weight: 600;
        }
        @media (max-width: 900px) {
          .screen {
            margin: 0 16px;
          }
          .main-video-container {
            aspect-ratio: 3 / 4;
          }
        }
        /* Demo Notice Box - Desktop */
        .demo-notice-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 8px;
          padding: 12px 16px;
          margin-bottom: 24px;
          gap: 16px;
        }
        .demo-notice-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }
        .demo-notice-buttons {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        /* Salary Grid */
        .salary-grid {
          display: grid;
          grid-template-columns: 100px 1fr auto;
          gap: 8px;
          align-items: center;
        }
        /* Job Status Bar */
        .job-status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #f8fafc;
          border-radius: 8px;
          margin-bottom: 24px;
          border: 1px solid #e2e8f0;
        }
        /* Job Tabs */
        .job-tabs-container {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          overflow-x: auto;
          padding: 4px;
          background: #f1f5f9;
          border-radius: 8px;
          -webkit-overflow-scrolling: touch;
        }
        .job-tabs-container::-webkit-scrollbar {
          display: none;
        }
        .job-tab {
          padding: 8px 14px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .job-tab:hover {
          background: rgba(5, 150, 105, 0.1);
          color: #059669;
        }
        .job-tab.active {
          background: #059669;
          color: #fff;
        }
        /* Section Header */
        .section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .section-header-icon {
          font-size: 18px;
        }
        .section-header-title {
          font-weight: 600;
          font-size: 16px;
          color: #1e293b;
        }
        .section-header-subtitle {
          font-size: 12px;
          color: #64748b;
        }
        /* Form Section */
        .form-section {
          margin-bottom: 24px;
          scroll-margin-top: 100px;
        }
        /* Form Grid */
        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        @media (max-width: 600px) {
          .progress-bar {
            flex-direction: row;
            gap: 4px;
            padding: 16px 8px;
            flex-wrap: nowrap;
            overflow-x: auto;
          }
          .progress-step::before {
            width: 100%;
            height: 2px;
            left: 0;
            top: 15px;
            transform: none;
          }
          .progress-step {
            min-width: 60px;
            flex: 1;
          }
          .step-number {
            margin-left: 0;
            width: 28px;
            height: 28px;
            font-size: 11px;
            line-height: 28px;
          }
          .step-label {
            text-align: center;
            margin-left: 0;
            font-size: 9px;
            margin-top: 4px;
            line-height: 1.2;
          }
          .content-shell {
            padding: 24px 12px 48px;
          }
          .app-header h1 {
            font-size: 28px;
          }
          .app-header .subtitle {
            font-size: 14px;
          }
          .card {
            padding: 16px !important;
            border-radius: 12px;
          }
          h2 {
            font-size: 18px;
            margin-bottom: 20px;
          }
          /* Demo Notice Box - Mobile */
          .demo-notice-box {
            flex-direction: column;
            gap: 12px;
            padding: 12px;
            text-align: center;
          }
          .demo-notice-content {
            flex-direction: column;
            gap: 8px;
          }
          .demo-notice-buttons {
            width: 100%;
            flex-direction: row;
            justify-content: center;
          }
          .demo-notice-buttons .btn {
            flex: 1;
            min-width: 80px;
          }
          /* Salary Grid - Mobile */
          .salary-grid {
            grid-template-columns: 80px 1fr;
            gap: 8px;
          }
          .salary-grid > div:last-child {
            grid-column: span 2;
            text-align: right;
          }
          /* Job Status Bar - Mobile */
          .job-status-bar {
            flex-direction: column;
            gap: 12px;
            text-align: center;
          }
          /* Form Grid - Mobile */
          .screen {
            margin: 0 8px;
          }
          .form-input {
            padding: 12px;
            font-size: 14px;
          }
          .input-label {
            font-size: 11px;
          }
          /* Form Grid - Mobile */
          .form-grid {
            grid-template-columns: 1fr;
          }
          /* Section Header - Mobile */
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            text-align: left;
          }
          .section-header-title {
            font-size: 14px;
          }
          .section-header-subtitle {
            font-size: 11px;
          }
          /* Job Tabs - Mobile */
          .job-tabs-container {
            gap: 4px;
            padding: 4px;
          }
          .job-tab {
            padding: 6px 10px;
            font-size: 11px;
          }
          /* Assessment Report - Mobile */
          .assessment-header-mobile {
            flex-direction: column;
            align-items: flex-start;
          }
          /* Upload Box - Mobile */
          .upload-box {
            padding: 16px !important;
          }
          /* Textarea - Mobile */
          textarea.form-input {
            font-size: 13px;
          }
        }
        /* Extra small screens */
        @media (max-width: 400px) {
          .progress-step {
            min-width: 50px;
          }
          .step-number {
            width: 24px;
            height: 24px;
            font-size: 10px;
          }
          .step-label {
            font-size: 8px;
          }
          .app-header h1 {
            font-size: 24px;
          }
          .demo-notice-buttons {
            flex-direction: column;
          }
          .demo-notice-buttons .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
