import React, { useState, useEffect, useRef } from "react";

// ── Clinical growth norms (WHO/INTERGROWTH-21 based) ─────────────────────────
// Each entry: { sizeCmMin, sizeCmMax, weightGMin, weightGMax }
const GROWTH_NORMS = {
  1:  { sizeCmMin: 0.0,  sizeCmMax: 0.2,   weightGMin: 0,    weightGMax: 1    },
  2:  { sizeCmMin: 0.1,  sizeCmMax: 0.3,   weightGMin: 0,    weightGMax: 1    },
  3:  { sizeCmMin: 0.5,  sizeCmMax: 1.5,   weightGMin: 0,    weightGMax: 1    },
  4:  { sizeCmMin: 1.5,  sizeCmMax: 3.0,   weightGMin: 0,    weightGMax: 1    },
  5:  { sizeCmMin: 2.0,  sizeCmMax: 5.0,   weightGMin: 0,    weightGMax: 1    },
  6:  { sizeCmMin: 4.0,  sizeCmMax: 8.0,   weightGMin: 0,    weightGMax: 2    },
  7:  { sizeCmMin: 7.0,  sizeCmMax: 13.0,  weightGMin: 0,    weightGMax: 2    },
  8:  { sizeCmMin: 12.0, sizeCmMax: 20.0,  weightGMin: 0.5,  weightGMax: 2    },
  9:  { sizeCmMin: 18.0, sizeCmMax: 28.0,  weightGMin: 1,    weightGMax: 3    },
  10: { sizeCmMin: 25.0, sizeCmMax: 38.0,  weightGMin: 2,    weightGMax: 6    },
  11: { sizeCmMin: 35.0, sizeCmMax: 48.0,  weightGMin: 5,    weightGMax: 10   },
  12: { sizeCmMin: 45.0, sizeCmMax: 60.0,  weightGMin: 10,   weightGMax: 18   },
  13: { sizeCmMin: 58.0, sizeCmMax: 75.0,  weightGMin: 18,   weightGMax: 30   },
  14: { sizeCmMin: 70.0, sizeCmMax: 90.0,  weightGMin: 35,   weightGMax: 52   },
  15: { sizeCmMin: 85.0, sizeCmMax: 105.0, weightGMin: 58,   weightGMax: 84   },
  16: { sizeCmMin: 100.0,sizeCmMax: 125.0, weightGMin: 85,   weightGMax: 115  },
  17: { sizeCmMin: 115.0,sizeCmMax: 145.0, weightGMin: 115,  weightGMax: 165  },
  18: { sizeCmMin: 125.0,sizeCmMax: 160.0, weightGMin: 158,  weightGMax: 222  },
  19: { sizeCmMin: 135.0,sizeCmMax: 170.0, weightGMin: 200,  weightGMax: 280  },
  20: { sizeCmMin: 145.0,sizeCmMax: 185.0, weightGMin: 255,  weightGMax: 345  },
  21: { sizeCmMin: 240.0,sizeCmMax: 295.0, weightGMin: 300,  weightGMax: 420  },
  22: { sizeCmMin: 250.0,sizeCmMax: 305.0, weightGMin: 360,  weightGMax: 500  },
  23: { sizeCmMin: 260.0,sizeCmMax: 315.0, weightGMin: 420,  weightGMax: 580  },
  24: { sizeCmMin: 270.0,sizeCmMax: 335.0, weightGMin: 500,  weightGMax: 700  },
  25: { sizeCmMin: 280.0,sizeCmMax: 345.0, weightGMin: 580,  weightGMax: 740  },
  26: { sizeCmMin: 290.0,sizeCmMax: 360.0, weightGMin: 660,  weightGMax: 860  },
  27: { sizeCmMin: 320.0,sizeCmMax: 400.0, weightGMin: 760,  weightGMax: 990  },
  28: { sizeCmMin: 335.0,sizeCmMax: 415.0, weightGMin: 880,  weightGMax: 1120 },
  29: { sizeCmMin: 345.0,sizeCmMax: 425.0, weightGMin: 1000, weightGMax: 1300 },
  30: { sizeCmMin: 360.0,sizeCmMax: 440.0, weightGMin: 1150, weightGMax: 1450 },
  31: { sizeCmMin: 370.0,sizeCmMax: 450.0, weightGMin: 1350, weightGMax: 1650 },
  32: { sizeCmMin: 380.0,sizeCmMax: 460.0, weightGMin: 1550, weightGMax: 1850 },
  33: { sizeCmMin: 390.0,sizeCmMax: 470.0, weightGMin: 1750, weightGMax: 2050 },
  34: { sizeCmMin: 400.0,sizeCmMax: 490.0, weightGMin: 1960, weightGMax: 2240 },
  35: { sizeCmMin: 415.0,sizeCmMax: 505.0, weightGMin: 2200, weightGMax: 2600 },
  36: { sizeCmMin: 425.0,sizeCmMax: 515.0, weightGMin: 2400, weightGMax: 2800 },
  37: { sizeCmMin: 435.0,sizeCmMax: 525.0, weightGMin: 2700, weightGMax: 3100 },
  38: { sizeCmMin: 445.0,sizeCmMax: 535.0, weightGMin: 2900, weightGMax: 3300 },
  39: { sizeCmMin: 455.0,sizeCmMax: 545.0, weightGMin: 3100, weightGMax: 3500 },
  40: { sizeCmMin: 460.0,sizeCmMax: 550.0, weightGMin: 3200, weightGMax: 3600 },
};

// Parse size string like "16mm", "2cm", "267mm", "36cm" → cm
function parseSizeToCm(sizeStr) {
  if (!sizeStr) return null;
  const s = String(sizeStr).toLowerCase().trim();
  const mmMatch  = s.match(/^([\d.]+)\s*mm$/);
  const cmMatch  = s.match(/^([\d.]+)\s*cm$/);
  const numMatch = s.match(/^([\d.]+)$/);
  if (mmMatch)  return parseFloat(mmMatch[1])  / 10;
  if (cmMatch)  return parseFloat(cmMatch[1]);
  if (numMatch) return parseFloat(numMatch[1]);
  return null;
}

// Parse weight string like "1g", "300g", "1kg", "1.15kg" → grams
function parseWeightToG(weightStr) {
  if (!weightStr) return null;
  const s = String(weightStr).toLowerCase().trim();
  if (s === "<1g" || s === "< 1g") return 0.5;
  const kgMatch  = s.match(/^([\d.]+)\s*kg$/);
  const gMatch   = s.match(/^([\d.]+)\s*g$/);
  const numMatch = s.match(/^([\d.]+)$/);
  if (kgMatch)  return parseFloat(kgMatch[1]) * 1000;
  if (gMatch)   return parseFloat(gMatch[1]);
  if (numMatch) return parseFloat(numMatch[1]);
  return null;
}

