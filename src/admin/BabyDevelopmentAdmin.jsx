import { useState, useEffect } from "react";
import { BABY_WEEKS_DATA } from "../data/babyDevelopmentData";

const API = "http://localhost:5000";
const auth = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...auth(), ...(opts.headers || {}) },
  });
  return res.json();
}

export default function BabyDevelopmentAdmin() {
  const [patients,      setPatients]      = useState([]);
  const [selectedPat,   setSelectedPat]   = useState(null);
  const [weeks,         setWeeks]         = useState([]);
  const [selectedWeek,  setSelectedWeek]  = useState(null);
  const [form,          setForm]          = useState({});
  const [loading,       setLoading]       = useState(false);
  const [seeding,       setSeeding]       = useState(false);
  const [msg,           setMsg]           = useState("");
  const [msgType,       setMsgType]       = useState("success");

  useEffect(() => { loadPatients(); }, []);

  const showMsg = (text, type = "success") => {
    setMsg(text); setMsgType(type);
    setTimeout(() => setMsg(""), 4000);
  };

  const loadPatients = async () => {
    setLoading(true);
    const data = await apiFetch("/patients-list");
    setPatients(data.patients || []);
    setLoading(false);
  };

  const loadWeeksForPatient = async (patient) => {
    setSelectedPat(patient);
    setSelectedWeek(null);
    setForm({});
    setLoading(true);
    const data = await apiFetch(`/baby-development?userId=${patient.userId}`);
    setWeeks(data.weeks || []);
    setLoading(false);
  };

  const seedForPatient = async () => {
    if (!selectedPat) return showMsg("Please select a patient first.", "error");
    setSeeding(true);
    showMsg("Seeding all 40 weeks...");
    const payload = BABY_WEEKS_DATA.map(w => ({ ...w }));
    const data = await apiFetch(`/baby-development/seed/${selectedPat.userId}`, {
      method: "POST",
      body: JSON.stringify({ weeks: payload }),
    });
    if (data.success) {
      showMsg(`✅ ${data.count} weeks seeded for ${selectedPat.userName}!`);
      loadWeeksForPatient(selectedPat);
    } else {
      showMsg("❌ Seed failed: " + (data.message || "unknown error"), "error");
    }
    setSeeding(false);
  };

  const editWeek = (weekNum) => {
    const stored = weeks.find(w => w.week === weekNum);
    const seed   = BABY_WEEKS_DATA[weekNum - 1];
    setSelectedWeek(weekNum);
    setForm(stored || { ...seed, userId: selectedPat?.userId });
  };

  const handleSave = async () => {
    if (!form.week || !selectedPat) return;
    setLoading(true);
    try {
      const stored = weeks.find(w => w.week === form.week);
      const payload = { ...form, userId: selectedPat.userId };
      if (stored?.$id) {
        await apiFetch(`/baby-development/${stored.$id}`, { method: "PUT", body: JSON.stringify(payload) });
        showMsg(`✅ Week ${form.week} updated for ${selectedPat.userName}`);
      } else {
        await apiFetch("/baby-development", { method: "POST", body: JSON.stringify(payload) });
        showMsg(`✅ Week ${form.week} created for ${selectedPat.userName}`);
      }
      loadWeeksForPatient(selectedPat);
      setSelectedWeek(null);
      setForm({});
    } catch (e) {
      showMsg("❌ Error saving.", "error");
    }
    setLoading(false);
  };

  const trimColor = (t) => ({ 1: "#FFE0D0", 2: "#D0F0E8", 3: "#D0E0FF" }[t] || "#F5F5F5");

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-thumb { background:#ccc; border-radius:3px; }
        button:hover { filter: brightness(0.92); }
      `}</style>

      <div style={S.header}>
        <div>
          <h1 style={S.title}>👶 Baby Development Admin</h1>
          <p style={S.sub}>Manage week-by-week baby data per patient</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {selectedPat && (
            <button style={S.seedBtn} onClick={seedForPatient} disabled={seeding}>
              {seeding ? "⏳ Seeding..." : `🌱 Seed All 40 Weeks → ${selectedPat.userName}`}
            </button>
          )}
          <button style={S.addBtn} onClick={() => {
            if (!selectedPat) return showMsg("Select a patient first!", "error");
            setSelectedWeek("new"); setForm({ userId: selectedPat.userId });
          }}>+ Add Week</button>
        </div>
      </div>

      {msg && (
        <div style={{ ...S.msgBox, background: msgType === "error" ? "#FFF0F0" : "#F0FFF4", borderColor: msgType === "error" ? "#E74C3C" : "#2ECC71", color: msgType === "error" ? "#C0392B" : "#1A5C2A" }}>
          {msg}
        </div>
      )}

      <div style={S.layout}>
        {/* Column 1: Patients */}
        <div style={{ ...S.col, width: 240, borderRight: "1px solid #EEE" }}>
          <div style={S.colHead}>👩‍🍼 Patients ({patients.length})</div>
          {loading && !patients.length ? <div style={S.empty}>Loading...</div>
            : patients.length === 0 ? <div style={S.empty}>No patients found</div>
            : (
              <div style={S.list}>
                {patients.map(p => (
                  <div key={p.$id} style={{ ...S.patRow, background: selectedPat?.userId === p.userId ? "#06202B" : "#fff", color: selectedPat?.userId === p.userId ? "#7AE2CF" : "#222" }} onClick={() => loadWeeksForPatient(p)}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.userName || "Unknown"}</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{p.userEmail}</div>
                    <div style={{ fontSize: 11, marginTop: 2 }}>Week {p.pregnancyWeek} · Month {p.pregnancyMonth}</div>
                  </div>
                ))}
              </div>
            )}
        </div>

        {/* Column 2: Weeks */}
        <div style={{ ...S.col, width: 300, borderRight: "1px solid #EEE" }}>
          <div style={S.colHead}>{selectedPat ? `📅 Weeks — ${selectedPat.userName}` : "📅 Select a patient"}</div>
          {!selectedPat ? <div style={S.empty}>← Choose a patient</div> : (
            <>
              <div style={{ padding: "8px 12px", display: "flex", gap: 8 }}>
                <div style={S.badge2}>✅ {weeks.length} saved</div>
                {weeks.length < 40 && <div style={{ ...S.badge2, background: "#FFF0F0", color: "#C0392B" }}>⚠️ {40 - weeks.length} missing</div>}
              </div>
              <div style={S.list}>
                {Array.from({ length: 40 }, (_, i) => i + 1).map(wk => {
                  const stored = weeks.find(w => w.week === wk);
                  const seed = BABY_WEEKS_DATA[wk - 1];
                  const isAct = selectedWeek === wk;
                  return (
                    <div key={wk} style={{ ...S.weekRow, background: isAct ? "#06202B" : trimColor(seed.trimester), borderLeft: `4px solid ${isAct ? "#7AE2CF" : stored ? "#2ECC71" : "#E74C3C"}`, cursor: "pointer" }} onClick={() => editWeek(wk)}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{seed.fruitEmoji}</span>
                        <span style={{ fontWeight: 700, color: isAct ? "#7AE2CF" : "#333", fontSize: 13 }}>Week {wk} — {seed.fruit}</span>
                      </div>
                      <span style={{ ...S.badge2, background: stored ? "#D4EDDA" : "#F8D7DA", color: stored ? "#155724" : "#721C24", fontSize: 10 }}>
                        {stored ? "✓ Saved" : "Not saved"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Column 3: Form */}
        <div style={{ ...S.col, flex: 1 }}>
          <div style={S.colHead}>✏️ {selectedWeek ? `Edit Week ${selectedWeek === "new" ? "(New)" : selectedWeek}` : "Week Details"}</div>
          {selectedWeek !== null ? (
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
              {selectedPat && <div style={S.patBadge}>👩 Editing for: <strong>{selectedPat.userName}</strong> · Currently at Week {selectedPat.pregnancyWeek}</div>}
              <div style={S.grid2}>
                <Field label="Week Number" type="number" value={form.week || ""} onChange={v => setForm({ ...form, week: parseInt(v) })} />
                <Field label="Trimester (1/2/3)" type="number" value={form.trimester || ""} onChange={v => setForm({ ...form, trimester: parseInt(v) })} />
                <Field label="Fruit Name" value={form.fruit || ""} onChange={v => setForm({ ...form, fruit: v })} />
                <Field label="Fruit Emoji" value={form.fruitEmoji || ""} onChange={v => setForm({ ...form, fruitEmoji: v })} />
                <Field label="Size (cm)" type="number" value={form.sizeCm || ""} onChange={v => setForm({ ...form, sizeCm: parseFloat(v) })} />
                <Field label="Weight (grams)" type="number" value={form.weightGrams || ""} onChange={v => setForm({ ...form, weightGrams: parseFloat(v) })} />
                <Field label="System Developing" value={form.systemDeveloping || ""} onChange={v => setForm({ ...form, systemDeveloping: v })} />
              </div>
              <TextArea label="Key Milestone" value={form.milestone || ""} onChange={v => setForm({ ...form, milestone: v })} />
              <TextArea label="Weekly Health Tip" value={form.healthTip || ""} onChange={v => setForm({ ...form, healthTip: v })} />
              <TextArea label="Fun Fact" value={form.funFact || ""} onChange={v => setForm({ ...form, funFact: v })} />
              <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                <button style={S.saveBtn} onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "💾 Save Week"}</button>
                <button style={S.cancelBtn} onClick={() => { setSelectedWeek(null); setForm({}); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ ...S.empty, paddingTop: 60 }}>
              <div style={{ fontSize: 48 }}>✍️</div>
              <p>Select a week from the list to edit it</p>
              <p style={{ fontSize: 12, color: "#aaa" }}>Or use "Seed All 40 Weeks" to populate all at once</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.label}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={S.input} />
    </div>
  );
}
function TextArea({ label, value, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.label}>{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} rows={3} style={{ ...S.input, resize: "vertical", lineHeight: 1.6 }} />
    </div>
  );
}

const S = {
  root: { fontFamily: "'DM Sans', sans-serif", background: "#F0F4F8", minHeight: "100vh", display: "flex", flexDirection: "column" },
  header: { background: "#06202B", padding: "20px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 },
  title: { fontFamily: "'Playfair Display', serif", color: "#7AE2CF", margin: 0, fontSize: 24 },
  sub: { color: "#aaa", margin: "3px 0 0", fontSize: 13 },
  seedBtn: { background: "#1A7A6E", color: "white", border: "none", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", fontSize: 13 },
  addBtn: { background: "#7AE2CF", color: "#06202B", border: "none", padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: "'DM Sans', sans-serif" },
  msgBox: { padding: "12px 24px", borderLeft: "4px solid", fontSize: 14, fontWeight: 500 },
  layout: { display: "flex", flex: 1, overflow: "hidden", height: "calc(100vh - 72px)" },
  col: { display: "flex", flexDirection: "column", overflow: "hidden", background: "#fff" },
  colHead: { padding: "14px 16px", fontWeight: 700, fontSize: 13, borderBottom: "1px solid #EEE", background: "#FAFAFA", color: "#444", flexShrink: 0 },
  list: { flex: 1, overflowY: "auto", padding: "8px" },
  empty: { padding: 20, color: "#aaa", fontSize: 13, textAlign: "center" },
  patRow: { padding: "10px 12px", borderRadius: 8, marginBottom: 6, cursor: "pointer", border: "1px solid #EEE", transition: "all 0.15s" },
  weekRow: { padding: "8px 10px", borderRadius: 8, marginBottom: 5 },
  badge2: { display: "inline-block", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: "#E8F5E9", color: "#155724" },
  patBadge: { background: "#E8F5FF", border: "1px solid #AED6F1", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#1A5276", marginBottom: 20 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5 },
  input: { width: "100%", padding: "9px 12px", borderRadius: 7, border: "1px solid #DDD", fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: "none" },
  saveBtn: { background: "#06202B", color: "#7AE2CF", border: "none", padding: "11px 26px", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" },
  cancelBtn: { background: "#eee", color: "#555", border: "none", padding: "11px 22px", borderRadius: 8, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
};