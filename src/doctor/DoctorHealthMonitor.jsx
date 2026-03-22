import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend
} from "recharts";

const API = "http://localhost:5000";
const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

/* ─── Clinical helpers ───────────────────────────────────────────────────── */
function bpZone(sys, dia) {
  if (sys >= 160 || dia >= 110) return "red";
  if (sys >= 140 || dia >= 90)  return "orange";
  if (sys < 90  || dia < 60)   return "yellow";
  return "green";
}
function customZone(value, baseline, low, high) {
  if (!baseline) return "green";
  const lo = low  ?? baseline * 0.85;
  const hi = high ?? baseline * 1.15;
  if (value < lo) return "yellow";
  if (value > hi) return "orange";
  return "green";
}
const ZONE_META = {
  green:  { label:"Healthy",    color:"#22C55E", bg:"rgba(34,197,94,0.1)",  border:"#166534" },
  yellow: { label:"Monitor",    color:"#EAB308", bg:"rgba(234,179,8,0.1)",  border:"#713F12" },
  orange: { label:"Borderline", color:"#F97316", bg:"rgba(249,115,22,0.1)", border:"#7C2D12" },
  red:    { label:"Critical",   color:"#EF4444", bg:"rgba(239,68,68,0.1)",  border:"#7F1D1D" },
};
const PALETTE = ["#A78BFA","#34D399","#F472B6","#FB923C","#38BDF8","#FBBF24","#4ADE80","#F87171"];

