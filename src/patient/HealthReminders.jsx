import { useState, useEffect } from "react";

const API = "http://localhost:5000";
const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const CATEGORIES = [
  { id:"water",       label:"Water Intake",    emoji:"💧", color:"#38BDF8", bg:"rgba(56,189,248,0.1)",  border:"#0369A1" },
  { id:"medication",  label:"Medication",       emoji:"💊", color:"#A78BFA", bg:"rgba(167,139,250,0.1)", border:"#5B21B6" },
  { id:"nutrition",   label:"Nutrition",        emoji:"🥗", color:"#34D399", bg:"rgba(52,211,153,0.1)",  border:"#065F46" },
  { id:"exercise",    label:"Exercise",         emoji:"🏃‍♀️",color:"#FB923C", bg:"rgba(251,146,60,0.1)",  border:"#7C2D12" },
  { id:"appointment", label:"Appointment",      emoji:"📅", color:"#F472B6", bg:"rgba(244,114,182,0.1)", border:"#831843" },
  { id:"general",     label:"General",          emoji:"🌸", color:"#E879F9", bg:"rgba(232,121,249,0.1)", border:"#6B21A8" },
];

const FREQ = [
  { id:"daily",  label:"Every Day" },
  { id:"weekly", label:"Every Week" },
  { id:"once",   label:"One Time" },
];

const DEFAULT_TEMPLATES = [
  { title:"Drink Water",        message:"Time to drink a glass of water! Staying hydrated is vital for you and baby. Aim for 8–10 glasses daily. 💧",                              category:"water",       reminderTime:"08:00" },
  { title:"Morning Vitamins",   message:"Don't forget your prenatal vitamins! Folic acid, iron, and DHA are essential for baby's development. 💊",                                category:"medication",  reminderTime:"08:30" },
  { title:"Midday Snack",       message:"Time for a healthy snack! Try fruits, nuts, or yogurt to keep your energy up and support baby's growth. 🥗",                             category:"nutrition",   reminderTime:"11:00" },
  { title:"Gentle Walk",        message:"A 15–20 min gentle walk is great for circulation, mood, and preparing your body for labor. Put on comfy shoes! 🏃‍♀️",                  category:"exercise",    reminderTime:"17:00" },
  { title:"Evening Vitamins",   message:"Evening reminder: take your omega-3 / DHA supplement if prescribed. Great for baby's brain development! 💊",                            category:"medication",  reminderTime:"20:00" },
  { title:"Kick Count",         message:"Time to count baby's kicks! Lie on your side and count movements. Contact your doctor if fewer than 10 in 2 hours. 👶",                 category:"general",     reminderTime:"21:00" },
  { title:"Hydration Check",    message:"Last water check of the day. Have you had 8 glasses? Dehydration can cause Braxton Hicks contractions. 💧",                             category:"water",       reminderTime:"21:30" },
  { title:"Rest & Sleep",       message:"Wind down time! Sleep on your left side to improve blood flow to baby. Use a pregnancy pillow for support. 🌙",                          category:"general",     reminderTime:"22:00" },
];

function catMeta(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[5];
}

