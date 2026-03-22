import { useState, useEffect } from "react";

const API = "http://localhost:5000";
const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const CATEGORIES = [
  { id:"water",       label:"Water",       emoji:"💧", color:"#38BDF8" },
  { id:"medication",  label:"Medication",  emoji:"💊", color:"#A78BFA" },
  { id:"nutrition",   label:"Nutrition",   emoji:"🥗", color:"#34D399" },
  { id:"exercise",    label:"Exercise",    emoji:"🏃‍♀️",color:"#FB923C" },
  { id:"appointment", label:"Appointment", emoji:"📅", color:"#F472B6" },
  { id:"general",     label:"General",     emoji:"🌸", color:"#E879F9" },
];
const catMeta = id => CATEGORIES.find(c => c.id === id) || CATEGORIES[5];

export default function DoctorRemindersPanel() {
  const [patients,   setPatients]   = useState([]);
  const [selPat,     setSelPat]     = useState(null);
  const [reminders,  setReminders]  = useState([]);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [testingId,  setTestingId]  = useState(null);
  const [toast,      setToast]      = useState(null);
  const [form, setForm] = useState({
    title:"", message:"", reminderTime:"09:00", frequency:"daily", category:"general",
  });

  useEffect(() => { loadPatients(); }, []);

  async function loadPatients() {
    const r = await fetch(`${API}/patients-list`, { headers: hdrs() });
    const d = await r.json();
    setPatients(d.patients || []);
  }

  async function selectPatient(pat) {
    setSelPat(pat);
    setShowForm(false);
    const r = await fetch(`${API}/reminders?userId=${pat.userId}`, { headers: hdrs() });
    const d = await r.json();
    setReminders(d.reminders || []);
  }

  function showToast(msg, type="success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function save() {
    if (!selPat) return;
    if (!form.title || !form.message) { showToast("Fill all required fields","error"); return; }
    setSaving(true);
    const r = await fetch(`${API}/reminders`, {
      method:"POST", headers: hdrs(),
      body: JSON.stringify({ ...form, targetUserId: selPat.userId }),
    });
    const d = await r.json();
    if (d.success) { showToast("Reminder sent to patient ✅"); selectPatient(selPat); setShowForm(false); resetForm(); }
    else showToast(d.message,"error");
    setSaving(false);
  }

  async function toggle(rem) {
    await fetch(`${API}/reminders/${rem.$id}`, { method:"PUT", headers: hdrs(), body: JSON.stringify({ isActive: !rem.isActive }) });
    setReminders(prev => prev.map(r => r.$id === rem.$id ? {...r, isActive: !r.isActive} : r));
  }

  async function remove(id) {
    if (!window.confirm("Delete this reminder?")) return;
    await fetch(`${API}/reminders/${id}`, { method:"DELETE", headers: hdrs() });
    setReminders(prev => prev.filter(r => r.$id !== id));
    showToast("Deleted");
  }

  async function sendNow(id) {
    setTestingId(id);
    const r = await fetch(`${API}/reminders/send-now/${id}`, { method:"POST", headers: hdrs() });
    const d = await r.json();
    showToast(d.success ? "Test email sent! 📬" : d.message, d.success ? "success" : "error");
    setTestingId(null);
  }

  function resetForm() { setForm({ title:"", message:"", reminderTime:"09:00", frequency:"daily", category:"general" }); }

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px;}
        .pat-row:hover{background:#1E293B!important;}
        .inp:focus{border-color:#A78BFA!important;outline:none;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(60px)}to{opacity:1;transform:translateX(0)}}
      `}</style>

      {toast && (
        <div style={{ ...S.toast, background: toast.type==="error"?"#7F1D1D":"#14532D", borderColor: toast.type==="error"?"#EF4444":"#22C55E" }}>
          {toast.type==="error"?"❌":"✅"} {toast.msg}
        </div>
      )}

      <div style={S.header}>
        <h1 style={S.title}>🔔 Patient Reminders</h1>
        <p style={S.sub}>Create personalised health reminders for your patients</p>
      </div>

      <div style={S.layout}>
        {/* Patient sidebar */}
        <div style={S.sidebar}>
          <div style={S.sideHead}>👩‍🍼 Select Patient</div>
          {patients.map(p => (
            <div key={p.$id} className="pat-row" onClick={() => selectPatient(p)}
              style={{ ...S.patRow, background: selPat?.userId===p.userId?"#1E3A5F":"transparent", borderLeft: selPat?.userId===p.userId?"3px solid #A78BFA":"3px solid transparent" }}>
              <div style={{ fontWeight:700, color: selPat?.userId===p.userId?"#C4B5FD":"#CBD5E1", fontSize:14 }}>{p.userName}</div>
              <div style={{ color:"#475569", fontSize:11, marginTop:2 }}>Week {p.pregnancyWeek}</div>
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div style={S.main}>
          {!selPat ? (
            <div style={S.placeholder}><div style={{fontSize:48}}>👈</div><p style={{color:"#475569"}}>Select a patient to manage their reminders</p></div>
          ) : (
            <div style={{animation:"fadeUp .3s ease"}} key={selPat.userId}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
                <div>
                  <h2 style={{ fontFamily:"'Lora',serif", color:"#F1F5F9", margin:0, fontSize:20 }}>{selPat.userName}</h2>
                  <p style={{ color:"#64748B", margin:"4px 0 0", fontSize:13 }}>Week {selPat.pregnancyWeek} · {reminders.length} reminders</p>
                </div>
                <button style={S.addBtn} onClick={() => setShowForm(v=>!v)}>
                  {showForm ? "✕ Cancel" : "+ Add Reminder"}
                </button>
              </div>

              {showForm && (
                <div style={S.formCard}>
                  <h3 style={{ fontFamily:"'Lora',serif", color:"#F1F5F9", margin:"0 0 16px", fontSize:16 }}>New Reminder for {selPat.userName}</h3>
                  <div style={S.formGrid}>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={S.label}>Category</label>
                      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                        {CATEGORIES.map(c=>(
                          <button key={c.id} onClick={()=>setForm({...form,category:c.id})}
                            style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${form.category===c.id?c.color:"#334155"}`,
                              background:form.category===c.id?`${c.color}20`:"transparent",color:form.category===c.id?c.color:"#64748B",
                              cursor:"pointer",fontSize:12,fontFamily:"'Sora',sans-serif"}}>
                            {c.emoji} {c.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label style={S.label}>Title *</label>
                      <input className="inp" style={S.inp} placeholder="e.g. Take Iron Tablet" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
                    </div>
                    <div>
                      <label style={S.label}>Time</label>
                      <input className="inp" style={S.inp} type="time" value={form.reminderTime} onChange={e=>setForm({...form,reminderTime:e.target.value})}/>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={S.label}>Message *</label>
                      <textarea className="inp" style={{...S.inp,height:70,resize:"vertical"}} placeholder="Personalised message for the patient…" value={form.message} onChange={e=>setForm({...form,message:e.target.value})}/>
                    </div>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={S.label}>Frequency</label>
                      <div style={{display:"flex",gap:8}}>
                        {[{id:"daily",label:"Daily"},{id:"weekly",label:"Weekly"},{id:"once",label:"Once"}].map(f=>(
                          <button key={f.id} onClick={()=>setForm({...form,frequency:f.id})}
                            style={{padding:"7px 18px",borderRadius:8,border:`1px solid ${form.frequency===f.id?"#A78BFA":"#334155"}`,
                              background:form.frequency===f.id?"rgba(167,139,250,0.15)":"transparent",color:form.frequency===f.id?"#A78BFA":"#64748B",
                              cursor:"pointer",fontSize:13,fontFamily:"'Sora',sans-serif"}}>
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <button style={S.addBtn} onClick={save} disabled={saving}>{saving?"Saving…":"💾 Save"}</button>
                    <button style={S.cancelBtn} onClick={()=>{setShowForm(false);resetForm();}}>Cancel</button>
                  </div>
                </div>
              )}

              {reminders.length===0 ? (
                <div style={S.empty}>No reminders yet. Add one above!</div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
                  {reminders.map(rem=>{
                    const cm=catMeta(rem.category);
                    return (
                      <div key={rem.$id} style={{background:"#0F172A",border:`1px solid #1E293B`,borderTop:`3px solid ${rem.isActive?cm.color:"#334155"}`,borderRadius:12,padding:16,opacity:rem.isActive?1:0.55}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <span style={{fontSize:20}}>{cm.emoji}</span>
                            <div style={{fontWeight:700,color:"#E2E8F0",fontSize:13}}>{rem.title}</div>
                          </div>
                          <div onClick={()=>toggle(rem)} style={{cursor:"pointer"}}>
                            <div style={{width:34,height:18,borderRadius:10,background:rem.isActive?cm.color:"#334155",position:"relative",transition:"background .2s"}}>
                              <div style={{position:"absolute",top:2,left:rem.isActive?16:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left .2s"}}/>
                            </div>
                          </div>
                        </div>
                        <div style={{color:"#64748B",fontSize:12,lineHeight:1.5,marginBottom:10}}>{rem.message}</div>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <span style={{background:"#1E293B",borderRadius:6,padding:"2px 8px",fontSize:11,color:"#94A3B8"}}>🕐 {rem.reminderTime}</span>
                          <div style={{display:"flex",gap:6}}>
                            <button onClick={()=>sendNow(rem.$id)} disabled={testingId===rem.$id}
                              style={{background:"transparent",border:"1px solid #334155",borderRadius:6,padding:"3px 8px",color:"#A78BFA",fontSize:11,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                              {testingId===rem.$id?"…":"📧 Test"}
                            </button>
                            <button onClick={()=>remove(rem.$id)}
                              style={{background:"none",border:"none",cursor:"pointer",color:"#334155",fontSize:15}}>🗑</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const S = {
  root:    {fontFamily:"'Sora',sans-serif",background:"#0A0F1E",minHeight:"100vh",color:"#E2E8F0"},
  header:  {padding:"24px 28px",borderBottom:"1px solid #1E293B"},
  title:   {fontFamily:"'Lora',serif",margin:0,fontSize:24,color:"#F1F5F9"},
  sub:     {color:"#475569",margin:"4px 0 0",fontSize:13},
  layout:  {display:"flex",height:"calc(100vh - 90px)",overflow:"hidden"},
  sidebar: {width:220,borderRight:"1px solid #1E293B",overflowY:"auto"},
  sideHead:{padding:"12px 16px",fontWeight:700,fontSize:11,color:"#64748B",textTransform:"uppercase",letterSpacing:.5,borderBottom:"1px solid #1E293B"},
  patRow:  {padding:"12px 14px",cursor:"pointer",borderBottom:"1px solid #0F172A",transition:"background .15s"},
  main:    {flex:1,overflowY:"auto",padding:24},
  placeholder:{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12},
  formCard:{background:"#0F172A",border:"1px solid #334155",borderRadius:14,padding:20,marginBottom:20},
  formGrid:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16},
  label:   {display:"block",color:"#94A3B8",fontSize:11,fontWeight:600,marginBottom:5,textTransform:"uppercase",letterSpacing:.4},
  inp:     {width:"100%",background:"#1E293B",border:"1px solid #334155",borderRadius:8,padding:"9px 12px",color:"#E2E8F0",fontSize:13,fontFamily:"'Sora',sans-serif"},
  addBtn:  {background:"linear-gradient(135deg,#ec4899,#a855f7)",color:"#fff",border:"none",borderRadius:9,padding:"10px 18px",fontWeight:700,cursor:"pointer",fontSize:13,fontFamily:"'Sora',sans-serif"},
  cancelBtn:{background:"#1E293B",color:"#94A3B8",border:"1px solid #334155",borderRadius:9,padding:"10px 16px",cursor:"pointer",fontFamily:"'Sora',sans-serif",fontSize:13},
  empty:   {padding:40,textAlign:"center",color:"#475569"},
  toast:   {position:"fixed",top:20,right:20,zIndex:9999,padding:"12px 20px",borderRadius:10,border:"1px solid",color:"#E2E8F0",fontSize:13,fontWeight:600,animation:"toastIn .3s ease"},
};