import { useState, useEffect } from "react";
import PregnancyChatbot from "./PregnancyChatbot";


const API = "http://localhost:5000";
const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const STEPS = ["Doctor", "Date & Time", "Details"];

export default function BookAppointment() {
  const [doctors,  setDoctors]  = useState([]);
  const [step,     setStep]     = useState(1);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState(null);
  const [toast,    setToast]    = useState(null);
  const [form, setForm] = useState({
    doctorId: "", appointmentDate: "", appointmentTime: "",
    consultationType: "AUDIO", reason: "", patientEmail: "", patientPhone: "",
  });

  useEffect(() => {
    fetch(`${API}/doctors`, { headers: hdrs() })
      .then(r => r.json()).then(d => setDoctors(d.doctors || [])).catch(console.error);
  }, []);

  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const selDoc = doctors.find(d => d.doctorId === form.doctorId);

  function showToast(msg, type = "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function nextStep() {
    if (step === 1 && !form.doctorId) { showToast("Please select a doctor"); return; }
    if (step === 2 && (!form.appointmentDate || !form.appointmentTime)) { showToast("Please pick a date and time"); return; }
    setStep(s => s + 1);
  }

  async function handleSubmit() {
    if (!form.patientEmail || !form.patientPhone) { showToast("Email and phone are required"); return; }
    setSaving(true);
    try {
      const r = await fetch(`${API}/book-appointment`, {
        method: "POST", headers: hdrs(), body: JSON.stringify(form),
      });
      const d = await r.json();
      if (r.ok) {
        setSuccess(d);
      } else {
        showToast(d.message || "Booking failed");
      }
    } catch (e) { showToast("Network error"); }
    setSaving(false);
  }

  // Success screen
  if (success) return (
    <div style={S.root}>
      <style>{CSS}</style>
      <div style={S.successWrap}>
        <div style={{ fontSize: 64, animation: "float 2s ease-in-out infinite" }}>🎉</div>
        <h2 style={S.successTitle}>Appointment Booked!</h2>
        <p style={S.successSub}>You'll receive a confirmation email shortly.</p>
        <div style={S.successCard}>
          <Row icon="👩‍⚕️" label="Doctor"    value={`Dr. ${selDoc?.name || ""}`} />
          <Row icon="📅" label="Date"      value={form.appointmentDate} />
          <Row icon="🕐" label="Time"      value={form.appointmentTime} />
          <Row icon="📱" label="Type"      value={form.consultationType} />
          {success.videoRoomUrl    && <Row icon="🎥" label="Video Link"  value={<a href={success.videoRoomUrl} target="_blank" rel="noreferrer" style={{ color:"#7AE2CF" }}>Join Video</a>} />}
          {success.audioChannelName && <Row icon="🎙" label="Audio Chan." value={success.audioChannelName} />}
        </div>
        <button style={S.primaryBtn} onClick={() => { setSuccess(null); setStep(1); setForm({ doctorId:"", appointmentDate:"", appointmentTime:"", consultationType:"AUDIO", reason:"", patientEmail:"", patientPhone:"" }); }}>
          Book Another
        </button>
      </div>
    </div>
  );

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {toast && (
        <div style={{ ...S.toast, background: toast.type==="error" ? "rgba(239,68,68,0.95)" : "rgba(7,122,125,0.95)" }}>
          ⚠️ {toast.msg}
        </div>
      )}

      <div style={S.pageLayout}>
        {/* Left panel */}
        <div style={S.leftPanel}>
          <div style={{ fontSize: 48, animation:"float 3s ease-in-out infinite", textAlign:"center" }}>🩺</div>
          <h1 style={S.leftTitle}>Book an Appointment</h1>
          <p style={S.leftSub}>Connect with your doctor via audio or video consultation from the comfort of home.</p>

          {/* Step tracker */}
          <div style={{ marginTop: 32 }}>
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done   = step > n;
              const active = step === n;
              return (
                <div key={s} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
                  <div style={{ width:32, height:32, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0, transition:"all .2s",
                    background: done ? "#077A7D" : active ? "rgba(122,226,207,0.2)" : "rgba(255,255,255,0.05)",
                    border: `2px solid ${done||active ? "#7AE2CF" : "#1a3a4a"}`,
                    color: done||active ? "#7AE2CF" : "#334155" }}>
                    {done ? "✓" : n}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight: active?700:400, color: active?"#7AE2CF":done?"#7AE2CF":"#334155" }}>{s}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected doctor preview */}
          {selDoc && (
            <div style={S.docPreview}>
              <div style={S.docAvatar}>{selDoc.name[0]}</div>
              <div>
                <div style={{ fontWeight:700, color:"#e0f7f5", fontSize:14 }}>Dr. {selDoc.name}</div>
                <div style={{ color:"#4a8a8c", fontSize:12, marginTop:2 }}>{selDoc.specialization}</div>
                {selDoc.consultationFee && <div style={{ color:"#7AE2CF", fontSize:12, marginTop:2 }}>₹{selDoc.consultationFee} / consult</div>}
              </div>
            </div>
          )}
        </div>

        {/* Right form */}
        <div style={S.formPanel}>
          <div style={{ animation:"fadeUp .3s ease" }} key={step}>
            <p style={S.stepLabel}>Step {step} of 3 — {STEPS[step-1]}</p>

            {/* STEP 1 — Doctor */}
            {step === 1 && (
              <>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Select Doctor</label>
                  <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:6 }}>
                    {doctors.map(doc => (
                      <div key={doc.$id} onClick={() => F("doctorId", doc.doctorId)}
                        className="doc-card"
                        style={{ ...S.docCard, border:`1px solid ${form.doctorId===doc.doctorId ? "#7AE2CF":"rgba(122,226,207,0.1)"}`, background:form.doctorId===doc.doctorId ? "rgba(122,226,207,0.08)":"rgba(122,226,207,0.03)" }}>
                        <div style={{ width:40, height:40, borderRadius:10, background:"rgba(7,122,125,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, color:"#7AE2CF", flexShrink:0 }}>
                          {doc.name[0]}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, color:"#e0f7f5", fontSize:14 }}>Dr. {doc.name}</div>
                          <div style={{ color:"#4a8a8c", fontSize:12, marginTop:2 }}>{doc.specialization}</div>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          {doc.consultationFee && <div style={{ color:"#7AE2CF", fontSize:13, fontWeight:700 }}>₹{doc.consultationFee}</div>}
                          {doc.availableTime   && <div style={{ color:"#334155", fontSize:11, marginTop:2 }}>{doc.availableTime}</div>}
                        </div>
                        {form.doctorId===doc.doctorId && <div style={{ color:"#7AE2CF", fontSize:16 }}>✓</div>}
                      </div>
                    ))}
                    {doctors.length === 0 && <div style={{ color:"#334155", textAlign:"center", padding:24 }}>No doctors available</div>}
                  </div>
                </div>
              </>
            )}

            {/* STEP 2 — Date & Time */}
            {step === 2 && (
              <>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Appointment Date</label>
                  <input className="inp" style={S.inp} type="date"
                    min={new Date().toISOString().slice(0,10)}
                    value={form.appointmentDate}
                    onChange={e => F("appointmentDate", e.target.value)} />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Preferred Time</label>
                  <input className="inp" style={S.inp} type="time"
                    value={form.appointmentTime}
                    onChange={e => F("appointmentTime", e.target.value)} />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Consultation Type</label>
                  <div style={{ display:"flex", gap:12, marginTop:6 }}>
                    {["AUDIO","VIDEO"].map(t => (
                      <div key={t} onClick={() => F("consultationType", t)}
                        style={{ flex:1, padding:"16px 12px", borderRadius:12, textAlign:"center", cursor:"pointer", transition:"all .15s",
                          border:`1px solid ${form.consultationType===t ? "#7AE2CF":"rgba(122,226,207,0.1)"}`,
                          background: form.consultationType===t ? "rgba(122,226,207,0.1)":"rgba(122,226,207,0.03)" }}>
                        <div style={{ fontSize:28, marginBottom:6 }}>{t==="AUDIO" ? "🎙" : "🎥"}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:form.consultationType===t?"#7AE2CF":"#4a8a8c" }}>{t==="AUDIO" ? "Audio Call" : "Video Call"}</div>
                        <div style={{ fontSize:11, color:"#334155", marginTop:3 }}>{t==="AUDIO" ? "Voice only" : "Face to face"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* STEP 3 — Details */}
            {step === 3 && (
              <>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Reason for Consultation</label>
                  <textarea className="inp" style={{ ...S.inp, height:80, resize:"vertical" }}
                    placeholder="Describe your symptoms or reason for visit…"
                    value={form.reason} onChange={e => F("reason", e.target.value)} />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Your Email *</label>
                  <input className="inp" style={S.inp} type="email" placeholder="you@email.com"
                    value={form.patientEmail} onChange={e => F("patientEmail", e.target.value)} />
                </div>
                <div style={S.fieldGroup}>
                  <label style={S.label}>Your Phone *</label>
                  <input className="inp" style={S.inp} placeholder="+91 XXXXX XXXXX"
                    value={form.patientPhone} onChange={e => F("patientPhone", e.target.value)} />
                </div>

                {/* Summary */}
                <div style={S.summary}>
                  <div style={{ fontSize:12, color:"#4a8a8c", fontWeight:700, marginBottom:10, textTransform:"uppercase", letterSpacing:.5 }}>Booking Summary</div>
                  <Row icon="👩‍⚕️" label="Doctor" value={selDoc ? `Dr. ${selDoc.name}` : "—"} />
                  <Row icon="📅" label="Date"   value={form.appointmentDate || "—"} />
                  <Row icon="🕐" label="Time"   value={form.appointmentTime || "—"} />
                  <Row icon="📱" label="Type"   value={form.consultationType} />
                </div>
              </>
            )}

            {/* Nav buttons */}
            <div style={{ display:"flex", gap:10, marginTop:24 }}>
              {step > 1 && (
                <button style={S.backBtn} onClick={() => setStep(s => s-1)}>← Back</button>
              )}
              {step < 3 ? (
                <button style={S.primaryBtn} onClick={nextStep}>Continue →</button>
              ) : (
                <button style={{ ...S.primaryBtn, background:"linear-gradient(135deg,#077A7D,#0a9a9e)" }}
                  onClick={handleSubmit} disabled={saving}>
                  {saving ? "Booking…" : "✅ Confirm Booking"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div>
        <PregnancyChatbot />
      </div>
    </div>
  );
}

function Row({ icon, label, value }) {
  return (
    <div style={{ display:"flex", gap:10, alignItems:"center", padding:"7px 0", borderBottom:"1px solid rgba(122,226,207,0.06)", fontSize:13 }}>
      <span style={{ fontSize:15, flexShrink:0 }}>{icon}</span>
      <span style={{ color:"#4a8a8c", minWidth:60 }}>{label}</span>
      <span style={{ color:"#e0f7f5", fontWeight:500 }}>{value}</span>
    </div>
  );
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Nunito:wght@300;400;600;700;800&display=swap');
  *{box-sizing:border-box;}
  ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#1a3a4a;border-radius:3px;}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
  @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
  @keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
  .inp:focus{border-color:#7AE2CF!important;outline:none;}
  .inp::placeholder{color:#334155;}
  .doc-card{cursor:pointer;transition:all .15s;}
  .doc-card:hover{border-color:#7AE2CF!important;}
`;

const S = {
  root:        { fontFamily:"'Nunito',sans-serif", background:"#06202B", minHeight:"100vh", color:"#e0f7f5" },
  toast:       { position:"fixed", top:20, right:20, zIndex:9999, padding:"12px 20px", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700, animation:"toastIn .3s ease" },
  pageLayout:  { display:"flex", minHeight:"100vh" },
  leftPanel:   { width:300, background:"linear-gradient(160deg,#06202B,#082535)", borderRight:"1px solid rgba(122,226,207,0.08)", padding:"40px 28px", flexShrink:0 },
  leftTitle:   { fontFamily:"'Playfair Display',serif", fontSize:22, color:"#f0fffe", margin:"16px 0 10px", lineHeight:1.3 },
  leftSub:     { color:"#334155", fontSize:13, lineHeight:1.7 },
  docPreview:  { marginTop:28, background:"rgba(122,226,207,0.06)", border:"1px solid rgba(122,226,207,0.12)", borderRadius:12, padding:"14px", display:"flex", gap:12, alignItems:"center" },
  docAvatar:   { width:40, height:40, borderRadius:10, background:"linear-gradient(135deg,#077A7D,#7AE2CF)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:800, color:"#fff", flexShrink:0 },
  formPanel:   { flex:1, padding:"40px 36px", overflowY:"auto" },
  stepLabel:   { fontSize:12, color:"#4a8a8c", marginBottom:24, letterSpacing:.3 },
  fieldGroup:  { marginBottom:18 },
  label:       { display:"block", fontSize:11, color:"#7AE2CF", fontWeight:700, marginBottom:6, textTransform:"uppercase", letterSpacing:.5 },
  inp:         { width:"100%", background:"rgba(122,226,207,0.06)", border:"1px solid rgba(122,226,207,0.15)", borderRadius:10, padding:"11px 14px", color:"#e0f7f5", fontSize:14, fontFamily:"'Nunito',sans-serif", transition:"border-color .15s" },
  docCard:     { display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:12 },
  summary:     { background:"rgba(122,226,207,0.04)", border:"1px solid rgba(122,226,207,0.1)", borderRadius:12, padding:"16px", marginTop:4 },
  primaryBtn:  { flex:1, padding:"13px", background:"linear-gradient(135deg,#077A7D,#7AE2CF)", color:"#06202B", border:"none", borderRadius:10, fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"'Nunito',sans-serif" },
  backBtn:     { padding:"13px 20px", background:"transparent", border:"1px solid #1a3a4a", borderRadius:10, color:"#334155", cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontSize:14 },
  successWrap: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"100vh", padding:32, textAlign:"center", animation:"fadeUp .4s ease" },
  successTitle:{ fontFamily:"'Playfair Display',serif", fontSize:28, color:"#f0fffe", margin:"16px 0 8px" },
  successSub:  { color:"#4a8a8c", fontSize:14, marginBottom:24 },
  successCard: { background:"rgba(122,226,207,0.06)", border:"1px solid rgba(122,226,207,0.15)", borderRadius:16, padding:"20px 28px", width:"100%", maxWidth:400, marginBottom:24, textAlign:"left" },
};