export default function HealthReminders() {
  const [reminders,  setReminders]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [showTempl,  setShowTempl]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [testingId,  setTestingId]  = useState(null);
  const [toast,      setToast]      = useState(null);
  const [form, setForm] = useState({
    title:"", message:"", reminderTime:"09:00", frequency:"daily", category:"general",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/reminders`, { headers: hdrs() });
      const d = await r.json();
      setReminders(d.reminders || []);
    } catch(e) { showToast("Failed to load reminders","error"); }
    setLoading(false);
  }

  function showToast(msg, type="success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function save() {
    if (!form.title.trim() || !form.message.trim()) {
      showToast("Title and message are required","error"); return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/reminders`, {
        method:"POST", headers: hdrs(),
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.success) { showToast("Reminder created! ✅"); load(); setShowForm(false); resetForm(); }
      else showToast(d.message || "Failed","error");
    } catch(e) { showToast("Network error","error"); }
    setSaving(false);
  }

  async function addTemplate(t) {
    setSaving(true);
    try {
      const r = await fetch(`${API}/reminders`, {
        method:"POST", headers: hdrs(),
        body: JSON.stringify({ ...t, frequency:"daily" }),
      });
      const d = await r.json();
      if (d.success) { showToast(`"${t.title}" added! ✅`); load(); }
      else showToast(d.message || "Failed","error");
    } catch(e) { showToast("Network error","error"); }
    setSaving(false);
  }

  async function toggle(rem) {
    try {
      await fetch(`${API}/reminders/${rem.$id}`, {
        method:"PUT", headers: hdrs(),
        body: JSON.stringify({ isActive: !rem.isActive }),
      });
      setReminders(prev => prev.map(r => r.$id === rem.$id ? {...r, isActive: !r.isActive} : r));
    } catch(e) { showToast("Failed to update","error"); }
  }

  async function remove(id) {
    if (!window.confirm("Delete this reminder?")) return;
    try {
      await fetch(`${API}/reminders/${id}`, { method:"DELETE", headers: hdrs() });
      setReminders(prev => prev.filter(r => r.$id !== id));
      showToast("Deleted");
    } catch(e) { showToast("Failed to delete","error"); }
  }

  async function sendNow(id) {
    setTestingId(id);
    try {
      const r = await fetch(`${API}/reminders/send-now/${id}`, { method:"POST", headers: hdrs() });
      const d = await r.json();
      if (d.success) showToast("Test email sent! Check your inbox 📬");
      else showToast(d.message || "Failed","error");
    } catch(e) { showToast("Failed to send","error"); }
    setTestingId(null);
  }

  function resetForm() {
    setForm({ title:"", message:"", reminderTime:"09:00", frequency:"daily", category:"general" });
  }

  function applyTemplate(t) {
    setForm({ title:t.title, message:t.message, reminderTime:t.reminderTime, frequency:"daily", category:t.category });
    setShowTempl(false);
    setShowForm(true);
  }

  const active   = reminders.filter(r => r.isActive);
  const inactive = reminders.filter(r => !r.isActive);

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px;}
        .rem-card:hover{border-color:#334155!important;}
        .inp:focus{border-color:#A78BFA!important;outline:none;}
        .del-btn:hover{color:#EF4444!important;}
        .test-btn:hover{background:rgba(167,139,250,0.2)!important;}
        .templ-card:hover{border-color:#A78BFA!important;transform:translateY(-1px);}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
      `}</style>

      {/* Toast */}
      {toast && (
        <div style={{ ...S.toast, background: toast.type==="error" ? "#7F1D1D" : "#14532D", borderColor: toast.type==="error" ? "#EF4444" : "#22C55E" }}>
          {toast.type === "error" ? "❌" : "✅"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>🔔 Health Reminders</h1>
          <p style={S.sub}>Daily nudges to keep you and baby healthy throughout your pregnancy</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button style={S.secondBtn} onClick={() => setShowTempl(v => !v)}>
            ✨ Templates
          </button>
          <button style={S.primaryBtn} onClick={() => { setShowForm(v => !v); setShowTempl(false); }}>
            {showForm ? "✕ Cancel" : "+ New Reminder"}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div style={S.statsRow}>
        {[
          { label:"Active Reminders", value:active.length,          color:"#22C55E" },
          { label:"Paused",           value:inactive.length,        color:"#64748B" },
          { label:"Total Set Up",     value:reminders.length,       color:"#A78BFA" },
          { label:"Categories",       value:new Set(reminders.map(r=>r.category)).size, color:"#F472B6" },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#475569", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Template picker */}
      {showTempl && (
        <div style={S.templWrap}>
          <div style={S.sectionHead}>⚡ Quick-add daily pregnancy templates</div>
          <div style={S.templGrid}>
            {DEFAULT_TEMPLATES.map(t => {
              const cm = catMeta(t.category);
              const already = reminders.some(r => r.title === t.title);
              return (
                <div key={t.title} className="templ-card" style={{ ...S.templCard, opacity: already ? 0.5 : 1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <span style={{ fontSize:22 }}>{cm.emoji}</span>
                    <span style={{ fontSize:11, color:"#475569" }}>{t.reminderTime}</span>
                  </div>
                  <div style={{ fontWeight:700, color:"#E2E8F0", fontSize:13, marginBottom:4 }}>{t.title}</div>
                  <div style={{ color:"#64748B", fontSize:11, lineHeight:1.5, marginBottom:12 }}>{t.message.slice(0,70)}…</div>
                  <button
                    style={{ ...S.addTemplBtn, background: already ? "#1E293B" : cm.bg, color: already ? "#475569" : cm.color, border:`1px solid ${already ? "#334155" : cm.border}` }}
                    onClick={() => !already && applyTemplate(t)}
                    disabled={already}
                  >
                    {already ? "✓ Added" : "+ Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New reminder form */}
      {showForm && (
        <div style={S.formCard}>
          <h3 style={S.formTitle}>📋 Create New Reminder</h3>
          <div style={S.formGrid}>
            {/* Category */}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={S.label}>Category</label>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setForm({...form, category:c.id})}
                    style={{ padding:"6px 14px", borderRadius:20, border:`1px solid ${form.category===c.id ? c.color : "#334155"}`,
                      background: form.category===c.id ? c.bg : "transparent",
                      color: form.category===c.id ? c.color : "#64748B",
                      cursor:"pointer", fontSize:12, fontFamily:"'Sora',sans-serif", transition:"all .15s" }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label style={S.label}>Title *</label>
              <input className="inp" style={S.inp} placeholder="e.g. Morning Vitamins"
                value={form.title} onChange={e => setForm({...form, title:e.target.value})} />
            </div>

            {/* Time */}
            <div>
              <label style={S.label}>Reminder Time</label>
              <input className="inp" style={S.inp} type="time"
                value={form.reminderTime} onChange={e => setForm({...form, reminderTime:e.target.value})} />
            </div>

            {/* Message */}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={S.label}>Message *</label>
              <textarea className="inp" style={{ ...S.inp, height:80, resize:"vertical" }}
                placeholder="What should the patient be reminded about?"
                value={form.message} onChange={e => setForm({...form, message:e.target.value})} />
            </div>

            {/* Frequency */}
            <div style={{ gridColumn:"1/-1" }}>
              <label style={S.label}>Frequency</label>
              <div style={{ display:"flex", gap:8 }}>
                {FREQ.map(f => (
                  <button key={f.id} onClick={() => setForm({...form, frequency:f.id})}
                    style={{ padding:"8px 20px", borderRadius:8, border:`1px solid ${form.frequency===f.id ? "#A78BFA" : "#334155"}`,
                      background: form.frequency===f.id ? "rgba(167,139,250,0.15)" : "transparent",
                      color: form.frequency===f.id ? "#A78BFA" : "#64748B",
                      cursor:"pointer", fontSize:13, fontFamily:"'Sora',sans-serif" }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display:"flex", gap:10, marginTop:4 }}>
            <button style={S.primaryBtn} onClick={save} disabled={saving}>{saving ? "Saving…" : "💾 Save Reminder"}</button>
            <button style={S.cancelBtn}  onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Reminders list */}
      {loading ? (
        <div style={{ padding:40, textAlign:"center", color:"#475569" }}>Loading reminders…</div>
      ) : reminders.length === 0 ? (
        <div style={S.emptyState}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔔</div>
          <div style={{ color:"#64748B", fontSize:15, marginBottom:8 }}>No reminders yet</div>
          <div style={{ color:"#334155", fontSize:13 }}>Add templates above or create a custom reminder</div>
        </div>
      ) : (
        <div style={{ padding:"0 24px 32px" }}>
          {active.length > 0 && (
            <>
              <div style={S.sectionHead}>✅ Active ({active.length})</div>
              <div style={S.listGrid}>
                {active.map(rem => <ReminderCard key={rem.$id} rem={rem} onToggle={toggle} onDelete={remove} onTest={sendNow} testingId={testingId} />)}
              </div>
            </>
          )}
          {inactive.length > 0 && (
            <>
              <div style={{ ...S.sectionHead, marginTop:24 }}>⏸ Paused ({inactive.length})</div>
              <div style={S.listGrid}>
                {inactive.map(rem => <ReminderCard key={rem.$id} rem={rem} onToggle={toggle} onDelete={remove} onTest={sendNow} testingId={testingId} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ReminderCard({ rem, onToggle, onDelete, onTest, testingId }) {
  const cm   = catMeta(rem.category);
  const freq = FREQ.find(f => f.id === rem.frequency)?.label || rem.frequency;
  const isTesting = testingId === rem.$id;
  return (
    <div className="rem-card" style={{ ...S.remCard, opacity: rem.isActive ? 1 : 0.55, borderTop:`3px solid ${rem.isActive ? cm.color : "#334155"}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ width:38, height:38, borderRadius:10, background:cm.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
            {cm.emoji}
          </div>
          <div>
            <div style={{ fontWeight:700, color:"#E2E8F0", fontSize:14 }}>{rem.title}</div>
            <div style={{ color:"#475569", fontSize:11, marginTop:2 }}>{cm.label} · {freq}</div>
          </div>
        </div>
        {/* Toggle switch */}
        <div onClick={() => onToggle(rem)} style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
          <div style={{ width:38, height:20, borderRadius:10, background: rem.isActive ? cm.color : "#334155", position:"relative", transition:"background .2s" }}>
            <div style={{ position:"absolute", top:2, left: rem.isActive ? 18 : 2, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left .2s" }} />
          </div>
        </div>
      </div>

      <div style={{ color:"#64748B", fontSize:12, lineHeight:1.6, marginBottom:12 }}>{rem.message}</div>

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <span style={{ background:"#1E293B", borderRadius:6, padding:"3px 10px", fontSize:11, color:"#94A3B8" }}>
            🕐 {rem.reminderTime}
          </span>
          {rem.lastSentAt && (
            <span style={{ color:"#334155", fontSize:11 }}>
              Last: {new Date(rem.lastSentAt).toLocaleDateString("en-IN")}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button className="test-btn" onClick={() => onTest(rem.$id)} disabled={isTesting}
            style={{ background:"transparent", border:"1px solid #334155", borderRadius:6, padding:"4px 10px", color:"#A78BFA", fontSize:11, cursor:"pointer", fontFamily:"'Sora',sans-serif" }}>
            {isTesting ? "Sending…" : "📧 Test"}
          </button>
          <button className="del-btn" onClick={() => onDelete(rem.$id)}
            style={{ background:"none", border:"none", cursor:"pointer", color:"#334155", fontSize:16, padding:"0 4px", transition:"color .15s" }}>
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  root:       { fontFamily:"'Sora',sans-serif", background:"#0A0F1E", minHeight:"100vh", color:"#E2E8F0" },
  header:     { padding:"24px 24px 16px", borderBottom:"1px solid #1E293B", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 },
  title:      { fontFamily:"'Lora',serif", margin:0, fontSize:24, color:"#F1F5F9" },
  sub:        { color:"#475569", margin:"4px 0 0", fontSize:13 },
  primaryBtn: { background:"linear-gradient(135deg,#ec4899,#a855f7)", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"'Sora',sans-serif" },
  secondBtn:  { background:"rgba(167,139,250,0.12)", color:"#A78BFA", border:"1px solid #5B21B6", borderRadius:9, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:13, fontFamily:"'Sora',sans-serif" },
  cancelBtn:  { background:"#1E293B", color:"#94A3B8", border:"1px solid #334155", borderRadius:9, padding:"10px 20px", cursor:"pointer", fontFamily:"'Sora',sans-serif", fontSize:13 },
  statsRow:   { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:12, padding:"16px 24px" },
  statCard:   { background:"#0F172A", border:"1px solid #1E293B", borderRadius:12, padding:"14px 16px" },
  sectionHead:{ fontSize:12, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:.5, padding:"16px 0 10px" },
  listGrid:   { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 },
  remCard:    { background:"#0F172A", border:"1px solid #1E293B", borderRadius:14, padding:"16px", transition:"border-color .2s", animation:"fadeUp .3s ease" },
  emptyState: { padding:"60px 24px", textAlign:"center", animation:"fadeUp .4s ease" },
  formCard:   { margin:"0 24px 16px", background:"#0F172A", border:"1px solid #334155", borderRadius:14, padding:"24px", animation:"slideDown .2s ease" },
  formTitle:  { fontFamily:"'Lora',serif", color:"#F1F5F9", margin:"0 0 18px", fontSize:17 },
  formGrid:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 },
  label:      { display:"block", color:"#94A3B8", fontSize:11, fontWeight:600, marginBottom:6, textTransform:"uppercase", letterSpacing:.4 },
  inp:        { width:"100%", background:"#1E293B", border:"1px solid #334155", borderRadius:8, padding:"10px 12px", color:"#E2E8F0", fontSize:13, fontFamily:"'Sora',sans-serif", transition:"border-color .15s" },
  templWrap:  { padding:"0 24px 8px", animation:"slideDown .2s ease" },
  templGrid:  { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:12 },
  templCard:  { background:"#0F172A", border:"1px solid #1E293B", borderRadius:12, padding:"16px", cursor:"pointer", transition:"all .2s" },
  addTemplBtn:{ width:"100%", padding:"7px", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:600, fontFamily:"'Sora',sans-serif" },
  toast:      { position:"fixed", top:20, right:20, zIndex:9999, padding:"12px 20px", borderRadius:10, border:"1px solid", color:"#E2E8F0", fontSize:13, fontWeight:600, animation:"toastIn .3s ease", boxShadow:"0 8px 24px rgba(0,0,0,0.4)" },
};