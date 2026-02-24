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
