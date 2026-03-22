import { useState, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea, Legend
} from "recharts";

/* ─── API ─────────────────────────────────────────────────────────────────── */
const API = "http://localhost:5000";
const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

async function fetchLogs()          { return (await fetch(`${API}/health-logs`,        { headers: hdrs() })).json(); }
async function fetchProfile()       { return (await fetch(`${API}/pregnancy-profile`,  { headers: hdrs() })).json(); }
async function fetchMetrics()       { return (await fetch(`${API}/custom-metrics`,     { headers: hdrs() })).json(); }
async function saveLog(p)           { return (await fetch(`${API}/health-logs`,        { method:"POST",   headers:hdrs(), body:JSON.stringify(p) })).json(); }
async function deleteLog(id)        { await fetch(`${API}/health-logs/${id}`,          { method:"DELETE", headers:hdrs() }); }
async function saveMetric(p)        { return (await fetch(`${API}/custom-metrics`,     { method:"POST",   headers:hdrs(), body:JSON.stringify(p) })).json(); }
async function updateMetric(id, p)  { return (await fetch(`${API}/custom-metrics/${id}`, { method:"PATCH", headers:hdrs(), body:JSON.stringify(p) })).json(); }
async function deleteMetric(id)     { await fetch(`${API}/custom-metrics/${id}`,       { method:"DELETE", headers:hdrs() }); }

/* ─── Clinical helpers ───────────────────────────────────────────────────── */
function bpZone(sys, dia) {
  if (sys >= 160 || dia >= 110) return "red";
  if (sys >= 140 || dia >= 90)  return "orange";
  if (sys < 90  || dia < 60)   return "yellow";
  return "green";
}
function weightZone(gained, trimester) {
  const ranges = { 1:[0.5,2], 2:[4,8], 3:[8,13] };
  const t = Math.min(3, Math.max(1, trimester));
  const [lo, hi] = ranges[t];
  if (gained < lo) return "yellow";
  if (gained > hi) return "orange";
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
  green:  { label:"Healthy",               color:"#22C55E", bg:"#F0FDF4", border:"#BBF7D0" },
  yellow: { label:"Monitor",               color:"#EAB308", bg:"#FEFCE8", border:"#FEF08A" },
  orange: { label:"Borderline — Alert",    color:"#F97316", bg:"#FFF7ED", border:"#FED7AA" },
  red:    { label:"Critical — See Doctor", color:"#EF4444", bg:"#FEF2F2", border:"#FECACA" },
};

/* ─── Palette for custom metric lines ───────────────────────────────────── */
const PALETTE = ["#A78BFA","#34D399","#F472B6","#FB923C","#38BDF8","#FBBF24","#4ADE80","#F87171"];