// ── Core assessment function ──────────────────────────────────────────────────
function assessBabySize(weekNum, sizeStr, weightStr) {
  const norm = GROWTH_NORMS[weekNum];
  if (!norm) return null;

  const sizeCm  = parseSizeToCm(sizeStr);
  const weightG = parseWeightToG(weightStr);

  let sizeStatus   = "normal"; // "low" | "normal" | "high"
  let weightStatus = "normal";
  let sizeDevPct   = 0;
  let weightDevPct = 0;

  if (sizeCm !== null) {
    const midSize = (norm.sizeCmMin + norm.sizeCmMax) / 2;
    sizeDevPct = ((sizeCm - midSize) / midSize) * 100;
    if (sizeCm < norm.sizeCmMin) sizeStatus = "low";
    else if (sizeCm > norm.sizeCmMax) sizeStatus = "high";
  }

  if (weightG !== null) {
    const midWeight = (norm.weightGMin + norm.weightGMax) / 2;
    weightDevPct = ((weightG - midWeight) / midWeight) * 100;
    if (weightG < norm.weightGMin) weightStatus = "low";
    else if (weightG > norm.weightGMax) weightStatus = "high";
  }

  const overallStatus =
    (sizeStatus === "low"    || weightStatus === "low")    ? "low"    :
    (sizeStatus === "high"   || weightStatus === "high")   ? "high"   :
    "normal";

  return { sizeStatus, weightStatus, overallStatus, sizeDevPct, weightDevPct, norm, sizeCm, weightG };
}

