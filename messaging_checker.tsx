import { useState, useRef } from "react";

const ASSET_TYPES = ["Campaign brief", "Email / demand gen", "Sales enablement", "Event content", "Website / landing page"];
const PERSONAS = ["VP of Operations", "Digital Transformation Leader", "IT Leader", "Process Owner", "General / All personas"];

const ISSUE_TYPES = {
  pillar: { label: "Pillar alignment", color: "#534AB7", bg: "#EEEDFE" },
  persona: { label: "Persona mismatch", color: "#0F6E56", bg: "#E1F5EE" },
  terminology: { label: "Outdated terminology", color: "#993C1D", bg: "#FAECE7" },
  framing: { label: "Feature vs. outcome", color: "#185FA5", bg: "#E6F1FB" },
  platform: { label: "Platform connection", color: "#BA7517", bg: "#FAEEDA" },
  consistency: { label: "Internal consistency", color: "#993556", bg: "#FBEAF0" },
};

const SYSTEM_PROMPT = `You are a product marketing messaging expert for Tulip, a manufacturing operations platform. Evaluate content against Tulip's approved FY27 messaging framework.

Core positioning: Tulip is the Operations-First AI platform combining composable operations software with human-first AI.

Approved FY27 pillars:
1. Contextualized AI — Human-First AI working WITH frontline workers
2. Composability + AI — Build and adapt operations apps without engineering dependency
3. Enterprise Scalability — Deploy across sites, scale with confidence

Approved framework: Compose → Orchestrate & Adapt → Evolve (NOT "Compose → Augment → Optimize")

Approved terms: "Human-First AI", "Composable operations", "Operations-First AI platform", "Frontline workers", "Engineering independence", "Orchestrate & Adapt", "Evolve"

Banned terms: "no-code", "drag-and-drop", "shop floor digitization", "Augment" as framework step, "Optimize" as framework step

Persona messages:
- VP of Operations: Operational agility, cost of quality reduction, faster time-to-value
- Digital Transformation Leader: Composable architecture, AI readiness, legacy modernization
- IT Leader: Enterprise security, integration flexibility, engineering independence
- Process Owner: Empowerment to build and adapt without waiting for IT

Always lead with business outcomes, not features.`;

const callClaude = async (messages, maxTokens = 1500) => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: maxTokens, system: SYSTEM_PROMPT, messages })
  });
  const d = await res.json();
  const text = d.content?.[0]?.text || "";
  const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(clean);
};

const SAMPLE = `Tulip's no-code platform gives manufacturers the ability to digitize their shop floor operations quickly and easily. With drag-and-drop app building and pre-built connectors, teams can deploy apps without IT involvement. Our composability features let you configure workflows for any process, and our AI tools help you analyze data from machines and workers.`;

const LAUNCH_DEF = {
  featureName: "Factory Playback", campaign: "Contextualized AI",
  positioning: "Factory Playback creates a synchronized, replayable history of factory operations by combining video with operational events captured by Tulip apps and machines.",
  oneLine: "Replay your factory to understand exactly what happened and why.",
  elevator: "Factory Playback enables manufacturers to reconstruct and replay production as it actually occurred. By synchronizing video streams with operational events, teams can jump directly to the moment an issue occurred.",
  pillars: "1. Replayable Factory Operations\n2. Connect Operational Data with Physical Reality\n3. AI-Ready Operational History",
  personaMessages: "VP of Operations: Replayable view of production to resolve issues faster.\nDT Leaders: Extends Tulip platform by connecting operational events with video.\nIT Leaders: Hybrid edge-cloud architecture reducing bandwidth costs.",
  painPoints: "Teams forced to reconstruct events from disconnected dashboards.\nTraditional systems record outcomes but lose physical context.",
  differentiation: "Tulip uniquely combines frontline workflows, machine telemetry, and operational events with video."
};

