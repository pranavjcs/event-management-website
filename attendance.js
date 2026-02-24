// Attendance Module
function getAttendanceData(key, fallback) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

function setAttendanceData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Get storage function from events.js or use local function  
function getStoreFn(key, fallback) {
  // Prefer window.events.getStore if available (events.js is loaded)
  if (window.events && window.events.getStore && (key === "events" || key === "registrations")) {
    return window.events.getStore(key, fallback);
  }
  // Otherwise use direct localStorage access
  return getAttendanceData(key, fallback);
}

function setStoreFn(key, value) {
  // Use direct storage access
  return setAttendanceData(key, value);
}

// Get or create attendance record
function getAttendanceRecord() {
  return getAttendanceData("eventAttendance", {});
}

// Mark attendance
function markAttendance(eventId, registrationId, attended) {
  const attendance = getAttendanceRecord();
  if (!attendance[eventId]) {
    attendance[eventId] = {};
  }
  attendance[eventId][registrationId] = attended;
  setAttendanceData("eventAttendance", attendance);
}

// Get attendance for an event
function getEventAttendance(eventId) {
  const attendance = getAttendanceRecord();
  return attendance[eventId] || {};
}

// Get attendance count for event
function getEventAttendanceCount(eventId) {
  const attendance = getEventAttendance(eventId);
  return Object.values(attendance).filter((v) => v === true).length;
}

// Load attendance page
function loadAttendancePage() {
  // Use auth module to get current admin
  const admin = (window.auth && window.auth.getCurrentAdmin)
    ? window.auth.getCurrentAdmin()
    : getAttendanceData("currentAdmin", null);
  
  if (!admin) {
    window.location.href = "admin-login.html";
    return;
  }

  // Ensure events.js has seeded the data before loading selector
  setTimeout(() => {
    loadEventSelector();
    displayAttendanceSummary();
  }, 100);
}

// Load event selector
function loadEventSelector() {
  const selector = document.getElementById("attendance-event");
  if (!selector) {
    console.error("Event selector element not found");
    return;
  }

  const events = getStoreFn("events", []);
  
  // Add error logging for debugging
  if (!events || events.length === 0) {
    console.warn("No events found in storage. Available events:", events);
    selector.innerHTML = '<option value="">No events available</option>';
    return;
  }

  // Show all events (both past and upcoming) for flexibility
  const sortedEvents = events.sort((a, b) => new Date(a.date) - new Date(b.date));

  selector.innerHTML = '<option value="">Choose an event...</option>';
  sortedEvents.forEach((event) => {
    const option = document.createElement("option");
    option.value = event.id;
    const eventDate = new Date(event.date);
    const dateStr = eventDate.toLocaleDateString();
    option.textContent = `${event.title} (${dateStr})`;
    selector.appendChild(option);
  });

  selector.addEventListener("change", () => {
    if (selector.value) {
      displayEventRegistrants(selector.value);
    } else {
      document.getElementById("attendance-container").innerHTML = "";
    }
  });
}

// Display registrants for selected event
function displayEventRegistrants(eventId) {
  const events = getStoreFn("events", []);
  const registrations = getStoreFn("registrations", []);
  const event = events.find((e) => e.id === eventId);
  const eventRegs = registrations.filter((r) => r.eventId === eventId);
  const attendance = getEventAttendance(eventId);

  const container = document.getElementById("attendance-container");
  if (!event) {
    container.innerHTML = "<p>Event not found.</p>";
    return;
  }

  let html = `
    <div style="background: var(--bg-accent); padding: 16px; border-radius: 12px; margin-bottom: 20px;">
      <h3 style="margin: 0 0 8px;">${event.title}</h3>
      <p style="margin: 0; color: var(--muted);">${event.date} | ${event.time}</p>
    </div>
    <div style="display: grid; gap: 12px;">
  `;

  if (eventRegs.length === 0) {
    html += '<p style="color: var(--muted);">No registrations for this event.</p>';
  } else {
    eventRegs.forEach((reg) => {
      const isAttended = attendance[reg.id] === true;
      html += `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--surface); border-radius: 8px; border: 1px solid #e5e7eb;">
          <div>
            <p style="font-weight: 600; margin: 0;">${reg.name}</p>
            <p style="font-size: 12px; color: var(--muted); margin: 4px 0;">${reg.email}</p>
          </div>
          <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input 
              type="checkbox" 
              ${isAttended ? "checked" : ""}
              onchange="window.attendance.markAttendance('${eventId}', '${reg.id}', this.checked); window.attendance.displayAttendanceSummary();"
              style="width: 20px; height: 20px; cursor: pointer;"
            />
            <span>Attended</span>
          </label>
        </div>
      `;
    });
  }

  html += "</div>";
  container.innerHTML = html;
}

// Display attendance summary
function displayAttendanceSummary() {
  const events = getStoreFn("events", []);
  const registrations = getStoreFn("registrations", []);
  const tbody = document.getElementById("attendance-summary-tbody");

  // Show all events (or filter to past if needed)
  const eventList = events.sort((a, b) => new Date(a.date) - new Date(b.date));

  tbody.innerHTML = "";
  eventList.forEach((event) => {
    const eventRegs = registrations.filter((r) => r.eventId === event.id);
    const attendanceCount = getEventAttendanceCount(event.id);
    const attendancePercent =
      eventRegs.length > 0
        ? Math.round((attendanceCount / eventRegs.length) * 100)
        : 0;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${event.title}</td>
      <td>${eventRegs.length}</td>
      <td>${attendanceCount}</td>
      <td><strong>${attendancePercent}%</strong></td>
    `;
    tbody.appendChild(row);
  });

  if (eventList.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="4" style="text-align: center; color: var(--muted);">No events available.</td>
    `;
    tbody.appendChild(row);
  }
}

// Export attendance API
window.attendance = {
  loadAttendancePage,
  displayEventRegistrants,
  displayAttendanceSummary,
  markAttendance,
  getEventAttendanceCount,
  getEventAttendance
};
