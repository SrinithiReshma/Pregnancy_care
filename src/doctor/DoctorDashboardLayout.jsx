import { Link, Routes, Route, useLocation } from "react-router-dom";
import DoctorAppointments from "./DoctorAppointments";
import DoctorRegister from "./DoctorRegister";
import BabyDevelopmentAdmin from "../admin/BabyDevelopmentAdmin";
import DoctorHealthMonitor from "./DoctorHealthMonitor";
import DoctorRemindersPanel from "./DoctorRemindersPanel";
import DoctorProfile from "./DoctorProfile";
import { useState } from "react";

const NAV = [
  { to: "/doctor-dashboard/appointments", icon: "📋", label: "Appointments"          },
  { to: "/doctor-dashboard/baby-admin",   icon: "👶", label: "Baby Dev Admin"        },
  { to: "/doctor-dashboard/health",       icon: "📊", label: "Health Monitor"        },
  { to: "/doctor-dashboard/reminders",    icon: "🔔", label: "Patient Reminders"     },
  { to: "/doctor-dashboard/profile",      icon: "📄", label: "My Profile"            },
  { to: "/doctor-dashboard/register",     icon: "⚙️", label: "Account Settings"      },
];

export default function DoctorDashboardLayout() {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const activeLabel = NAV.find(n =>
    location.pathname.includes(n.to.split("/")[2])
  )?.label || "Dashboard";

  function logout() {
    if (window.confirm("Logout?")) {
      localStorage.removeItem("token");
      window.location.href = "/";
    }
  }

  return (
    <div style={S.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,500&family=Nunito:wght@300;400;600;700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:#1a3a4a;border-radius:3px;}
        @keyframes fadeIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        .nav-link:hover{ background:rgba(251,191,36,0.1) !important; color:#FBBF24 !important; }
        .nav-link:hover .nav-icon{ transform:scale(1.15); }
        .logout-btn:hover{ background:rgba(239,68,68,0.12) !important; color:#fca5a5 !important; }
        .home-card:hover{ background:rgba(251,191,36,0.09) !important; transform:translateY(-2px) !important; }
        @media(max-width:700px){
          .sidebar{ transform:translateX(-100%); transition:transform .25s ease; position:fixed!important; z-index:200; }
          .sidebar.open{ transform:translateX(0); }
          .overlay{ display:block!important; }
          .hamburger{ display:block!important; }
        }
      `}</style>

      {/* Mobile overlay */}
      <div className="overlay" onClick={() => setOpen(false)}
        style={{ display:"none", position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:199 }} />

      {/* ── Sidebar ── */}
      <aside className={`sidebar${open ? " open" : ""}`} style={S.sidebar}>

        {/* Logo */}
        <div style={S.logo}>
          <div style={S.logoIcon}>🩺</div>
          <div>
            <div style={S.logoName}>NurtureWell</div>
            <div style={S.logoSub}>Doctor Portal</div>
          </div>
        </div>

        <div style={S.divider} />

        <div style={S.navSection}>Navigation</div>

        <nav style={{ flex: 1 }}>
          {NAV.map(({ to, icon, label }) => {
            const seg    = to.split("/")[2];
            const active = location.pathname.includes(seg);
            return (
              <Link key={to} to={to} className="nav-link"
                onClick={() => setOpen(false)}
                style={{
                  ...S.navLink,
                  background: active ? "rgba(251,191,36,0.12)" : "transparent",
                  color:      active ? "#FBBF24" : "#94a3b8",
                  borderLeft: active ? "3px solid #FBBF24" : "3px solid transparent",
                  fontWeight: active ? 700 : 500,
                }}>
                <span className="nav-icon" style={{ fontSize: 17, transition: "transform .15s", flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: 13 }}>{label}</span>
                {active && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "#FBBF24" }} />}
              </Link>
            );
          })}
        </nav>

        <div style={S.divider} />

        {/* Logout */}
        <button className="logout-btn" onClick={logout} style={S.logoutBtn}>
          <span style={{ fontSize: 16 }}>🚪</span>
          <span style={{ fontSize: 13 }}>Logout</span>
        </button>

        <div style={{ fontSize: 10, color: "#1a3a4a", textAlign: "center", marginTop: 14 }}>
          NurtureWell v1.0
        </div>
      </aside>

      {/* ── Main ── */}
      <div style={S.main}>

        {/* Top bar */}
        <div style={S.topbar}>
          <button
            onClick={() => setOpen(v => !v)}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: "#FBBF24", padding: 0 }}
            className="hamburger"
          >☰</button>
          <style>{`.hamburger{display:none!important} @media(max-width:700px){.hamburger{display:block!important}}`}</style>

          <div style={S.breadcrumb}>
            <span style={{ color: "#334155" }}>Doctor</span>
            <span style={{ color: "#1a3a4a", margin: "0 6px" }}>›</span>
            <span style={{ color: "#FBBF24", fontWeight: 700 }}>{activeLabel}</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginLeft: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 20, padding: "4px 12px" }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#FBBF24" }} />
              <span style={{ fontSize: 11, color: "#fde68a", fontWeight: 600 }}>Doctor</span>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div style={S.content}>
          <Routes>
            <Route path="appointments" element={<DoctorAppointments />} />
            <Route path="register"     element={<DoctorRegister />} />
            <Route path="baby-admin"   element={<BabyDevelopmentAdmin />} />
            <Route path="health"       element={<DoctorHealthMonitor />} />
            <Route path="reminders"    element={<DoctorRemindersPanel />} />
            <Route path="profile"      element={<DoctorProfile />} />
            <Route path="*"            element={<DoctorHome />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

/* ── Doctor Home landing page ── */
function DoctorHome() {
  const cards = [
    { to: "/doctor-dashboard/appointments", icon: "📋", label: "Appointments",      sub: "View & manage bookings",       color: "#FBBF24" },
    { to: "/doctor-dashboard/health",       icon: "📊", label: "Health Monitor",    sub: "Track patient BP & weight",    color: "#34D399" },
    { to: "/doctor-dashboard/reminders",    icon: "🔔", label: "Patient Reminders", sub: "Send health nudges",           color: "#F472B6" },
    { to: "/doctor-dashboard/baby-admin",   icon: "👶", label: "Baby Dev Admin",    sub: "Manage week-by-week content",  color: "#60A5FA" },
    { to: "/doctor-dashboard/profile",      icon: "📄", label: "My Profile",        sub: "View your doctor profile",     color: "#A78BFA" },
    { to: "/doctor-dashboard/register",     icon: "⚙️", label: "Account Settings",  sub: "Update credentials",           color: "#7AE2CF" },
  ];

  return (
    <div style={{ padding: 28 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, color: "#fef9c3", margin: "0 0 6px" }}>
          Good morning, Doctor 👋
        </h1>
        <p style={{ color: "#78716c", fontSize: 14 }}>What would you like to manage today?</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
        {cards.map(c => (
          <Link key={c.to} to={c.to} style={{ textDecoration: "none" }}>
            <div
              className="home-card"
              style={{
                background: "rgba(251,191,36,0.04)",
                border: "1px solid rgba(251,191,36,0.1)",
                borderRadius: 16,
                padding: "22px 18px",
                cursor: "pointer",
                transition: "all .2s",
                borderTop: `3px solid ${c.color}`,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12 }}>{c.icon}</div>
              <div style={{ fontWeight: 800, color: "#fef9c3", fontSize: 15, marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 12, color: "#78716c" }}>{c.sub}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const S = {
  root:      { display: "flex", height: "100vh", fontFamily: "'Nunito',sans-serif", background: "#06202B", overflow: "hidden" },
  sidebar:   { width: 230, background: "linear-gradient(180deg,#06202B 0%,#082535 100%)", borderRight: "1px solid rgba(251,191,36,0.08)", display: "flex", flexDirection: "column", padding: "22px 14px 18px", flexShrink: 0, height: "100vh", overflowY: "auto" },
  logo:      { display: "flex", alignItems: "center", gap: 12, marginBottom: 22 },
  logoIcon:  { width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#B45309,#FBBF24)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 },
  logoName:  { fontFamily: "'Playfair Display',serif", fontSize: 16, color: "#fef9c3", fontWeight: 700, lineHeight: 1.2 },
  logoSub:   { fontSize: 10, color: "#334155", marginTop: 1 },
  divider:   { height: 1, background: "rgba(251,191,36,0.08)", margin: "10px 0" },
  navSection:{ fontSize: 10, color: "#1a3a4a", fontWeight: 700, textTransform: "uppercase", letterSpacing: .8, marginBottom: 8, paddingLeft: 12 },
  navLink:   { display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 9, textDecoration: "none", marginBottom: 3, transition: "all .15s" },
  logoutBtn: { display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 9, background: "transparent", border: "none", cursor: "pointer", color: "#475569", fontFamily: "'Nunito',sans-serif", width: "100%", marginTop: 4, transition: "all .15s" },
  main:      { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar:    { height: 52, background: "rgba(8,37,53,0.95)", borderBottom: "1px solid rgba(251,191,36,0.08)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 },
  breadcrumb:{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center" },
  content:   { flex: 1, overflowY: "auto", background: "#06202B" },
};