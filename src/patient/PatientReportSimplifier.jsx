import { useState, useCallback, useRef } from "react";

// ── Supported languages ───────────────────────────────────────────────────────
const LANGUAGES = [
  { code: "en", label: "English",   native: "English",  flag: "🇬🇧" },
  { code: "ta", label: "Tamil",     native: "தமிழ்",     flag: "🇮🇳" },
  { code: "hi", label: "Hindi",     native: "हिन्दी",     flag: "🇮🇳" },
  { code: "ml", label: "Malayalam", native: "മലയാളം",    flag: "🇮🇳" },
  { code: "te", label: "Telugu",    native: "తెలుగు",     flag: "🇮🇳" },
  { code: "kn", label: "Kannada",   native: "ಕನ್ನಡ",      flag: "🇮🇳" },
  { code: "bn", label: "Bengali",   native: "বাংলা",      flag: "🇮🇳" },
  { code: "mr", label: "Marathi",   native: "मराठी",      flag: "🇮🇳" },
];

// ── Build prompt for a given language — passed directly to Sarvam ─────────────
function buildPrompt(langCode) {
  const lang = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];
  const isEnglish = langCode === "en";

  const langInstruction = isEnglish
    ? "Write the entire response in simple, friendly English."
    : `Write the ENTIRE response in ${lang.label} (${lang.native}). Every word of the content must be in ${lang.label}. Only keep the emoji section headers exactly as shown — translate all the text after them into ${lang.label}. Use simple, everyday ${lang.label} that a patient with no medical background can understand.`;

  return `You are a compassionate medical translator helping patients understand their health reports.
${langInstruction}

Please simplify the attached medical report into plain, friendly language. Structure your response using EXACTLY these section headers (copy the emojis exactly as shown):

📋 WHAT THIS REPORT IS ABOUT
[1-2 sentences explaining the type of report]

🔍 KEY FINDINGS
[Bullet points with - prefix explaining each finding simply]

✅ WHAT'S NORMAL
[Bullet points with - prefix listing anything within healthy range]

⚠️ WHAT NEEDS ATTENTION
[Bullet points with - prefix for anything requiring follow-up]

💊 NEXT STEPS
[Numbered list 1. 2. 3. of simple actionable suggestions]

❓ QUESTIONS TO ASK YOUR DOCTOR
[Numbered list 1. 2. 3. of helpful questions]

IMPORTANT:
- Use **bold** around key medical terms
- Use bullet points with - prefix
- Do NOT use --- dividers
- Keep the tone warm, caring, and non-alarming
- ${isEnglish ? "Write in plain English" : `Every sentence must be in ${lang.label} — do not mix in English except for medical terms that have no ${lang.label} equivalent`}`;
}