/* ─── Custom Tooltip ─────────────────────────────────────────────────────── */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:"#1E293B", borderRadius:10, padding:"10px 16px", fontSize:12, color:"#fff", boxShadow:"0 8px 24px rgba(0,0,0,0.3)" }}>
      <div style={{ fontWeight:700, marginBottom:4, color:"#94A3B8" }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ color:p.color }}>
          {p.name}: <strong>{p.value}</strong> {p.unit || ""}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function HealthTracker() {
  const [logs,          setLogs]          = useState([]);
  const [profile,       setProfile]       = useState(null);
  const [metrics,       setMetrics]       = useState([]); // custom metrics config
  const [activeChart,   setActiveChart]   = useState("bp");
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [alert,         setAlert]         = useState(null);

  // Modal states
  const [showLogForm,    setShowLogForm]    = useState(false);
  const [showMetricForm, setShowMetricForm] = useState(false);
  const [editingMetric,  setEditingMetric]  = useState(null); // null = create, obj = edit

  // Log form
  const [logForm, setLogForm] = useState({
    date: new Date().toISOString().slice(0,10),
    systolic:"", diastolic:"", weight:"",
    customValues:{}, // { metricId: value }
    notes:"",
  });

  // Metric form
  const [metricForm, setMetricForm] = useState({
    name:"", unit:"", baseline:"", rangeLow:"", rangeHigh:"", color:"",
  });

  // Label overrides for built-in metrics
  const [bpLabel,     setBpLabel]     = useState("Blood Pressure");
  const [weightLabel, setWeightLabel] = useState("Weight");
  const [editingLabel, setEditingLabel] = useState(null); // "bp"|"weight"|null

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [logData, profData, metData] = await Promise.all([fetchLogs(), fetchProfile(), fetchMetrics()]);
      const sorted = (logData.logs || []).sort((a,b) => new Date(a.date)-new Date(b.date));
      setLogs(sorted);
      setProfile(profData.profile || profData);
      const mets = metData.metrics || [];
      setMetrics(mets);
      checkAlerts(sorted);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  function checkAlerts(allLogs) {
    if (allLogs.length < 2) return;
    const recent = allLogs.slice(-3);
    const highBP = recent.filter(l => l.systolic >= 140 || l.diastolic >= 90);
    if (highBP.length >= 2) setAlert({ msg:"⚠️ BP ≥140/90 in multiple recent readings — possible preeclampsia. Contact your doctor immediately.", color:"#EF4444" });
  }

  /* ── Log submit ── */
  async function handleLogSubmit() {
    if (!logForm.date) return;
    setSaving(true);
    const payload = {
      date:      logForm.date,
      systolic:  logForm.systolic  ? parseInt(logForm.systolic)  : null,
      diastolic: logForm.diastolic ? parseInt(logForm.diastolic) : null,
      weight:    logForm.weight    ? parseFloat(logForm.weight)  : null,
      notes:     logForm.notes,
      customValues: logForm.customValues,
    };
    const res = await saveLog(payload);
    if (res.success) {
      setShowLogForm(false);
      setLogForm({ date:new Date().toISOString().slice(0,10), systolic:"", diastolic:"", weight:"", customValues:{}, notes:"" });
      load();
    }
    setSaving(false);
  }

  /* ── Metric submit ── */
  async function handleMetricSubmit() {
    if (!metricForm.name) return;
    setSaving(true);
    const usedColors = metrics.map(m => m.color);
    const autoColor  = PALETTE.find(c => !usedColors.includes(c)) || PALETTE[metrics.length % PALETTE.length];
    const payload = {
      name:       metricForm.name,
      unit:       metricForm.unit,
      baseline:   metricForm.baseline   ? parseFloat(metricForm.baseline)   : null,
      rangeLow:   metricForm.rangeLow   ? parseFloat(metricForm.rangeLow)   : null,
      rangeHigh:  metricForm.rangeHigh  ? parseFloat(metricForm.rangeHigh)  : null,
      color:      metricForm.color || autoColor,
    };
    if (editingMetric) {
      await updateMetric(editingMetric.$id, payload);
    } else {
      await saveMetric(payload);
    }
    setShowMetricForm(false);
    setEditingMetric(null);
    setMetricForm({ name:"", unit:"", baseline:"", rangeLow:"", rangeHigh:"", color:"" });
    setSaving(false);
    load();
  }

  async function handleDeleteMetric(id) {
    if (!window.confirm("Delete this metric and all its recorded values?")) return;
    await deleteMetric(id);
    load();
  }

  function openEditMetric(m) {
    setEditingMetric(m);
    setMetricForm({ name:m.name, unit:m.unit||"", baseline:m.baseline||"", rangeLow:m.rangeLow||"", rangeHigh:m.rangeHigh||"", color:m.color||"" });
    setShowMetricForm(true);
  }

  /* ── Derived ── */
  const latestLog     = logs[logs.length - 1];
  const firstWeight   = logs.find(l => l.weight)?.weight;
  const latestWeight  = [...logs].reverse().find(l => l.weight)?.weight;
  const weightGained  = firstWeight && latestWeight ? +(latestWeight - firstWeight).toFixed(1) : null;
  const trimester     = profile?.pregnancyWeek
    ? profile.pregnancyWeek <= 12 ? 1 : profile.pregnancyWeek <= 26 ? 2 : 3
    : 1;

  /* Chart tabs = bp + weight + each custom metric */
  const allTabs = [
    { id:"bp",     label: bpLabel },
    { id:"weight", label: weightLabel },
    ...metrics.map(m => ({ id:`metric_${m.$id}`, label: m.name, metric: m })),
  ];

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

  if (loading) return <Loader />;

  const activeMetric = allTabs.find(t => t.id === activeChart)?.metric || null;

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700;800&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:5px;} ::-webkit-scrollbar-thumb{background:#334155;border-radius:4px;}
        @keyframes slideIn{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse2{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,0.4)}50%{box-shadow:0 0 0 10px rgba(239,68,68,0)}}
        .log-row:hover{background:#1E293B!important;}
        .del-btn:hover{color:#EF4444!important;}
        .tab-btn:hover{background:rgba(255,255,255,0.1)!important;}
        .action-btn:hover{opacity:.8;}
        .metric-card:hover{border-color:#334155!important;}
      `}</style>

      {/* ── Alert Banner ── */}
      {alert && (
        <div style={{ ...S.alertBanner, animation:"pulse2 2s infinite" }}>
          <span style={{ fontSize:20 }}>🚨</span>
          <span style={{ flex:1 }}>{alert.msg}</span>
          <button onClick={() => setAlert(null)} style={S.alertClose}>✕</button>
        </div>
      )}

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <h1 style={S.title}>Health Monitor</h1>
          <p style={S.subtitle}>Personalised health tracking</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button style={S.secondaryBtn} onClick={() => { setEditingMetric(null); setMetricForm({ name:"", unit:"", baseline:"", rangeLow:"", rangeHigh:"", color:"" }); setShowMetricForm(true); }}>
            ＋ New Metric
          </button>
          <button style={S.logBtn} onClick={() => setShowLogForm(true)}>
            ＋ Log Reading
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div style={S.cards}>
        <SummaryCard icon="🩺" label={bpLabel} value={latestLog?.systolic ? `${latestLog.systolic}/${latestLog.diastolic}` : "—"} sub="mmHg" zone={latestLog?.systolic ? bpZone(latestLog.systolic, latestLog.diastolic) : null} onEdit={() => setEditingLabel("bp")} />
        <SummaryCard icon="⚖️" label={weightLabel} value={latestWeight ? `${latestWeight} kg` : "—"} sub={weightGained !== null ? `+${weightGained} kg gained` : "No data yet"} zone={weightGained !== null ? weightZone(weightGained, trimester) : null} onEdit={() => setEditingLabel("weight")} />
        {metrics.map((m, i) => {
          const vals = logs.map(l => l.customValues?.[m.$id]).filter(v => v != null);
          const latest = vals[vals.length - 1];
          return (
            <SummaryCard
              key={m.$id}
              icon="📊"
              label={m.name}
              value={latest != null ? `${latest} ${m.unit||""}` : "—"}
              sub={m.baseline ? `Baseline: ${m.baseline} ${m.unit||""}` : "No baseline set"}
              zone={latest != null && m.baseline ? customZone(latest, m.baseline, m.rangeLow, m.rangeHigh) : "green"}
              color={m.color}
              onEdit={() => openEditMetric(m)}
            />
          );
        })}
        <SummaryCard icon="📅" label="Total Readings" value={logs.length} sub={`Week ${profile?.pregnancyWeek || "—"}`} zone="green" />
      </div>

      {/* ── Custom Metrics Manager ── */}
      {metrics.length > 0 && (
        <div style={S.metricManagerCard}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={S.chartTitle}>🛠 Your Custom Metrics</h2>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
            {metrics.map((m, i) => (
              <div key={m.$id} className="metric-card" style={{ background:"#0A0F1E", borderRadius:12, padding:"14px 16px", border:"1px solid #1E293B", transition:"border-color .15s" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:10, height:10, borderRadius:"50%", background:m.color || PALETTE[i%PALETTE.length], display:"inline-block" }} />
                      <span style={{ fontWeight:700, color:"#E2E8F0", fontSize:14 }}>{m.name}</span>
                      {m.unit && <span style={{ color:"#475569", fontSize:11 }}>({m.unit})</span>}
                    </div>
                    {m.baseline != null && (
                      <div style={{ color:"#64748B", fontSize:12, marginTop:4 }}>
                        Baseline: <span style={{ color:"#94A3B8" }}>{m.baseline}{m.unit ? ` ${m.unit}` : ""}</span>
                        {m.rangeLow != null && m.rangeHigh != null && (
                          <span> · Range: {m.rangeLow}–{m.rangeHigh}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => openEditMetric(m)} style={S.iconBtn} title="Edit">✏️</button>
                    <button onClick={() => handleDeleteMetric(m.$id)} style={S.iconBtn} title="Delete">🗑</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Chart Section ── */}
      <div style={S.chartCard}>
        <div style={S.chartHeader}>
          <h2 style={S.chartTitle}>
            {allTabs.find(t => t.id === activeChart)?.label || "Trend"} Trend
          </h2>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
            {allTabs.map(t => (
              <button
                key={t.id}
                className="tab-btn"
                onClick={() => setActiveChart(t.id)}
                style={{
                  ...S.tab,
                  background:   activeChart === t.id ? "rgba(255,255,255,0.15)" : "transparent",
                  fontWeight:   activeChart === t.id ? 700 : 400,
                  borderBottom: activeChart === t.id ? `2px solid ${t.metric?.color || "#6366F1"}` : "2px solid transparent",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {logs.length < 2 ? (
          <div style={S.noData}><div style={{ fontSize:48 }}>📈</div><p>Log at least 2 readings to see your trend chart</p></div>
        ) : activeChart === "bp" ? (
          <BPChart data={chartData} />
        ) : activeChart === "weight" ? (
          <WeightChart data={chartData} weightGained={weightGained} trimester={trimester} />
        ) : activeMetric ? (
          <CustomMetricChart data={chartData} metric={activeMetric} />
        ) : null}
      </div>

      {/* ── Log History ── */}
      <div style={S.historyCard}>
        <h2 style={S.chartTitle}>📋 All Readings</h2>
        {logs.length === 0 ? (
          <div style={S.noData}><p>No readings logged yet.</p></div>
        ) : (
          <div style={{ overflowX:"auto" }}>
            <table style={S.table}>
              <thead>
                <tr style={{ background:"#1E293B" }}>
                  {["Date", bpLabel, "BP Status", weightLabel, ...metrics.map(m=>`${m.name}${m.unit?` (${m.unit})`:"" }`), "Notes", ""].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...logs].reverse().map(log => {
                  const zone = log.systolic ? bpZone(log.systolic, log.diastolic) : null;
                  const zm   = zone ? ZONE_META[zone] : null;
                  return (
                    <tr key={log.$id} className="log-row" style={{ background:"#0F172A", borderBottom:"1px solid #1E293B", transition:"background .15s" }}>
                      <td style={S.td}>{new Date(log.date).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}</td>
                      <td style={S.td}>{log.systolic ? <span style={{ fontWeight:700, color:zm?.color }}>{log.systolic}/{log.diastolic}</span> : <span style={{ color:"#475569" }}>—</span>}</td>
                      <td style={S.td}>{zm ? <span style={{ ...S.zoneBadge, background:zm.bg, color:zm.color, border:`1px solid ${zm.border}` }}>{zm.label}</span> : "—"}</td>
                      <td style={S.td}>{log.weight ? `${log.weight} kg` : "—"}</td>
                      {metrics.map(m => {
                        const v = log.customValues?.[m.$id];
                        const cz = v != null && m.baseline ? customZone(v, m.baseline, m.rangeLow, m.rangeHigh) : null;
                        const czm = cz ? ZONE_META[cz] : null;
                        return (
                          <td key={m.$id} style={S.td}>
                            {v != null ? (
                              <span style={{ color: czm?.color || m.color || "#E2E8F0", fontWeight:600 }}>{v}</span>
                            ) : <span style={{ color:"#475569" }}>—</span>}
                          </td>
                        );
                      })}
                      <td style={{ ...S.td, color:"#64748B", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{log.notes || "—"}</td>
                      <td style={S.td}>
                        <button className="del-btn" onClick={() => handleDelete(log.$id)} style={{ background:"none", border:"none", cursor:"pointer", color:"#475569", fontSize:14, transition:"color .15s" }}>🗑</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ LOG FORM MODAL ══════════════════════════════════════════════════ */}
      {showLogForm && (
        <div style={S.overlay} onClick={() => setShowLogForm(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...S.chartTitle, marginBottom:24 }}>📝 Log New Reading</h2>

            <div style={S.formGrid}>
              <FormField label="Date" type="date" value={logForm.date} onChange={v => setLogForm({...logForm, date:v})} />
            </div>

            {/* Built-in metrics */}
            <SectionLabel>🩺 {bpLabel}</SectionLabel>
            <div style={S.formGrid}>
              <FormField label="Systolic (mmHg)" type="number" placeholder="e.g. 118" value={logForm.systolic} onChange={v => setLogForm({...logForm, systolic:v})} />
              <FormField label="Diastolic (mmHg)" type="number" placeholder="e.g. 76" value={logForm.diastolic} onChange={v => setLogForm({...logForm, diastolic:v})} />
            </div>

            <SectionLabel>⚖️ {weightLabel}</SectionLabel>
            <div style={{ marginBottom:16 }}>
              <FormField label="Weight (kg)" type="number" placeholder="e.g. 64.5" value={logForm.weight} onChange={v => setLogForm({...logForm, weight:v})} />
            </div>

            {/* Live BP preview */}
            {logForm.systolic && logForm.diastolic && (() => {
              const z = bpZone(parseInt(logForm.systolic), parseInt(logForm.diastolic));
              const zm = ZONE_META[z];
              return (
                <div style={{ ...S.bpPreview, background:zm.bg, border:`1px solid ${zm.border}`, marginBottom:16 }}>
                  <span style={{ color:zm.color, fontWeight:700 }}>{zm.label} — {logForm.systolic}/{logForm.diastolic} mmHg</span>
                  {z==="red"    && <span style={{ color:"#EF4444", fontSize:12 }}> · See your doctor immediately</span>}
                  {z==="orange" && <span style={{ color:"#F97316", fontSize:12 }}> · Discuss at next visit</span>}
                </div>
              );
            })()}

            {/* Custom metrics */}
            {metrics.length > 0 && (
              <>
                <SectionLabel>📊 Custom Metrics</SectionLabel>
                <div style={S.formGrid}>
                  {metrics.map(m => (
                    <FormField
                      key={m.$id}
                      label={`${m.name}${m.unit ? ` (${m.unit})` : ""}`}
                      type="number"
                      placeholder={m.baseline ? `Baseline: ${m.baseline}` : "Enter value"}
                      value={logForm.customValues[m.$id] || ""}
                      onChange={v => setLogForm({ ...logForm, customValues:{ ...logForm.customValues, [m.$id]: v } })}
                    />
                  ))}
                </div>
              </>
            )}

            <SectionLabel>📝 Notes</SectionLabel>
            <div style={{ marginBottom:16 }}>
              <FormField placeholder="e.g. after rest, at clinic..." value={logForm.notes} onChange={v => setLogForm({...logForm, notes:v})} />
            </div>

            <div style={{ display:"flex", gap:12, marginTop:8 }}>
              <button style={S.saveBtn} onClick={handleLogSubmit} disabled={saving}>{saving ? "Saving…" : "💾 Save Reading"}</button>
              <button style={S.cancelBtn} onClick={() => setShowLogForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ METRIC FORM MODAL ═══════════════════════════════════════════════ */}
      {showMetricForm && (
        <div style={S.overlay} onClick={() => setShowMetricForm(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ ...S.chartTitle, marginBottom:6 }}>
              {editingMetric ? "✏️ Edit Metric" : "➕ Create Custom Metric"}
            </h2>
            <p style={{ color:"#64748B", fontSize:13, marginBottom:24 }}>
              Define your own health metric with a name, unit, and baseline for personalised chart visualisation.
            </p>

            <div style={S.formGrid}>
              <div style={{ gridColumn:"1/-1" }}>
                <FormField label="Metric Name *" placeholder="e.g. Blood Sugar, Fetal Kicks, Mood Score" value={metricForm.name} onChange={v => setMetricForm({...metricForm, name:v})} />
              </div>
              <FormField label="Unit" placeholder="e.g. mg/dL, bpm, kicks/hr, °C" value={metricForm.unit} onChange={v => setMetricForm({...metricForm, unit:v})} />
              <FormField label="Baseline value" type="number" placeholder="Your personal baseline" value={metricForm.baseline} onChange={v => setMetricForm({...metricForm, baseline:v})} />
              <FormField label="Range Low (alert below)" type="number" placeholder="Optional" value={metricForm.rangeLow} onChange={v => setMetricForm({...metricForm, rangeLow:v})} />
              <FormField label="Range High (alert above)" type="number" placeholder="Optional" value={metricForm.rangeHigh} onChange={v => setMetricForm({...metricForm, rangeHigh:v})} />
            </div>

            {/* Colour picker */}
            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", color:"#94A3B8", fontSize:12, fontWeight:600, marginBottom:8 }}>Chart Colour</label>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                {PALETTE.map(c => (
                  <button key={c} onClick={() => setMetricForm({...metricForm, color:c})} style={{ width:28, height:28, borderRadius:"50%", background:c, border: metricForm.color===c ? "3px solid #fff" : "3px solid transparent", cursor:"pointer", transition:"border .15s" }} />
                ))}
              </div>
            </div>

            {/* Baseline preview */}
            {metricForm.baseline && (
              <div style={{ background:"#1E293B", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#94A3B8" }}>
                Baseline: <strong style={{ color: metricForm.color || "#A78BFA" }}>{metricForm.baseline} {metricForm.unit}</strong>
                {metricForm.rangeLow && metricForm.rangeHigh && (
                  <> · Healthy range: <strong style={{ color:"#22C55E" }}>{metricForm.rangeLow}–{metricForm.rangeHigh} {metricForm.unit}</strong></>
                )}
              </div>
            )}

            <div style={{ display:"flex", gap:12 }}>
              <button style={S.saveBtn} onClick={handleMetricSubmit} disabled={saving || !metricForm.name}>{saving ? "Saving…" : editingMetric ? "💾 Update Metric" : "💾 Create Metric"}</button>
              <button style={S.cancelBtn} onClick={() => { setShowMetricForm(false); setEditingMetric(null); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ LABEL EDIT MODAL ════════════════════════════════════════════════ */}
      {editingLabel && (
        <LabelEditModal
          current={editingLabel === "bp" ? bpLabel : weightLabel}
          onSave={v => { editingLabel === "bp" ? setBpLabel(v) : setWeightLabel(v); setEditingLabel(null); }}
          onClose={() => setEditingLabel(null)}
        />
      )}
    </div>
  );

  async function handleDelete(id) {
    if (!window.confirm("Delete this log entry?")) return;
    await deleteLog(id);
    load();
  }
}

/* ─── Charts ─────────────────────────────────────────────────────────────── */
function BPChart({ data }) {
  return (
    <div style={{ height:320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top:10, right:30, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="date" stroke="#475569" tick={{ fill:"#64748B", fontSize:11 }} />
          <YAxis domain={[50,180]} stroke="#475569" tick={{ fill:"#64748B", fontSize:11 }} />
          <Tooltip content={<ChartTip />} />
          <Legend wrapperStyle={{ color:"#94A3B8", fontSize:12 }} />
          <ReferenceArea y1={160} y2={180} fill="#EF4444" fillOpacity={0.1} />
          <ReferenceArea y1={140} y2={160} fill="#F97316" fillOpacity={0.1} />
          <ReferenceArea y1={120} y2={140} fill="#EAB308" fillOpacity={0.07} />
          <ReferenceArea y1={50}  y2={120} fill="#22C55E" fillOpacity={0.05} />
          <ReferenceLine y={140} stroke="#F97316" strokeDasharray="4 2" label={{ value:"140", fill:"#F97316", fontSize:10 }} />
          <ReferenceLine y={90}  stroke="#EAB308" strokeDasharray="4 2" />
          <Line type="monotone" dataKey="systolic"  name="Systolic"  stroke="#F87171" strokeWidth={2.5} dot={{ r:4, fill:"#F87171" }} activeDot={{ r:6 }} connectNulls />
          <Line type="monotone" dataKey="diastolic" name="Diastolic" stroke="#60A5FA" strokeWidth={2.5} dot={{ r:4, fill:"#60A5FA" }} activeDot={{ r:6 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function WeightChart({ data, weightGained, trimester }) {
  const wData   = data.filter(d => d.weight != null);
  const ranges  = { 1:[0.5,2], 2:[4,8], 3:[8,13] };
  const [lo,hi] = ranges[Math.min(3, Math.max(1, trimester))];
  const firstW  = wData[0]?.weight || 60;
  return (
    <div style={{ height:320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={wData} margin={{ top:10, right:30, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="date" stroke="#475569" tick={{ fill:"#64748B", fontSize:11 }} />
          <YAxis stroke="#475569" tick={{ fill:"#64748B", fontSize:11 }} />
          <Tooltip content={<ChartTip />} />
          <ReferenceArea y1={firstW+lo} y2={firstW+hi} fill="#22C55E" fillOpacity={0.1} />
          <ReferenceLine y={firstW+hi} stroke="#F97316" strokeDasharray="4 2" label={{ value:`+${hi}kg`, fill:"#F97316", fontSize:10 }} />
          <ReferenceLine y={firstW+lo} stroke="#EAB308" strokeDasharray="4 2" label={{ value:`+${lo}kg`, fill:"#EAB308", fontSize:10 }} />
          <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#A78BFA" strokeWidth={3} dot={{ r:5, fill:"#A78BFA" }} activeDot={{ r:7 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      {weightGained !== null && (
        <div style={{ textAlign:"center", color:"#94A3B8", fontSize:12, marginTop:8 }}>
          Total gain: <strong style={{ color:"#A78BFA" }}>+{weightGained} kg</strong> · Recommended for trimester {Math.min(3,Math.max(1,trimester))}: <strong style={{ color:"#22C55E" }}>+{lo}–{hi} kg</strong>
        </div>
      )}
    </div>
  );
}

function CustomMetricChart({ data, metric }) {
  const key    = `metric_${metric.$id}`;
  const color  = metric.color || "#A78BFA";
  const cData  = data.filter(d => d[key] != null);
  const vals   = cData.map(d => d[key]);
  const minV   = Math.min(...vals);
  const maxV   = Math.max(...vals);
  const pad    = (maxV - minV) * 0.2 || 1;
  const domLo  = Math.floor(minV - pad);
  const domHi  = Math.ceil(maxV + pad);

  return (
    <div style={{ height:320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={cData} margin={{ top:10, right:30, left:0, bottom:0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
          <XAxis dataKey="date" stroke="#475569" tick={{ fill:"#64748B", fontSize:11 }} />
          <YAxis domain={[domLo, domHi]} stroke="#475569" tick={{ fill:"#64748B", fontSize:11 }} />
          <Tooltip content={<ChartTip />} />

          {/* Healthy range band */}
          {metric.rangeLow != null && metric.rangeHigh != null && (
            <ReferenceArea y1={metric.rangeLow} y2={metric.rangeHigh} fill="#22C55E" fillOpacity={0.1}
              label={{ value:"Healthy range", fill:"#22C55E", fontSize:10, position:"insideTopRight" }} />
          )}
          {metric.rangeHigh != null && (
            <ReferenceLine y={metric.rangeHigh} stroke="#F97316" strokeDasharray="4 2"
              label={{ value:`High: ${metric.rangeHigh}`, fill:"#F97316", fontSize:10 }} />
          )}
          {metric.rangeLow != null && (
            <ReferenceLine y={metric.rangeLow} stroke="#EAB308" strokeDasharray="4 2"
              label={{ value:`Low: ${metric.rangeLow}`, fill:"#EAB308", fontSize:10 }} />
          )}
          {/* Baseline */}
          {metric.baseline != null && (
            <ReferenceLine y={metric.baseline} stroke={color} strokeDasharray="6 3"
              label={{ value:`Baseline: ${metric.baseline}`, fill:color, fontSize:10 }} />
          )}

          <Line type="monotone" dataKey={key} name={`${metric.name}${metric.unit ? ` (${metric.unit})` : ""}`}
            stroke={color} strokeWidth={3} dot={{ r:5, fill:color }} activeDot={{ r:7 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
      <div style={{ textAlign:"center", color:"#94A3B8", fontSize:12, marginTop:8 }}>
        {metric.baseline != null && <>Baseline: <strong style={{ color }}>{metric.baseline} {metric.unit}</strong></>}
        {metric.rangeLow != null && metric.rangeHigh != null && <> · Healthy range: <strong style={{ color:"#22C55E" }}>{metric.rangeLow}–{metric.rangeHigh} {metric.unit}</strong></>}
      </div>
    </div>
  );
}

/* ─── Label Edit Modal ───────────────────────────────────────────────────── */
function LabelEditModal({ current, onSave, onClose }) {
  const [val, setVal] = useState(current);
  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={{ ...S.modal, width:"min(360px,90vw)" }} onClick={e => e.stopPropagation()}>
        <h2 style={{ ...S.chartTitle, marginBottom:16 }}>✏️ Rename Metric</h2>
        <FormField label="Display Name" value={val} onChange={setVal} />
        <div style={{ display:"flex", gap:10, marginTop:20 }}>
          <button style={S.saveBtn} onClick={() => onSave(val)}>Save</button>
          <button style={S.cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function SummaryCard({ icon, label, value, sub, zone, color, onEdit }) {
  const zm = zone ? ZONE_META[zone] : null;
  return (
    <div style={{ ...S.card, borderTop:`3px solid ${zm?.color || color || "#334155"}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ fontSize:26 }}>{icon}</div>
        {onEdit && (
          <button onClick={onEdit} style={{ background:"none", border:"none", cursor:"pointer", color:"#475569", fontSize:12, padding:0 }} title="Rename">✏️</button>
        )}
      </div>
      <div style={{ fontSize:11, color:"#64748B", fontWeight:600, letterSpacing:.5, textTransform:"uppercase", marginTop:6 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:800, color:zm?.color || color || "#E2E8F0", marginTop:4 }}>{value}</div>
      <div style={{ fontSize:12, color:"#475569", marginTop:4 }}>{sub}</div>
    </div>
  );
}

