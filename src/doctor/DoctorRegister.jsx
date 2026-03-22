import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SPECIALIZATIONS = [
  "Obstetrics & Gynecology","Maternal-Fetal Medicine","Neonatology",
  "Reproductive Medicine","Pediatrics","General Practice","Other"
];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

export default function DoctorRegister() {
  const navigate = useNavigate();
  const [step,     setStep]     = useState(1); // 1=account, 2=professional, 3=schedule
  const [selDays,  setSelDays]  = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    name:"", email:"", password:"", specialization:"",
    experienceYears:"", qualification:"", phone:"",
    clinicAddress:"", consultationFee:"", availableTime:"", licenseNumber:""
  });

  const F = (k,v) => setForm(f => ({...f,[k]:v}));
  const toggleDay = d => setSelDays(p => p.includes(d) ? p.filter(x=>x!==d) : [...p,d]);

  async function handleSubmit() {
    setSaving(true);
    try {
      const r = await fetch("http://localhost:5000/doctor/register", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ ...form, availableDays: selDays.join(", ") }),
      });
      const d = await r.json();
      if (r.ok) { navigate("/"); }
      else alert(d.message || "Registration failed");
    } catch(e) { alert("Network error"); }
    setSaving(false);
  }

  const STEPS = ["Account","Professional","Schedule"];
  const canNext1 = form.name && form.email && form.password;
  const canNext2 = form.specialization && form.qualification;

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Sora:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        .inp:focus{border-color:#60A5FA!important;outline:none;}
        .inp::placeholder{color:#334155;}
        .day-btn:hover{border-color:#60A5FA!important;}
        .spec-btn:hover{border-color:#60A5FA!important;}
        .next-btn:hover{filter:brightness(1.1);}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      `}</style>

      {/* Background glow blobs */}
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:400,height:400,borderRadius:"50%",background:"rgba(29,78,216,0.12)",filter:"blur(80px)",pointerEvents:"none"}}/>
      <div style={{position:"fixed",bottom:"-10%",right:"-5%",width:300,height:300,borderRadius:"50%",background:"rgba(96,165,250,0.08)",filter:"blur(60px)",pointerEvents:"none"}}/>

      <div style={S.card}>
        {/* Header */}
        <div style={S.header}>
          <div style={{fontSize:40,animation:"float 3s ease-in-out infinite"}}>🩺</div>
          <h1 style={S.title}>Doctor Registration</h1>
          <p style={S.sub}>Join NurtureWell as a healthcare provider</p>
        </div>

        {/* Step indicator */}
        <div style={S.stepRow}>
          {STEPS.map((s,i) => {
            const n = i+1;
            const done   = step > n;
            const active = step === n;
            return (
              <div key={s} style={{display:"flex",alignItems:"center",gap:0}}>
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                  <div style={{
                    width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:13,fontWeight:700,transition:"all .2s",
                    background: done ? "#1d4ed8" : active ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.05)",
                    border: `2px solid ${done||active ? "#60A5FA":"#1e3a5f"}`,
                    color: done||active ? "#60A5FA":"#334155"
                  }}>
                    {done ? "✓" : n}
                  </div>
                  <span style={{fontSize:10,color:active?"#60A5FA":"#334155",fontWeight:active?700:400,whiteSpace:"nowrap"}}>{s}</span>
                </div>
                {i < STEPS.length-1 && (
                  <div style={{width:60,height:2,background:step>n?"#1d4ed8":"#1e3a5f",margin:"0 4px",marginBottom:20,transition:"background .3s"}}/>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Step 1: Account ── */}
        {step === 1 && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <p style={S.stepLabel}>Step 1 of 3 — Account Details</p>
            <div style={S.fieldGroup}>
              <label style={S.label}>Full Name</label>
              <input className="inp" style={S.inp} placeholder="Dr. Full Name" value={form.name} onChange={e=>F("name",e.target.value)} />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Email Address</label>
              <input className="inp" style={S.inp} type="email" placeholder="doctor@hospital.com" value={form.email} onChange={e=>F("email",e.target.value)} />
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Password</label>
              <input className="inp" style={S.inp} type="password" placeholder="Create a strong password" value={form.password} onChange={e=>F("password",e.target.value)} />
            </div>
            <button className="next-btn" style={{...S.primaryBtn, opacity:canNext1?1:0.4, cursor:canNext1?"pointer":"not-allowed"}}
              onClick={() => canNext1 && setStep(2)}>
              Continue →
            </button>
            <p style={S.loginLink}>Already registered? <span style={{color:"#60A5FA",cursor:"pointer"}} onClick={()=>navigate("/")}>Sign in</span></p>
          </div>
        )}

        {/* ── Step 2: Professional ── */}
        {step === 2 && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <p style={S.stepLabel}>Step 2 of 3 — Professional Details</p>

            <div style={S.fieldGroup}>
              <label style={S.label}>Specialization</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:4}}>
                {SPECIALIZATIONS.map(sp => (
                  <button key={sp} className="spec-btn" onClick={()=>F("specialization",sp)}
                    style={{padding:"6px 14px",borderRadius:20,cursor:"pointer",fontFamily:"'Sora',sans-serif",fontSize:12,transition:"all .15s",
                      border:`1px solid ${form.specialization===sp?"#60A5FA":"#1e3a5f"}`,
                      background:form.specialization===sp?"rgba(96,165,250,0.15)":"transparent",
                      color:form.specialization===sp?"#60A5FA":"#475569"}}>
                    {sp}
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Qualification</label>
                <input className="inp" style={S.inp} placeholder="MBBS, MD, DGO…" value={form.qualification} onChange={e=>F("qualification",e.target.value)} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Experience (years)</label>
                <input className="inp" style={S.inp} type="number" min="0" placeholder="e.g. 8" value={form.experienceYears} onChange={e=>F("experienceYears",e.target.value)} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Phone</label>
                <input className="inp" style={S.inp} placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e=>F("phone",e.target.value)} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>License Number</label>
                <input className="inp" style={S.inp} placeholder="Medical council no." value={form.licenseNumber} onChange={e=>F("licenseNumber",e.target.value)} />
              </div>
            </div>
            <div style={S.fieldGroup}>
              <label style={S.label}>Clinic Address</label>
              <textarea className="inp" style={{...S.inp,height:72,resize:"vertical"}} placeholder="Full clinic address" value={form.clinicAddress} onChange={e=>F("clinicAddress",e.target.value)} />
            </div>

            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button style={S.backBtn} onClick={()=>setStep(1)}>← Back</button>
              <button className="next-btn" style={{...S.primaryBtn,flex:1,opacity:canNext2?1:0.4,cursor:canNext2?"pointer":"not-allowed"}}
                onClick={()=>canNext2&&setStep(3)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Schedule ── */}
        {step === 3 && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <p style={S.stepLabel}>Step 3 of 3 — Schedule & Fees</p>

            <div style={S.fieldGroup}>
              <label style={S.label}>Available Days</label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:6}}>
                {DAYS.map(d => (
                  <button key={d} className="day-btn" onClick={()=>toggleDay(d)}
                    style={{width:50,height:50,borderRadius:10,cursor:"pointer",fontFamily:"'Sora',sans-serif",fontSize:12,fontWeight:700,transition:"all .15s",
                      border:`1px solid ${selDays.includes(d)?"#60A5FA":"#1e3a5f"}`,
                      background:selDays.includes(d)?"rgba(96,165,250,0.18)":"transparent",
                      color:selDays.includes(d)?"#60A5FA":"#475569"}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Available Time</label>
                <input className="inp" style={S.inp} placeholder="9:00 AM – 5:00 PM" value={form.availableTime} onChange={e=>F("availableTime",e.target.value)} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Consultation Fee (₹)</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"#60A5FA",fontWeight:700,pointerEvents:"none"}}>₹</span>
                  <input className="inp" style={{...S.inp,paddingLeft:28}} type="number" min="0" placeholder="500" value={form.consultationFee} onChange={e=>F("consultationFee",e.target.value)} />
                </div>
              </div>
            </div>

            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button style={S.backBtn} onClick={()=>setStep(2)}>← Back</button>
              <button className="next-btn" style={{...S.primaryBtn,flex:1}} onClick={handleSubmit} disabled={saving}>
                {saving ? "Registering…" : "✅ Complete Registration"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  root:       {background:"#0A1628",minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",fontFamily:"'Sora',sans-serif"},
  card:       {background:"rgba(255,255,255,0.03)",border:"1px solid rgba(96,165,250,0.12)",borderRadius:20,padding:"40px 36px",width:"100%",maxWidth:520,backdropFilter:"blur(12px)"},
  header:     {textAlign:"center",marginBottom:28},
  title:      {fontFamily:"'DM Serif Display',serif",fontSize:26,color:"#f1f5f9",margin:"12px 0 6px",fontWeight:400},
  sub:        {color:"#475569",fontSize:13},
  stepRow:    {display:"flex",alignItems:"flex-start",justifyContent:"center",marginBottom:28,gap:0},
  stepLabel:  {fontSize:12,color:"#475569",marginBottom:20,letterSpacing:.3},
  fieldGroup: {marginBottom:16},
  label:      {display:"block",fontSize:11,color:"#60A5FA",fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:.5},
  inp:        {width:"100%",background:"rgba(96,165,250,0.07)",border:"1px solid rgba(96,165,250,0.15)",borderRadius:10,padding:"11px 14px",color:"#e2e8f0",fontSize:14,fontFamily:"'Sora',sans-serif",transition:"border-color .15s"},
  primaryBtn: {width:"100%",padding:"13px",background:"linear-gradient(135deg,#1d4ed8,#2563eb)",color:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:14,fontFamily:"'Sora',sans-serif",transition:"filter .15s"},
  backBtn:    {padding:"13px 20px",background:"transparent",border:"1px solid #1e3a5f",borderRadius:10,color:"#475569",cursor:"pointer",fontFamily:"'Sora',sans-serif",fontSize:14},
  loginLink:  {textAlign:"center",color:"#334155",fontSize:13,marginTop:16},
};