// ── Parse AI response into structured sections ────────────────────────────────
function parseReport(text) {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/g, "").trim();

  const SECTION_ICONS = {
    "WHAT THIS REPORT IS ABOUT": "📋",
    "KEY FINDINGS":               "🔍",
    "WHAT'S NORMAL":              "✅",
    "WHAT NEEDS ATTENTION":       "⚠️",
    "NEXT STEPS":                 "💊",
    "QUESTIONS TO ASK":           "❓",
  };

  const SECTION_COLORS = {
    "📋": { color:"#60A5FA", bg:"rgba(96,165,250,0.08)",  border:"rgba(96,165,250,0.2)"  },
    "🔍": { color:"#7AE2CF", bg:"rgba(122,226,207,0.08)", border:"rgba(122,226,207,0.2)" },
    "✅": { color:"#34D399", bg:"rgba(52,211,153,0.08)",  border:"rgba(52,211,153,0.2)"  },
    "⚠️": { color:"#FBBF24", bg:"rgba(251,191,36,0.08)",  border:"rgba(251,191,36,0.2)"  },
    "💊": { color:"#A78BFA", bg:"rgba(167,139,250,0.08)", border:"rgba(167,139,250,0.2)" },
    "❓": { color:"#F472B6", bg:"rgba(244,114,182,0.08)", border:"rgba(244,114,182,0.2)" },
  };

  const sections = [];
  const lines = cleaned.split("\n");
  let currentSection = null;
  let currentLines   = [];

  function flushSection() {
    if (currentSection) sections.push({ ...currentSection, lines: currentLines.filter(l => l.trim()) });
    currentLines = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line === "---") continue;

    const headerMatch =
      line.match(/^([📋🔍✅⚠️💊❓])\s+\*{0,2}(.+?)\*{0,2}$/) ||
      line.match(/^\*{1,2}([📋🔍✅⚠️💊❓].+?)\*{0,2}$/) ||
      (() => {
        for (const [key, icon] of Object.entries(SECTION_ICONS)) {
          if (line.toUpperCase().includes(key)) return [null, icon, line.replace(/[📋🔍✅⚠️💊❓*#]/g,"").trim()];
        }
        return null;
      })();

    if (headerMatch) {
      flushSection();
      const icon  = headerMatch[1];
      const title = (headerMatch[2] || headerMatch[1] || "").replace(/[*#]/g,"").trim();
      const theme = SECTION_COLORS[icon] || SECTION_COLORS["📋"];
      currentSection = { icon, title, ...theme };
      currentLines   = [];
    } else {
      currentLines.push(line);
    }
  }
  flushSection();

  if (!sections.length) {
    sections.push({ icon:"📄", title:"Report Summary", color:"#7AE2CF", bg:"rgba(122,226,207,0.08)", border:"rgba(122,226,207,0.2)", lines: cleaned.split("\n").filter(l=>l.trim()) });
  }
  return sections;
}

function RichLine({ text }) {
  const cleaned  = text.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, m => m);
  const isBullet = /^[-•*]\s/.test(text) || /^\d+\.\s/.test(text);
  const num      = text.match(/^(\d+)\.\s/);
  const parts    = cleaned.split(/(\*{1,2}[^*]+\*{1,2})/g);
  const rendered = parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ color:"#e0f7f5", fontWeight:800 }}>{p.slice(2,-2)}</strong>;
    if (p.startsWith("*")  && p.endsWith("*"))  return <em key={i} style={{ color:"#c8f0eb", fontStyle:"italic" }}>{p.slice(1,-1)}</em>;
    return <span key={i}>{p}</span>;
  });
  return (
    <div style={{ display:"flex", gap:10, alignItems:"flex-start", marginBottom:6, lineHeight:1.7 }}>
      {isBullet && (
        <span style={{ flexShrink:0, marginTop:2, fontSize:num?12:14 }}>
          {num
            ? <span style={{ background:"rgba(122,226,207,0.15)", borderRadius:"50%", width:20, height:20, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:800, color:"#7AE2CF" }}>{num[1]}</span>
            : <span style={{ color:"#7AE2CF" }}>✦</span>}
        </span>
      )}
      <span style={{ color:"#c8f0eb", fontSize:14 }}>{rendered}</span>
    </div>
  );
}

function SectionCard({ section }) {
  return (
    <div style={{ background:section.bg, border:`1px solid ${section.border}`, borderRadius:14, overflow:"hidden", marginBottom:16 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 18px", borderBottom:`1px solid ${section.border}`, background:section.bg }}>
        <span style={{ fontSize:20 }}>{section.icon}</span>
        <span style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:600, color:section.color, letterSpacing:.2 }}>
          {section.title.replace(/[📋🔍✅⚠️💊❓]/g,"").trim()}
        </span>
      </div>
      <div style={{ padding:"14px 18px" }}>
        {section.lines.map((line, i) => <RichLine key={i} text={line} />)}
      </div>
    </div>
  );
}

