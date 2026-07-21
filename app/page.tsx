"use client";

import {
  ArrowUp,
  BrainCircuit,
  Check,
  ChevronDown,
  FileCheck2,
  FlaskConical,
  MessageCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AuditSummary, ChatMessage, EvaluatedCase } from "../lib/types";

type Tab = "chat" | "case";

const familyLabels: Record<string, string> = {
  "Funciones Ños": "Ños Functions",
  "Máscaras Funcionales": "Functional Masks",
  "Casos claros": "Resolved expert cases",
  "Casos oscuros": "Unresolved expert cases"
};

function normalizeEvaluatedCase(value: EvaluatedCase): EvaluatedCase {
  const rawScore = Number(value?.evaluation?.score);
  if (!Number.isFinite(rawScore)) return value;
  const score = Math.max(0, Math.min(100, Math.round(rawScore <= 10 ? rawScore * 10 : rawScore)));
  return { ...value, evaluation: { ...value.evaluation, score } };
}

export default function HomePage() {
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [audit, setAudit] = useState<AuditSummary | null>(null);
  const [auditOpen, setAuditOpen] = useState(false);
  const [visibleTurns, setVisibleTurns] = useState(1);
  const [evaluatedCase, setEvaluatedCase] = useState<EvaluatedCase | null>(null);
  const [caseLoading, setCaseLoading] = useState(false);
  const [caseElapsed, setCaseElapsed] = useState(0);
  const [caseError, setCaseError] = useState("");
  const caseRequested = useRef(false);
  const [serviceReady, setServiceReady] = useState<boolean | null>(null);
  const userTurns = messages.filter((message) => message.role === "user").length;
  const canSend = useMemo(
    () => draft.trim().length > 0 && !loading && userTurns < 5 && serviceReady === true,
    [draft, loading, serviceReady, userTurns]
  );
  const casePhase =
    caseElapsed < 8
      ? "Consulting the four architecture families"
      : caseElapsed < 24
        ? "Constructing three coherent exchanges"
        : "Completing the critical evaluation";
  const caseTimer = `${String(Math.floor(caseElapsed / 60)).padStart(2, "0")}:${String(
    caseElapsed % 60
  ).padStart(2, "0")}`;

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => setServiceReady(Boolean(result.ready)))
      .catch(() => setServiceReady(false));
  }, []);

  useEffect(() => {
    if (!caseLoading) return;
    const timer = window.setInterval(() => setCaseElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [caseLoading]);

  useEffect(() => {
    if (tab !== "case" || evaluatedCase || caseRequested.current) return;

    const saved = sessionStorage.getItem("nos-evaluated-case-v1");
    if (saved) {
      try {
        const normalized = normalizeEvaluatedCase(JSON.parse(saved));
        sessionStorage.setItem("nos-evaluated-case-v1", JSON.stringify(normalized));
        setEvaluatedCase(normalized);
        return;
      } catch {
        sessionStorage.removeItem("nos-evaluated-case-v1");
      }
    }

    caseRequested.current = true;
    setCaseElapsed(0);
    setCaseLoading(true);
    setCaseError("");
    const sessionKeyName = "nos-evaluated-case-session-v1";
    let sessionId = sessionStorage.getItem(sessionKeyName);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(sessionKeyName, sessionId);
    }

    fetch("/api/evaluated-case", {
      method: "POST",
      cache: "no-store",
      headers: { "x-nos-session": sessionId }
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "The evaluated case could not be generated.");
        const normalized = normalizeEvaluatedCase(result);
        sessionStorage.setItem("nos-evaluated-case-v1", JSON.stringify(normalized));
        setEvaluatedCase(normalized);
      })
      .catch((caught) => {
        setCaseError(caught instanceof Error ? caught.message : "The evaluated case could not be generated.");
      })
      .finally(() => setCaseLoading(false));
  }, [tab, evaluatedCase]);

  async function sendMessage() {
    if (!canSend) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: draft.trim() }];
    setMessages(next);
    setDraft("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Ños could not be reached.");
      setMessages([...next, { role: "assistant", content: result.message }]);
      setAudit(result.audit);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([]);
    setDraft("");
    setAudit(null);
    setError("");
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="pulse" aria-hidden="true">
            <BrainCircuit size={20} />
          </span>
          <div>
            <strong>Ños</strong>
            <small>Clinical-Symbolic System · v1.2.5</small>
          </div>
        </div>
        <div className={`status-pill ${serviceReady === false ? "pending" : ""}`}>
          <span /> {serviceReady === null ? "Checking connection" : serviceReady ? "Architecture connected" : "Connection pending"}
        </div>
      </header>

      <nav className="tabs" aria-label="Experiences">
        <button className={tab === "chat" ? "active" : ""} onClick={() => setTab("chat")}>
          <MessageCircle size={17} /> Chat Ños
        </button>
        <button className={tab === "case" ? "active" : ""} onClick={() => setTab("case")}>
          <FlaskConical size={17} /> Evaluated case
        </button>
      </nav>

      {tab === "chat" ? (
        <section className="workspace">
          <div className="demo-notice">
            <ShieldCheck size={17} />
            <p>
              Experimental demonstration. It does not diagnose or replace psychological, medical, or
              emergency care.
            </p>
          </div>

          <div className="conversation" aria-live="polite">
            {messages.length === 0 ? (
              <div className="empty">
                <span className="empty-icon"><Sparkles /></span>
                <p className="eyebrow">INDEPENDENT IMPLEMENTATION</p>
                <h1>Talk with Ños</h1>
                <p>
                  A demonstration window into a documented architecture for non-diagnostic psychological
                  support, analysis, and guidance.
                </p>
                <div className="architecture-row">
                  <span>4 document families</span>
                  <i />
                  <span>Mandatory retrieval</span>
                  <i />
                  <span>Automatic model routing</span>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <article className={`bubble ${message.role}`} key={`${message.role}-${index}`}>
                  <span>{message.role === "assistant" ? "Ños" : "You"}</span>
                  <p>{message.content}</p>
                  {message.role === "assistant" && index === messages.length - 1 && audit ? (
                    <button className="evidence-button" onClick={() => setAuditOpen((value) => !value)}>
                      <FileCheck2 size={14} /> Ños architecture applied
                      <ChevronDown size={14} className={auditOpen ? "rotated" : ""} />
                    </button>
                  ) : null}
                </article>
              ))
            )}
            {loading ? (
              <div className="thinking"><span /> Ños is integrating the context and cross-checking its documents…</div>
            ) : null}

            {auditOpen && audit ? (
              <aside className="audit-panel">
                <div className="audit-title">
                  <div>
                    <span className="eyebrow">TRACEABILITY WITHOUT EXPOSING THE SYSTEM</span>
                    <h2>Architecture consulted</h2>
                  </div>
                  <strong>{audit.evidenceCount}</strong>
                </div>
                <div className="audit-grid">
                  {audit.familiesConsulted.map((family) => (
                    <span key={family}><Check size={13} /> {familyLabels[family] || family}</span>
                  ))}
                </div>
                <p>
                  This response was produced only after retrieving evidence from all four document families.
                  Private excerpts and internal reasoning remain protected.
                </p>
                <div className="audit-meta">
                  <span>Ños {audit.version}</span>
                  <span>{audit.modelClass === "deep" ? "Deep reasoning" : "Efficient mode"}</span>
                  <span>Conversation not stored</span>
                </div>
              </aside>
            ) : null}
          </div>

          <div className="composer-wrap">
            <div className="session-meta">
              <span>{userTurns}/5 demonstration messages</span>
              {messages.length ? (
                <button onClick={resetChat}><RotateCcw size={13} /> Reset</button>
              ) : null}
            </div>
            <div className="composer">
              <textarea
                aria-label="Message"
                placeholder={
                  serviceReady === false
                    ? "Connect the API and document store to activate Ños."
                    : userTurns >= 5
                      ? "This demonstration session has ended."
                      : "Write what you would like to share…"
                }
                value={draft}
                disabled={userTurns >= 5 || serviceReady === false}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <button aria-label="Send" disabled={!canSend} onClick={sendMessage}>
                <ArrowUp />
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="case-layout">
          <div className="case-intro">
            <span className="eyebrow">LIVE SYNTHETIC EVALUATION</span>
            <h1>{caseLoading ? "Creating a new case…" : evaluatedCase?.title || "A case unique to this session"}</h1>
            <p>
              {caseLoading
                ? "The API is creating a fictional user, three complete exchanges, and a critical final evaluation."
                : evaluatedCase?.scenario || "Open this experience to generate an original synthetic case."}
            </p>
            <div className="architecture-row">
              <span>3 complete exchanges</span>
              <i />
              <span>Generated live through the API</span>
              <i />
              <span>One case per session</span>
            </div>
            <div className="case-note">
              <FlaskConical size={18} />
              <p>
                This test uses no data from a real person. Its case, conversation, and evaluation are created
                automatically for this browser session and then preserved to prevent repeated API charges.
              </p>
            </div>
            {evaluatedCase ? (
              <div className="turn-controls">
                <button
                  className="primary"
                  disabled={visibleTurns >= evaluatedCase.turns.length}
                  onClick={() => setVisibleTurns((value) => Math.min(evaluatedCase.turns.length, value + 1))}
                >
                  {visibleTurns >= evaluatedCase.turns.length ? "Conversation complete" : "Show next intervention"}
                </button>
                <button className="secondary" onClick={() => setVisibleTurns(1)}>Replay this case</button>
              </div>
            ) : null}
            {caseLoading ? (
              <div className="case-progress" role="status" aria-live="polite">
                <div className="case-progress-head">
                  <span><i /> {casePhase}</span>
                  <strong>{caseTimer}</strong>
                </div>
                <div className="case-progress-track"><span /></div>
                <p>A live case normally takes 20–60 seconds. Keep this tab open; it will appear automatically.</p>
              </div>
            ) : null}
            {caseError ? <div className="case-inline-error">{caseError}</div> : null}
          </div>

          <div className="case-results">
            {evaluatedCase?.turns.slice(0, visibleTurns).map((turn, index) => (
              <article className={`turn ${turn.speaker === "Ños" ? "nos" : "patient"}`} key={index}>
                <span>{String(index + 1).padStart(2, "0")} · {turn.speaker}</span>
                <p>{turn.content}</p>
              </article>
            ))}

            {evaluatedCase && visibleTurns >= evaluatedCase.turns.length ? (
              <article className="scorecard">
                <div className="score"><strong>{evaluatedCase.evaluation.score}</strong><span>/100</span></div>
                <div className="evaluation-copy">
                  <span className="eyebrow">SYNTHETIC PATIENT · FINAL ANALYSIS</span>
                  <h2>Strengths</h2>
                  <ul>{evaluatedCase.evaluation.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
                  <h2>Limitations</h2>
                  <ul>{evaluatedCase.evaluation.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
                  <h2>Observed capabilities</h2>
                  <ul>{evaluatedCase.evaluation.observed_capabilities.map((item) => <li key={item}>{item}</li>)}</ul>
                  <p>{evaluatedCase.evaluation.conclusion}</p>
                </div>
              </article>
            ) : null}
          </div>
        </section>
      )}

      {error ? <div role="alert" className="error">{error}</div> : null}
      <footer>
        <strong>Ños 1.2.5</strong> · OpenAI Build Week demonstration · The intended product is a mobile application.
      </footer>
    </main>
  );
}
