// Event Calendar Module
let currentCalendarDate = new Date();

function getCalendarData(key, fallback) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

// Get events for a specific date
function getEventsForDate(dateStr) {
  // Use direct localStorage access
  const events = getCalendarData("events", []);
  return events.filter((e) => e.date === dateStr);
}

// Check if user is registered for an event
function isUserRegisteredForEvent(eventId, userEmail) {
  // Use direct localStorage access
  const registrations = getCalendarData("registrations", []);
  return registrations.some(
    (r) => r.eventId === eventId && r.email === userEmail
  );
}

// Render the calendar
function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  const monthDisplay = document.getElementById("calendar-month");

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();

  monthDisplay.textContent = currentCalendarDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  const prevLastDate = new Date(year, month, 0).getDate();

  let html = `
    <tr>
      <th>Sun</th>
      <th>Mon</th>
      <th>Tue</th>
      <th>Wed</th>
      <th>Thu</th>
      <th>Fri</th>
      <th>Sat</th>
    </tr>
    <tr>
  `;

  // Previous month dates
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<td class="other-month">${prevLastDate - i}</td>`;
  }

  // Current month dates
  const today = new Date();
  // Use auth module to get current user if available
  const currentUser = (window.auth && window.auth.getCurrentUser)
    ? window.auth.getCurrentUser()
    : getCalendarData("currentUser", null);
  const userEmail = currentUser ? currentUser.email : null;

  for (let date = 1; date <= lastDate; date++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      date
    ).padStart(2, "0")}`;
    const isToday =
      date === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();

    html += `<td ${isToday ? 'class="today"' : ""}>
      <div class="calendar-day">${date}</div>
      <div class="calendar-events" id="events-${dateStr}"></div>
    </td>`;

    // Add events for this date
    const events = getEventsForDate(dateStr);
    const eventsHtml = events
      .map((event) => {
        const isRegistered = userEmail
          ? isUserRegisteredForEvent(event.id, userEmail)
          : false;
        return `
          <div class="event-dot" style="background: ${isRegistered ? "var(--secondary)" : "var(--primary)"};" 
               onclick="window.location.href='event-details.html?id=${event.id}'" 
               title="${event.title}">
            ${event.title.substring(0, 15)}${event.title.length > 15 ? "..." : ""}
          </div>
        `;
      })
      .join("");

    html += `<script>
      document.getElementById("events-${dateStr}").innerHTML = ${JSON.stringify(
      eventsHtml
    )};
    </script>`;

    if ((firstDay + date) % 7 === 0 && date < lastDate) {
      html += `</tr><tr>`;
    }
  }

  // Next month dates
  const totalCells = firstDay + lastDate;
  const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let date = 1; date <= remainingCells; date++) {
    html += `<td class="other-month">${date}</td>`;
  }

  html += `</tr>`;
  grid.innerHTML = html;

  // Re-populate events after rendering
  const events = getCalendarData("events", []);
  events.forEach((event) => {
    const eventCell = document.getElementById(`events-${event.date}`);
    if (eventCell) {
      const isRegistered = userEmail
        ? isUserRegisteredForEvent(event.id, userEmail)
        : false;
      const eventDiv = document.createElement("div");
      eventDiv.className = "event-dot";
      eventDiv.style.background = isRegistered
        ? "var(--secondary)"
        : "var(--primary)";
      eventDiv.title = event.title;
      eventDiv.textContent =
        event.title.substring(0, 15) +
        (event.title.length > 15 ? "..." : "");
      eventDiv.onclick = () => {
        window.location.href = `event-details.html?id=${event.id}`;
      };
      eventCell.appendChild(eventDiv);
    }
  });
}

// Navigation functions
function nextMonth() {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
  renderCalendar();
}

function previousMonth() {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
  renderCalendar();
}

function currentMonth() {
  currentCalendarDate = new Date();
  renderCalendar();
}

// Export calendar API
window.calendar = {
  renderCalendar,
  nextMonth,
  previousMonth,
  currentMonth
};

