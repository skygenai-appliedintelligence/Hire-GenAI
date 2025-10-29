"use client";

import { useMemo, useRef, useState } from "react";

// Screen identifiers
const SCREENS = ["job", "candidate", "interview", "assessment"] as const;

type Screen = (typeof SCREENS)[number];

const defaultJobDescription = `Key Responsibilities:
- Conduct keyword research and analysis.
- Optimize website content and landing pages for SEO.
- Monitor and analyze SEO performance metrics.
- Stay up-to-date with the latest SEO trends and algorithm changes.`

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
• Good understanding of SEO fundamentals
• Shows enthusiasm and cultural alignment
• Areas for growth in advanced technical skills`;

function buildQuestionPlan(jobTitle: string, jobDescription: string, resume: string) {
  const title = jobTitle.trim() || "the open role";
  const sentences = jobDescription
    .split(/\r?\n|•|\u2022|\-/)
    .map((line) => line.replace(/^[^a-zA-Z0-9]+/, "").trim())
    .map((line) => (line.endsWith(".") ? line : line ? `${line}.` : line))
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
  const [screen, setScreen] = useState<Screen>("job");

  // Job + candidate state
  const [jobTitle, setJobTitle] = useState("SEO Specialist");
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

  return (
    <div className="page-wrap">
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
          <section className="screen">
            <div className="card">
              <h2>Job Details</h2>
              <div className="form-group">
                <label className="input-label">Job Title</label>
                <input
                  className="form-input"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="input-label">Job Description</label>
                <textarea
                  className="form-input"
                  rows={8}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>
              <div className="button-row">
                <button
                  className="btn btn-next"
                  disabled={!canNextFromJob}
                  onClick={() => goToNext("candidate")}
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        )}

        {/* candidate screen */}
        {screen === "candidate" && (
          <section className="screen">
            <div className="card">
              <h2>Candidate Details</h2>
              <div className="form-row">
                <div className="form-col">
                  <label className="input-label">First Name</label>
                  <input
                    className="form-input"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="form-col">
                  <label className="input-label">Last Name</label>
                  <input
                    className="form-input"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div
                className="upload-box"
                onClick={() => document.getElementById("resumeUpload")?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleResume(file);
                }}
              >
                <div className="upload-message">
                  <div className="upload-icon">📄</div>
                  <div className="upload-text">
                    <div className="drag-text">Drag & drop file here</div>
                    <div className="or-text">or click to select a file</div>
                    <div className="file-hint">(PDF or DOCX only; plain text is auto-read)</div>
                  </div>
                </div>
                <input
                  id="resumeUpload"
                  type="file"
                  accept=".pdf,.docx,.txt,.md"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleResume(file);
                  }}
                />
              </div>
              {resumeFileName && (
                <div className="info-message">Selected: {resumeFileName}</div>
              )}

              <div className="button-row">
                <button className="btn btn-back" onClick={() => goToNext("job")}>
                  Back
                </button>
                <button className="btn btn-next" onClick={() => goToNext("interview")}>
                  Next
                </button>
              </div>
            </div>
          </section>
        )}

        {/* interview screen */}
        {screen === "interview" && (
          <section className="interview-container">
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

            <div className="question-box">
              <div className="ai-message" id="currentQuestion" ref={questionElRef}>
                <div className="ai-avatar">AI</div>
                <div className="message-content">
                  Welcome to your SEO Specialist interview. I'll be asking you some questions about your experience and skills. Ready to begin?
                </div>
              </div>
            </div>

            <div className="ai-avatar-container">
              <video ref={remoteVideoRef} id="remoteVideo" autoPlay playsInline />
              <audio ref={remoteAudioRef} id="remoteAudio" autoPlay />
            </div>
          </section>
        )}

        {/* assessment screen */}
        {screen === "assessment" && (
          <section className="screen">
            <div className="assessment-header">
              <div className="assessment-title">
                <h1>
                  Interview for <span>{candidateName}</span> — <span>{jobTitle || "Role"}</span>
                </h1>
              </div>
              <div className="assessment-tabs">
                <button className="tab-btn active">Evaluation</button>
                <button
                  className="tab-btn"
                  onClick={() => {
                    const el = document.getElementById("finalTranscript");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Transcript
                </button>
                <button id="downloadReport" className="btn btn-next" onClick={exportPdf}>
                  Download Full Report
                </button>
              </div>
            </div>

            <div className="score-section">
              <div className="score-circle">
                <svg viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#6b46ff"
                    strokeWidth="2"
                    strokeDasharray={`${totalScore}, 100`}
                  />
                  <text x="18" y="20" textAnchor="middle" fill="#2d3748" fontSize="8">
                    {totalScore}
                  </text>
                </svg>
                <div className="score-label">/100</div>
              </div>
            </div>

            <div className="evaluation-sections">
              <div className="eval-section">
                <h3>Overall Summary</h3>
                <p style={{ whiteSpace: "pre-wrap" }}>{generalNotes}</p>
              </div>
              {([
                ["Technical Expertise", scores.technical, "technical"],
                ["Communication Skills", scores.communication, "communication"],
                ["Problem Solving", scores.problemSolving, "problemSolving"],
                ["Leadership Potential", scores.leadership, "leadership"],
                ["Cultural Fit", scores.cultural, "cultural"],
                ["Professional Conduct", scores.conduct, "conduct"],
              ] as const).map(([label, score, key]) => (
                <div key={key} className="eval-section">
                  <h3>
                    {label}
                    <span className="eval-score">{score}/10</span>
                  </h3>
                  <p>Assessment will appear after the interview.</p>
                </div>
              ))}
            </div>

            <div className="card" id="finalTranscript" style={{ marginTop: 24 }}>
              <h3>Interview Transcript</h3>
              <div className="chat-transcript">
                {transcript.map((line, i) => {
                  const isAI = line.startsWith("AI: ");
                  const text = isAI ? line.slice(4) : line.replace(/^User: /, "");
                  return (
                    <div key={i} className={`chat-message ${isAI ? "ai" : "user"}`}>
                      <div className="chat-avatar">{isAI ? "AI" : "U"}</div>
                      <div className="chat-bubble">{text}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </div>

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
        @media (max-width: 600px) {
          .progress-bar {
            flex-direction: column;
            gap: 16px;
          }
          .progress-step::before {
            width: 2px;
            height: calc(100% - 32px);
            left: 15px;
            top: 32px;
            transform: none;
          }
          .step-number {
            margin-left: 0;
          }
          .step-label {
            text-align: left;
            margin-left: 44px;
          }
        }
      `}</style>
    </div>
  );
}
