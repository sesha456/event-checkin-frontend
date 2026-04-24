import { useEffect, useMemo, useState } from "react";
import {
  getAttendees,
  getStats,
  manualCheckIn,
  manualCheckOut,
  uploadExcel,
  walkInCheckIn
} from "../services/api";

const isMobile = window.innerWidth <= 768;

export default function Dashboard() {
  const [attendees, setAttendees] = useState([]);
  const [stats, setStats] = useState({ total: 0, inside: 0, checked_out: 0, not_arrived: 0 });
  const [search, setSearch] = useState("");
  const [showVolunteers, setShowVolunteers] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [volunteerFile, setVolunteerFile] = useState(null);

  const [showWalkIn, setShowWalkIn] = useState(false);
  const [walkInData, setWalkInData] = useState({ name: "", email: "", student_id: "" });

  async function loadData() {
    try {
      setLoading(true);
      setError("");
      const [attendeeData, statsData] = await Promise.all([getAttendees(), getStats()]);
      setAttendees(attendeeData);
      setStats(statsData);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filteredAttendees = useMemo(() => {
    const q = search.trim().toLowerCase();
    return attendees
      .filter((a) => {
        if (showVolunteers === "volunteers") return a.is_volunteer;
        if (showVolunteers === "non-volunteers") return !a.is_volunteer;
        return true;
      })
      .filter((a) => {
        if (!q) return true;
        const name = (a.name ?? "").toLowerCase();
        const email = (a.contact ?? "").toLowerCase();
        const studentId = (a.student_id ?? "").toLowerCase();
        return (
          (name && name.includes(q)) ||
          (email && email.includes(q)) ||
          (studentId && studentId.includes(q))
        );
      });
  }, [attendees, search, showVolunteers]);

  async function handleCheckIn(email) {
    try {
      await manualCheckIn(email);
      await loadData();
    } catch (err) {
      alert(err.message || "Check-in failed");
    }
  }

  async function handleCheckOut(email) {
    try {
      await manualCheckOut(email);
      await loadData();
    } catch (err) {
      alert(err.message || "Check-out failed");
    }
  }

  const handleVolunteerUpload = async () => {
    if (!volunteerFile) return alert("Select volunteer file");
    const formData = new FormData();
    formData.append("file", volunteerFile);
    const res = await fetch("https://event-checkin-backend-vre4.onrender.com/upload_volunteers", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.status === "success") {
      alert(`Loaded ${data.loaded} volunteers!`);
      setVolunteerFile(null);
      loadData();
    } else {
      alert("Failed: " + data.message);
    }
  };

  const handleUpload = async () => {
    if (!file) { alert("Please select file"); return; }
    const res = await uploadExcel(file);
    if (res.status === "success") {
      alert(`Inserted ${res.inserted} records`);
      setFile(null);
      loadData();
    } else {
      alert("Upload failed");
    }
  };

  async function handleWalkInSubmit() {
    if (!walkInData.name || !walkInData.student_id) {
      return alert("Name & ID required");
    }
    const res = await walkInCheckIn(walkInData);
    if (res.success) {
      setWalkInData({ name: "", email: "", student_id: "" });
      setShowWalkIn(false);
      loadData();
    } else {
      alert(res.message);
    }
  }

  const getStatus = (a) => {
    if (a.checked_in && !a.checked_out) return { label: "Inside ✅", cls: "status-badge success" };
    if (a.checked_out)                  return { label: "Checked Out 👋", cls: "status-badge warning" };
    return                                     { label: "Not Arrived", cls: "status-badge pending" };
  };

  // Mobile card view for each attendee
  const MobileCard = ({ a }) => {
    const { label, cls } = getStatus(a);
    return (
      <div style={{
        background: a.is_volunteer ? "#1a3a2a" : "#1e2433",
        borderLeft: a.is_volunteer ? "3px solid #22c55e" : "3px solid transparent",
        borderRadius: "8px",
        padding: "12px",
        marginBottom: "10px"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
          <div>
            <span style={{ fontWeight: "600", fontSize: "15px", color: "#fff" }}>{a.name}</span>
            {a.is_volunteer && (
              <span style={{
                display: "inline-block", marginLeft: "6px",
                background: "#166534", color: "#bbf7d0",
                fontSize: "11px", padding: "2px 7px",
                borderRadius: "10px", fontWeight: 600
              }}>🙋 Volunteer</span>
            )}
          </div>
          <span className={cls}>{label}</span>
        </div>
        <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>{a.contact}</div>
        <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>
          ID: {a.student_id === a.contact ? "—" : a.student_id}
          {a.checkin_time && <span style={{ marginLeft: "10px" }}>In: {new Date(a.checkin_time).toLocaleTimeString()}</span>}
          {a.checkout_time && <span style={{ marginLeft: "10px" }}>Out: {new Date(a.checkout_time).toLocaleTimeString()}</span>}
        </div>
        <div>
          {!a.checked_in && (
            <button className="primary-btn" onClick={() => handleCheckIn(a.contact)}>Check In</button>
          )}
          {a.checked_in && !a.checked_out && (
            <button className="warning-btn" onClick={() => handleCheckOut(a.contact)}>Check Out</button>
          )}
          {a.checked_out && (
            <button className="primary-btn" onClick={() => handleCheckIn(a.contact)}>Re-enter</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .dashboard-header h1 {
            font-size: 20px !important;
            margin-bottom: 10px !important;
          }
          .header-actions {
            flex-wrap: wrap !important;
            gap: 8px !important;
          }
          .header-actions input[type="file"] {
            max-width: 130px !important;
            font-size: 12px !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .toolbar {
            flex-direction: column !important;
          }
          .toolbar select {
            width: 100% !important;
          }
        }
      `}</style>

      <main style={{ padding: "16px", width: "100%", boxSizing: "border-box" }}>
        <section style={{ width: "100%", maxWidth: "100%", boxSizing: "border-box" }} className="card">

          {/* HEADER */}
          <div className="dashboard-header page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
            <h1 style={{ margin: 0 }}>🎯 Event Check-in Dashboard</h1>
            <div className="header-actions" style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <input type="file" accept=".xlsx,.csv" onChange={(e) => setFile(e.target.files[0])} />
              <button className="primary-btn" onClick={handleUpload}>Upload</button>
              <button className="secondary-btn" onClick={loadData}>Refresh</button>
              <button className="primary-btn" onClick={() => setShowWalkIn(true)}>+ Walk-in</button>
              <input type="file" accept=".xlsx" onChange={(e) => setVolunteerFile(e.target.files[0])} />
              <button className="primary-btn" onClick={handleVolunteerUpload}>Upload Volunteers</button>
            </div>
          </div>

          {/* STATS */}
          <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "20px" }}>
            <div className="stat-box">
              <span className="stat-label">Total</span>
              <span className="stat-value">{stats.total}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Currently Inside</span>
              <span className="stat-value">{stats.inside}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Checked Out</span>
              <span className="stat-value">{stats.checked_out}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Not Arrived</span>
              <span className="stat-value">{stats.not_arrived}</span>
            </div>
          </div>

          {/* SEARCH + FILTER */}
          <div className="toolbar" style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            <input
              className="search-input"
              type="text"
              placeholder="Search by name, email, or student ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <select
              value={showVolunteers}
              onChange={(e) => setShowVolunteers(e.target.value)}
              className="search-input"
              style={{ width: "200px" }}
            >
              <option value="all">👥 All Attendees</option>
              <option value="volunteers">🙋 Volunteers Only</option>
              <option value="non-volunteers">🎓 Non-Volunteers Only</option>
            </select>
          </div>

          {loading && <p className="info-text">Loading attendees...</p>}
          {error && <p className="error-text">{error}</p>}

          {/* TABLE — desktop only */}
          {!loading && !error && !isMobile && (
            <div style={{ width: "100%", overflowX: "auto" }}>
              <table style={{ width: "100%", tableLayout: "fixed" }} className="attendee-table">
                <colgroup>
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "11%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Student ID</th>
                    <th>Check-in Time</th>
                    <th>Check-out Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.length === 0 ? (
                    <tr><td colSpan="7" className="empty-cell">No attendees found</td></tr>
                  ) : (
                    filteredAttendees.map((a) => {
                      const { label, cls } = getStatus(a);
                      return (
                        <tr
                          key={a.contact}
                          style={a.is_volunteer ? {
                            backgroundColor: "#1a3a2a",
                            borderLeft: "3px solid #22c55e"
                          } : {}}
                        >
                          <td style={{ wordBreak: "break-word" }}>
                            {a.name}
                            {a.is_volunteer && (
                              <span style={{
                                display: "inline-block", marginLeft: "6px",
                                background: "#166534", color: "#bbf7d0",
                                fontSize: "11px", padding: "2px 7px",
                                borderRadius: "10px", fontWeight: 600
                              }}>🙋 Volunteer</span>
                            )}
                          </td>
                          <td style={{ wordBreak: "break-all", fontSize: "13px" }}>{a.contact}</td>
                          <td style={{ fontSize: "13px" }}>
                            {a.student_id === a.contact ? "—" : a.student_id}
                          </td>
                          <td>{a.checkin_time ? new Date(a.checkin_time).toLocaleTimeString() : "—"}</td>
                          <td>{a.checkout_time ? new Date(a.checkout_time).toLocaleTimeString() : "—"}</td>
                          <td><span className={cls}>{label}</span></td>
                          <td>
                            {!a.checked_in && (
                              <button className="primary-btn" onClick={() => handleCheckIn(a.contact)}>Check In</button>
                            )}
                            {a.checked_in && !a.checked_out && (
                              <button className="warning-btn" onClick={() => handleCheckOut(a.contact)}>Check Out</button>
                            )}
                            {a.checked_out && (
                              <button className="primary-btn" onClick={() => handleCheckIn(a.contact)}>Re-enter</button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* CARDS — mobile only */}
          {!loading && !error && isMobile && (
            <div>
              {filteredAttendees.length === 0 ? (
                <p className="empty-cell">No attendees found</p>
              ) : (
                filteredAttendees.map((a) => <MobileCard key={a.contact} a={a} />)
              )}
            </div>
          )}

        </section>
      </main>

      {/* WALK-IN MODAL */}
      {showWalkIn && (
        <div style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.6)",
          display: "flex", justifyContent: "center", alignItems: "center",
          zIndex: 1000, padding: "16px", boxSizing: "border-box"
        }}>
          <div style={{
            background: "#1e2433",
            borderRadius: "12px",
            padding: "32px",
            width: "100%",
            maxWidth: "400px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
          }}>
            <h3 style={{ margin: "0 0 24px 0", fontSize: "22px", fontWeight: "700", color: "#fff" }}>
              Walk-in Registration
            </h3>
            <input
              placeholder="Name"
              value={walkInData.name}
              onChange={(e) => setWalkInData({ ...walkInData, name: e.target.value })}
              style={{
                display: "block", width: "100%", marginBottom: "12px",
                padding: "12px 16px", borderRadius: "8px",
                background: "#2a3347", border: "1px solid #3a4460",
                color: "#fff", fontSize: "15px", boxSizing: "border-box", outline: "none"
              }}
            />
            <input
              placeholder="Email"
              value={walkInData.email}
              onChange={(e) => setWalkInData({ ...walkInData, email: e.target.value })}
              style={{
                display: "block", width: "100%", marginBottom: "12px",
                padding: "12px 16px", borderRadius: "8px",
                background: "#2a3347", border: "1px solid #3a4460",
                color: "#fff", fontSize: "15px", boxSizing: "border-box", outline: "none"
              }}
            />
            <input
              placeholder="Student ID / Phone"
              value={walkInData.student_id}
              onChange={(e) => setWalkInData({ ...walkInData, student_id: e.target.value })}
              style={{
                display: "block", width: "100%", marginBottom: "24px",
                padding: "12px 16px", borderRadius: "8px",
                background: "#2a3347", border: "1px solid #3a4460",
                color: "#fff", fontSize: "15px", boxSizing: "border-box", outline: "none"
              }}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={handleWalkInSubmit}
                style={{
                  flex: 1, padding: "12px",
                  background: "#2563eb", color: "#fff",
                  border: "none", borderRadius: "8px",
                  fontSize: "15px", fontWeight: "600", cursor: "pointer"
                }}
              >
                Register & Check-in
              </button>
              <button
                onClick={() => setShowWalkIn(false)}
                style={{
                  padding: "12px 20px",
                  background: "#2a3347", color: "#fff",
                  border: "1px solid #3a4460", borderRadius: "8px",
                  fontSize: "15px", cursor: "pointer"
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}