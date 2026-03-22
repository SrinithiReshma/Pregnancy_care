import { useState, useEffect, useRef } from "react";

const API = "http://localhost:5000";
const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/* ─── Language config ────────────────────────────────────────────────────── */
const LANGS = {
  en: {
    code: "en",
    label: "EN",
    flag: "🇬🇧",
    name: "English",
    welcome: "Hi there! 👋 I'm Numi, your NurtureWell assistant.\n\nI can help you:\n• 📅 Book a doctor appointment\n• 🤰 Answer pregnancy questions\n• 💊 Share health tips\n\nWhat would you like help with today?",
    chips: ["Book appointment","Morning sickness tips","Safe foods list","When to see a doctor","Baby kicks normal?","Prenatal vitamins"],
    placeholder: "Ask about pregnancy or type 'book appointment'…",
    online: "Online — NurtureWell Assistant",
    poweredBy: "Powered by Ollama · NurtureWell",
    bookingStart: "Sure, let's get your appointment booked! 📅",
    pickDoctor: "Great! Here are our available doctors. Tap one to select:",
    doctorSelected: (name, spec, days, time) => `Great choice! Dr. ${name} (${spec}) is available ${days}, ${time}.\n\nPlease enter your preferred date (YYYY-MM-DD):`,
    gotDate: (d) => `Got it — ${d} ✅\n\nWhat time works? (e.g. 10:30)`,
    invalidDate: "Please use YYYY-MM-DD format (e.g. 2026-04-15).",
    gotTime: (t) => `Time: ${t} ✅\n\nConsultation type?\n• Type audio for Audio call\n• Type video for Video call`,
    invalidTime: "Please use HH:MM format (e.g. 10:30).",
    gotType: (t) => `${t} selected ✅\n\nWhat is the reason for your visit?`,
    gotReason: "Got it ✅\n\nYour email address:",
    invalidEmail: "Please enter a valid email.",
    gotEmail: "Email saved ✅\n\nYour phone number:",
    summary: (s) => `Summary:\n\n👩‍⚕️ Doctor: ${s.doctor.name}\n📅 Date: ${s.date}\n🕐 Time: ${s.time}\n📱 Type: ${s.consultationType}\n📝 Reason: ${s.reason}\n\nType confirm to book or cancel to start over.`,
    confirmPrompt: 'Type "confirm" to proceed or "cancel" to start over.',
    cancelled: "Booking cancelled. How else can I help?",
    bookFailed: (m) => `❌ Booking failed: ${m}`,
    bookError: "Something went wrong. Please try again.",
    ollamaError: "I'm having trouble connecting. Please make sure Ollama is running (`ollama serve`).",
    noDoctors: "Sorry, couldn't load doctors right now. Please use the Book Appointment page.",
    joinVideo: "🎥 Join Video Call",
    booked: "✅ Appointment Booked!",
    labels: { doctor:"👩‍⚕️ Doctor", date:"📅 Date", time:"🕐 Time", type:"📱 Type", reason:"📝 Reason" },
  },
  ta: {
    code: "ta",
    label: "தமிழ்",
    flag: "🇮🇳",
    name: "Tamil",
    welcome: "வணக்கம்! 👋 நான் நுமி, உங்கள் NurtureWell உதவியாளர்.\n\nநான் உதவ முடியும்:\n• 📅 மருத்துவர் சந்திப்பு பதிவு செய்ய\n• 🤰 கர்ப்பகால கேள்விகளுக்கு பதிலளிக்க\n• 💊 சுகாதார குறிப்புகள் பகிர\n\nஇன்று நான் எவ்வாறு உதவலாம்?",
    chips: ["சந்திப்பு பதிவு","காலை சுகவீனம்","பாதுகாப்பான உணவுகள்","மருத்துவரை எப்போது பார்க்கணும்?","குழந்தை உதைக்குதா?","கர்ப்பகால வைட்டமின்கள்"],
    placeholder: "கர்ப்பம் பற்றி கேளுங்கள் அல்லது 'சந்திப்பு பதிவு' என்று தட்டச்சு செய்யுங்கள்…",
    online: "நேரடியாக — NurtureWell உதவியாளர்",
    poweredBy: "Ollama · NurtureWell மூலம் இயக்கப்படுகிறது",
    bookingStart: "சரி, உங்கள் சந்திப்பை பதிவு செய்வோம்! 📅",
    pickDoctor: "இதோ கிடைக்கக்கூடிய மருத்துவர்கள். ஒருவரைத் தேர்ந்தெடுக்கவும்:",
    doctorSelected: (name, spec, days, time) => `நல்ல தேர்வு! டாக்டர் ${name} (${spec}) ${days}, ${time} அன்று கிடைக்கிறார்.\n\nவிரும்பிய தேதியை உள்ளிடவும் (YYYY-MM-DD):`,
    gotDate: (d) => `சரி — ${d} ✅\n\nஎந்த நேரம் ஏற்றது? (எ.கா. 10:30)`,
    invalidDate: "YYYY-MM-DD வடிவத்தைப் பயன்படுத்தவும் (எ.கா. 2026-04-15).",
    gotTime: (t) => `நேரம்: ${t} ✅\n\nஆலோசனை வகை?\n• ஆடியோ கலை என்று தட்டச்சு செய்யுங்கள்\n• வீடியோ கலை என்று தட்டச்சு செய்யுங்கள்`,
    invalidTime: "HH:MM வடிவத்தைப் பயன்படுத்தவும் (எ.கா. 10:30).",
    gotType: (t) => `${t === "VIDEO" ? "வீடியோ" : "ஆடியோ"} தேர்ந்தெடுக்கப்பட்டது ✅\n\nவருகையின் காரணம் என்ன?`,
    gotReason: "சரி ✅\n\nஉங்கள் மின்னஞ்சல் முகவரி:",
    invalidEmail: "சரியான மின்னஞ்சலை உள்ளிடவும்.",
    gotEmail: "மின்னஞ்சல் சேமிக்கப்பட்டது ✅\n\nஉங்கள் தொலைபேசி எண்:",
    summary: (s) => `சுருக்கம்:\n\n👩‍⚕️ மருத்துவர்: ${s.doctor.name}\n📅 தேதி: ${s.date}\n🕐 நேரம்: ${s.time}\n📱 வகை: ${s.consultationType}\n📝 காரணம்: ${s.reason}\n\nபதிவு செய்ய "உறுதிப்படுத்து" அல்லது ரத்து செய்ய "ரத்து" என்று தட்டச்சு செய்யவும்.`,
    confirmPrompt: '"உறுதிப்படுத்து" அல்லது "ரத்து" என்று தட்டச்சு செய்யவும்.',
    cancelled: "பதிவு ரத்து செய்யப்பட்டது. வேறு எதில் உதவட்டுமா?",
    bookFailed: (m) => `❌ பதிவு தோல்வியடைந்தது: ${m}`,
    bookError: "ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.",
    ollamaError: "இணைப்பில் சிக்கல். Ollama இயங்குகிறதா என்று சரிபார்க்கவும் (`ollama serve`).",
    noDoctors: "மன்னிக்கவும், மருத்துவர்களை ஏற்றவில்லை. சந்திப்பு பக்கத்தைப் பயன்படுத்தவும்.",
    joinVideo: "🎥 வீடியோ கலில் சேரவும்",
    booked: "✅ சந்திப்பு பதிவாகியது!",
    labels: { doctor:"👩‍⚕️ மருத்துவர்", date:"📅 தேதி", time:"🕐 நேரம்", type:"📱 வகை", reason:"📝 காரணம்" },
  },
};

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function TypingDots() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={S.botAvatar}>🤱</div>
      <div style={{ background:"rgba(122,226,207,0.08)", border:"1px solid rgba(122,226,207,0.1)", borderRadius:"4px 16px 16px 16px", padding:"12px 18px", display:"flex", gap:5, alignItems:"center" }}>
        {[0,.2,.4].map(d => (
          <span key={d} style={{ width:7,height:7,borderRadius:"50%",background:"#7AE2CF",display:"inline-block",animation:"blink 1.4s ease-in-out infinite",animationDelay:`${d}s` }}/>
        ))}
      </div>
    </div>
  );
}

