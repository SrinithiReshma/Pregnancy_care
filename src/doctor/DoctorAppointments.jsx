import { useState, useEffect } from "react";

const API = "http://localhost:5000";
const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const STATUS_META = {
  BOOKED:      { color:"#fbbf24", bg:"rgba(251,191,36,0.1)",   border:"#92400e", label:"Booked"     },
  COMPLETED:   { color:"#34d399", bg:"rgba(52,211,153,0.1)",   border:"#065f46", label:"Completed"  },
  RESCHEDULED: { color:"#60A5FA", bg:"rgba(96,165,250,0.1)",   border:"#1e3a5f", label:"Rescheduled"},
  CANCELLED:   { color:"#f87171", bg:"rgba(248,113,113,0.1)",  border:"#7f1d1d", label:"Cancelled"  },
};
const smeta = s => STATUS_META[s] || STATUS_META.BOOKED;

const FILTERS = ["All","BOOKED","COMPLETED","RESCHEDULED","CANCELLED"];

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [confirming,   setConfirming]   = useState(null);
  const [filter,       setFilter]       = useState("All");
  const [search,       setSearch]       = useState("");
  const [toast,        setToast]        = useState(null);

  useEffect(() => { fetchAppointments(); }, []);

  async function fetchAppointments() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/doctor/appointments`, { headers: hdrs() });
      const d = await r.json();
      setAppointments(Array.isArray(d) ? d : d.appointments || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function showToast(msg, type="success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function confirmAppointment(id) {
    setConfirming(id);
    try {
      const r = await fetch(`${API}/doctor/schedule`, {
        method:"POST", headers: hdrs(),
        body: JSON.stringify({ appointmentId: id }),
      });
      if (r.ok) { showToast("Appointment confirmed! Patient has been notified. ✅"); fetchAppointments(); }
      else showToast("Failed to confirm", "error");
    } catch (e) { showToast("Network error","error"); }
    setConfirming(null);
  }

  async function cancelAppointment(id) {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      const r = await fetch(`${API}/cancel-appointment/${id}`, { method:"PUT", headers: hdrs() });
      if (r.ok) { showToast("Appointment cancelled"); fetchAppointments(); }
      else showToast("Failed to cancel","error");
    } catch (e) { showToast("Network error","error"); }
  }

  const filtered = appointments.filter(a => {
    const matchFilter = filter === "All" || a.status === filter;
    const matchSearch = !search ||
      a.patientEmail?.toLowerCase().includes(search.toLowerCase()) ||
      a.reason?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = appointments.filter(a => a.status === s).length;
    return acc;
  }, {});

  const today = new Date().toISOString().slice(0,10);
  const todayAppts = appointments.filter(a => a.appointmentDate === today && a.status !== "CANCELLED");

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Sora:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;height:4px;} ::-webkit-scrollbar-thumb{background:#1e3a5f;border-radius:3px;}
        .row-hover:hover{background:rgba(96,165,250,0.04)!important;}
        .filter-btn:hover{border-color:#60A5FA!important;color:#60A5FA!important;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes toastIn{from{opacity:0;transform:translateX(40px)}to{opacity:1;transform:translateX(0)}}
        .inp:focus{border-color:#60A5FA!important;outline:none;}
        .inp::placeholder{color:#334155;}
      `}</style>

      {toast && (
        <div style={{...S.toast,
          background:toast.type==="error"?"rgba(239,68,68,0.95)":"rgba(14,120,190,0.95)",
          animation:"toastIn .3s ease"}}>
          {toast.type==="error"?"❌":"✅"} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>📋 Appointments</h1>
          <p style={S.sub}>Manage and confirm patient consultations</p>
        </div>
        {todayAppts.length > 0 && (
          <div style={S.todayBadge}>
            🗓️ {todayAppts.length} appointment{todayAppts.length>1?"s":""} today
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={S.statsRow}>
        {[
          { label:"Total",     value: appointments.length,        color:"#60A5FA" },
          { label:"Pending",   value: counts.BOOKED     || 0,     color:"#fbbf24" },
          { label:"Completed", value: counts.COMPLETED  || 0,     color:"#34d399" },
          { label:"Cancelled", value: counts.CANCELLED  || 0,     color:"#f87171" },
        ].map(s => (
          <div key={s.label} style={S.statCard}>
            <div style={{fontSize:24,fontWeight:700,color:s.color}}>{s.value}</div>
            <div style={{fontSize:11,color:"#334155",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div style={S.filterBar}>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {FILTERS.map(f => (
            <button key={f} className="filter-btn" onClick={()=>setFilter(f)}
              style={{...S.filterBtn,
                background: filter===f ? "rgba(96,165,250,0.15)" : "transparent",
                borderColor: filter===f ? "#60A5FA" : "#1e3a5f",
                color: filter===f ? "#60A5FA" : "#475569",
                fontWeight: filter===f ? 700 : 400}}>
              {f} {f!=="All" && counts[f] ? <span style={{fontSize:11,marginLeft:4}}>({counts[f]})</span> : null}
            </button>
          ))}
        </div>
        <input className="inp" style={{...S.searchInp}} placeholder="🔍  Search by email or reason…"
          value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div style={S.tableWrap}>
        {loading ? (
          <div style={S.empty}><div style={{fontSize:36,marginBottom:8}}>⏳</div>Loading appointments…</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}><div style={{fontSize:36,marginBottom:8}}>📭</div>No appointments found</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr style={{background:"#0f2035"}}>
                {["Patient","Date & Time","Type","Reason","Status","Join","Action"].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a,i) => {
                const sm = smeta(a.status);
                const isToday = a.appointmentDate === today;
                return (
                  <tr key={a.$id} className="row-hover"
                    style={{borderBottom:"1px solid rgba(96,165,250,0.07)",background:isToday?"rgba(96,165,250,0.03)":"transparent",animation:`fadeUp ${0.1+i*0.03}s ease`}}>

                    {/* Patient */}
                    <td style={S.td}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:34,height:34,borderRadius:10,background:"rgba(96,165,250,0.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#60A5FA",flexShrink:0}}>
                          {(a.patientEmail||"P")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{color:"#e2e8f0",fontSize:13,fontWeight:500}}>{a.patientEmail || "—"}</div>
                          {a.patientPhone && <div style={{color:"#334155",fontSize:11,marginTop:1}}>{a.patientPhone}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Date & Time */}
                    <td style={S.td}>
                      <div style={{color:isToday?"#fbbf24":"#cbd5e1",fontSize:13,fontWeight:isToday?700:400}}>
                        {isToday ? "🔔 Today" : a.appointmentDate}
                      </div>
                      <div style={{color:"#475569",fontSize:11,marginTop:2}}>🕐 {a.appointmentTime}</div>
                    </td>

                    {/* Type */}
                    <td style={S.td}>
                      <span style={{background:a.consultationType==="VIDEO"?"rgba(168,85,247,0.12)":"rgba(96,165,250,0.12)",
                        border:`1px solid ${a.consultationType==="VIDEO"?"rgba(168,85,247,0.3)":"rgba(96,165,250,0.3)"}`,
                        color:a.consultationType==="VIDEO"?"#d8b4fe":"#60A5FA",
                        borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:600}}>
                        {a.consultationType==="VIDEO"?"🎥 Video":"🎙 Audio"}
                      </span>
                    </td>

                    {/* Reason */}
                    <td style={{...S.td,maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#475569",fontSize:12}}>
                      {a.reason || "—"}
                    </td>

                    {/* Status */}
                    <td style={S.td}>
                      <span style={{background:sm.bg,border:`1px solid ${sm.border}`,color:sm.color,borderRadius:20,padding:"3px 10px",fontSize:11,fontWeight:700}}>
                        {sm.label}
                      </span>
                    </td>

                    {/* Join */}
                    <td style={S.td}>
                      {a.consultationType==="VIDEO" && a.videoRoomUrl && a.status==="COMPLETED" && (
                        <a href={a.videoRoomUrl} target="_blank" rel="noreferrer"
                          style={{background:"rgba(168,85,247,0.15)",border:"1px solid rgba(168,85,247,0.3)",color:"#d8b4fe",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:600,textDecoration:"none"}}>
                          🎥 Join
                        </a>
                      )}
                      {a.consultationType==="AUDIO" && a.status==="COMPLETED" && a.audioChannelName && (
                        <button
                          onClick={()=>window.location.href=`/audio-call/${a.audioChannelName}/${a.audioToken}`}
                          style={{background:"rgba(96,165,250,0.15)",border:"1px solid rgba(96,165,250,0.3)",color:"#60A5FA",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                          🎙 Join
                        </button>
                      )}
                      {a.status !== "COMPLETED" && <span style={{color:"#1e3a5f",fontSize:11}}>—</span>}
                    </td>

                    {/* Action */}
                    <td style={S.td}>
                      <div style={{display:"flex",gap:6}}>
                        {a.status==="BOOKED" && (
                          <button onClick={()=>confirmAppointment(a.$id)} disabled={confirming===a.$id}
                            style={{background:"rgba(52,211,153,0.15)",border:"1px solid rgba(52,211,153,0.3)",color:"#34d399",borderRadius:8,padding:"5px 12px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Sora',sans-serif",whiteSpace:"nowrap"}}>
                            {confirming===a.$id ? "…" : "✅ Confirm"}
                          </button>
                        )}
                        {(a.status==="BOOKED"||a.status==="COMPLETED") && (
                          <button onClick={()=>cancelAppointment(a.$id)}
                            style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.2)",color:"#f87171",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontFamily:"'Sora',sans-serif"}}>
                            ✕
                          </button>
                        )}
                        {(a.status==="COMPLETED"||a.status==="CANCELLED"||a.status==="RESCHEDULED") && confirming!==a.$id && (
                          <span style={{color:"#1e3a5f",fontSize:11}}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const S = {
  root:       {fontFamily:"'Sora',sans-serif",background:"#0A1628",minHeight:"100vh",color:"#e2e8f0"},
  header:     {padding:"24px 24px 16px",borderBottom:"1px solid rgba(96,165,250,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12},
  title:      {fontFamily:"'DM Serif Display',serif",margin:0,fontSize:24,color:"#f1f5f9",fontWeight:400},
  sub:        {color:"#334155",margin:"4px 0 0",fontSize:13},
  todayBadge: {background:"rgba(251,191,36,0.12)",border:"1px solid rgba(251,191,36,0.3)",borderRadius:10,padding:"8px 16px",color:"#fbbf24",fontSize:13,fontWeight:600},
  statsRow:   {display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,padding:"16px 24px"},
  statCard:   {background:"rgba(96,165,250,0.05)",border:"1px solid rgba(96,165,250,0.08)",borderRadius:12,padding:"14px 16px"},
  filterBar:  {padding:"0 24px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"},
  filterBtn:  {padding:"6px 14px",borderRadius:20,border:"1px solid",cursor:"pointer",fontSize:12,fontFamily:"'Sora',sans-serif",transition:"all .15s"},
  searchInp:  {background:"rgba(96,165,250,0.07)",border:"1px solid rgba(96,165,250,0.15)",borderRadius:10,padding:"8px 14px",color:"#e2e8f0",fontSize:13,fontFamily:"'Sora',sans-serif",width:280,transition:"border-color .15s"},
  tableWrap:  {margin:"0 24px 32px",background:"rgba(96,165,250,0.03)",border:"1px solid rgba(96,165,250,0.08)",borderRadius:14,overflow:"auto"},
  table:      {width:"100%",borderCollapse:"collapse",fontSize:13},
  th:         {padding:"10px 14px",textAlign:"left",color:"#334155",fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:.5},
  td:         {padding:"12px 14px",verticalAlign:"middle"},
  empty:      {padding:"48px",textAlign:"center",color:"#334155",fontSize:14},
  toast:      {position:"fixed",top:20,right:20,zIndex:9999,padding:"12px 20px",borderRadius:10,color:"#fff",fontSize:13,fontWeight:700,boxShadow:"0 8px 24px rgba(0,0,0,0.5)"},
};