// ── Growth Feedback Card Component ───────────────────────────────────────────
function GrowthFeedbackCard({ weekNum, sizeStr, weightStr, trimesterColor }) {
  const result = assessBabySize(weekNum, sizeStr, weightStr);
  if (!result) return null;

  const { sizeStatus, weightStatus, overallStatus, sizeDevPct, weightDevPct, norm, sizeCm, weightG } = result;

  // Only show card if something is notable (abnormal OR just healthy confirmation)
  const statusConfig = {
    normal: {
      icon: "✅",
      label: "Healthy Growth",
      color: "#34d399",
      bg: "rgba(52,211,153,0.07)",
      border: "rgba(52,211,153,0.25)",
      glow: "rgba(52,211,153,0.15)",
      headline: "Baby's size is right on track!",
      subtext: "Your baby's measurements fall within the healthy range for this week. Keep up the great work, mama! 💚",
      urgency: "routine",
    },
    low: {
      icon: "⚠️",
      label: "Below Expected Range",
      color: "#fbbf24",
      bg: "rgba(251,191,36,0.07)",
      border: "rgba(251,191,36,0.3)",
      glow: "rgba(251,191,36,0.15)",
      headline: "Baby appears smaller than expected",
      subtext: "This can sometimes indicate a growth concern, but many babies are naturally smaller. Please discuss with your doctor at your next visit.",
      urgency: "advisory",
    },
    high: {
      icon: "📊",
      label: "Above Expected Range",
      color: "#60A5FA",
      bg: "rgba(96,165,250,0.07)",
      border: "rgba(96,165,250,0.3)",
      glow: "rgba(96,165,250,0.15)",
      headline: "Baby is measuring larger than average",
      subtext: "A larger baby can be normal, but may indicate gestational diabetes or other factors worth discussing with your healthcare provider.",
      urgency: "advisory",
    },
  };

  const cfg = statusConfig[overallStatus];

  // Build individual metric pills
  const metrics = [
    sizeCm !== null && {
      label: "Length",
      value: sizeCm < 1 ? `${(sizeCm * 10).toFixed(1)}mm` : `${sizeCm}cm`,
      status: sizeStatus,
      expected: norm.sizeCmMin < 1
        ? `${(norm.sizeCmMin * 10).toFixed(0)}–${(norm.sizeCmMax * 10).toFixed(0)}mm`
        : `${norm.sizeCmMin}–${norm.sizeCmMax}cm`,
      devPct: sizeDevPct,
    },
    weightG !== null && weightG > 0 && {
      label: "Weight",
      value: weightG >= 1000 ? `${(weightG / 1000).toFixed(2)}kg` : `${Math.round(weightG)}g`,
      status: weightStatus,
      expected: norm.weightGMax >= 1000
        ? `${(norm.weightGMin / 1000).toFixed(2)}–${(norm.weightGMax / 1000).toFixed(2)}kg`
        : `${norm.weightGMin}–${norm.weightGMax}g`,
      devPct: weightDevPct,
    },
  ].filter(Boolean);

  const metricStatusColor = (s) =>
    s === "normal" ? "#34d399" : s === "low" ? "#fbbf24" : "#60A5FA";

  // Gauge bar: position within range
  const gaugePercent = (val, min, max) => {
    if (val === null || val === undefined) return 50;
    const extended = (max - min) * 0.4; // show 20% padding on each side
    const lo = min - extended;
    const hi = max + extended;
    return Math.max(2, Math.min(98, ((val - lo) / (hi - lo)) * 100));
  };

  return (
    <div style={{
      borderRadius: 20,
      padding: "20px 22px",
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      boxShadow: `0 0 32px ${cfg.glow}`,
      marginBottom: 16,
      animation: "slideIn 0.4s ease",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Decorative background glow */}
      <div style={{
        position: "absolute", top: -30, right: -30,
        width: 120, height: 120, borderRadius: "50%",
        background: `radial-gradient(circle, ${cfg.glow}, transparent 70%)`,
        pointerEvents: "none",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 22 }}>{cfg.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              fontSize: 11, fontWeight: 800, textTransform: "uppercase",
              letterSpacing: 0.8, color: cfg.color,
              background: `${cfg.color}18`, borderRadius: 20,
              padding: "2px 10px", border: `1px solid ${cfg.color}33`,
            }}>
              {cfg.label}
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              Week {weekNum} reference
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 14, fontWeight: 700, color: "#fff" }}>
            {cfg.headline}
          </p>
        </div>
      </div>

      {/* Metric gauges */}
      {metrics.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          {metrics.map((m) => {
            const mc = metricStatusColor(m.status);
            const gp = m.label === "Length"
              ? gaugePercent(sizeCm,   norm.sizeCmMin,   norm.sizeCmMax)
              : gaugePercent(weightG,  norm.weightGMin,  norm.weightGMax);
            const devAbs = Math.abs(m.devPct);
            const devLabel = devAbs < 5 ? "on track" : m.devPct > 0 ? `+${devAbs.toFixed(0)}% above avg` : `${devAbs.toFixed(0)}% below avg`;

            return (
              <div key={m.label} style={{
                background: "rgba(255,255,255,0.04)",
                borderRadius: 14,
                padding: "12px 14px",
                border: `1px solid rgba(255,255,255,0.07)`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                      {m.label === "Length" ? "📏" : "⚖️"} {m.label}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: mc,
                      background: `${mc}18`, borderRadius: 20, padding: "1px 8px",
                    }}>
                      {m.status === "normal" ? "✓ Normal" : m.status === "low" ? "↓ Low" : "↑ High"}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: mc }}>{m.value}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginLeft: 6 }}>{devLabel}</span>
                  </div>
                </div>

                {/* Gauge bar */}
                <div style={{ position: "relative", height: 8, borderRadius: 4, background: "rgba(255,255,255,0.08)", overflow: "visible" }}>
                  {/* Normal range highlight */}
                  <div style={{
                    position: "absolute",
                    left: "20%", right: "20%",
                    top: 0, bottom: 0,
                    background: "rgba(52,211,153,0.15)",
                    borderRadius: 4,
                  }} />
                  {/* Range labels */}
                  <span style={{ position: "absolute", left: "20%", top: 11, fontSize: 9, color: "rgba(255,255,255,0.25)", transform: "translateX(-50%)" }}>min</span>
                  <span style={{ position: "absolute", left: "80%", top: 11, fontSize: 9, color: "rgba(255,255,255,0.25)", transform: "translateX(-50%)" }}>max</span>
                  {/* Marker */}
                  <div style={{
                    position: "absolute",
                    left: `${gp}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 14, height: 14,
                    borderRadius: "50%",
                    background: mc,
                    boxShadow: `0 0 8px ${mc}`,
                    border: "2px solid rgba(255,255,255,0.5)",
                    zIndex: 2,
                  }} />
                </div>
                <p style={{ margin: "18px 0 0", fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                  Expected range: {m.expected}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Advisory text */}
      <p style={{
        margin: 0, fontSize: 13, color: "rgba(255,255,255,0.65)", lineHeight: 1.6,
        borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10,
      }}>
        {cfg.subtext}
      </p>

      {/* CTA for abnormal */}
      {overallStatus !== "normal" && (
        <div style={{
          marginTop: 12, display: "flex", alignItems: "center", gap: 10,
          background: "rgba(255,255,255,0.04)", borderRadius: 12,
          padding: "10px 14px", border: "1px solid rgba(255,255,255,0.07)",
        }}>
          <span style={{ fontSize: 18 }}>👩‍⚕️</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
            <strong style={{ color: cfg.color }}>Recommended: </strong>
            Mention this at your next prenatal checkup. Your doctor can perform an ultrasound to get accurate measurements.
          </span>
        </div>
      )}
    </div>
  );
}

// ── Fallback seed data ────────────────────────────────────────────────────────
const SEED_DATA = [
  { week: 1,  fruit: "Poppy Seed",    emoji: "🌱", size: "0.1mm",  weight: "<1g",    color: "#FFB5C8", milestones: ["Fertilization occurs", "Cell division begins", "Implantation starts"], tip: "Start taking 400mcg folic acid daily to prevent neural tube defects.", tipIcon: "💊" },
  { week: 2,  fruit: "Sesame Seed",   emoji: "🌿", size: "0.2mm",  weight: "<1g",    color: "#FFCBA4", milestones: ["Blastocyst forms", "Implantation completes", "Placenta starts forming"], tip: "Stay hydrated — aim for 8-10 glasses of water daily.", tipIcon: "💧" },
  { week: 3,  fruit: "Poppy Seed",    emoji: "🌾", size: "0.9mm",  weight: "<1g",    color: "#FFF0A0", milestones: ["Neural tube begins forming", "Heart cells appear", "Three layers of cells develop"], tip: "Avoid alcohol completely — no safe amount exists during pregnancy.", tipIcon: "🚫" },
  { week: 4,  fruit: "Apple Seed",    emoji: "🍏", size: "2mm",    weight: "<1g",    color: "#B5EFB5", milestones: ["Heart begins beating", "Brain & spinal cord forming", "Arm & leg buds appear"], tip: "Schedule your first prenatal appointment this week.", tipIcon: "🏥" },
  { week: 5,  fruit: "Sesame Seed",   emoji: "🫘", size: "4mm",    weight: "<1g",    color: "#C8E6FF", milestones: ["Facial features start forming", "Stomach & liver developing", "Umbilical cord functioning"], tip: "Ginger tea or crackers can help ease morning sickness.", tipIcon: "🫚" },
  { week: 6,  fruit: "Lentil",        emoji: "🟤", size: "6mm",    weight: "<1g",    color: "#E8C5FF", milestones: ["Eyes & ears forming", "Nose begins to appear", "Fingers & toes budding"], tip: "Eat small, frequent meals to manage nausea throughout the day.", tipIcon: "🍽️" },
  { week: 7,  fruit: "Blueberry",     emoji: "🫐", size: "10mm",   weight: "<1g",    color: "#8B7EC8", milestones: ["Brain grows rapidly", "Eyelid folds forming", "Tongue appears"], tip: "Avoid soft cheeses, raw fish, and deli meats during pregnancy.", tipIcon: "🥗" },
  { week: 8,  fruit: "Raspberry",     emoji: "🍇", size: "16mm",   weight: "1g",     color: "#FF6B8A", milestones: ["All major organs present", "Baby begins moving", "Fingers distinct"], tip: "Prenatal yoga can reduce stress and improve sleep quality.", tipIcon: "🧘" },
  { week: 9,  fruit: "Cherry",        emoji: "🍒", size: "23mm",   weight: "2g",     color: "#FF4D6D", milestones: ["Eyelids almost cover eyes", "External genitalia forming", "Muscles developing"], tip: "Iron-rich foods like spinach and lentils prevent anemia.", tipIcon: "🥬" },
  { week: 10, fruit: "Strawberry",    emoji: "🍓", size: "31mm",   weight: "4g",     color: "#FF6B6B", milestones: ["Baby officially a fetus", "Vital organs functional", "Webbing between fingers gone"], tip: "This is often when nausea starts to ease — enjoy nutritious foods.", tipIcon: "🌟" },
  { week: 11, fruit: "Lime",          emoji: "🍋", size: "41mm",   weight: "7g",     color: "#BAED91", milestones: ["Baby can open & close fists", "Tooth buds appearing", "Breathing movements begin"], tip: "Calcium is crucial now — add dairy or fortified plant milk daily.", tipIcon: "🥛" },
  { week: 12, fruit: "Plum",          emoji: "🫐", size: "53mm",   weight: "14g",    color: "#9B59B6", milestones: ["Reflexes developing", "Fingernails forming", "Risk of miscarriage drops significantly"], tip: "Celebrate end of 1st trimester! Gentle walks are great exercise.", tipIcon: "🎉" },
  { week: 13, fruit: "Peach",         emoji: "🍑", size: "65mm",   weight: "23g",    color: "#FFAD86", milestones: ["Fingerprints forming", "Vocal cords developing", "Intestines moving into belly"], tip: "Omega-3 fatty acids support brain development — try walnuts & flaxseed.", tipIcon: "🧠" },
  { week: 14, fruit: "Lemon",         emoji: "🍋", size: "80mm",   weight: "43g",    color: "#FFF176", milestones: ["Baby can squint & grimace", "Kidneys producing urine", "Thyroid gland working"], tip: "Energy often returns in the 2nd trimester — enjoy light exercise!", tipIcon: "⚡" },
  { week: 15, fruit: "Apple",         emoji: "🍎", size: "93mm",   weight: "70g",    color: "#FF5252", milestones: ["Bones hardening", "Baby hiccups!", "Skin is very thin and translucent"], tip: "Sleep on your left side to improve blood flow to baby.", tipIcon: "😴" },
  { week: 16, fruit: "Avocado",       emoji: "🥑", size: "116mm",  weight: "100g",   color: "#558B2F", milestones: ["Baby can HEAR your voice!", "Eyes moving side to side", "Legs now longer than arms"], tip: "Talk and sing to your baby — they can hear you from now on!", tipIcon: "🎵" },
  { week: 17, fruit: "Pear",          emoji: "🍐", size: "130mm",  weight: "140g",   color: "#AED581", milestones: ["Fat deposits forming", "Sweat glands developing", "Baby practices swallowing"], tip: "Vitamin D supports bone development — safe sun exposure is beneficial.", tipIcon: "☀️" },
  { week: 18, fruit: "Sweet Potato",  emoji: "🍠", size: "142mm",  weight: "190g",   color: "#FF8A65", milestones: ["You may feel first kicks!", "Nervous system maturing", "Ears fully formed"], tip: "Track your baby's movements — first kicks are a special milestone!", tipIcon: "👶" },
  { week: 19, fruit: "Mango",         emoji: "🥭", size: "152mm",  weight: "240g",   color: "#FFD54F", milestones: ["Vernix covers skin", "Sensory development accelerates", "Brain designates areas for senses"], tip: "Your anatomy scan is coming up soon!", tipIcon: "🔬" },
  { week: 20, fruit: "Banana",        emoji: "🍌", size: "160mm",  weight: "300g",   color: "#FFEE58", milestones: ["HALFWAY THERE! 🎉", "Kicks now more regular", "Hair beginning to grow"], tip: "Halfway milestone! Treat yourself to a prenatal massage.", tipIcon: "💆" },
  { week: 21, fruit: "Carrot",        emoji: "🥕", size: "267mm",  weight: "360g",   color: "#FF7043", milestones: ["Eyebrows & eyelids fully formed", "Baby can taste amniotic fluid", "Movements become stronger"], tip: "Fiber-rich foods prevent constipation.", tipIcon: "🥕" },
  { week: 22, fruit: "Spaghetti Squash", emoji: "🎃", size: "277mm", weight: "430g", color: "#FFB300", milestones: ["Lips becoming more distinct", "Baby looks like a newborn now", "Pancreas developing"], tip: "Pelvic floor exercises (Kegels) help prepare for labor.", tipIcon: "💪" },
  { week: 23, fruit: "Eggplant",      emoji: "🍆", size: "286mm",  weight: "501g",   color: "#7B1FA2", milestones: ["Ears fully hear outside sounds", "Lungs developing rapidly", "Skin wrinkled due to no fat yet"], tip: "Swimming is ideal as it relieves joint pressure.", tipIcon: "🏊" },
  { week: 24, fruit: "Corn",          emoji: "🌽", size: "300mm",  weight: "600g",   color: "#FDD835", milestones: ["Viability milestone reached", "Taste buds working", "Brain developing rapidly"], tip: "Get tested for gestational diabetes around now.", tipIcon: "🩸" },
  { week: 25, fruit: "Cauliflower",   emoji: "🥦", size: "313mm",  weight: "660g",   color: "#F5F5F5", milestones: ["Baby responds to touch", "Nostrils opening", "Spine forming joints & rings"], tip: "Increase protein intake — eggs, legumes, and lean meat are great.", tipIcon: "🥚" },
  { week: 26, fruit: "Scallion",      emoji: "🧅", size: "325mm",  weight: "760g",   color: "#DCEDC8", milestones: ["Eyes begin to open", "Brain wave activity starts", "Inhales & exhales amniotic fluid"], tip: "Practice breathing exercises — they'll help during labor.", tipIcon: "🌬️" },
  { week: 27, fruit: "Cauliflower",   emoji: "🥦", size: "36cm",   weight: "875g",   color: "#A5D6A7", milestones: ["Can recognize your voice clearly", "Sleep cycles established", "Brain tissue developing grooves"], tip: "Welcome to the 3rd trimester! Start planning your birth plan.", tipIcon: "📋" },
  { week: 28, fruit: "Eggplant",      emoji: "🍆", size: "37cm",   weight: "1kg",    color: "#CE93D8", milestones: ["Eyes open and close", "REM sleep & dreaming possible", "Fat stores increasing"], tip: "Kick counts: feel at least 10 movements every 2 hours.", tipIcon: "👟" },
  { week: 29, fruit: "Butternut Squash", emoji: "🎃", size: "38cm", weight: "1.15kg", color: "#FFCC80", milestones: ["Muscles & lungs maturing", "Head growing bigger for brain", "Immune system building"], tip: "Reduce sodium to prevent water retention and swelling.", tipIcon: "🧂" },
  { week: 30, fruit: "Cabbage",       emoji: "🥬", size: "40cm",   weight: "1.3kg",  color: "#80CBC4", milestones: ["Baby turns head-down (ideally)", "Bone marrow making red blood cells", "Toenails growing"], tip: "Prepare your hospital bag — include essentials for you and baby.", tipIcon: "🎒" },
  { week: 31, fruit: "Coconut",       emoji: "🥥", size: "41cm",   weight: "1.5kg",  color: "#D7CCC8", milestones: ["All 5 senses working", "Rapid weight gain begins", "Processes information & learns"], tip: "Heartburn is common now — eat small meals and avoid spicy foods.", tipIcon: "🔥" },
  { week: 32, fruit: "Jicama",        emoji: "🧅", size: "42cm",   weight: "1.7kg",  color: "#FFF8E1", milestones: ["Bones fully formed (still soft)", "Practicing breathing movements", "Skin becomes less wrinkled"], tip: "Attend childbirth education classes to feel prepared.", tipIcon: "📚" },
  { week: 33, fruit: "Pineapple",     emoji: "🍍", size: "43cm",   weight: "1.9kg",  color: "#FFD700", milestones: ["Skull bones not yet fused", "Immune system boosted", "Amniotic fluid at maximum"], tip: "Practice relaxation techniques — meditation apps can help.", tipIcon: "🧘" },
  { week: 34, fruit: "Cantaloupe",    emoji: "🍈", size: "45cm",   weight: "2.1kg",  color: "#FFE082", milestones: ["CNS & lungs almost mature", "Recognizes your voice & familiar songs", "Eyes adjust to light"], tip: "Rest as much as possible — fatigue is normal.", tipIcon: "😴" },
  { week: 35, fruit: "Coconut",       emoji: "🥥", size: "46cm",   weight: "2.4kg",  color: "#BCAAA4", milestones: ["Kidneys fully developed", "Liver can process waste", "Most babies head-down now"], tip: "Perineal massage can help reduce tearing during birth.", tipIcon: "✋" },
  { week: 36, fruit: "Romaine Lettuce", emoji: "🥬", size: "47cm", weight: "2.6kg",  color: "#C8E6C9", milestones: ["Baby considered 'early term'", "Baby 'drops' into pelvis", "Skull bones remain flexible"], tip: "Watch for signs of labor: contractions, water breaking, or discharge.", tipIcon: "🚨" },
  { week: 37, fruit: "Bunch of Chard", emoji: "🌿", size: "48cm",  weight: "2.9kg",  color: "#A5D6A7", milestones: ["Full term begins!", "Practicing sucking & breathing", "Fat accumulating quickly"], tip: "Colostrum (first milk) may start leaking — wear breast pads.", tipIcon: "🍼" },
  { week: 38, fruit: "Leek",          emoji: "🧅", size: "49cm",   weight: "3.1kg",  color: "#DCEDC8", milestones: ["Meconium forms in intestines", "Lungs producing surfactant", "Fine hair (lanugo) disappearing"], tip: "Stay near your support person — labor can begin any time.", tipIcon: "❤️" },
  { week: 39, fruit: "Mini Watermelon", emoji: "🍉", size: "50cm", weight: "3.3kg",  color: "#EF9A9A", milestones: ["Brain continues developing rapidly", "Antibodies transferred to baby", "Outer layers of skin shedding"], tip: "Pack snacks and entertainment for your hospital stay.", tipIcon: "🎭" },
  { week: 40, fruit: "Watermelon",    emoji: "🍉", size: "51cm",   weight: "3.4kg",  color: "#F48FB1", milestones: ["Fully developed!", "Ready to meet you! 🎉", "Final surges of antibody transfer"], tip: "Your baby is ready! Trust your body and your birth team. You've got this! 💪", tipIcon: "🌟" },
];

const TRIMESTERS = [
  { label: "1st Trimester", weeks: [1, 12],  color: "#FF8FAB", bg: "rgba(255,143,171,0.15)", icon: "🌱" },
  { label: "2nd Trimester", weeks: [13, 26], color: "#74C69D", bg: "rgba(116,198,157,0.15)", icon: "🌿" },
  { label: "3rd Trimester", weeks: [27, 40], color: "#9B8EC4", bg: "rgba(155,142,196,0.15)", icon: "🌸" },
];

function getTrimester(week) {
  if (week <= 12) return 0;
  if (week <= 26) return 1;
  return 2;
}

const API = "http://localhost:5000";
const hdrs = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function resolveWeekData(weekNum, dbWeeks) {
  const seed = SEED_DATA[weekNum - 1];
  const dbDoc = dbWeeks.find((w) => Number(w.week) === weekNum);
  if (!dbDoc) return seed;
  return {
    week:    weekNum,
    fruit:   dbDoc.fruit           || seed.fruit,
    emoji:   dbDoc.fruitEmoji      || seed.emoji,
    size:    dbDoc.sizeCm          ? `${dbDoc.sizeCm}cm` : seed.size,
    weight:  dbDoc.weightGrams     ? `${dbDoc.weightGrams}g` : seed.weight,
    color:   seed.color,
    milestones: dbDoc.milestone
      ? dbDoc.milestone.split(". ").filter(Boolean)
      : seed.milestones,
    tip:     dbDoc.healthTip       || seed.tip,
    tipIcon: seed.tipIcon,
    funFact: dbDoc.funFact         || null,
    system:  dbDoc.systemDeveloping || null,
    source:  "db",
  };
}

function LoadingScreen() {
  return (
    <div style={styles.root}>
      <div style={styles.blob1} /><div style={styles.blob2} /><div style={styles.blob3} />
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"70vh", gap:20 }}>
        <div style={{ fontSize:64, animation:"floatAnim 2s ease-in-out infinite" }}>🤰</div>
        <div style={{ color:"rgba(255,255,255,0.6)", fontFamily:"'Nunito',sans-serif", fontSize:16 }}>Loading your baby's journey...</div>
        <div style={{ display:"flex", gap:8 }}>
          {[0,0.2,0.4].map((d,i) => (
            <div key={i} style={{ width:10, height:10, borderRadius:"50%", background:"#FF8FAB", animation:`blink 1.2s ${d}s infinite ease-in-out` }} />
          ))}
        </div>
      </div>
      <style>{`@keyframes floatAnim{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}} @keyframes blink{0%,80%,100%{opacity:0.2}40%{opacity:1}}`}</style>
    </div>
  );
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div style={styles.root}>
      <div style={styles.blob1} /><div style={styles.blob2} />
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"70vh", gap:16, textAlign:"center", padding:"0 24px" }}>
        <div style={{ fontSize:56 }}>⚠️</div>
        <h2 style={{ color:"#FF8FAB", fontFamily:"'Nunito',sans-serif", margin:0 }}>Couldn't load data</h2>
        <p style={{ color:"rgba(255,255,255,0.5)", fontSize:14, maxWidth:320 }}>{message}</p>
        <button onClick={onRetry} style={{ background:"#FF8FAB", border:"none", borderRadius:12, padding:"12px 28px", color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:"'Nunito',sans-serif", fontSize:14 }}>
          Try Again
        </button>
      </div>
    </div>
  );
}

export default function BabyDashboard() {
  const [currentWeek,  setCurrentWeek]  = useState(null);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [dbWeeks,      setDbWeeks]      = useState([]);
  const [profile,      setProfile]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [animating,    setAnimating]    = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const timelineRef = useRef(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [profRes, weeksRes] = await Promise.all([
        fetch(`${API}/pregnancy-profile`, { headers: hdrs() }),
        fetch(`${API}/baby-development`,  { headers: hdrs() }),
      ]);
      if (!profRes.ok) throw new Error("Could not load pregnancy profile. Please complete your profile first.");
      const profData = await profRes.json();
      const prof     = profData.profile || profData;
      const wk       = Math.max(1, Math.min(40, Number(prof?.pregnancyWeek) || 1));
      let weeks = [];
      if (weeksRes.ok) {
        const weeksData = await weeksRes.json();
        weeks = weeksData.weeks || [];
      }
      setProfile(prof);
      setDbWeeks(weeks);
      setCurrentWeek(wk);
      setSelectedWeek(wk);
      if (wk === 20 || wk === 40) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const handleWeekClick = (w) => {
    if (w > currentWeek) return;
    setAnimating(true);
    setSelectedWeek(w);
    setTimeout(() => setAnimating(false), 400);
    if (w === 20 || w === 40) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    setTimeout(() => {
      const el = document.getElementById(`week-dot-${w}`);
      if (el) el.scrollIntoView({ behavior:"smooth", block:"nearest", inline:"center" });
    }, 50);
  };

  if (loading) return <LoadingScreen />;
  if (error)   return <ErrorScreen message={error} onRetry={loadData} />;

  const weekData     = resolveWeekData(selectedWeek, dbWeeks);
  const trimesterIdx = getTrimester(selectedWeek);
  const trimester    = TRIMESTERS[trimesterIdx];
  const progress     = Math.round((selectedWeek / 40) * 100);
  const isLocked     = selectedWeek > currentWeek;
  const dueDate      = profile?.expectedDueDate
    ? new Date(profile.expectedDueDate).toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" })
    : null;
  const weeksLeft    = Math.max(0, 40 - currentWeek);

  return (
    <div style={styles.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; }
        @keyframes floatAnim { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes pulse { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.18);opacity:0.2} }
        @keyframes slideIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }
        .week-dot-btn:hover { transform: scale(1.15) !important; opacity: 1 !important; }
        .nav-btn:hover { background: rgba(255,255,255,0.15) !important; }
        .trim-tab:hover { opacity: 0.85; }
        .timeline-scroll::-webkit-scrollbar { width: 5px; }
        .timeline-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 4px; }
        .timeline-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
        .timeline-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.35); }
      `}</style>

      <div style={styles.blob1} />
      <div style={styles.blob2} />
      <div style={styles.blob3} />
      {showConfetti && <Confetti />}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerEmoji}>🤰</span>
          <div>
            <h1 style={styles.headerTitle}>Baby's Journey</h1>
            <p style={styles.headerSub}>
              {dueDate ? `Due ${dueDate} · ` : ""}
              {weeksLeft > 0 ? `${weeksLeft} weeks to go` : "Due any day!"}
            </p>
          </div>
        </div>
        <div style={styles.weekBadge}>
          <span style={styles.weekBadgeNum}>Week {currentWeek}</span>
          <span style={styles.weekBadgeSub}>
            {profile?.pregnancyMonth ? `Month ${profile.pregnancyMonth}` : "Current week"}
          </span>
        </div>
      </header>

      {/* Progress Bar */}
      <div style={styles.progressSection}>
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>Pregnancy Progress</span>
          <span style={styles.progressPercent}>{Math.round((currentWeek / 40) * 100)}% complete</span>
        </div>
        <div style={styles.progressTrack}>
          {TRIMESTERS.map((tri, i) => (
            <div key={i} style={{
              ...styles.progressSegment,
              background: i <= getTrimester(currentWeek)
                ? `linear-gradient(90deg, ${tri.color}cc, ${tri.color})`
                : "rgba(255,255,255,0.1)",
              width: i === 0 ? "30%" : i === 1 ? "35%" : "35%",
            }}>
              <span style={styles.progressSegLabel}>{tri.icon} {tri.label}</span>
            </div>
          ))}
          <div style={{ ...styles.progressThumb, left:`calc(${(currentWeek / 40) * 100}% - 12px)` }}>
            <span style={{ fontSize:16 }}>👶</span>
          </div>
        </div>
        <div style={styles.progressWeekLabels}>
          {[1,10,20,30,40].map(w => (
            <span key={w} style={styles.progressWeekLabel}>W{w}</span>
          ))}
        </div>
      </div>

      {/* Trimester Tabs */}
      <div style={styles.trimesterTabs}>
        {TRIMESTERS.map((tri, i) => (
          <button key={i} className="trim-tab" onClick={() => handleWeekClick(Math.min(tri.weeks[0], currentWeek))} style={{
            ...styles.trimTab,
            background: trimesterIdx === i ? tri.color : "rgba(255,255,255,0.08)",
            color: trimesterIdx === i ? "#fff" : "rgba(255,255,255,0.5)",
            transform: trimesterIdx === i ? "scale(1.05)" : "scale(1)",
            border: trimesterIdx === i ? "none" : "1px solid rgba(255,255,255,0.1)",
          }}>
            {tri.icon} {tri.label}
            <span style={styles.trimTabSub}>Wks {tri.weeks[0]}–{tri.weeks[1]}</span>
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div style={styles.mainGrid}>

        {/* Left: Hero Card */}
        <div style={{ ...styles.heroCard, opacity:animating ? 0 : 1, transform:animating ? "translateY(10px)" : "translateY(0)", transition:"all 0.4s ease" }}>
          {isLocked ? (
            <LockedCard week={selectedWeek} currentWeek={currentWeek} trimester={trimester} />
          ) : (
            <>
              {/* Fruit visual */}
              <div style={styles.fruitBubble}>
                <div style={{ ...styles.fruitCircle, background:`radial-gradient(circle at 35% 35%, ${weekData.color}ff, ${weekData.color}88)`, boxShadow:`0 20px 60px ${weekData.color}66` }}>
                  <span style={styles.fruitEmoji}>{weekData.emoji}</span>
                </div>
                <div style={styles.fruitPulse} />
              </div>

              {/* Week info */}
              <div style={styles.heroInfo}>
                <div style={styles.weekTag}>
                  <span style={{ color:trimester.color }}>Week {selectedWeek}</span>
                  <span style={styles.weekTagDot}>•</span>
                  <span style={styles.weekTagTri}>{trimester.icon} {trimester.label}</span>
                  {weekData.source === "db" && (
                    <span style={{ fontSize:10, background:"rgba(116,198,157,0.2)", color:"#74C69D", borderRadius:20, padding:"2px 8px", fontWeight:700 }}>
                      ✓ from your records
                    </span>
                  )}
                </div>
                <h2 style={styles.fruitName}>Size of a {weekData.fruit}</h2>
                <div style={styles.sizeRow}>
                  <div style={styles.sizeChip}>
                    <span style={styles.sizeIcon}>📏</span>
                    <div><p style={styles.sizeVal}>{weekData.size}</p><p style={styles.sizeKey}>Length</p></div>
                  </div>
                  <div style={styles.sizeChip}>
                    <span style={styles.sizeIcon}>⚖️</span>
                    <div><p style={styles.sizeVal}>{weekData.weight}</p><p style={styles.sizeKey}>Weight</p></div>
                  </div>
                  <div style={styles.sizeChip}>
                    <span style={styles.sizeIcon}>📅</span>
                    <div><p style={styles.sizeVal}>{progress}%</p><p style={styles.sizeKey}>Complete</p></div>
                  </div>
                </div>
              </div>

              {/* ── GROWTH FEEDBACK CARD (new feature) ── */}
              <GrowthFeedbackCard
                weekNum={selectedWeek}
                sizeStr={weekData.size}
                weightStr={weekData.weight}
                trimesterColor={trimester.color}
              />

              {/* System Developing */}
              {weekData.system && (
                <div style={{ ...styles.milestonesCard, marginBottom:12, borderLeft:`3px solid ${trimester.color}` }}>
                  <h3 style={{ ...styles.sectionTitle, marginBottom:6 }}>🔬 Developing Now</h3>
                  <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.75)", lineHeight:1.6 }}>{weekData.system}</p>
                </div>
              )}

              {/* Milestones */}
              <div style={styles.milestonesCard}>
                <h3 style={styles.sectionTitle}>✨ This Week's Milestones</h3>
                <div style={styles.milestonesList}>
                  {weekData.milestones.map((m, i) => (
                    <div key={i} style={{ ...styles.milestoneItem, animationDelay:`${i * 100}ms` }}>
                      <div style={{ ...styles.milestoneDot, background:trimester.color }} />
                      <span style={styles.milestoneText}>{m}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Health Tip */}
              <div style={{ ...styles.tipCard, borderColor:trimester.color }}>
                <div style={styles.tipHeader}>
                  <span style={styles.tipIcon}>{weekData.tipIcon}</span>
                  <span style={styles.tipTitle}>Mama's Health Tip</span>
                </div>
                <p style={styles.tipText}>{weekData.tip}</p>
              </div>

              {/* Fun Fact */}
              {weekData.funFact && (
                <div style={{ ...styles.tipCard, marginTop:12, borderColor:"#FFD700", background:"rgba(255,215,0,0.05)" }}>
                  <div style={styles.tipHeader}>
                    <span style={styles.tipIcon}>✨</span>
                    <span style={styles.tipTitle}>Did You Know?</span>
                  </div>
                  <p style={{ ...styles.tipText, fontStyle:"italic" }}>"{weekData.funFact}"</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Timeline */}
        <div style={styles.timelinePanel}>
          <h3 style={styles.timelinePanelTitle}>All 40 Weeks</h3>
          <div style={styles.timelineScroll} className="timeline-scroll" ref={timelineRef}>
            {SEED_DATA.map((s, i) => {
              const wNum       = i + 1;
              const locked     = wNum > currentWeek;
              const isSelected = wNum === selectedWeek;
              const isCurrent  = wNum === currentWeek;
              const tri        = TRIMESTERS[getTrimester(wNum)];
              const hasDbData  = dbWeeks.some(d => Number(d.week) === wNum);
              const resolved   = resolveWeekData(wNum, dbWeeks);
              const showLabel  = wNum === 1 || wNum === 13 || wNum === 27;
              const triLabelIdx = wNum === 1 ? 0 : wNum === 13 ? 1 : 2;

              // Growth status dot indicator for timeline
              const assessment = !locked ? assessBabySize(wNum, resolved.size, resolved.weight) : null;
              const dotIndicatorColor =
                !assessment ? null :
                assessment.overallStatus === "low"  ? "#fbbf24" :
                assessment.overallStatus === "high" ? "#60A5FA" : null;

              return (
                <React.Fragment key={wNum}>
                  {showLabel && (
                    <div style={{ gridColumn:"1 / -1", padding:"8px 2px 4px", fontSize:10, fontWeight:800, color:TRIMESTERS[triLabelIdx].color, textTransform:"uppercase", letterSpacing:1, borderTop:wNum > 1 ? "1px solid rgba(255,255,255,0.08)" : "none", marginTop:wNum > 1 ? 4 : 0 }}>
                      {TRIMESTERS[triLabelIdx].icon} {TRIMESTERS[triLabelIdx].label} · Wks {TRIMESTERS[triLabelIdx].weeks[0]}–{TRIMESTERS[triLabelIdx].weeks[1]}
                    </div>
                  )}
                  <button
                    id={`week-dot-${wNum}`}
                    className="week-dot-btn"
                    onClick={() => handleWeekClick(wNum)}
                    title={locked ? `🔒 Week ${wNum}` : `Week ${wNum}: ${resolved.fruit}`}
                    style={{
                      ...styles.weekDot,
                      background: isSelected ? tri.color : locked ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.1)",
                      border: isCurrent ? `2px solid ${tri.color}` : isSelected ? "2px solid transparent" : hasDbData ? `1px solid ${tri.color}55` : "1px solid rgba(255,255,255,0.07)",
                      opacity: locked ? 0.35 : 1,
                      transform: isSelected ? "scale(1.1)" : "scale(1)",
                      boxShadow: isSelected ? `0 4px 20px ${tri.color}66` : isCurrent ? `0 0 0 3px ${tri.color}33` : "none",
                      cursor: locked ? "not-allowed" : "pointer",
                    }}
                  >
                    <span style={{ fontSize:22, lineHeight:1 }}>{locked ? "🔒" : resolved.emoji}</span>
                    <span style={{ fontSize:11, fontWeight:isSelected ? 800 : 600, color:isSelected ? "#fff" : isCurrent ? tri.color : "rgba(255,255,255,0.65)", marginTop:2 }}>
                      W{wNum}
                    </span>
                    {isCurrent && <div style={{ ...styles.currentDot, background:tri.color }} />}
                    {/* Growth alert dot on timeline */}
                    {dotIndicatorColor && (
                      <div style={{
                        position:"absolute", bottom:4, right:4,
                        width:7, height:7, borderRadius:"50%",
                        background:dotIndicatorColor,
                        boxShadow:`0 0 6px ${dotIndicatorColor}`,
                        border:"1px solid rgba(255,255,255,0.4)",
                      }} title="Growth outside normal range" />
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {/* Legend */}
          <div style={styles.legend}>
            {TRIMESTERS.map((t, i) => (
              <div key={i} style={styles.legendItem}>
                <div style={{ ...styles.legendDot, background:t.color }} />
                <span style={styles.legendText}>{t.icon} {t.label}</span>
              </div>
            ))}
            <div style={styles.legendItem}>
              <span style={{ fontSize:11 }}>🔒</span>
              <span style={styles.legendText}>Future weeks</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background:"none", border:"1px solid #74C69D44", borderRadius:"50%" }} />
              <span style={styles.legendText}>In your records</span>
            </div>
            <div style={styles.legendItem}>
              <div style={{ ...styles.legendDot, background:"#fbbf24" }} />
              <span style={styles.legendText}>Growth outside range</span>
            </div>
          </div>

          {/* Profile summary */}
          {profile && (
            <div style={styles.profileSummary}>
              <div style={styles.profileSummaryTitle}>Your Pregnancy</div>
              <div style={styles.profileSummaryRow}><span>📅 LMP</span><span>{profile.LMP || "—"}</span></div>
              <div style={styles.profileSummaryRow}><span>🏁 Due Date</span><span>{dueDate || "—"}</span></div>
              <div style={styles.profileSummaryRow}><span>🤱 First pregnancy?</span><span>{profile.firstPregnancy ? "Yes 🌟" : "No"}</span></div>
              {profile.existingConditions && profile.existingConditions !== "None" && (
                <div style={styles.profileSummaryRow}><span>💊 Conditions</span><span style={{ color:"#FFD54F" }}>{profile.existingConditions}</span></div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div style={styles.navRow}>
        <button className="nav-btn" style={{ ...styles.navBtn, opacity:selectedWeek <= 1 ? 0.3 : 1 }}
          onClick={() => selectedWeek > 1 && handleWeekClick(selectedWeek - 1)}
          disabled={selectedWeek <= 1}>
          ← Previous Week
        </button>
        <div style={styles.navCenter}>
          <span style={styles.navEmoji}>{weekData?.emoji}</span>
          <span style={styles.navWeekText}>Week {selectedWeek} of 40</span>
        </div>
        <button className="nav-btn" style={{ ...styles.navBtn, opacity:(selectedWeek >= 40 || selectedWeek >= currentWeek) ? 0.3 : 1 }}
          onClick={() => selectedWeek < currentWeek && handleWeekClick(selectedWeek + 1)}
          disabled={selectedWeek >= 40 || selectedWeek >= currentWeek}>
          Next Week →
        </button>
      </div>
    </div>
  );
}

function LockedCard({ week, currentWeek, trimester }) {
  const weeksLeft = week - currentWeek;
  return (
    <div style={styles.lockedCard}>
      <div style={styles.lockedIcon}>🔒</div>
      <h2 style={styles.lockedTitle}>Week {week} is Coming!</h2>
      <p style={styles.lockedSub}>
        Only <strong style={{ color:trimester.color }}>{weeksLeft} more week{weeksLeft !== 1 ? "s" : ""}</strong> until this chapter unlocks
      </p>
      <div style={styles.lockedHint}>
        <span>🌟</span>
        <span>Keep going, mama — every week is a milestone!</span>
      </div>
      <div style={styles.lockedProgress}>
        <div style={{ ...styles.lockedProgressFill, width:`${Math.min(100,(currentWeek/week)*100).toFixed(0)}%`, background:trimester.color }} />
      </div>
      <p style={styles.lockedProgressText}>{Math.min(100,((currentWeek/week)*100).toFixed(0))}% of the way to Week {week}</p>
    </div>
  );
}

function Confetti() {
  const colors = ["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#FF6FC8"];
  return (
    <div style={styles.confettiContainer}>
      {Array.from({ length:30 }, (_,i) => (
        <div key={i} style={{
          position:"absolute", left:`${Math.random()*100}%`, top:"-10px",
          width:`${6+Math.random()*8}px`, height:`${6+Math.random()*8}px`,
          background:colors[i%colors.length],
          borderRadius:Math.random()>0.5?"50%":"2px",
          animation:`fall ${1.5+Math.random()*2}s linear forwards`,
          animationDelay:`${Math.random()*0.8}s`,
        }} />
      ))}
      <style>{`@keyframes fall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>
    </div>
  );
}

const styles = {
  root: { minHeight:"100vh", background:"linear-gradient(135deg, #0F0B2A 0%, #1A1040 40%, #0D1B2A 100%)", fontFamily:"'Nunito', 'Segoe UI', sans-serif", color:"#fff", padding:"20px", position:"relative", overflow:"hidden" },
  blob1: { position:"fixed", top:"-100px", right:"-100px", width:"400px", height:"400px", borderRadius:"50%", background:"radial-gradient(circle, rgba(255,100,170,0.15), transparent 70%)", pointerEvents:"none" },
  blob2: { position:"fixed", bottom:"-80px", left:"-80px", width:"350px", height:"350px", borderRadius:"50%", background:"radial-gradient(circle, rgba(100,180,255,0.12), transparent 70%)", pointerEvents:"none" },
  blob3: { position:"fixed", top:"50%", left:"50%", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle, rgba(155,142,196,0.08), transparent 70%)", transform:"translate(-50%,-50%)", pointerEvents:"none" },
  confettiContainer: { position:"fixed", top:0, left:0, width:"100%", height:"100%", pointerEvents:"none", zIndex:100 },
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24, flexWrap:"wrap", gap:12 },
  headerLeft: { display:"flex", alignItems:"center", gap:14 },
  headerEmoji: { fontSize:48, filter:"drop-shadow(0 4px 12px rgba(255,143,171,0.4))" },
  headerTitle: { margin:0, fontSize:28, fontWeight:800, background:"linear-gradient(135deg, #FF8FAB, #FFA8C5)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
  headerSub: { margin:0, fontSize:13, color:"rgba(255,255,255,0.5)", marginTop:2 },
  weekBadge: { background:"rgba(255,143,171,0.15)", border:"1px solid rgba(255,143,171,0.3)", borderRadius:16, padding:"10px 20px", textAlign:"center" },
  weekBadgeNum: { display:"block", fontSize:20, fontWeight:800, color:"#FF8FAB" },
  weekBadgeSub: { display:"block", fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:2 },
  progressSection: { marginBottom:24 },
  progressHeader: { display:"flex", justifyContent:"space-between", marginBottom:8 },
  progressLabel: { fontSize:13, color:"rgba(255,255,255,0.6)", fontWeight:600 },
  progressPercent: { fontSize:13, color:"#FF8FAB", fontWeight:700 },
  progressTrack: { display:"flex", height:36, borderRadius:18, overflow:"hidden", position:"relative", background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.1)" },
  progressSegment: { display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.5s ease" },
  progressSegLabel: { fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.85)", whiteSpace:"nowrap" },
  progressThumb: { position:"absolute", bottom:2, width:28, height:28, background:"rgba(255,255,255,0.15)", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid rgba(255,255,255,0.3)", transition:"left 0.5s ease", backdropFilter:"blur(4px)" },
  progressWeekLabels: { display:"flex", justifyContent:"space-between", marginTop:6 },
  progressWeekLabel: { fontSize:11, color:"rgba(255,255,255,0.35)", fontWeight:600 },
  trimesterTabs: { display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" },
  trimTab: { flex:1, minWidth:100, padding:"10px 16px", borderRadius:14, cursor:"pointer", fontWeight:700, fontSize:13, display:"flex", flexDirection:"column", alignItems:"center", gap:2, transition:"all 0.3s ease", fontFamily:"inherit" },
  trimTabSub: { fontSize:11, fontWeight:400, opacity:0.8 },
  mainGrid: { display:"grid", gridTemplateColumns:"1fr 320px", gap:20, alignItems:"start" },
  heroCard: { background:"rgba(255,255,255,0.05)", backdropFilter:"blur(20px)", borderRadius:28, padding:28, border:"1px solid rgba(255,255,255,0.1)" },
  fruitBubble: { display:"flex", justifyContent:"center", marginBottom:20, position:"relative" },
  fruitCircle: { width:140, height:140, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", zIndex:1 },
  fruitEmoji: { fontSize:72, filter:"drop-shadow(0 8px 16px rgba(0,0,0,0.3))" },
  fruitPulse: { position:"absolute", width:160, height:160, borderRadius:"50%", background:"rgba(255,255,255,0.05)", animation:"pulse 2s infinite" },
  heroInfo: { textAlign:"center", marginBottom:20 },
  weekTag: { fontSize:13, fontWeight:600, marginBottom:6, display:"flex", justifyContent:"center", alignItems:"center", gap:8, flexWrap:"wrap" },
  weekTagDot: { color:"rgba(255,255,255,0.3)" },
  weekTagTri: { color:"rgba(255,255,255,0.6)" },
  fruitName: { margin:"0 0 16px", fontSize:24, fontWeight:800 },
  sizeRow: { display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap" },
  sizeChip: { display:"flex", alignItems:"center", gap:10, padding:"10px 16px", background:"rgba(255,255,255,0.08)", borderRadius:14, border:"1px solid rgba(255,255,255,0.1)" },
  sizeIcon: { fontSize:20 },
  sizeVal: { margin:0, fontWeight:800, fontSize:16 },
  sizeKey: { margin:0, fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:1 },
  milestonesCard: { background:"rgba(255,255,255,0.04)", borderRadius:20, padding:"18px 20px", marginBottom:16, border:"1px solid rgba(255,255,255,0.08)" },
  sectionTitle: { margin:"0 0 14px", fontSize:15, fontWeight:700, color:"rgba(255,255,255,0.9)" },
  milestonesList: { display:"flex", flexDirection:"column", gap:10 },
  milestoneItem: { display:"flex", alignItems:"flex-start", gap:12, animation:"slideIn 0.3s ease both" },
  milestoneDot: { width:8, height:8, borderRadius:"50%", marginTop:6, flexShrink:0 },
  milestoneText: { fontSize:14, color:"rgba(255,255,255,0.8)", lineHeight:1.5 },
  tipCard: { borderRadius:20, padding:"16px 20px", background:"rgba(255,255,255,0.04)", borderLeft:"4px solid" },
  tipHeader: { display:"flex", alignItems:"center", gap:8, marginBottom:8 },
  tipIcon: { fontSize:20 },
  tipTitle: { fontWeight:700, fontSize:14, color:"rgba(255,255,255,0.9)" },
  tipText: { margin:0, fontSize:13, color:"rgba(255,255,255,0.7)", lineHeight:1.6 },
  timelinePanel: { background:"rgba(255,255,255,0.04)", backdropFilter:"blur(10px)", borderRadius:24, padding:20, border:"1px solid rgba(255,255,255,0.1)", height:"80vh", display:"flex", flexDirection:"column" },
  timelinePanelTitle: { margin:"0 0 12px", fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.7)", flexShrink:0 },
  timelineScroll: { flex:1, overflowY:"auto", display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8, paddingRight:6, paddingBottom:8, alignContent:"start" },
  weekDot: { display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, padding:"12px 4px", borderRadius:14, border:"none", transition:"all 0.2s ease", position:"relative", fontFamily:"inherit", minHeight:68 },
  currentDot: { position:"absolute", top:3, right:3, width:6, height:6, borderRadius:"50%", border:"1px solid rgba(255,255,255,0.5)" },
  legend: { marginTop:12, display:"flex", flexDirection:"column", gap:5, borderTop:"1px solid rgba(255,255,255,0.08)", paddingTop:12 },
  legendItem: { display:"flex", alignItems:"center", gap:8 },
  legendDot: { width:10, height:10, borderRadius:"50%", flexShrink:0 },
  legendText: { fontSize:11, color:"rgba(255,255,255,0.45)" },
  profileSummary: { marginTop:12, background:"rgba(255,255,255,0.04)", borderRadius:14, padding:"14px 16px", border:"1px solid rgba(255,255,255,0.07)" },
  profileSummaryTitle: { fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.4)", textTransform:"uppercase", letterSpacing:0.5, marginBottom:10 },
  profileSummaryRow: { display:"flex", justifyContent:"space-between", fontSize:12, color:"rgba(255,255,255,0.6)", padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)", gap:8 },
  lockedCard: { textAlign:"center", padding:"40px 20px" },
  lockedIcon: { fontSize:56, marginBottom:16 },
  lockedTitle: { margin:"0 0 8px", fontSize:22, fontWeight:800 },
  lockedSub: { margin:"0 0 20px", fontSize:14, color:"rgba(255,255,255,0.6)", lineHeight:1.6 },
  lockedHint: { display:"flex", alignItems:"center", gap:10, justifyContent:"center", background:"rgba(255,255,255,0.06)", borderRadius:14, padding:"12px 20px", fontSize:13, color:"rgba(255,255,255,0.7)", marginBottom:20 },
  lockedProgress: { height:8, background:"rgba(255,255,255,0.1)", borderRadius:4, overflow:"hidden", marginBottom:8 },
  lockedProgressFill: { height:"100%", borderRadius:4, transition:"width 0.5s ease" },
  lockedProgressText: { margin:0, fontSize:12, color:"rgba(255,255,255,0.4)" },
  navRow: { display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:20, gap:16, flexWrap:"wrap" },
  navBtn: { background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", color:"#fff", borderRadius:14, padding:"12px 24px", cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"inherit", transition:"all 0.2s ease" },
  navCenter: { display:"flex", alignItems:"center", gap:10 },
  navEmoji: { fontSize:28 },
  navWeekText: { fontSize:14, fontWeight:700, color:"rgba(255,255,255,0.7)" },
};