function Message({ msg, onDoctorSelect, lang }) {
  const isBot = msg.role === "assistant";
  const L = LANGS[lang];

  if (msg.type === "booking_confirm") return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
      <div style={S.botAvatar}>🤱</div>
      <div style={S.confirmCard}>
        <div style={S.confirmHeader}>{L.booked}</div>
        <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:7 }}>
          {[
            [L.labels.doctor, msg.data.doctorName],
            [L.labels.date,   msg.data.date],
            [L.labels.time,   msg.data.time],
            [L.labels.type,   msg.data.type],
            [L.labels.reason, msg.data.reason],
          ].map(([label,val]) => (
            <div key={label} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#4a8a8c", borderBottom:"1px solid rgba(122,226,207,0.08)", paddingBottom:5 }}>
              <span>{label}</span><strong style={{ color:"#e0f7f5" }}>{val}</strong>
            </div>
          ))}
        </div>
        {msg.data.videoUrl && (
          <a href={msg.data.videoUrl} target="_blank" rel="noreferrer" style={{ display:"block", margin:"0 16px 14px", background:"linear-gradient(135deg,#077A7D,#7AE2CF)", color:"#06202B", borderRadius:8, padding:"9px", fontSize:12, fontWeight:800, textDecoration:"none", textAlign:"center" }}>
            {L.joinVideo}
          </a>
        )}
      </div>
    </div>
  );

  if (msg.type === "doctor_list") return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:8 }}>
      <div style={S.botAvatar}>🤱</div>
      <div style={{ maxWidth:"88%" }}>
        <div style={S.bubbleBot}>{msg.text}</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:8 }}>
          {msg.doctors.map(doc => (
            <div key={doc.$id} onClick={() => onDoctorSelect(doc)}
              style={{ background:"rgba(122,226,207,0.06)", border:"1px solid rgba(122,226,207,0.15)", borderRadius:12, padding:"12px 14px", cursor:"pointer", width:150, transition:"all .15s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="#7AE2CF"}
              onMouseLeave={e => e.currentTarget.style.borderColor="rgba(122,226,207,0.15)"}>
              <div style={{ fontSize:26, textAlign:"center", marginBottom:5 }}>👩‍⚕️</div>
              <div style={{ fontWeight:800, fontSize:12, color:"#e0f7f5", textAlign:"center" }}>{doc.name}</div>
              <div style={{ fontSize:11, color:"#7AE2CF", fontWeight:600, textAlign:"center", marginBottom:5 }}>{doc.specialization}</div>
              <div style={{ fontSize:10, color:"#4a8a8c" }}>⭐ {doc.experienceYears} yrs</div>
              <div style={{ fontSize:10, color:"#4a8a8c" }}>💰 ₹{doc.consultationFee}</div>
              <div style={{ fontSize:10, color:"#4a8a8c", marginBottom:8 }}>🕐 {doc.availableTime}</div>
              <div style={{ background:"linear-gradient(135deg,#077A7D,#7AE2CF)", color:"#06202B", borderRadius:6, padding:"4px 8px", fontSize:10, fontWeight:800, textAlign:"center" }}>
                {lang === "ta" ? "தேர்ந்தெடு →" : "Select →"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", alignItems:"flex-end", gap:8, justifyContent:isBot?"flex-start":"flex-end" }}>
      {isBot && <div style={S.botAvatar}>🤱</div>}
      <div style={isBot ? S.bubbleBot : S.bubbleUser}>
        {msg.text.split("\n").map((line,i,arr) => (
          <span key={i}>{line}{i < arr.length-1 && <br/>}</span>
        ))}
      </div>
      {!isBot && <div style={{ width:28,height:28,borderRadius:"50%",background:"#077A7D",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0 }}>👤</div>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function PregnancyChatbot() {
  const [open,         setOpen]         = useState(false);
  const [lang,         setLang]         = useState("en"); // "en" | "ta"
  const [messages,     setMessages]     = useState(() => [{ role:"assistant", text: LANGS.en.welcome }]);
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [bookingState, setBookingState] = useState(null);
  const [doctors,      setDoctors]      = useState([]);
  const [langAnim,     setLangAnim]     = useState(false); // flash on switch
  const bottomRef = useRef(null);

  const L = LANGS[lang]; // current language strings

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);
  useEffect(() => { if (open && doctors.length === 0) fetchDoctors(); }, [open]);

  /* ── Language switch ── */
  function switchLang(newLang) {
    if (newLang === lang) return;
    setLang(newLang);
    setLangAnim(true);
    setTimeout(() => setLangAnim(false), 600);
    // Add a language-switch acknowledgement message
    const switchMsg = newLang === "ta"
      ? "தமிழுக்கு மாறினோம்! 🌟 இப்போது தமிழில் கேளுங்கள்."
      : "Switched to English! 🌟 You can now ask in English.";
    setMessages(p => [...p, { role:"assistant", text: switchMsg }]);
    setBookingState(null); // reset booking flow on lang switch
  }

  async function fetchDoctors() {
    try {
      const r = await fetch(`${API}/doctors`, { headers: hdrs() });
      const d = await r.json();
      setDoctors(d.doctors || []);
    } catch(e) { console.error(e); }
  }

  function addMsg(msg) { setMessages(p => [...p, msg]); }

  async function detectIntent(text) {
    try {
      const r = await fetch(`${API}/api/chat-intent`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ message:text }) });
      const d = await r.json();
      return d.intent;
    } catch { return "PREGNANCY_QA"; }
  }

  // Tamil booking keywords for local intent detection
  const TAMIL_BOOKING_WORDS = ["சந்திப்பு","பதிவு","மருத்துவர்","book","appointment"];

  async function detectIntentWithLang(text) {
    // For Tamil, do a quick keyword check before hitting the API
    if (lang === "ta") {
      const lower = text.toLowerCase();
      if (TAMIL_BOOKING_WORDS.some(k => lower.includes(k))) return "BOOK_APPOINTMENT";
    }
    return detectIntent(text);
  }

  async function askOllama(text, history) {
    // Add language instruction to the message for Tamil
    const langgedText = lang === "ta"
      ? `Please respond in Tamil (தமிழ்). User message: ${text}`
      : text;
    const r = await fetch(`${API}/api/chat`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ message: langgedText, history, language: lang }),
    });
    const d = await r.json();
    return d.reply;
  }

  function startBookingFlow() {
    if (!doctors.length) { addMsg({ role:"assistant", text: L.noDoctors }); return; }
    addMsg({ role:"assistant", type:"doctor_list", text: L.pickDoctor, doctors });
    setBookingState({ step:"SELECT_DOCTOR" });
  }

  function handleDoctorSelected(doc) {
    setBookingState(p => ({ ...p, doctor:doc, step:"GET_DATE" }));
    addMsg({ role:"user", text: lang === "ta" ? `டாக்டர் ${doc.name} அவர்களிடம் சந்திக்க விரும்புகிறேன்` : `I'd like to see Dr. ${doc.name}` });
    addMsg({ role:"assistant", text: L.doctorSelected(doc.name, doc.specialization, doc.availableDays, doc.availableTime) });
  }

  async function handleBookingStep(text) {
    const s = bookingState;

    if (s.step === "GET_DATE") {
      const m = text.match(/\d{4}-\d{2}-\d{2}/);
      if (!m) { addMsg({ role:"assistant", text: L.invalidDate }); return; }
      setBookingState(p => ({...p, date:m[0], step:"GET_TIME"}));
      addMsg({ role:"assistant", text: L.gotDate(m[0]) });
      return;
    }
    if (s.step === "GET_TIME") {
      const m = text.match(/\d{1,2}:\d{2}/);
      if (!m) { addMsg({ role:"assistant", text: L.invalidTime }); return; }
      setBookingState(p => ({...p, time:m[0], step:"GET_TYPE"}));
      addMsg({ role:"assistant", text: L.gotTime(m[0]) });
      return;
    }
    if (s.step === "GET_TYPE") {
      const lower = text.toLowerCase();
      // Accept both English and Tamil type keywords
      const isVideo = lower.includes("video") || lower.includes("வீடியோ");
      const type = isVideo ? "VIDEO" : "AUDIO";
      setBookingState(p => ({...p, consultationType:type, step:"GET_REASON"}));
      addMsg({ role:"assistant", text: L.gotType(type) });
      return;
    }
    if (s.step === "GET_REASON") {
      setBookingState(p => ({...p, reason:text, step:"GET_EMAIL"}));
      addMsg({ role:"assistant", text: L.gotReason });
      return;
    }
    if (s.step === "GET_EMAIL") {
      if (!text.includes("@")) { addMsg({ role:"assistant", text: L.invalidEmail }); return; }
      setBookingState(p => ({...p, email:text, step:"GET_PHONE"}));
      addMsg({ role:"assistant", text: L.gotEmail });
      return;
    }
    if (s.step === "GET_PHONE") {
      const ns = {...s, phone:text};
      setBookingState({...ns, step:"CONFIRM"});
      addMsg({ role:"assistant", text: L.summary(ns) });
      return;
    }
    if (s.step === "CONFIRM") {
      const lower = text.toLowerCase();
      // Accept Tamil confirm/cancel words too
      const isCancelled = lower.includes("cancel") || lower.includes("ரத்து");
      const isConfirmed  = lower.includes("confirm") || lower.includes("உறுதிப்படுத்து");
      if (isCancelled) { setBookingState(null); addMsg({ role:"assistant", text: L.cancelled }); return; }
      if (isConfirmed) { await submitBooking(s); return; }
      addMsg({ role:"assistant", text: L.confirmPrompt });
    }
  }

  async function submitBooking(s) {
    setLoading(true);
    try {
      const r = await fetch(`${API}/book-appointment`, {
        method:"POST", headers:hdrs(),
        body:JSON.stringify({
          doctorId:        s.doctor.doctorId,
          appointmentDate: s.date,
          appointmentTime: s.time,
          consultationType: s.consultationType,
          reason:          s.reason,
          patientEmail:    s.email,
          patientPhone:    s.phone,
          doctorEmail:     s.doctor.email || "",
          doctorName:      s.doctor.name,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        addMsg({ role:"assistant", type:"booking_confirm", data:{ doctorName:s.doctor.name, date:s.date, time:s.time, type:s.consultationType, reason:s.reason, videoUrl:d.videoRoomUrl||null } });
        setBookingState(null);
      } else {
        addMsg({ role:"assistant", text: L.bookFailed(d.message) });
      }
    } catch { addMsg({ role:"assistant", text: L.bookError }); }
    setLoading(false);
  }

  async function handleSend(textOverride) {
    const text = (textOverride || input).trim();
    if (!text || loading) return;
    setInput("");
    addMsg({ role:"user", text });
    if (bookingState && bookingState.step !== "SELECT_DOCTOR") { await handleBookingStep(text); return; }
    setLoading(true);
    const intent = await detectIntentWithLang(text);
    if (intent === "BOOK_APPOINTMENT") {
      setLoading(false);
      addMsg({ role:"assistant", text: L.bookingStart });
      startBookingFlow();
      return;
    }
    const history = messages.filter(m => m.role && m.text && !m.type).slice(-10).map(m => ({ role:m.role, content:m.text }));
    try {
      const reply = await askOllama(text, history);
      addMsg({ role:"assistant", text: reply });
    } catch {
      addMsg({ role:"assistant", text: L.ollamaError });
    }
    setLoading(false);
  }

  function renderMessages() {
    return messages.map((msg, i) => (
      <div key={i} style={{ animation:"slideUp .25s ease" }}>
        <Message msg={msg} onDoctorSelect={handleDoctorSelected} lang={lang} />
      </div>
    ));
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&family=Noto+Sans+Tamil:wght@400;600;700&display=swap');
        @keyframes blink{0%,80%,100%{opacity:0}40%{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes langFlash{0%{background:rgba(122,226,207,0.25)}100%{background:transparent}}
        .chat-inp:focus{outline:none;border-color:#7AE2CF!important;}
        .chip-btn:hover{background:rgba(122,226,207,0.15)!important;border-color:#7AE2CF!important;}
        .fab:hover{transform:scale(1.08)!important;animation:none!important;}
        .lang-btn{transition:all .2s;}
        .lang-btn:hover{border-color:#7AE2CF!important;color:#7AE2CF!important;}
        ::-webkit-scrollbar{width:3px;} ::-webkit-scrollbar-thumb{background:#1a3a4a;border-radius:3px;}
        .tamil-font{font-family:'Noto Sans Tamil','Nunito',sans-serif;}
      `}</style>

      {/* FAB */}
      {!open && (
        <button className="fab" onClick={() => setOpen(true)} style={S.fab}>
          <span style={{ fontSize:24 }}>🤱</span>
          <span style={{ color:"#06202B", fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:14 }}>
            {lang === "ta" ? "நுமியிடம் கேளுங்கள்" : "Ask Numi"}
          </span>
        </button>
      )}

      {/* Chat Window */}
      {open && (
        <div style={S.window}>

          {/* Header */}
          <div style={S.header}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={S.headerAvatar}>🤱</div>
              <div>
                <div style={{ color:"#fff", fontWeight:800, fontSize:15, fontFamily:"'Nunito',sans-serif" }}>Numi</div>
                <div style={{ color:"rgba(255,255,255,0.6)", fontSize:11, display:"flex", alignItems:"center", gap:5, marginTop:1 }}>
                  <span style={{ width:6,height:6,borderRadius:"50%",background:"#7AE2CF",display:"inline-block" }}/>
                  {L.online}
                </div>
              </div>
            </div>

            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              {/* ── Language Toggle ── */}
              <div style={{ display:"flex", background:"rgba(0,0,0,0.25)", borderRadius:20, padding:3, gap:2 }}>
                {Object.values(LANGS).map(l => (
                  <button
                    key={l.code}
                    className="lang-btn"
                    onClick={() => switchLang(l.code)}
                    style={{
                      background:  lang === l.code ? "linear-gradient(135deg,#077A7D,#7AE2CF)" : "transparent",
                      border:      lang === l.code ? "none" : "1px solid rgba(122,226,207,0.2)",
                      color:       lang === l.code ? "#06202B" : "rgba(255,255,255,0.5)",
                      borderRadius:16,
                      padding:     "4px 10px",
                      fontSize:    lang === l.code ? 11 : 10,
                      fontWeight:  800,
                      cursor:      "pointer",
                      fontFamily:  l.code === "ta" ? "'Noto Sans Tamil',sans-serif" : "'Nunito',sans-serif",
                      whiteSpace:  "nowrap",
                      transition:  "all .2s",
                    }}
                    title={`Switch to ${l.name}`}
                  >
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>

              <button onClick={() => setOpen(false)} style={{ background:"rgba(255,255,255,0.12)", border:"none", color:"#fff", width:30, height:30, borderRadius:"50%", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>
          </div>

          {/* Quick chips */}
          <div style={{
            padding:"8px 12px",
            display:"flex",
            gap:6,
            flexWrap:"wrap",
            background: langAnim ? "rgba(122,226,207,0.05)" : "rgba(6,32,43,0.8)",
            borderBottom:"1px solid rgba(122,226,207,0.1)",
            transition:"background .4s",
          }}>
            {L.chips.map(c => (
              <button key={c} className="chip-btn" onClick={() => handleSend(c)}
                style={{
                  background:"rgba(122,226,207,0.06)",
                  border:"1px solid rgba(122,226,207,0.2)",
                  color:"#7AE2CF",
                  borderRadius:20,
                  padding:"4px 11px",
                  fontSize:lang === "ta" ? 10 : 11,
                  cursor:"pointer",
                  fontFamily: lang === "ta" ? "'Noto Sans Tamil','Nunito',sans-serif" : "'Nunito',sans-serif",
                  fontWeight:700,
                  transition:"all .15s",
                }}>
                {c}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"14px 12px", display:"flex", flexDirection:"column", gap:10, background:"#06202B" }}>
            {renderMessages()}
            {loading && <TypingDots />}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding:"10px 12px", background:"rgba(8,37,53,0.95)", display:"flex", gap:8, alignItems:"flex-end", borderTop:"1px solid rgba(122,226,207,0.1)" }}>
            <textarea
              className="chat-inp"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              placeholder={L.placeholder}
              rows={1}
              style={{
                flex:1,
                resize:"none",
                fontFamily: lang === "ta" ? "'Noto Sans Tamil','Nunito',sans-serif" : "'Nunito',sans-serif",
                fontSize:13,
                color:"#e0f7f5",
                background:"rgba(122,226,207,0.06)",
                border:"1px solid rgba(122,226,207,0.15)",
                borderRadius:10,
                padding:"10px 12px",
                maxHeight:90,
                overflowY:"auto",
                transition:"border-color .2s",
              }}
            />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()}
              style={{ width:40,height:40,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#077A7D,#7AE2CF)",color:"#06202B",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,opacity:(!input.trim()||loading)?0.4:1,transition:"opacity .15s" }}>
              ➤
            </button>
          </div>

          <div style={{ textAlign:"center", fontSize:10, color:"#1a3a4a", padding:"4px 0 7px", background:"rgba(8,37,53,0.95)", fontFamily:"'Nunito',sans-serif" }}>
            {L.poweredBy}
          </div>
        </div>
      )}
    </>
  );
}

const S = {
  fab:          { position:"fixed", bottom:28, right:28, zIndex:9999, background:"linear-gradient(135deg,#077A7D,#7AE2CF)", border:"none", borderRadius:50, padding:"13px 20px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, boxShadow:"0 8px 28px rgba(7,122,125,0.45)", animation:"pulse 2.5s ease-in-out infinite", transition:"transform .2s" },
  window:       { position:"fixed", bottom:28, right:28, zIndex:9999, width:"min(400px,94vw)", height:"min(640px,88vh)", background:"#06202B", borderRadius:20, overflow:"hidden", display:"flex", flexDirection:"column", boxShadow:"0 24px 70px rgba(0,0,0,0.5)", fontFamily:"'Nunito',sans-serif", animation:"popIn .3s cubic-bezier(0.34,1.56,0.64,1)", border:"1px solid rgba(122,226,207,0.1)" },
  header:       { background:"linear-gradient(135deg,#082535,#077A7D)", padding:"12px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" },
  headerAvatar: { width:42,height:42,borderRadius:"50%",background:"rgba(122,226,207,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,border:"2px solid rgba(122,226,207,0.3)" },
  botAvatar:    { width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#077A7D,#7AE2CF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 },
  bubbleBot:    { background:"rgba(122,226,207,0.07)", border:"1px solid rgba(122,226,207,0.1)", borderRadius:"4px 14px 14px 14px", padding:"10px 14px", fontSize:13, lineHeight:1.65, color:"#c8f0eb", maxWidth:"85%" },
  bubbleUser:   { background:"linear-gradient(135deg,#077A7D,#06202B)", color:"#e0f7f5", borderRadius:"14px 4px 14px 14px", padding:"10px 14px", fontSize:13, lineHeight:1.65, maxWidth:"80%", boxShadow:"0 2px 8px rgba(7,122,125,0.25)" },
  confirmCard:  { background:"rgba(122,226,207,0.06)", border:"1px solid rgba(122,226,207,0.2)", borderRadius:14, overflow:"hidden", maxWidth:260 },
  confirmHeader:{ background:"linear-gradient(135deg,#077A7D,#7AE2CF)", color:"#06202B", padding:"10px 16px", fontWeight:800, fontSize:13 },
};