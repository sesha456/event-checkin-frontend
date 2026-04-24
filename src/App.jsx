import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Scanner from "./pages/Scanner";

function App() {
  return (
    <div>
      <nav className="topbar">
        <div className="brand">Event Check-in System</div>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/scanner">Scanner</Link>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scanner" element={<Scanner />} />
      </Routes>
    </div>
  );
}

export default App;