export default function App() {
  const [tab, setTab] = useState("asset");
  const [inputMode, setInputMode] = useState("text");
  const [draft, setDraft] = useState(SAMPLE);
  const [lpCopy, setLpCopy] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfB64, setPdfB64] = useState(null);
  const [assetType, setAssetType] = useState(ASSET_TYPES[0]);
  const [persona, setPersona] = useState(PERSONAS[0]);
  const [launch, setLaunch] = useState(LAUNCH_DEF);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState({});
  const fileRef = useRef();

  const toggle = i => setOpen(p => ({ ...p, [i]: !p[i] }));

  const handleFile = e => {
    const f = e.target.files?.[0]; if (!f) return;
    setPdfFile(f); setResult(null);
    const r = new FileReader();
    r.onload = () => setPdfB64(r.result.split(",")[1]);
    r.readAsDataURL(f);
  };

  const run = async () => {
    setLoading(true); setError(null); setResult(null); setOpen({});
    try {
      let msgs, prompt, r;

      if (tab === "launch") {
        const c = `Feature: ${launch.featureName}\nCampaign: ${launch.campaign}\nPositioning: ${launch.positioning}\nOne-line: ${launch.oneLine}\nElevator: ${launch.elevator}\nPillars:\n${launch.pillars}\nPersonas:\n${launch.personaMessages}\nPain points:\n${launch.painPoints}\nDiff:\n${launch.differentiation}`;
        prompt = `${c}\n\nEvaluate across 6 dimensions: pillar, persona, terminology, framing, platform (anchored to FY27 pillar?), consistency (do sections contradict?). Return ONLY valid JSON:\n{"overallScore":75,"summary":"text","platformPillar":"pillar name","issues":[{"issueType":"terminology","draftText":"phrase","approvedText":"better phrase","explanation":"reason"}],"strengths":["strength"]}`;
        msgs = [{ role: "user", content: prompt }];

      } else if (inputMode === "landing") {
        prompt = `Evaluate this landing page copy section by section.\n\nPersona: ${persona}\n\nCopy:\n${lpCopy}\n\nReturn ONLY valid JSON:\n{"overallScore":75,"summary":"text","platformPillar":"pillar","sections":[{"sectionName":"name","currentCopy":"copy","hasIssues":true,"issues":[{"issueType":"terminology","draftText":"phrase","explanation":"reason"}],"suggestedRewrite":"improved copy"}],"strengths":["strength"]}`;
        msgs = [{ role: "user", content: prompt }];

      } else if (inputMode === "pdf") {
        prompt = `Asset type: ${assetType}\nPersona: ${persona}\n\nEvaluate all messaging. Return ONLY valid JSON:\n{"overallScore":75,"summary":"text","issues":[{"issueType":"terminology","draftText":"phrase","approvedText":"better","explanation":"reason"}],"strengths":["strength"]}`;
        msgs = [{ role: "user", content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfB64 } },
          { type: "text", text: prompt }
        ]}];

      } else {
        prompt = `Asset type: ${assetType}\nPersona: ${persona}\n\nDraft:\n"${draft}"\n\nReturn ONLY valid JSON:\n{"overallScore":75,"summary":"text","issues":[{"issueType":"terminology","draftText":"phrase","approvedText":"better","explanation":"reason"}],"strengths":["strength"]}`;
        msgs = [{ role: "user", content: prompt }];
      }

      r = await callClaude(msgs, inputMode === "landing" ? 2500 : 1500);
      setResult(r);
    } catch(e) {
      setError("Something went wrong: " + e.message);
    }
    setLoading(false);
  };

  const canRun = tab === "launch"
    ? !!(launch.featureName && launch.positioning)
    : inputMode === "pdf" ? !!pdfB64
    : inputMode === "landing" ? lpCopy.trim().length > 50
    : draft.trim().length > 10;

  const scoreColor = !result ? "#888780"
    : result.overallScore >= 75 ? "#0F6E56"
    : result.overallScore >= 50 ? "#BA7517" : "#A32D2D";

  const inputBorder = "0.5px solid var(--color-border-secondary)";
  const inputStyle = { width: "100%", resize: "vertical", fontSize: 13, lineHeight: 1.6, padding: "10px 12px", boxSizing: "border-box", borderRadius: "var(--border-radius-md)", border: inputBorder, background: "var(--color-background-primary)", color: "var(--color-text-primary)", fontFamily: "var(--font-sans)" };

  const lf = (k, label, rows = 2) => (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>{label}</label>
      <textarea rows={rows} value={launch[k]} onChange={e => setLaunch(p => ({ ...p, [k]: e.target.value }))} style={inputStyle} />
    </div>
  );

  return (
    <div style={{ fontFamily: "var(--font-sans)", padding: "1.5rem 0", maxWidth: 760, margin: "0 auto" }}>

      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: "1rem" }}>
        {[["asset","Asset checker"],["launch","Launch messaging"]].map(([v,l]) => (
          <button key={v} onClick={() => { setTab(v); setResult(null); setError(null); }}
            style={{ background: tab===v ? "var(--color-background-secondary)" : "transparent", fontWeight: tab===v ? 500 : 400 }}>{l}</button>
        ))}
      </div>

      {tab === "asset" && (
        <>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 1.25rem" }}>Check any asset against Tulip's approved FY27 messaging.</p>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {[["text","Paste text"],["pdf","Upload PDF"],["landing","Landing page"]].map(([m,l]) => (
              <button key={m} onClick={() => { setInputMode(m); setResult(null); setError(null); }}
                style={{ background: inputMode===m ? "var(--color-background-secondary)" : "transparent", fontWeight: inputMode===m ? 500 : 400, fontSize: 13 }}>{l}</button>
            ))}
          </div>

          {inputMode !== "landing" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Asset type</label>
                <select value={assetType} onChange={e => setAssetType(e.target.value)} style={{ width: "100%" }}>{ASSET_TYPES.map(t => <option key={t}>{t}</option>)}</select>
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Target persona</label>
                <select value={persona} onChange={e => setPersona(e.target.value)} style={{ width: "100%" }}>{PERSONAS.map(p => <option key={p}>{p}</option>)}</select>
              </div>
            </div>
          )}

          {inputMode === "text" && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Draft asset</label>
              <textarea value={draft} onChange={e => { setDraft(e.target.value); setResult(null); }} rows={6} style={inputStyle} placeholder="Paste your draft asset here..." />
            </div>
          )}

          {inputMode === "pdf" && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Upload PDF</label>
              <div onClick={() => fileRef.current.click()} style={{ border: "0.5px dashed var(--color-border-secondary)", borderRadius: "var(--border-radius-lg)", padding: "2rem", textAlign: "center", cursor: "pointer", background: "var(--color-background-secondary)" }}>
                {pdfFile
                  ? <><div style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4 }}>{pdfFile.name}</div><div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{(pdfFile.size/1024).toFixed(0)} KB — click to replace</div></>
                  : <><div style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 4 }}>Click to upload a PDF</div><div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>Supports decks and docs exported as PDF</div></>}
              </div>
              <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFile} style={{ display: "none" }} />
            </div>
          )}

          {inputMode === "landing" && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Target persona</label>
                <select value={persona} onChange={e => setPersona(e.target.value)} style={{ width: "100%", maxWidth: 320 }}>{PERSONAS.map(p => <option key={p}>{p}</option>)}</select>
              </div>
              <label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Paste landing page copy</label>
              <textarea value={lpCopy} onChange={e => { setLpCopy(e.target.value); setResult(null); }} rows={10} style={inputStyle} placeholder="Paste all copy from the landing page here. Select all text on the page (Cmd+A), copy, and paste." />
              <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "6px 0 0" }}>The tool will evaluate copy section by section and suggest rewrites for each.</p>
            </div>
          )}
        </>
      )}

      {tab === "launch" && (
        <>
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 1.25rem" }}>Validate new feature launch messaging against the FY27 platform narrative.</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div><label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Feature name</label><input value={launch.featureName} onChange={e => setLaunch(p=>({...p,featureName:e.target.value}))} style={{ width:"100%",boxSizing:"border-box" }} /></div>
            <div><label style={{ fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Product campaign</label><input value={launch.campaign} onChange={e => setLaunch(p=>({...p,campaign:e.target.value}))} style={{ width:"100%",boxSizing:"border-box" }} /></div>
          </div>
          {lf("positioning","Positioning statement",2)}
          {lf("oneLine","One-line summary",1)}
          {lf("elevator","Elevator pitch",4)}
          {lf("pillars","Messaging pillars (one per line)",3)}
          {lf("personaMessages","Persona-specific messages",4)}
          {lf("painPoints","Pain points addressed",3)}
          {lf("differentiation","Tulip differentiation",3)}
        </>
      )}

      <button onClick={run} disabled={loading || !canRun} style={{ marginBottom: "1.5rem" }}>
        {loading ? "Checking..." : tab==="launch" ? "Validate launch messaging ↗" : inputMode==="landing" ? "Review landing page ↗" : "Check messaging ↗"}
      </button>

      {error && (
        <div style={{ padding: "10px 14px", background: "#FCEBEB", border: "0.5px solid #F7C1C1", borderRadius: "var(--border-radius-md)", marginBottom: "1rem" }}>
          <p style={{ fontSize: 13, color: "#A32D2D", margin: 0 }}>{error}</p>
        </div>
      )}

      {result && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 16, alignItems: "center", marginBottom: "1.5rem", padding: "1rem 1.25rem", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 38, fontWeight: 500, color: scoreColor, lineHeight: 1 }}>{result.overallScore}</div>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>/ 100</div>
            </div>
            <div>
              {result.platformPillar && <div style={{ marginBottom: 8 }}><span style={{ fontSize: 11, padding: "3px 8px", borderRadius: "var(--border-radius-md)", background: "#FAEEDA", color: "#BA7517", display: "inline-block" }}>Pillar: {result.platformPillar}</span></div>}
              <p style={{ fontSize: 14, margin: 0, lineHeight: 1.6, color: "var(--color-text-primary)" }}>{result.summary}</p>
            </div>
          </div>

          {Array.isArray(result.sections) && result.sections.length > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Section-by-section review</div>
              {result.sections.map((sec, i) => (
                <div key={i} style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", marginBottom: 8 }}>
                  <div onClick={() => toggle(i)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", cursor: "pointer", background: "var(--color-background-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{sec.sectionName || `Section ${i+1}`}</span>
                      {sec.hasIssues
                        ? <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: "var(--border-radius-md)", background: "#FAECE7", color: "#993C1D" }}>{(sec.issues||[]).length} issue{(sec.issues||[]).length !== 1 ? "s" : ""}</span>
                        : <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: "var(--border-radius-md)", background: "#E1F5EE", color: "#0F6E56" }}>looks good</span>}
                    </div>
                    <span style={{ fontSize: 16, color: "var(--color-text-secondary)", lineHeight: 1 }}>{open[i] ? "−" : "+"}</span>
                  </div>
                  {open[i] && (
                    <div style={{ padding: "14px", borderTop: "0.5px solid var(--color-border-tertiary)" }}>
                      {sec.currentCopy && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6, letterSpacing: "0.04em" }}>CURRENT COPY</div>
                          <p style={{ fontSize: 13, margin: 0, color: "var(--color-text-primary)", lineHeight: 1.6, fontStyle: "italic" }}>"{sec.currentCopy}"</p>
                        </div>
                      )}
                      {(sec.issues||[]).length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 6, letterSpacing: "0.04em" }}>FLAGGED ISSUES</div>
                          {(sec.issues||[]).map((iss, j) => {
                            const type = ISSUE_TYPES[iss.issueType] || ISSUE_TYPES.terminology;
                            return (
                              <div key={j} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 6, padding: "8px 10px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)" }}>
                                <span style={{ fontSize: 11, padding: "3px 7px", borderRadius: "var(--border-radius-md)", background: type.bg, color: type.color, whiteSpace: "nowrap", flexShrink: 0 }}>{type.label}</span>
                                <p style={{ fontSize: 13, margin: 0, color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                                  <em>"{iss.draftText}"</em>
                                  <span style={{ color: "var(--color-text-secondary)", marginLeft: 6 }}>— {iss.explanation}</span>
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {sec.suggestedRewrite && (
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "#085041", marginBottom: 6, letterSpacing: "0.04em" }}>SUGGESTED REWRITE</div>
                          <div style={{ fontSize: 13, lineHeight: 1.7, color: "#085041", padding: "10px 12px", background: "#E1F5EE", borderRadius: "var(--border-radius-md)", border: "0.5px solid #9FE1CB" }}>{sec.suggestedRewrite}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {Array.isArray(result.issues) && result.issues.length > 0 && !result.sections && (
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Flagged issues</div>
              <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", background: "var(--color-background-secondary)", padding: "8px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>DRAFT LANGUAGE</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>APPROVED MESSAGING</span>
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)", fontWeight: 500 }}>TYPE</span>
                </div>
                {result.issues.map((iss, i) => {
                  const type = ISSUE_TYPES[iss.issueType] || ISSUE_TYPES.terminology;
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", padding: "12px", borderBottom: i < result.issues.length-1 ? "0.5px solid var(--color-border-tertiary)" : "none", alignItems: "start" }}>
                      <div style={{ paddingRight: 12 }}>
                        <p style={{ fontSize: 13, margin: "0 0 4px", fontStyle: "italic" }}>"{iss.draftText}"</p>
                        <p style={{ fontSize: 12, margin: 0, color: "var(--color-text-secondary)" }}>{iss.explanation}</p>
                      </div>
                      <div style={{ paddingRight: 12 }}><p style={{ fontSize: 13, margin: 0 }}>{iss.approvedText}</p></div>
                      <div><span style={{ fontSize: 11, padding: "3px 8px", borderRadius: "var(--border-radius-md)", background: type.bg, color: type.color, whiteSpace: "nowrap", display: "inline-block" }}>{type.label}</span></div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {Array.isArray(result.strengths) && result.strengths.length > 0 && (
            <div style={{ padding: "1rem 1.25rem", background: "#E1F5EE", borderRadius: "var(--border-radius-lg)", border: "0.5px solid #9FE1CB" }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: "#085041", marginBottom: 8 }}>What's working</div>
              <ul style={{ margin: 0, padding: "0 0 0 16px" }}>
                {result.strengths.map((s, i) => <li key={i} style={{ fontSize: 13, color: "#0F6E56", marginBottom: 4, lineHeight: 1.5 }}>{s}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
