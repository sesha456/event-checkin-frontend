const BASE_URL = "https://event-checkin-backend-vre4.onrender.com"

export async function getAttendees() {
  const res = await fetch(`${BASE_URL}/attendees`);
  if (!res.ok) throw new Error("Failed to fetch attendees");
  return res.json();
}

export async function getStats() {
  const res = await fetch(`${BASE_URL}/stats`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export async function manualCheckIn(contact) {
  const res = await fetch(`${BASE_URL}/manual_checkin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Manual check-in failed");
  return data;
}

export async function manualCheckOut(contact) {
  const res = await fetch(`${BASE_URL}/manual_checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contact }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Manual check-out failed");
  return data;
}

export async function uploadExcel(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE_URL}/upload_excel`, {
    method: "POST",
    body: formData,
  });
  return res.json();
}

export async function walkInCheckIn(data) {
  try {
    const res = await fetch(`${BASE_URL}/api/walkin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.message || "Walk-in failed");
    }

    return json;

  } catch (err) {
    console.error("Walk-in API error:", err);
    return { success: false, message: err.message };
  }
}

export async function qrCheckInFromUrl(url) {
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "QR check-in failed");
  return data;
}