/* ─── Tooltip ────────────────────────────────────────────────────────────── */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1E293B", borderRadius:8, padding:"8px 14px", fontSize:12, color:"#fff" }}>
      <div style={{ color:"#64748B", marginBottom:4 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color }}>{p.name}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function DoctorHealthMonitor() {
  const [patients,       setPatients]       = useState([]);
  const [selPat,         setSelPat]         = useState(null);
  const [logs,           setLogs]           = useState([]);
  const [metrics,        setMetrics]        = useState([]); // patient's custom metrics
  const [activeChart,    setActiveChart]    = useState("bp");
  const [loading,        setLoading]        = useState(false);
  const [patLoading,     setPatLoading]     = useState(true);
  const [saving,         setSaving]         = useState(false);

  // Metric form modal (doctor adds metric FOR patient)
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [editingMetric,  setEditingMetric]  = useState(null);
  const [metricForm,     setMetricForm]     = useState({
    name:"", unit:"", baseline:"", rangeLow:"", rangeHigh:"", color:"",
  });

  useEffect(() => { loadPatients(); }, []);

  async function loadPatients() {
    setPatLoading(true);
    const r = await fetch(`${API}/patients-list`, { headers: hdrs() });
    const d = await r.json();
    setPatients(d.patients || []);
    setPatLoading(false);
  }

  async function loadPatientData(pat) {
    setSelPat(pat);
    setLogs([]);
    setMetrics([]);
    setActiveChart("bp");
    setLoading(true);
    try {
      const [logRes, metRes] = await Promise.all([
        fetch(`${API}/health-logs?userId=${pat.userId}`,      { headers: hdrs() }),
        fetch(`${API}/custom-metrics?userId=${pat.userId}`,   { headers: hdrs() }),
      ]);
      const logData = await logRes.json();
      const metData = await metRes.json();
      setLogs((logData.logs || []).sort((a,b) => new Date(a.date)-new Date(b.date)));
      setMetrics(metData.metrics || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  /* ── Metric CRUD (doctor acting on patient's behalf) ── */
  async function handleMetricSubmit() {
    if (!metricForm.name || !selPat) return;
    setSaving(true);
    const usedColors = metrics.map(m => m.color);
    const autoColor  = PALETTE.find(c => !usedColors.includes(c)) || PALETTE[metrics.length % PALETTE.length];
    const payload = {
      targetUserId: selPat.userId,           // server uses this when role=DOCTOR
      name:      metricForm.name,
      unit:      metricForm.unit      || null,
      baseline:  metricForm.baseline  ? parseFloat(metricForm.baseline)  : null,
      rangeLow:  metricForm.rangeLow  ? parseFloat(metricForm.rangeLow)  : null,
      rangeHigh: metricForm.rangeHigh ? parseFloat(metricForm.rangeHigh) : null,
      color:     metricForm.color     || autoColor,
    };

    const url    = editingMetric ? `${API}/custom-metrics/${editingMetric.$id}` : `${API}/custom-metrics`;
    const method = editingMetric ? "PATCH" : "POST";
    await fetch(url, { method, headers: hdrs(), body: JSON.stringify(payload) });

    setShowMetricForm(false);
    setEditingMetric(null);
    setMetricForm({ name:"", unit:"", baseline:"", rangeLow:"", rangeHigh:"", color:"" });
    setSaving(false);
    loadPatientData(selPat);
  }

  async function handleDeleteMetric(id) {
    if (!window.confirm("Delete this metric?")) return;
    await fetch(`${API}/custom-metrics/${id}`, { method:"DELETE", headers: hdrs() });
    loadPatientData(selPat);
  }

  function openEditMetric(m) {
    setEditingMetric(m);
    setMetricForm({ name:m.name, unit:m.unit||"", baseline:m.baseline||"", rangeLow:m.rangeLow||"", rangeHigh:m.rangeHigh||"", color:m.color||"" });
    setShowMetricForm(true);
  }

  /* ── Alert detection ── */
  const recentHighBP    = logs.slice(-3).filter(l => l.systolic >= 140 || l.diastolic >= 90);
  const hasPreeclampsia = recentHighBP.length >= 2;

  /* ── Chart data ── */
  const chartData = logs.map(l => ({
    date:      new Date(l.date).toLocaleDateString("en-IN", { day:"numeric", month:"short" }),
    systolic:  l.systolic,
    diastolic: l.diastolic,
    weight:    l.weight,
    ...metrics.reduce((acc, m) => ({
      ...acc,
      [`metric_${m.$id}`]: l.customValues?.[m.$id] ?? null,
    }), {}),
  }));

  /* ── Summary stats ── */
  const latestLog    = logs[logs.length - 1];
  const firstWeight  = logs.find(l => l.weight)?.weight;
  const latestWeight = [...logs].reverse().find(l => l.weight)?.weight;
  const weightGained = firstWeight && latestWeight ? +(latestWeight - firstWeight).toFixed(1) : null;

  /* ── All chart tabs ── */
  const allTabs = [
    { id:"bp",     label:"🩺 BP" },
    { id:"weight", label:"⚖️ Weight" },
    ...metrics.map(m => ({ id:`metric_${m.$id}`, label: m.name, metric: m })),
  ];
  const activeMetric = allTabs.find(t => t.id === activeChart)?.metric || null;

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px;}
        .pat-row:hover{background:#1E293B!important;}
        .icon-btn:hover{opacity:.7;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── Header ── */}
      <div style={S.header}>
        <h1 style={S.title}>🩺 Patient Health Monitor</h1>
        <p style={S.sub}>Blood pressure, weight & custom health metrics</p>
      </div>

      <div style={S.layout}>

        {/* ══ Left: Patient List ══════════════════════════════════════════ */}
        <div style={S.sidebar}>
          <div style={S.sideHead}>👩‍🍼 Patients ({patients.length})</div>
          {patLoading ? <div style={S.empty}>Loading...</div> :
           patients.length === 0 ? <div style={S.empty}>No patients yet</div> : (
            <div style={{ overflowY:"auto", flex:1 }}>
              {patients.map(p => {
                const isActive = selPat?.userId === p.userId;
                return (
                  <div
                    key={p.$id}
                    className="pat-row"
                    onClick={() => loadPatientData(p)}
                    style={{ ...S.patRow, background: isActive ? "#1E3A5F" : "transparent", borderLeft: isActive ? "3px solid #60A5FA" : "3px solid transparent" }}
                  >
                    <div style={{ fontWeight:700, color: isActive ? "#93C5FD" : "#CBD5E1", fontSize:14 }}>{p.userName || "Unknown"}</div>
                    <div style={{ color:"#475569", fontSize:11, marginTop:2 }}>Week {p.pregnancyWeek}</div>
                    <div style={{ color:"#475569", fontSize:11 }}>{p.userEmail}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══ Right: Patient Detail ════════════════════════════════════════ */}
        <div style={S.main}>
          {!selPat ? (
            <div style={S.placeholder}>
              <div style={{ fontSize:56 }}>👈</div>
              <p style={{ color:"#475569" }}>Select a patient to view their health data</p>
            </div>
          ) : loading ? (
            <div style={S.placeholder}><div style={{ fontSize:40 }}>⏳</div><p style={{ color:"#475569" }}>Loading...</p></div>
          ) : (
            <div style={{ animation:"fadeUp .3s ease" }} key={selPat.userId}>

              {/* Patient Header */}
              <div style={S.patHeader}>
                <div>
                  <h2 style={{ fontFamily:"'Lora',serif", color:"#F1F5F9", margin:0, fontSize:22 }}>{selPat.userName}</h2>
                  <p style={{ color:"#64748B", margin:"4px 0 0", fontSize:13 }}>
                    Week {selPat.pregnancyWeek} · {logs.length} readings · {metrics.length} custom metric{metrics.length !== 1 ? "s" : ""}
                    {selPat.expectedDueDate && ` · Due: ${new Date(selPat.expectedDueDate).toLocaleDateString("en-IN")}`}
                  </p>
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                  {hasPreeclampsia && (
                    <div style={S.alertChip}>🚨 Preeclampsia Risk</div>
                  )}
                  <button
                    style={S.addMetricBtn}
                    onClick={() => { setEditingMetric(null); setMetricForm({ name:"", unit:"", baseline:"", rangeLow:"", rangeHigh:"", color:"" }); setShowMetricForm(true); }}
                  >
                    ＋ Add Metric
                  </button>
                </div>
              </div>

              {/* Summary Stats */}
              <div style={S.statsRow}>
                <StatBox label="Latest BP" value={latestLog?.systolic ? `${latestLog.systolic}/${latestLog.diastolic}` : "—"} zone={latestLog?.systolic ? bpZone(latestLog.systolic, latestLog.diastolic) : "green"} />
                <StatBox label="Current Weight" value={latestWeight ? `${latestWeight} kg` : "—"} zone="green" />
                <StatBox label="Weight Gained" value={weightGained !== null ? `+${weightGained} kg` : "—"} zone={weightGained > 15 ? "orange" : "green"} />
                <StatBox label="High BP Readings" value={logs.filter(l => l.systolic >= 140).length} zone={logs.filter(l => l.systolic >= 140).length > 1 ? "red" : "green"} />
                {/* Custom metric summary cards */}
                {metrics.map((m, i) => {
                  const vals  = logs.map(l => l.customValues?.[m.$id]).filter(v => v != null);
                  const latest = vals[vals.length - 1];
                  const zone  = latest != null && m.baseline ? customZone(latest, m.baseline, m.rangeLow, m.rangeHigh) : "green";
                  return (
                    <StatBox
                      key={m.$id}
                      label={m.name}
                      value={latest != null ? `${latest}${m.unit ? " "+m.unit : ""}` : "—"}
                      zone={zone}
                      color={m.color}
                      sub={m.baseline ? `Baseline: ${m.baseline}` : undefined}
                    />
                  );
                })}
              </div>

              {/* ── Custom Metrics Manager ── */}
              {metrics.length > 0 && (
                <div style={S.metricsPanel}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <span style={{ fontFamily:"'Lora',serif", color:"#E2E8F0", fontSize:15, fontWeight:600 }}>📊 Custom Metrics</span>
                    <span style={{ color:"#475569", fontSize:12 }}>Defined for this patient</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))", gap:10 }}>
                    {metrics.map((m, i) => (
                      <div key={m.$id} style={{ background:"#0A0F1E", borderRadius:10, padding:"12px 14px", border:"1px solid #1E293B" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                              <span style={{ width:9, height:9, borderRadius:"50%", background: m.color || PALETTE[i%PALETTE.length], display:"inline-block" }} />
                              <span style={{ fontWeight:700, color:"#E2E8F0", fontSize:13 }}>{m.name}</span>
                              {m.unit && <span style={{ color:"#475569", fontSize:10 }}>({m.unit})</span>}
                            </div>
                            {m.baseline != null && (
                              <div style={{ color:"#64748B", fontSize:11, marginTop:3 }}>
                                Baseline: <span style={{ color:"#94A3B8" }}>{m.baseline}{m.unit ? ` ${m.unit}` : ""}</span>
                                {m.rangeLow != null && m.rangeHigh != null && <span> · {m.rangeLow}–{m.rangeHigh}</span>}
                              </div>
                            )}
                          </div>
                          <div style={{ display:"flex", gap:4 }}>
                            <button className="icon-btn" onClick={() => openEditMetric(m)} style={S.iconBtn}>✏️</button>
                            <button className="icon-btn" onClick={() => handleDeleteMetric(m.$id)} style={S.iconBtn}>🗑</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Chart Section ── */}
              <div style={S.chartBox}>
                <div style={S.chartHead}>
                  <span style={S.chartTitle}>
                    {allTabs.find(t => t.id === activeChart)?.label?.replace(/^[^\s]+\s/, "") || "Trend"} Trend
                  </span>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                    {allTabs.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setActiveChart(t.id)}
                        style={{
                          ...S.tab,
                          background:   activeChart === t.id ? "rgba(255,255,255,0.12)" : "transparent",
                          fontWeight:   activeChart === t.id ? 700 : 400,
                          borderBottom: activeChart === t.id ? `2px solid ${t.metric?.color || "#6366F1"}` : "2px solid transparent",
                          color:        activeChart === t.id ? "#E2E8F0" : "#64748B",
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {logs.length < 2 ? (
                  <div style={S.empty}>Need ≥ 2 readings to show trend</div>
                ) : activeChart === "bp" ? (
                  <BPChart data={chartData} />
                ) : activeChart === "weight" ? (
                  <WeightChart data={chartData} weightGained={weightGained} />
                ) : activeMetric ? (
                  <CustomMetricChart data={chartData} metric={activeMetric} />
                ) : null}
              </div>

              {/* ── Log Table ── */}
              <div style={{ ...S.chartBox, marginTop:16 }}>
                <div style={S.chartHead}>
                  <span style={S.chartTitle}>All Readings</span>
                  <span style={{ color:"#475569", fontSize:12 }}>{logs.length} entries</span>
                </div>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                    <thead>
                      <tr style={{ background:"#1E293B" }}>
                        {["Date","BP","Status","Weight",
                          ...metrics.map(m => `${m.name}${m.unit ? ` (${m.unit})` : ""}`),
                          "Notes"
                        ].map(h => (
                          <th key={h} style={S.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...logs].reverse().map(log => {
                        const z  = log.systolic ? bpZone(log.systolic, log.diastolic) : null;
                        const zm = z ? ZONE_META[z] : null;
                        return (
                          <tr key={log.$id} style={{ borderBottom:"1px solid #1E293B" }}>
                            <td style={S.td}>{new Date(log.date).toLocaleDateString("en-IN", {day:"numeric",month:"short",year:"numeric"})}</td>
                            <td style={{ ...S.td, fontWeight:700, color:zm?.color || "#475569" }}>
                              {log.systolic ? `${log.systolic}/${log.diastolic}` : "—"}
                            </td>
                            <td style={S.td}>
                              {zm ? <span style={{ background:zm.bg, color:zm.color, border:`1px solid ${zm.border}`, borderRadius:20, padding:"2px 9px", fontSize:10, fontWeight:700 }}>{zm.label}</span> : "—"}
                            </td>
                            <td style={S.td}>{log.weight ? `${log.weight} kg` : "—"}</td>
                            {metrics.map(m => {
                              const v  = log.customValues?.[m.$id];
                              const cz = v != null && m.baseline ? customZone(v, m.baseline, m.rangeLow, m.rangeHigh) : null;
                              const czm = cz ? ZONE_META[cz] : null;
                              return (
                                <td key={m.$id} style={S.td}>
                                  {v != null
                                    ? <span style={{ color: czm?.color || m.color || "#E2E8F0", fontWeight:600 }}>{v}</span>
                                    : <span style={{ color:"#334155" }}>—</span>
                                  }
                                </td>
                              );
                            })}
                            <td style={{ ...S.td, color:"#475569", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.notes || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* ══ ADD / EDIT METRIC MODAL ════════════════════════════════════════ */}
      {showMetricForm && (
        <div style={S.overlay} onClick={() => setShowMetricForm(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily:"'Lora',serif", color:"#F1F5F9", margin:"0 0 6px", fontSize:20 }}>
              {editingMetric ? "✏️ Edit Metric" : "➕ Add Custom Metric"}
            </h2>
            <p style={{ color:"#475569", fontSize:12, marginBottom:20 }}>
              For patient: <strong style={{ color:"#93C5FD" }}>{selPat?.userName}</strong>
            </p>

            <div style={S.formGrid}>
              <div style={{ gridColumn:"1/-1" }}>
                <FormField label="Metric Name *" placeholder="e.g. Blood Sugar, Heart Rate, Fetal Kicks" value={metricForm.name} onChange={v => setMetricForm({...metricForm, name:v})} />
              </div>
              <FormField label="Unit" placeholder="e.g. mg/dL, bpm, kicks/hr" value={metricForm.unit} onChange={v => setMetricForm({...metricForm, unit:v})} />
              <FormField label="Baseline" type="number" placeholder="Patient's normal value" value={metricForm.baseline} onChange={v => setMetricForm({...metricForm, baseline:v})} />
              <FormField label="Alert below (Range Low)" type="number" placeholder="Optional" value={metricForm.rangeLow} onChange={v => setMetricForm({...metricForm, rangeLow:v})} />
              <FormField label="Alert above (Range High)" type="number" placeholder="Optional" value={metricForm.rangeHigh} onChange={v => setMetricForm({...metricForm, rangeHigh:v})} />
            </div>

            {/* Colour picker */}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", color:"#94A3B8", fontSize:12, fontWeight:600, marginBottom:8 }}>Chart Colour</label>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={() => setMetricForm({...metricForm, color:c})}
                    style={{ width:26, height:26, borderRadius:"50%", background:c, border: metricForm.color===c ? "3px solid #fff" : "3px solid transparent", cursor:"pointer", transition:"border .15s" }} />
                ))}
              </div>
            </div>

            {/* Preview */}
            {metricForm.baseline && (
              <div style={{ background:"#1E293B", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:"#94A3B8" }}>
                Baseline: <strong style={{ color: metricForm.color || "#A78BFA" }}>{metricForm.baseline} {metricForm.unit}</strong>
                {metricForm.rangeLow && metricForm.rangeHigh && (
                  <> · Healthy range: <strong style={{ color:"#22C55E" }}>{metricForm.rangeLow}–{metricForm.rangeHigh} {metricForm.unit}</strong></>
                )}
              </div>
            )}

            <div style={{ display:"flex", gap:10 }}>
              <button style={S.saveBtn} onClick={handleMetricSubmit} disabled={saving || !metricForm.name}>
                {saving ? "Saving…" : editingMetric ? "💾 Update" : "💾 Create Metric"}
              </button>
              <button style={S.cancelBtn} onClick={() => { setShowMetricForm(false); setEditingMetric(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Charts ─────────────────────────────────────────────────────────────── */
function BPChart({ data }) {
  return (
    <div style={{ height:280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top:5, right:20, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="date" stroke="#334155" tick={{ fill:"#475569", fontSize:10 }} />
          <YAxis domain={[50,180]} stroke="#334155" tick={{ fill:"#475569", fontSize:10 }} />
          <Tooltip content={<ChartTip />} />
          <Legend wrapperStyle={{ color:"#64748B", fontSize:11 }} />
          <ReferenceArea y1={140} y2={180} fill="#EF4444" fillOpacity={0.08} />
          <ReferenceLine y={140} stroke="#F97316" strokeDasharray="3 2" label={{ value:"140", fill:"#F97316", fontSize:9 }} />
          <ReferenceLine y={90}  stroke="#EAB308" strokeDasharray="3 2" />
          <Line type="monotone" dataKey="systolic"  name="Systolic"  stroke="#F87171" strokeWidth={2} dot={{ r:3 }} connectNulls />
          <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#60A5FA" strokeWidth={2} dot={{ r:3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeightChart({ data, weightGained }) {
  const wData = data.filter(d => d.weight != null);
  return (
    <div style={{ height:280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={wData} margin={{ top:5, right:20, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="date" stroke="#334155" tick={{ fill:"#475569", fontSize:10 }} />
          <YAxis stroke="#334155" tick={{ fill:"#475569", fontSize:10 }} />
          <Tooltip content={<ChartTip />} />
          <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#A78BFA" strokeWidth={2.5} dot={{ r:4 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      {weightGained !== null && (
        <div style={{ textAlign:"center", color:"#64748B", fontSize:11, marginTop:6 }}>
          Total gain: <strong style={{ color:"#A78BFA" }}>+{weightGained} kg</strong>
        </div>
      )}
    </div>
  );
}

function CustomMetricChart({ data, metric }) {
  const key   = `metric_${metric.$id}`;
  const color = metric.color || "#A78BFA";
  const cData = data.filter(d => d[key] != null);
  const vals  = cData.map(d => d[key]);
  const pad   = ((Math.max(...vals) - Math.min(...vals)) * 0.2) || 2;

  return (
    <div style={{ height:280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={cData} margin={{ top:5, right:20, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="date" stroke="#334155" tick={{ fill:"#475569", fontSize:10 }} />
          <YAxis domain={[Math.floor(Math.min(...vals)-pad), Math.ceil(Math.max(...vals)+pad)]} stroke="#334155" tick={{ fill:"#475569", fontSize:10 }} />
          <Tooltip content={<ChartTip />} />
          {metric.rangeLow != null && metric.rangeHigh != null && (
            <ReferenceArea y1={metric.rangeLow} y2={metric.rangeHigh} fill="#22C55E" fillOpacity={0.1}
              label={{ value:"Healthy range", fill:"#22C55E", fontSize:9, position:"insideTopRight" }} />
          )}
          {metric.rangeHigh != null && <ReferenceLine y={metric.rangeHigh} stroke="#F97316" strokeDasharray="4 2" label={{ value:`High: ${metric.rangeHigh}`, fill:"#F97316", fontSize:9 }} />}
          {metric.rangeLow  != null && <ReferenceLine y={metric.rangeLow}  stroke="#EAB308" strokeDasharray="4 2" label={{ value:`Low: ${metric.rangeLow}`,   fill:"#EAB308", fontSize:9 }} />}
          {metric.baseline  != null && <ReferenceLine y={metric.baseline}  stroke={color}   strokeDasharray="6 3" label={{ value:`Baseline: ${metric.baseline}`, fill:color, fontSize:9 }} />}
          <Line type="monotone" dataKey={key} name={`${metric.name}${metric.unit ? ` (${metric.unit})` : ""}`}
            stroke={color} strokeWidth={2.5} dot={{ r:4, fill:color }} activeDot={{ r:6 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ textAlign:"center", color:"#64748B", fontSize:11, marginTop:6 }}>
        {metric.baseline != null && <>Baseline: <strong style={{ color }}>{metric.baseline} {metric.unit}</strong></>}
        {metric.rangeLow != null && metric.rangeHigh != null && <> · Range: <strong style={{ color:"#22C55E" }}>{metric.rangeLow}–{metric.rangeHigh} {metric.unit}</strong></>}
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function StatBox({ label, value, zone, color, sub }) {
  const zm = ZONE_META[zone] || ZONE_META.green;
  return (
    <div style={{ background:"#0F172A", border:`1px solid ${zm.border}`, borderRadius:12, padding:"14px 16px", borderTop:`3px solid ${color || zm.color}` }}>
      <div style={{ fontSize:10, color:"#475569", fontWeight:600, textTransform:"uppercase", letterSpacing:.5 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:800, color: color || zm.color, marginTop:4 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:"#475569", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function FormField({ label, type="text", value, onChange, placeholder="" }) {
  return (
    <div>
      {label && <label style={{ display:"block", color:"#94A3B8", fontSize:11, fontWeight:600, marginBottom:5 }}>{label}</label>}
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ width:"100%", background:"#1E293B", border:"1px solid #334155", borderRadius:7, padding:"9px 12px", color:"#E2E8F0", fontSize:13, outline:"none", fontFamily:"'Sora',sans-serif" }} />
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const S = {
  root:         { fontFamily:"'Sora',sans-serif", background:"#0A0F1E", minHeight:"100vh", color:"#E2E8F0" },
  header:       { padding:"20px 28px", borderBottom:"1px solid #1E293B" },
  title:        { fontFamily:"'Lora',serif", margin:0, fontSize:22, color:"#F1F5F9" },
  sub:          { color:"#475569", margin:"4px 0 0", fontSize:12 },
  layout:       { display:"flex", height:"calc(100vh - 80px)", overflow:"hidden" },
  sidebar:      { width:232, borderRight:"1px solid #1E293B", display:"flex", flexDirection:"column", overflow:"hidden" },
  sideHead:     { padding:"11px 14px", fontWeight:700, fontSize:11, color:"#64748B", textTransform:"uppercase", letterSpacing:.5, borderBottom:"1px solid #1E293B", flexShrink:0 },
  patRow:       { padding:"11px 13px", cursor:"pointer", transition:"background .15s", borderBottom:"1px solid #0F172A" },
  main:         { flex:1, overflowY:"auto", padding:"20px 24px" },
  placeholder:  { height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:12, textAlign:"center" },
  empty:        { padding:"24px", color:"#475569", textAlign:"center", fontSize:13 },
  patHeader:    { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:12 },
  alertChip:    { background:"rgba(239,68,68,0.1)", border:"1px solid #7F1D1D", borderRadius:8, padding:"7px 12px", color:"#FCA5A5", fontSize:11, fontWeight:700 },
  addMetricBtn: { background:"linear-gradient(135deg,#6366F1,#8B5CF6)", color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:"'Sora',sans-serif" },
  statsRow:     { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))", gap:10, marginBottom:16 },
  metricsPanel: { background:"#0F172A", border:"1px solid #1E293B", borderRadius:12, padding:"16px", marginBottom:16 },
  chartBox:     { background:"#0F172A", border:"1px solid #1E293B", borderRadius:14, padding:"18px" },
  chartHead:    { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, flexWrap:"wrap", gap:8 },
  chartTitle:   { fontFamily:"'Lora',serif", fontSize:15, fontWeight:600, color:"#E2E8F0" },
  tab:          { padding:"5px 12px", borderRadius:6, border:"none", cursor:"pointer", fontSize:11, fontFamily:"'Sora',sans-serif", transition:"all .15s" },
  th:           { padding:"8px 12px", textAlign:"left", color:"#64748B", fontWeight:600, fontSize:10, textTransform:"uppercase", letterSpacing:.4 },
  td:           { padding:"10px 12px", color:"#94A3B8", verticalAlign:"middle" },
  overlay:      { position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" },
  modal:        { background:"#0F172A", border:"1px solid #334155", borderRadius:18, padding:"28px", width:"min(480px,90vw)", maxHeight:"90vh", overflowY:"auto", animation:"slideIn .2s ease" },
  formGrid:     { display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 },
  saveBtn:      { background:"linear-gradient(135deg,#6366F1,#8B5CF6)", color:"#fff", border:"none", borderRadius:8, padding:"10px 24px", fontWeight:700, cursor:"pointer", fontFamily:"'Sora',sans-serif", fontSize:13 },
  cancelBtn:    { background:"#1E293B", color:"#94A3B8", border:"1px solid #334155", borderRadius:8, padding:"10px 20px", cursor:"pointer", fontFamily:"'Sora',sans-serif", fontSize:13 },
  iconBtn:      { background:"none", border:"none", cursor:"pointer", fontSize:13, padding:"2px 4px", opacity:.7, transition:"opacity .15s" },
};