function FormField({ label, type="text", value, onChange, placeholder="" }) {
  return (
    <div>
      {label && <label style={{ display:"block", color:"#94A3B8", fontSize:12, fontWeight:600, marginBottom:6 }}>{label}</label>}
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ width:"100%", background:"#1E293B", border:"1px solid #334155", borderRadius:8, padding:"10px 14px", color:"#E2E8F0", fontSize:14, outline:"none", fontFamily:"'Sora',sans-serif" }} />
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ color:"#64748B", fontSize:11, fontWeight:700, letterSpacing:.8, textTransform:"uppercase", marginBottom:10, marginTop:4, borderBottom:"1px solid #1E293B", paddingBottom:6 }}>{children}</div>;
}

function Loader() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"50vh", gap:16, background:"#0A0F1E" }}>
      <div style={{ fontSize:40 }}>💓</div>
      <div style={{ color:"#64748B", fontFamily:"'Sora',sans-serif" }}>Loading health data…</div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const S = {
  root:          { fontFamily:"'Sora',sans-serif", background:"#0A0F1E", minHeight:"100vh", color:"#E2E8F0" },
  alertBanner:   { background:"#450A0A", borderBottom:"2px solid #EF4444", padding:"14px 24px", display:"flex", alignItems:"center", gap:12, color:"#FCA5A5", fontSize:14 },
  alertClose:    { background:"none", border:"none", color:"#FCA5A5", cursor:"pointer", fontSize:18, padding:0 },
  header:        { padding:"28px 24px 0", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:12 },
  title:         { fontFamily:"'Lora',serif", fontSize:32, fontWeight:700, margin:0, color:"#F1F5F9" },
  subtitle:      { color:"#64748B", fontSize:14, margin:"4px 0 0" },
  logBtn:        { background:"linear-gradient(135deg,#6366F1,#8B5CF6)", color:"#fff", border:"none", borderRadius:10, padding:"12px 22px", fontWeight:700, cursor:"pointer", fontSize:14, fontFamily:"'Sora',sans-serif" },
  secondaryBtn:  { background:"#1E293B", color:"#94A3B8", border:"1px solid #334155", borderRadius:10, padding:"12px 18px", fontWeight:600, cursor:"pointer", fontSize:14, fontFamily:"'Sora',sans-serif" },
  cards:         { display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:16, padding:"24px 24px 0" },
  card:          { background:"#0F172A", borderRadius:14, padding:"18px 16px", border:"1px solid #1E293B" },
  metricManagerCard: { margin:"20px 24px 0", background:"#0F172A", borderRadius:16, padding:"20px", border:"1px solid #1E293B" },
  chartCard:     { margin:"20px 24px 0", background:"#0F172A", borderRadius:16, padding:"24px", border:"1px solid #1E293B" },
  chartHeader:   { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 },
  chartTitle:    { fontFamily:"'Lora',serif", fontSize:18, fontWeight:600, color:"#F1F5F9", margin:0 },
  tab:           { padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, color:"#94A3B8", fontFamily:"'Sora',sans-serif", transition:"all .15s" },
  noData:        { textAlign:"center", padding:"40px 20px", color:"#475569" },
  historyCard:   { margin:"16px 24px 32px", background:"#0F172A", borderRadius:16, padding:"24px", border:"1px solid #1E293B" },
  table:         { width:"100%", borderCollapse:"collapse", fontSize:13 },
  th:            { padding:"10px 14px", textAlign:"left", color:"#64748B", fontWeight:600, fontSize:11, textTransform:"uppercase", letterSpacing:.5 },
  td:            { padding:"12px 14px", color:"#CBD5E1", verticalAlign:"middle" },
  zoneBadge:     { padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, whiteSpace:"nowrap" },
  overlay:       { position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" },
  modal:         { background:"#0F172A", border:"1px solid #334155", borderRadius:20, padding:"32px", width:"min(520px,90vw)", maxHeight:"90vh", overflowY:"auto", animation:"slideIn .2s ease" },
  formGrid:      { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 },
  bpPreview:     { borderRadius:10, padding:"10px 14px", fontSize:13 },
  saveBtn:       { background:"linear-gradient(135deg,#6366F1,#8B5CF6)", color:"#fff", border:"none", borderRadius:10, padding:"12px 28px", fontWeight:700, cursor:"pointer", fontFamily:"'Sora',sans-serif" },
  cancelBtn:     { background:"#1E293B", color:"#94A3B8", border:"1px solid #334155", borderRadius:10, padding:"12px 24px", cursor:"pointer", fontFamily:"'Sora',sans-serif" },
  iconBtn:       { background:"none", border:"none", cursor:"pointer", fontSize:14, padding:"2px 4px", opacity:.7, transition:"opacity .15s" },
};