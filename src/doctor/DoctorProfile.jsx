import { useState, useEffect } from "react";

const API = "http://localhost:5000";
const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const SPECIALIZATIONS = [
  "Obstetrics & Gynecology", "Maternal-Fetal Medicine", "Neonatology",
  "Reproductive Medicine", "Pediatrics", "General Practice", "Other"
];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function DoctorProfile() {
  const [doctor,   setDoctor]   = useState(null);
  const [editing,  setEditing]  = useState(false);
  const [section,  setSection]  = useState("overview");
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [form,     setForm]     = useState({});
  const [selDays,  setSelDays]  = useState([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/doctor/profile`, { headers: hdrs() });
      const d = await r.json();
      const doc = d.doctor || d;
      setDoctor(doc);
      const days = doc?.availableDays ? doc.availableDays.split(",").map(s => s.trim()) : [];
      setSelDays(days);
      setForm({
        name:            doc?.name            || "",
        specialization:  doc?.specialization  || "",
        experienceYears: doc?.experienceYears || "",
        qualification:   doc?.qualification   || "",
        phone:           doc?.phone           || "",
        clinicAddress:   doc?.clinicAddress   || "",
        consultationFee: doc?.consultationFee || "",
        availableTime:   doc?.availableTime   || "",
        licenseNumber:   doc?.licenseNumber   || "",
      });
    } catch (e) {
      console.error(e);
      showToast("Could not load profile", "error");
    }
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function toggleDay(day) {
    setSelDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }

  async function save() {
    setSaving(true);
    try {
      const r = await fetch(`${API}/doctor/profile`, {
        method: "PUT", headers: hdrs(),
        body: JSON.stringify({
          ...form,
          experienceYears: Number(form.experienceYears),
          consultationFee: Number(form.consultationFee),
          availableDays:   selDays.join(", "),
        }),
      });
      const d = await r.json();
      if (d.success) {
        showToast("Profile updated! ✅");
        setEditing(false);
        load();
      } else {
        showToast(d.message || "Failed to save", "error");
      }
    } catch (e) {
      showToast("Network error", "error");
    }
    setSaving(false);
  }

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const initials = (form.name || "D").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const expYears  = doctor?.experienceYears;

  const TABS = [
    { id:"overview",     label:"Overview",        emoji:"🏠" },
    { id:"professional", label:"Professional",     emoji:"🩺" },
    { id:"schedule",     label:"Schedule & Fees",  emoji:"📅" },
    { id:"account",      label:"Account",          emoji:"👤" },
  ];

  if (loading) return (
    <div style={{ background:"#0A1628", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:48, animation:"float 2s ease-in-out infinite" }}>🩺</div>
        <p style={{ color:"#60A5FA", fontFamily:"'Sora',sans-serif", marginTop:12 }}>Loading your profile…</p>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Sora:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background:#1e3a5f; border-radius:4px; }
        @keyframes float   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toastIn { from{opacity:0;transform:translateX(40px)} to{opacity:1;transform:translateX(0)} }
        .tab-btn:hover  { background:rgba(96,165,250,0.1) !important; }
        .inp:focus      { border-color:#60A5FA !important; outline:none; }
        .edit-btn:hover { background:rgba(96,165,250,0.15) !important; }
        .day-btn:hover  { border-color:#60A5FA !important; }
      `}</style>

      {toast && (
        <div style={{ ...S.toast,
          background: toast.type==="error" ? "rgba(239,68,68,0.95)" : "rgba(14,120,190,0.95)",
          animation: "toastIn .3s ease" }}>
          {toast.type==="error" ? "❌" : "✅"} {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div style={S.header}>
        <div style={S.headerInner}>
          {/* Avatar */}
          <div style={S.avatar}>{initials}</div>

          {/* Name + badges */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, color:"#3b82f6", fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:4 }}>
              Dr. Profile
            </div>
            <h1 style={S.heroName}>Dr. {form.name || "Your Name"}</h1>
            <div style={S.heroBadges}>
              {doctor?.specialization && (
                <span style={S.badge}>🩺 {doctor.specialization}</span>
              )}
              {expYears && (
                <span style={{ ...S.badge, background:"rgba(14,120,190,0.15)", border:"1px solid rgba(14,120,190,0.35)" }}>
                  {expYears} yrs experience
                </span>
              )}
              {doctor?.consultationFee && (
                <span style={{ ...S.badge, background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)", color:"#86efac" }}>
                  ₹{doctor.consultationFee} / consult
                </span>
              )}
              {doctor?.licenseNumber && (
                <span style={{ ...S.badge, background:"rgba(168,85,247,0.1)", border:"1px solid rgba(168,85,247,0.3)", color:"#d8b4fe" }}>
                  Lic: {doctor.licenseNumber}
                </span>
              )}
            </div>
          </div>

          {/* Edit / Save */}
          <div style={{ display:"flex", gap:10, flexShrink:0 }}>
            {editing ? (
              <>
                <button style={S.saveBtn} onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "💾 Save Changes"}
                </button>
                <button style={S.cancelBtn} onClick={() => { setEditing(false); load(); }}>Cancel</button>
              </>
            ) : (
              <button className="edit-btn" style={S.editBtn} onClick={() => setEditing(true)}>
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* Availability strip */}
        {(doctor?.availableDays || doctor?.availableTime) && (
          <div style={S.availStrip}>
            {doctor.availableDays && (
              <span style={{ color:"#60A5FA", fontSize:13 }}>
                📅 {doctor.availableDays}
              </span>
            )}
            {doctor.availableTime && (
              <span style={{ color:"#60A5FA", fontSize:13 }}>
                🕐 {doctor.availableTime}
              </span>
            )}
            <span style={{ ...S.badge, background:"rgba(34,197,94,0.12)", border:"1px solid rgba(34,197,94,0.3)", color:"#86efac", fontSize:11 }}>
              ● Available
            </span>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={S.tabBar}>
        {TABS.map(t => (
          <button key={t.id} className="tab-btn" onClick={() => setSection(t.id)}
            style={{ ...S.tab,
              color:        section===t.id ? "#60A5FA" : "#334155",
              borderBottom: section===t.id ? "2px solid #60A5FA" : "2px solid transparent" }}>
            <span style={{ fontSize:15 }}>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={S.content} key={section}>

        {/* OVERVIEW */}
        {section === "overview" && (
          <div style={{ animation:"fadeUp .3s ease" }}>
            <div style={S.grid3}>
              <InfoCard icon="🏥" label="Clinic"        value={doctor?.clinicAddress   || "Not set"} />
              <InfoCard icon="📞" label="Phone"          value={doctor?.phone           || "Not set"} />
              <InfoCard icon="🎓" label="Qualification"  value={doctor?.qualification   || "Not set"} />
              <InfoCard icon="📋" label="License No."    value={doctor?.licenseNumber   || "Not set"} />
              <InfoCard icon="💰" label="Consultation"   value={doctor?.consultationFee ? `₹${doctor.consultationFee}` : "Not set"} />
              <InfoCard icon="⏱️" label="Experience"     value={expYears ? `${expYears} years` : "Not set"} />
            </div>

            <div style={S.summaryStrip}>
              {[
                { label:"Specialization", value: doctor?.specialization || "—" },
                { label:"Available Days", value: doctor?.availableDays  || "—" },
                { label:"Timing",         value: doctor?.availableTime  || "—" },
                { label:"Fee",            value: doctor?.consultationFee ? `₹${doctor.consultationFee}` : "—" },
              ].map(s => (
                <div key={s.label} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:11, color:"#334155", textTransform:"uppercase", letterSpacing:.5 }}>{s.label}</div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#60A5FA", marginTop:3 }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROFESSIONAL */}
        {section === "professional" && (
          <div style={{ animation:"fadeUp .3s ease" }}>
            <SectionTitle>🩺 Professional Details</SectionTitle>
            <div style={S.formGrid}>
              <Field label="Full Name" editing={editing}>
                {editing
                  ? <input className="inp" style={S.inp} placeholder="Dr. Full Name" value={form.name} onChange={e=>F("name",e.target.value)} />
                  : <Val>{doctor?.name || "—"}</Val>}
              </Field>

              <Field label="Specialization" editing={editing}>
                {editing
                  ? <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:4 }}>
                      {SPECIALIZATIONS.map(sp => (
                        <button key={sp} onClick={() => F("specialization", sp)}
                          style={{ padding:"6px 14px", borderRadius:20,
                            border:`1px solid ${form.specialization===sp ? "#60A5FA":"#1e3a5f"}`,
                            background: form.specialization===sp ? "rgba(96,165,250,0.15)":"transparent",
                            color: form.specialization===sp ? "#60A5FA":"#334155",
                            cursor:"pointer", fontFamily:"'Sora',sans-serif", fontSize:12 }}>
                          {sp}
                        </button>
                      ))}
                    </div>
                  : <Val>{doctor?.specialization || "—"}</Val>}
              </Field>

              <Field label="Qualification" editing={editing}>
                {editing
                  ? <input className="inp" style={S.inp} placeholder="e.g. MBBS, MD, DGO" value={form.qualification} onChange={e=>F("qualification",e.target.value)} />
                  : <Val>{doctor?.qualification || "—"}</Val>}
              </Field>

              <Field label="Years of Experience" editing={editing}>
                {editing
                  ? <input className="inp" style={S.inp} type="number" min="0" max="60" placeholder="e.g. 8" value={form.experienceYears} onChange={e=>F("experienceYears",e.target.value)} />
                  : <Val>{expYears ? `${expYears} years` : "—"}</Val>}
              </Field>

              <Field label="License Number" editing={editing}>
                {editing
                  ? <input className="inp" style={S.inp} placeholder="Medical council license" value={form.licenseNumber} onChange={e=>F("licenseNumber",e.target.value)} />
                  : <Val>{doctor?.licenseNumber || "—"}</Val>}
              </Field>

              <Field label="Phone" editing={editing}>
                {editing
                  ? <input className="inp" style={S.inp} placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e=>F("phone",e.target.value)} />
                  : <Val>{doctor?.phone || "—"}</Val>}
              </Field>

              <Field label="Clinic Address" editing={editing}>
                {editing
                  ? <textarea className="inp" style={{ ...S.inp, height:80, resize:"vertical" }} placeholder="Full clinic address" value={form.clinicAddress} onChange={e=>F("clinicAddress",e.target.value)} />
                  : <Val>{doctor?.clinicAddress || "—"}</Val>}
              </Field>
            </div>
          </div>
        )}

        {/* SCHEDULE & FEES */}
        {section === "schedule" && (
          <div style={{ animation:"fadeUp .3s ease" }}>
            <SectionTitle>📅 Schedule & Consultation Fees</SectionTitle>
            <div style={S.formGrid}>

              <Field label="Available Days" editing={editing}>
                {editing
                  ? <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:4 }}>
                      {DAYS.map(day => (
                        <button key={day} className="day-btn" onClick={() => toggleDay(day)}
                          style={{ width:52, height:52, borderRadius:10,
                            border:`1px solid ${selDays.includes(day) ? "#60A5FA":"#1e3a5f"}`,
                            background: selDays.includes(day) ? "rgba(96,165,250,0.18)":"transparent",
                            color: selDays.includes(day) ? "#60A5FA":"#334155",
                            cursor:"pointer", fontFamily:"'Sora',sans-serif", fontSize:12, fontWeight:700,
                            transition:"all .15s" }}>
                          {day}
                        </button>
                      ))}
                    </div>
                  : <Val>{doctor?.availableDays || "—"}</Val>}
              </Field>

              <Field label="Available Time" editing={editing}>
                {editing
                  ? <input className="inp" style={S.inp} placeholder="e.g. 9:00 AM – 5:00 PM" value={form.availableTime} onChange={e=>F("availableTime",e.target.value)} />
                  : <Val>{doctor?.availableTime || "—"}</Val>}
              </Field>

              <Field label="Consultation Fee (₹)" editing={editing}>
                {editing
                  ? <div style={{ position:"relative" }}>
                      <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#60A5FA", fontWeight:700, fontSize:15 }}>₹</span>
                      <input className="inp" style={{ ...S.inp, paddingLeft:28 }} type="number" min="0" placeholder="500" value={form.consultationFee} onChange={e=>F("consultationFee",e.target.value)} />
                    </div>
                  : <div style={{ fontSize:22, fontWeight:800, color:"#60A5FA" }}>
                      ₹{doctor?.consultationFee || "—"}
                    </div>}
              </Field>
            </div>
          </div>
        )}

        {/* ACCOUNT */}
        {section === "account" && (
          <div style={{ animation:"fadeUp .3s ease" }}>
            <SectionTitle>👤 Account</SectionTitle>
            <div style={S.formGrid}>
              <Field label="Role"><Val>Doctor</Val></Field>
              <Field label="Doctor ID"><Val style={{ fontFamily:"monospace", fontSize:12 }}>{doctor?.doctorId || "—"}</Val></Field>
            </div>
            <div style={{ ...S.card, marginTop:20, borderColor:"rgba(239,68,68,0.2)" }}>
              <div style={{ fontWeight:700, color:"#fca5a5", marginBottom:6, fontSize:14 }}>⚠️ Danger Zone</div>
              <p style={{ color:"#334155", fontSize:13, marginBottom:12 }}>
                Email and password changes are handled through the admin panel or reset flow.
              </p>
              <button style={{ background:"rgba(239,68,68,0.1)", color:"#fca5a5", border:"1px solid rgba(239,68,68,0.3)", borderRadius:8, padding:"8px 18px", cursor:"pointer", fontFamily:"'Sora',sans-serif", fontSize:13 }}
                onClick={() => {
                  if (window.confirm("Logout?")) {
                    localStorage.removeItem("token");
                    window.location.href = "/";
                  }
                }}>
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div style={S.infoCard}>
      <div style={{ fontSize:22, marginBottom:8 }}>{icon}</div>
      <div style={{ fontSize:10, color:"#334155", textTransform:"uppercase", letterSpacing:.5, fontWeight:700 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:700, color:"#e2e8f0", marginTop:3, lineHeight:1.4 }}>{value}</div>
    </div>
  );
}
function SectionTitle({ children }) {
  return <h2 style={{ fontFamily:"'DM Serif Display',serif", color:"#60A5FA", fontSize:20, margin:"0 0 20px", fontWeight:400 }}>{children}</h2>;
}
function Field({ label, editing, children }) {
  return (
    <div style={{ padding:"14px 0", borderBottom:"1px solid rgba(96,165,250,0.07)" }}>
      <div style={{ fontSize:10, color:"#334155", textTransform:"uppercase", letterSpacing:.5, fontWeight:700, marginBottom:6 }}>{label}</div>
      {children}
    </div>
  );
}
function Val({ children }) {
  return <div style={{ fontSize:15, color:"#cbd5e1", fontWeight:500 }}>{children}</div>;
}

const S = {
  root:      { fontFamily:"'Sora',sans-serif", background:"#0A1628", minHeight:"100vh", color:"#e2e8f0" },
  header:    { background:"linear-gradient(135deg,#0A1628,#0f2744)", borderBottom:"1px solid rgba(96,165,250,0.1)", padding:"28px 28px 20px" },
  headerInner:{ display:"flex", alignItems:"flex-start", gap:20, flexWrap:"wrap", marginBottom:12 },
  avatar:    { width:72, height:72, borderRadius:16, background:"linear-gradient(135deg,#1d4ed8,#3b82f6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, fontWeight:700, color:"#fff", flexShrink:0, letterSpacing:1 },
  heroName:  { fontFamily:"'DM Serif Display',serif", fontSize:"clamp(20px,3vw,28px)", margin:"0 0 8px", color:"#f1f5f9", lineHeight:1.2, fontWeight:400 },
  heroBadges:{ display:"flex", gap:8, flexWrap:"wrap" },
  badge:     { background:"rgba(96,165,250,0.1)", border:"1px solid rgba(96,165,250,0.2)", borderRadius:20, padding:"3px 12px", fontSize:12, color:"#60A5FA", fontWeight:500 },
  editBtn:   { background:"transparent", border:"1px solid rgba(96,165,250,0.3)", borderRadius:10, padding:"10px 18px", color:"#60A5FA", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"'Sora',sans-serif", transition:"background .15s" },
  saveBtn:   { background:"linear-gradient(135deg,#1d4ed8,#2563eb)", color:"#fff", border:"none", borderRadius:10, padding:"10px 22px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'Sora',sans-serif" },
  cancelBtn: { background:"transparent", border:"1px solid #1e3a5f", borderRadius:10, padding:"10px 16px", color:"#334155", fontSize:13, cursor:"pointer", fontFamily:"'Sora',sans-serif" },
  availStrip:{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap", paddingTop:4 },
  tabBar:    { display:"flex", gap:0, borderBottom:"1px solid rgba(96,165,250,0.1)", background:"#0A1628", overflowX:"auto", paddingLeft:16 },
  tab:       { padding:"14px 20px", border:"none", background:"transparent", cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"'Sora',sans-serif", display:"flex", alignItems:"center", gap:7, whiteSpace:"nowrap", transition:"all .15s" },
  content:   { padding:"24px 28px", maxWidth:860 },
  grid3:     { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12, marginBottom:20 },
  infoCard:  { background:"rgba(96,165,250,0.05)", border:"1px solid rgba(96,165,250,0.1)", borderRadius:14, padding:"16px 18px" },
  summaryStrip:{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", background:"rgba(29,78,216,0.1)", border:"1px solid rgba(29,78,216,0.2)", borderRadius:14, padding:"16px 20px", gap:16 },
  formGrid:  { display:"grid", gridTemplateColumns:"1fr", gap:0 },
  inp:       { width:"100%", background:"rgba(96,165,250,0.07)", border:"1px solid rgba(96,165,250,0.15)", borderRadius:8, padding:"10px 14px", color:"#e2e8f0", fontSize:14, fontFamily:"'Sora',sans-serif", transition:"border-color .15s" },
  card:      { background:"rgba(96,165,250,0.04)", border:"1px solid rgba(96,165,250,0.1)", borderRadius:14, padding:"18px 20px" },
  toast:     { position:"fixed", top:20, right:20, zIndex:9999, padding:"12px 20px", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, boxShadow:"0 8px 24px rgba(0,0,0,0.5)" },
}; 