// ── Language Selector ─────────────────────────────────────────────────────────
function LanguageSelector({ selected, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const current = LANGUAGES.find(l => l.code === selected) || LANGUAGES[0];
  return (
    <div style={{ position:"relative" }}>
      <button onClick={() => !disabled && setOpen(o => !o)} disabled={disabled}
        style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(122,226,207,0.08)", border:`1px solid ${open?"rgba(122,226,207,0.4)":"rgba(122,226,207,0.2)"}`, borderRadius:10, padding:"8px 14px", color:disabled?"#334155":"#7AE2CF", cursor:disabled?"not-allowed":"pointer", fontFamily:"'Nunito',sans-serif", fontSize:13, fontWeight:700, transition:"all .15s", whiteSpace:"nowrap", opacity:disabled?0.5:1 }}>
        <span style={{ fontSize:16 }}>{current.flag}</span>
        <span>{current.native}</span>
        <span style={{ fontSize:10, color:"#4a8a8c", marginLeft:2 }}>{open?"▲":"▼"}</span>
      </button>
      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, background:"#082535", border:"1px solid rgba(122,226,207,0.2)", borderRadius:12, overflow:"hidden", zIndex:100, boxShadow:"0 16px 40px rgba(0,0,0,0.5)", minWidth:180, animation:"fadeUp .15s ease" }}>
          {LANGUAGES.map(lang => (
            <button key={lang.code} onClick={() => { onChange(lang.code); setOpen(false); }}
              style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 16px", border:"none", background:selected===lang.code?"rgba(122,226,207,0.08)":"transparent", cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontSize:13, color:selected===lang.code?"#7AE2CF":"#c8f0eb", textAlign:"left" }}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(122,226,207,0.1)"}
              onMouseLeave={e=>e.currentTarget.style.background=selected===lang.code?"rgba(122,226,207,0.08)":"transparent"}>
              <span style={{ fontSize:18 }}>{lang.flag}</span>
              <div>
                <div style={{ fontWeight:700 }}>{lang.native}</div>
                <div style={{ fontSize:11, color:"#4a8a8c" }}>{lang.label}</div>
              </div>
              {selected===lang.code && <span style={{ marginLeft:"auto", color:"#7AE2CF" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PatientReportSimplifier() {
  const [file,     setFile]     = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [sections, setSections] = useState(null);
  const [rawText,  setRawText]  = useState("");
  const [error,    setError]    = useState(null);
  const [view,     setView]     = useState("cards");
  const [language, setLanguage] = useState("en");
  // track which language the current result was generated in
  const [resultLang, setResultLang] = useState("en");
  const inputRef   = useRef();
  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.match(/\.(pdf|txt)$/i)) { setError("Please upload a PDF or TXT file."); return; }
    setError(null); setSections(null); setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  function readFileAsBase64(f) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(f); });
  }
  function readFileAsText(f) {
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = e => res(e.target.result); r.onerror = rej; r.readAsText(f); });
  }

  // ── One API call — Sarvam simplifies directly in chosen language ──────────
  async function runAnalysis(langCode) {
    if (!file) return;
    setLoading(true); setError(null); setSections(null); setRawText("");
    const lang = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];
    try {
      const PROMPT = buildPrompt(langCode);
      let messages;
      if (file.name.endsWith(".pdf")) {
        const base64Data = await readFileAsBase64(file);
        messages = [{ role:"user", content:[
          { type:"document", source:{ type:"base64", media_type:"application/pdf", data:base64Data }},
          { type:"text", text: PROMPT },
        ]}];
      } else {
        const text = await readFileAsText(file);
        messages = [{ role:"user", content:`${PROMPT}\n\nHere is the medical report:\n---\n${text}\n---` }];
      }

      const r = await fetch("http://localhost:5000/api/claude", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          model:"claude-sonnet-4-5",
          max_tokens:1500,
          language: langCode,   // ← backend uses this to set Sarvam language hint
          messages,
        }),
      });
      const d    = await r.json();
      const text = d.content?.map(b => b.text||"").join("") || "";
      if (!text) throw new Error("No response from AI.");
      setRawText(text);
      setSections(parseReport(text));
      setResultLang(langCode);
    } catch (e) {
      setError(`Failed to simplify in ${lang.native}. Please try again.`);
      console.error(e);
    }
    setLoading(false);
  }

  const analyze    = ()       => runAnalysis(language);
  const reanalyze  = ()       => runAnalysis(language);

  const resultLangObj = LANGUAGES.find(l => l.code === resultLang) || LANGUAGES[0];
  const langChanged   = sections && language !== resultLang;

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Nunito:wght@300;400;600;700;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#1a3a4a;border-radius:3px;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        .upload-zone:hover{border-color:#7AE2CF!important;background:rgba(122,226,207,0.06)!important;}
        .view-btn:hover{background:rgba(122,226,207,0.12)!important;}
      `}</style>

      {/* Header */}
      <div style={S.header}>
        <div style={{ display:"flex", alignItems:"center", gap:16, flex:1 }}>
          <div style={{ fontSize:36, animation:"float 3s ease-in-out infinite" }}>🩺</div>
          <div>
            <h1 style={S.headerTitle}>MedSimplify</h1>
            <p style={S.headerSub}>Your medical report, explained in your language</p>
          </div>
        </div>
        <LanguageSelector selected={language} onChange={setLanguage} disabled={loading} />
      </div>

      <div style={S.main}>
        {error && <div style={S.errorBox}>⚠️ {error}</div>}

        {!sections ? (
          <>
            {/* Language banner */}
            <div style={S.langBanner}>
              <span style={{ fontSize:22 }}>🌐</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, color:"#7AE2CF", fontSize:14, marginBottom:2 }}>
                  Choose your language before uploading
                </div>
                <div style={{ color:"#4a8a8c", fontSize:12 }}>
                  Sarvam AI will simplify your report directly in {currentLang.native} — no separate translation step
                </div>
              </div>
              <LanguageSelector selected={language} onChange={setLanguage} disabled={loading} />
            </div>

            {/* Upload zone */}
            <div className="upload-zone"
              style={{ ...S.uploadZone, borderColor:dragging?"#7AE2CF":"rgba(122,226,207,0.2)", background:dragging?"rgba(122,226,207,0.06)":"rgba(122,226,207,0.03)" }}
              onDrop={onDrop}
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onClick={()=>!file&&inputRef.current?.click()}>
              <input ref={inputRef} type="file" accept=".pdf,.txt" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])} />
              <div style={{ fontSize:52, animation:"float 3s ease-in-out infinite", marginBottom:16 }}>📄</div>
              <h3 style={S.uploadTitle}>Upload Your Medical Report</h3>
              <p style={S.uploadSub}>Drag & drop your file here, or click to browse<br/>Supports PDF and TXT files</p>
              <button style={S.browseBtn} onClick={e=>{e.stopPropagation();inputRef.current?.click();}}>
                Choose File
              </button>
            </div>

            {file && (
              <div style={S.fileInfo}>
                <span style={{ fontSize:24 }}>📎</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:"#7AE2CF", fontSize:14 }}>{file.name}</div>
                  <div style={{ color:"#4a8a8c", fontSize:12, marginTop:2 }}>
                    {(file.size/1024).toFixed(1)} KB · Sarvam AI will explain this in {currentLang.flag} {currentLang.native}
                  </div>
                </div>
                <button onClick={()=>setFile(null)} style={{ background:"none", border:"none", color:"#4a8a8c", cursor:"pointer", fontSize:18 }}>✕</button>
              </div>
            )}

            {file && !loading && (
              <button style={S.analyzeBtn} onClick={analyze}>
                {currentLang.flag} Simplify in {currentLang.native}
              </button>
            )}

            {loading && (
              <div style={S.loadingBox}>
                <div style={S.spinner} />
                <p style={{ color:"#7AE2CF", fontSize:16, fontWeight:700, margin:"0 0 6px" }}>
                  {currentLang.flag} Analysing your report…
                </p>
                <p style={{ color:"#4a8a8c", fontSize:13, fontStyle:"italic", margin:0 }}>
                  Sarvam AI is explaining this directly in {currentLang.native}
                </p>
              </div>
            )}
          </>
        ) : (
          /* ── Results ── */
          <div style={{ animation:"fadeUp .4s ease" }}>
            <div style={S.resultHeader}>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, color:"#f0fffe", margin:"0 0 4px" }}>
                  ✅ Your Simplified Report
                </div>
                <div style={{ color:"#4a8a8c", fontSize:13, display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  <span>{file?.name}</span>
                  <span>·</span>
                  <span>{sections.length} sections</span>
                  <span style={{ background:"rgba(122,226,207,0.12)", border:"1px solid rgba(122,226,207,0.2)", borderRadius:20, padding:"2px 10px", fontSize:11, color:"#7AE2CF", fontWeight:700 }}>
                    {resultLangObj.flag} {resultLangObj.native}
                  </span>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                <LanguageSelector selected={language} onChange={setLanguage} disabled={loading} />
                <div style={{ display:"flex", background:"rgba(122,226,207,0.08)", border:"1px solid rgba(122,226,207,0.15)", borderRadius:8, overflow:"hidden" }}>
                  {[["cards","🃏 Cards"],["raw","📄 Raw"]].map(([v,l])=>(
                    <button key={v} className="view-btn" onClick={()=>setView(v)}
                      style={{ padding:"7px 14px", border:"none", cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontSize:12, fontWeight:700, background:view===v?"rgba(122,226,207,0.2)":"transparent", color:view===v?"#7AE2CF":"#4a8a8c", transition:"all .15s" }}>
                      {l}
                    </button>
                  ))}
                </div>
                <button onClick={()=>{ setSections(null); setFile(null); setError(null); setRawText(""); }}
                  style={{ background:"transparent", color:"#4a8a8c", border:"1px solid rgba(122,226,207,0.15)", borderRadius:8, padding:"7px 14px", cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontSize:12, fontWeight:700 }}>
                  ← New Report
                </button>
              </div>
            </div>

            {/* Language changed — prompt to re-simplify */}
            {langChanged && !loading && (
              <div style={{ marginTop:12, background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.25)", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:10, fontSize:13, flexWrap:"wrap" }}>
                <span style={{ fontSize:18 }}>🌐</span>
                <span style={{ color:"#fbbf24", fontWeight:700 }}>Language changed to {currentLang.native}</span>
                <span style={{ color:"#4a8a8c" }}>· Current result is in {resultLangObj.native}</span>
                <button onClick={reanalyze}
                  style={{ marginLeft:"auto", background:"linear-gradient(135deg,#077A7D,#7AE2CF)", color:"#06202B", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:800, fontFamily:"'Nunito',sans-serif", whiteSpace:"nowrap" }}>
                  {currentLang.flag} Re-simplify in {currentLang.native}
                </button>
              </div>
            )}

            {/* Current language info */}
            {!langChanged && !loading && (
              <div style={{ marginTop:12, background:"rgba(122,226,207,0.04)", border:"1px solid rgba(122,226,207,0.1)", borderRadius:10, padding:"10px 16px", display:"flex", alignItems:"center", gap:10, fontSize:12, flexWrap:"wrap" }}>
                <span>{resultLangObj.flag}</span>
                <span style={{ color:"#4a8a8c" }}>
                  Simplified directly in <strong style={{ color:"#7AE2CF" }}>{resultLangObj.native}</strong> by Sarvam AI
                </span>
                <span style={{ color:"#334155" }}>·</span>
                <span style={{ color:"#334155" }}>Switch language above and click Re-simplify to get a fresh explanation</span>
              </div>
            )}

            {loading && (
              <div style={{ ...S.loadingBox, marginTop:16, padding:"24px 32px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <div style={{ ...S.spinner, width:32, height:32, margin:0, borderWidth:3 }} />
                  <div>
                    <p style={{ color:"#7AE2CF", fontSize:14, fontWeight:700, margin:"0 0 2px" }}>
                      {currentLang.flag} Simplifying in {currentLang.native}…
                    </p>
                    <p style={{ color:"#4a8a8c", fontSize:12, margin:0 }}>
                      Sarvam AI is generating a direct {currentLang.label} explanation
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!loading && (
              view === "cards" ? (
                <div style={{ marginTop:16 }}>
                  {sections.map((sec, i) => <SectionCard key={i} section={sec} />)}
                </div>
              ) : (
                <div style={{ marginTop:16, background:"rgba(122,226,207,0.03)", border:"1px solid rgba(122,226,207,0.12)", borderRadius:14, padding:"20px 24px" }}>
                  <pre style={{ color:"#c8f0eb", fontSize:13, lineHeight:1.8, whiteSpace:"pre-wrap", fontFamily:"'Nunito',sans-serif", margin:0 }}>
                    {rawText.replace(/<think>[\s\S]*?<\/think>/g,"").trim()}
                  </pre>
                </div>
              )
            )}

            <div style={{ marginTop:20, background:"rgba(251,191,36,0.06)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:10, padding:"12px 16px", fontSize:12, color:"#fbbf24" }}>
              ⚠️ This simplification is for informational purposes only. Always consult your doctor for medical advice and treatment decisions.
              {resultLang !== "en" && " · Medical terms without a direct translation may remain in English."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  root:         { fontFamily:"'Nunito',sans-serif", background:"#06202B", minHeight:"100vh", color:"#e0f7f5" },
  header:       { background:"linear-gradient(135deg,#06202B,#082535)", borderBottom:"1px solid rgba(122,226,207,0.1)", padding:"20px 32px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" },
  headerTitle:  { fontFamily:"'Playfair Display',serif", fontSize:24, color:"#f0fffe", margin:0 },
  headerSub:    { color:"#4a8a8c", fontSize:13, margin:"4px 0 0", fontStyle:"italic" },
  main:         { maxWidth:760, margin:"0 auto", padding:"32px 24px 60px" },
  errorBox:     { background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:10, padding:"14px 18px", color:"#fca5a5", fontSize:13, marginBottom:20 },
  langBanner:   { background:"rgba(122,226,207,0.05)", border:"1px solid rgba(122,226,207,0.15)", borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:12, marginBottom:20, flexWrap:"wrap" },
  uploadZone:   { border:"2px dashed", borderRadius:16, padding:"52px 32px", textAlign:"center", cursor:"pointer", transition:"all .2s", marginBottom:20 },
  uploadTitle:  { fontFamily:"'Playfair Display',serif", fontSize:20, color:"#e0f7f5", margin:"0 0 8px" },
  uploadSub:    { color:"#4a8a8c", fontSize:13, margin:"0 0 24px", lineHeight:1.7 },
  browseBtn:    { background:"linear-gradient(135deg,#077A7D,#7AE2CF)", color:"#06202B", border:"none", borderRadius:10, padding:"12px 28px", fontSize:14, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif" },
  fileInfo:     { background:"rgba(122,226,207,0.07)", border:"1px solid rgba(122,226,207,0.2)", borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:12, marginBottom:16 },
  analyzeBtn:   { width:"100%", background:"linear-gradient(135deg,#077A7D,#7AE2CF)", color:"#06202B", border:"none", borderRadius:12, padding:"16px", fontSize:16, fontWeight:800, cursor:"pointer", fontFamily:"'Nunito',sans-serif", marginBottom:24 },
  loadingBox:   { background:"rgba(122,226,207,0.04)", border:"1px solid rgba(122,226,207,0.12)", borderRadius:14, padding:"40px", textAlign:"center" },
  spinner:      { width:48, height:48, border:"4px solid rgba(122,226,207,0.12)", borderTopColor:"#7AE2CF", borderRadius:"50%", margin:"0 auto 20px", animation:"spin .8s linear infinite" },
  resultHeader: { display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 },
};