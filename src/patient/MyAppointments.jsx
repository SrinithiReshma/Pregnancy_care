import { useState, useEffect } from "react";

import PregnancyChatbot from "./PregnancyChatbot";

const API = "http://localhost:5000";
const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const STATUS_META = {
  BOOKED:      { color:"#fbbf24", bg:"rgba(251,191,36,0.1)",  border:"#92400e", label:"Booked",      icon:"🕐" },
  COMPLETED:   { color:"#34d399", bg:"rgba(52,211,153,0.1)",  border:"#065f46", label:"Completed",   icon:"✅" },
  RESCHEDULED: { color:"#7AE2CF", bg:"rgba(122,226,207,0.1)", border:"#077A7D", label:"Rescheduled", icon:"📅" },
  CANCELLED:   { color:"#f87171", bg:"rgba(248,113,113,0.1)", border:"#7f1d1d", label:"Cancelled",   icon:"✕"  },
};
const sm = s => STATUS_META[s] || STATUS_META.BOOKED;

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState("All");
  const [cancelling,   setCancelling]   = useState(null);
  const [toast,        setToast]        = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/my-appointments`, { headers: hdrs() });
      const d = await r.json();
      setAppointments(d.appointments || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function cancel(id) {
    if (!window.confirm("Cancel this appointment?")) return;
    setCancelling(id);
    try {
      const r = await fetch(`${API}/cancel-appointment/${id}`, { method:"PUT", headers: hdrs() });
      if (r.ok) { showToast("Appointment cancelled"); load(); }
      else showToast("Failed to cancel", "error");
    } catch(e) { showToast("Network error","error"); }
    setCancelling(null);
  }

  async function reschedule(id) {
    const date = window.prompt("New date (YYYY-MM-DD):");
    if (!date) return;
    const time = window.prompt("New time (HH:MM):");
    if (!time) return;
    try {
      const r = await fetch(`${API}/reschedule-appointment/${id}`, {
        method:"PUT", headers: hdrs(),
        body: JSON.stringify({ appointmentDate: date, appointmentTime: time }),
      });
      if (r.ok) { showToast("Appointment rescheduled! ✅"); load(); }
      else showToast("Reschedule failed","error");
    } catch(e) { showToast("Network error","error"); }
  }

  const today  = new Date().toISOString().slice(0,10);
  const TABS   = ["All","BOOKED","COMPLETED","RESCHEDULED","CANCELLED"];
  const counts = TABS.slice(1).reduce((a,s) => ({ ...a, [s]: appointments.filter(x => x.status===s).length }), {});
  const filtered = filter === "All" ? appointments : appointments.filter(a => a.status === filter);

  const upcoming = appointments.filter(a => a.appointmentDate >= today && a.status !== "CANCELLED");
  const nextAppt = upcoming.sort((a,b) => a.appointmentDate.localeCompare(b.appointmentDate))[0];

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Nunito:wght@300;400;600;700;800&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px;} ::-webkit-scrollbar-thumb{background:#1a3a4a;border-radius:3px;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
        .tab-btn:hover{background:rgba(122,226,207,0.08)!important;}
        .apt-row:hover{background:rgba(122,226,207,0.03)!important;}
      `}</style>

      {toast && (
        <div style={{ ...S.toast, background: toast.type==="error" ? "rgba(239,68,68,0.95)":"rgba(7,122,125,0.95)", animation:"toastIn .3s ease" }}>
          {toast.type==="error"?"❌":"✅"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📋 My Appointments</h1>
          <p style={S.sub}>Track and manage your consultations</p>
        </div>
        <button style={S.bookBtn} onClick={() => window.location.href="/patient_dashboard/book"}>
          + Book New
        </button>
      </div>

      {/* Next appointment banner */}
      {nextAppt && (
        <div style={S.nextBanner}>
          <div style={{ fontSize:32 }}>{nextAppt.consultationType==="VIDEO" ? "🎥":"🎙"}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, color:"#4a8a8c", textTransform:"uppercase", letterSpacing:.5, marginBottom:3 }}>
              {nextAppt.appointmentDate === today ? "🔔 Today" : "Upcoming"}
            </div>
            <div style={{ fontWeight:800, color:"#e0f7f5", fontSize:15 }}>
              {nextAppt.consultationType} Consultation
            </div>
            <div style={{ color:"#4a8a8c", fontSize:13, marginTop:2 }}>
              {nextAppt.appointmentDate} at {nextAppt.appointmentTime}
            </div>
          </div>
          <span style={{ ...S.statusChip, background:sm(nextAppt.status).bg, color:sm(nextAppt.status).color, border:`1px solid ${sm(nextAppt.status).border}` }}>
            {sm(nextAppt.status).icon} {sm(nextAppt.status).label}
          </span>
          {nextAppt.consultationType==="VIDEO" && nextAppt.videoRoomUrl && nextAppt.status==="COMPLETED" && (
            <a href={nextAppt.videoRoomUrl} target="_blank" rel="noreferrer" style={S.joinBtn}>
              🎥 Join Now
            </a>
          )}
          {nextAppt.consultationType==="AUDIO" && nextAppt.status==="COMPLETED" && nextAppt.audioChannelName && (
            <button onClick={() => window.location.href=`/audio-call/${nextAppt.audioChannelName}/${nextAppt.audioToken}`}
              style={S.joinBtn}>
              🎙 Join Now
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      <div style={S.statsRow}>
        {[
          { label:"Total",    value: appointments.length,        color:"#7AE2CF" },
          { label:"Upcoming", value: upcoming.length,            color:"#34d399" },
          { label:"Pending",  value: counts.BOOKED    || 0,      color:"#fbbf24" },
          { label:"Done",     value: counts.COMPLETED || 0,      color:"#a78bfa" },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:11, color:"#334155", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tab filters */}
      <div style={S.tabRow}>
        {TABS.map(t => (
          <button key={t} className="tab-btn" onClick={() => setFilter(t)}
            style={{ ...S.tab,
              color:        filter===t ? "#7AE2CF" : "#334155",
              borderBottom: filter===t ? "2px solid #7AE2CF" : "2px solid transparent" }}>
            {t} {t!=="All" && counts[t] ? `(${counts[t]})` : ""}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ padding:"0 24px 32px" }}>
        {loading ? (
          <div style={S.empty}><div style={{fontSize:36}}>⏳</div><p>Loading…</p></div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            <div style={{fontSize:48,marginBottom:12}}>📭</div>
            <p style={{color:"#334155"}}>No appointments {filter!=="All" ? `with status "${filter}"`:"yet"}</p>
            <button style={{...S.bookBtn,marginTop:12}} onClick={()=>window.location.href="/patient_dashboard/book"}>
              Book Your First Appointment
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {filtered.map((a, i) => {
              const s   = sm(a.status);
              const isT = a.appointmentDate === today;
              return (
                <div key={a.$id} className="apt-row"
                  style={{ ...S.aptCard, borderLeft:`3px solid ${s.color}`, animation:`fadeUp ${.1+i*.04}s ease` }}>
                  <div style={{ display:"flex", gap:14, alignItems:"center", flexWrap:"wrap" }}>

                    {/* Type icon */}
                    <div style={{ width:46, height:46, borderRadius:12, background:"rgba(122,226,207,0.08)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                      {a.consultationType==="VIDEO" ? "🎥" : "🎙"}
                    </div>

                    {/* Main info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:4 }}>
                        <span style={{ fontWeight:700, color:"#e0f7f5", fontSize:14 }}>
                          {a.consultationType} Consultation
                        </span>
                        <span style={{ ...S.statusChip, background:s.bg, color:s.color, border:`1px solid ${s.border}` }}>
                          {s.icon} {s.label}
                        </span>
                        {isT && <span style={{ ...S.statusChip, background:"rgba(251,191,36,0.15)", color:"#fbbf24", border:"1px solid #92400e" }}>🔔 Today</span>}
                      </div>
                      <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                        <span style={{ color:"#4a8a8c", fontSize:12 }}>📅 {a.appointmentDate}</span>
                        <span style={{ color:"#4a8a8c", fontSize:12 }}>🕐 {a.appointmentTime}</span>
                        {a.reason && <span style={{ color:"#334155", fontSize:12 }}>📝 {a.reason}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:"flex", gap:8, flexShrink:0, flexWrap:"wrap" }}>
                      {a.consultationType==="VIDEO" && a.videoRoomUrl && a.status==="COMPLETED" && (
                        <a href={a.videoRoomUrl} target="_blank" rel="noreferrer" style={S.joinBtn}>🎥 Join</a>
                      )}
                      {a.consultationType==="AUDIO" && a.status==="COMPLETED" && a.audioChannelName && (
                        <button onClick={() => window.location.href=`/audio-call/${a.audioChannelName}/${a.audioToken}`} style={S.joinBtn}>
                          🎙 Join
                        </button>
                      )}
                      {(a.status==="BOOKED"||a.status==="COMPLETED") && (
                        <button onClick={() => reschedule(a.$id)}
                          style={{ background:"rgba(122,226,207,0.1)", border:"1px solid rgba(122,226,207,0.2)", color:"#7AE2CF", borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                          📅 Reschedule
                        </button>
                      )}
                      {(a.status==="BOOKED"||a.status==="COMPLETED") && (
                        <button onClick={() => cancel(a.$id)} disabled={cancelling===a.$id}
                          style={{ background:"rgba(248,113,113,0.1)", border:"1px solid rgba(248,113,113,0.2)", color:"#f87171", borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:"'Nunito',sans-serif" }}>
                          {cancelling===a.$id ? "…" : "✕ Cancel"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <PregnancyChatbot />
      </div>
    </div>
  );
}

const S = {
  root:       { fontFamily:"'Nunito',sans-serif", background:"#06202B", minHeight:"100vh", color:"#e0f7f5" },
  header:     { padding:"24px 24px 16px", borderBottom:"1px solid rgba(122,226,207,0.08)", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 },
  title:      { fontFamily:"'Playfair Display',serif", margin:0, fontSize:24, color:"#f0fffe" },
  sub:        { color:"#334155", margin:"4px 0 0", fontSize:13 },
  bookBtn:    { background:"linear-gradient(135deg,#077A7D,#7AE2CF)", color:"#06202B", border:"none", borderRadius:10, padding:"10px 20px", fontWeight:800, cursor:"pointer", fontSize:13, fontFamily:"'Nunito',sans-serif" },
  nextBanner: { margin:"20px 24px 0", background:"rgba(122,226,207,0.06)", border:"1px solid rgba(122,226,207,0.15)", borderRadius:16, padding:"18px 20px", display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" },
  statsRow:   { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:12, padding:"16px 24px" },
  statCard:   { background:"rgba(122,226,207,0.04)", border:"1px solid rgba(122,226,207,0.08)", borderRadius:12, padding:"14px 16px" },
  tabRow:     { display:"flex", gap:0, borderBottom:"1px solid rgba(122,226,207,0.08)", paddingLeft:24, overflowX:"auto", marginBottom:16 },
  tab:        { padding:"12px 18px", border:"none", background:"transparent", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:"'Nunito',sans-serif", whiteSpace:"nowrap", transition:"all .15s" },
  aptCard:    { background:"rgba(122,226,207,0.03)", border:"1px solid rgba(122,226,207,0.08)", borderRadius:14, padding:"16px 20px", transition:"background .15s" },
  statusChip: { borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700 },
  joinBtn:    { background:"rgba(7,122,125,0.2)", border:"1px solid rgba(122,226,207,0.3)", color:"#7AE2CF", borderRadius:8, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif", textDecoration:"none", display:"inline-block" },
  empty:      { padding:"48px", textAlign:"center", color:"#334155", fontSize:14, display:"flex", flexDirection:"column", alignItems:"center", gap:8 },
  toast:      { position:"fixed", top:20, right:20, zIndex:9999, padding:"12px 20px", borderRadius:10, color:"#fff", fontSize:13, fontWeight:700 },
};