(() => {
  function getApiBaseCandidates() {
    const fromWindow = window.__API_BASE__;
    if (fromWindow) {
      return [fromWindow.replace(/\/$/, "")];
    }

    const fallback = "http://localhost:5000/api";
    if (window.location.protocol === "file:") {
      return [fallback];
    }

    if (window.location.port === "5000") {
      return ["/api"];
    }

    return ["/api", fallback];
  }

  let currentCalendarDateApi = new Date();

  async function apiRequest(endpoint, options = {}) {
    const bases = getApiBaseCandidates();
    let lastError = null;

    for (const base of bases) {
      try {
        const response = await fetch(`${base}${endpoint}`, {
          headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
          },
          ...options
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok || payload.success === false) {
          lastError = new Error(payload.message || `Request failed (${response.status})`);
          continue;
        }

        return payload;
      } catch (error) {
        lastError = error;
      }
    }

    throw new Error(lastError?.message || "Unable to connect to backend API");
  }

  async function renderCalendarApi() {
    const grid = document.getElementById("calendar-grid");
    const monthDisplay = document.getElementById("calendar-month");
    if (!grid || !monthDisplay) return;

    const year = currentCalendarDateApi.getFullYear();
    const month = currentCalendarDateApi.getMonth();

    monthDisplay.textContent = currentCalendarDateApi.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric"
    });

    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const prevLastDate = new Date(year, month, 0).getDate();

    const currentUser = window.auth && window.auth.getCurrentUser
      ? window.auth.getCurrentUser()
      : null;

    try {
      const [eventsResult, registrationsResult] = await Promise.all([
        apiRequest("/events"),
        currentUser
          ? apiRequest(`/registrations?email=${encodeURIComponent(currentUser.email)}`)
          : Promise.resolve({ data: [] })
      ]);

      const events = eventsResult.data;
      const userRegistrations = registrationsResult.data;
      const registeredIds = new Set(userRegistrations.map((item) => item.eventId));

      let html = `
        <tr>
          <th>Sun</th>
          <th>Mon</th>
          <th>Tue</th>
          <th>Wed</th>
          <th>Thu</th>
          <th>Fri</th>
          <th>Sat</th>
        </tr>
        <tr>
      `;

      for (let index = firstDay - 1; index >= 0; index--) {
        html += `<td class="other-month">${prevLastDate - index}</td>`;
      }

      const today = new Date();
      for (let date = 1; date <= lastDate; date++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;
        const isToday =
          date === today.getDate() &&
          month === today.getMonth() &&
          year === today.getFullYear();

        html += `<td ${isToday ? 'class="today"' : ""}><div class="calendar-day">${date}</div><div class="calendar-events" id="events-${dateStr}"></div></td>`;

        if ((firstDay + date) % 7 === 0 && date < lastDate) {
          html += "</tr><tr>";
        }
      }

      const totalCells = firstDay + lastDate;
      const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
      for (let date = 1; date <= remainingCells; date++) {
        html += `<td class="other-month">${date}</td>`;
      }

      html += "</tr>";
      grid.innerHTML = html;

      events.forEach((event) => {
        const container = document.getElementById(`events-${event.date}`);
        if (!container) return;

        const dot = document.createElement("div");
        dot.className = "event-dot";
        dot.style.background = registeredIds.has(event.id) ? "var(--secondary)" : "var(--primary)";
        dot.title = event.title;
        dot.textContent = event.title.substring(0, 15) + (event.title.length > 15 ? "..." : "");
        dot.onclick = () => {
          window.location.href = `event-details.html?id=${event.id}`;
        };
        container.appendChild(dot);
      });
    } catch (error) {
      grid.innerHTML = `<tr><td colspan="7">${error.message || "Unable to load calendar."}</td></tr>`;
    }
  }

  function nextMonthApi() {
    currentCalendarDateApi.setMonth(currentCalendarDateApi.getMonth() + 1);
    renderCalendarApi();
  }

  function previousMonthApi() {
    currentCalendarDateApi.setMonth(currentCalendarDateApi.getMonth() - 1);
    renderCalendarApi();
  }

  function currentMonthApi() {
    currentCalendarDateApi = new Date();
    renderCalendarApi();
  }

  window.calendar = {
    ...window.calendar,
    renderCalendar: renderCalendarApi,
    nextMonth: nextMonthApi,
    previousMonth: previousMonthApi,
    currentMonth: currentMonthApi
  };
})();
