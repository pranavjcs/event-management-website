// Profile Management Module
// Direct localStorage access - consistent with auth.js
function getProfileData(key, fallback) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

function setProfileData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

// Load and display user profile with registered events
function loadMyEvents() {
  const authRequired = document.getElementById("auth-required");
  const myEventsSection = document.getElementById("my-events-section");
  // Use auth module to get current user if available
  const currentUser = (window.auth && window.auth.getCurrentUser) 
    ? window.auth.getCurrentUser()
    : getProfileData("currentUser", null);

  // Check if user is logged in
  if (!currentUser) {
    if (authRequired) authRequired.style.display = "block";
    if (myEventsSection) myEventsSection.style.display = "none";
    return;
  }

  // Show user content
  if (authRequired) authRequired.style.display = "none";
  if (myEventsSection) myEventsSection.style.display = "block";

  // Load profile information
  displayProfile(currentUser);

  // Load registered and past events
  displayRegisteredEvents(currentUser.email);
}

function displayProfile(user) {
  const nameEl = document.getElementById("profile-name");
  const emailEl = document.getElementById("profile-email");
  const deptEl = document.getElementById("profile-dept");
  const countEl = document.getElementById("profile-count");

  if (nameEl) nameEl.textContent = user.fullName || "N/A";
  if (emailEl) emailEl.textContent = user.email || "N/A";
  if (deptEl) deptEl.textContent = user.department || "N/A";

  // Count registered events - use direct localStorage access
  const registrations = getProfileData("registrations", []);
  const userRegistrations = registrations.filter(
    (reg) => reg.email === user.email
  );
  if (countEl) countEl.textContent = userRegistrations.length;
}

function displayRegisteredEvents(userEmail) {
  const myEventsGrid = document.getElementById("my-events-grid");
  const pastEventsGrid = document.getElementById("past-events-grid");
  if (!myEventsGrid || !pastEventsGrid) return;

  // Use direct localStorage access - consistent across all modules
  const events = getProfileData("events", []);
  const registrations = getProfileData("registrations", []);

  // Get user's registered events
  const userRegistrations = registrations.filter(
    (reg) => reg.email === userEmail
  );

  // Separate upcoming and past events
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingRegs = userRegistrations.filter((reg) => {
    const eventDate = new Date(
      events.find((e) => e.id === reg.eventId)?.date || "1900-01-01"
    );
    return eventDate >= today;
  });

  const pastRegs = userRegistrations.filter((reg) => {
    const eventDate = new Date(
      events.find((e) => e.id === reg.eventId)?.date || "1900-01-01"
    );
    return eventDate < today;
  });

  // Render upcoming events
  myEventsGrid.innerHTML = "";
  if (upcomingRegs.length === 0) {
    myEventsGrid.innerHTML =
      '<p style="grid-column: 1/-1; text-align: center; color: var(--muted);">No upcoming events. <a href="events.html" style="font-weight: 600; text-decoration: underline;">Browse events</a></p>';
  } else {
    upcomingRegs.forEach((reg) => {
      const event = events.find((e) => e.id === reg.eventId);
      if (event) {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
          <span class="badge">${event.category}</span>
          <h3>${event.title}</h3>
          <p style="font-size: 14px; color: var(--primary); font-weight: 600; margin: 0;">📍 ${event.club}</p>
          <p class="meta">${event.date} | ${event.time}</p>
          <p style="color: var(--muted); font-size: 14px;">${event.venue}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="event-details.html?id=${event.id}">View Details</a>
            <button class="btn btn-secondary" onclick="window.profile.cancelRegistration('${reg.id}', '${userEmail}')">Cancel</button>
          </div>
        `;
        myEventsGrid.appendChild(card);
      }
    });
  }

  // Render past events
  pastEventsGrid.innerHTML = "";
  if (pastRegs.length === 0) {
    pastEventsGrid.innerHTML =
      '<p style="grid-column: 1/-1; text-align: center; color: var(--muted);">No past events yet.</p>';
  } else {
    pastRegs.forEach((reg) => {
      const event = events.find((e) => e.id === reg.eventId);
      if (event) {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
          <span class="badge" style="opacity: 0.7;">${event.category}</span>
          <h3>${event.title}</h3>
          <p style="font-size: 14px; color: var(--primary); font-weight: 600; margin: 0;">📍 ${event.club}</p>
          <p class="meta" style="opacity: 0.7;">${event.date} | ${event.time}</p>
          <p style="color: var(--muted); font-size: 14px;">${event.venue}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="event-details.html?id=${event.id}">View Details</a>
            <span style="display: inline-block; padding: 10px 16px; background: #e0f2fe; color: #0369a1; border-radius: 10px; font-size: 14px; font-weight: 600;">✓ Attended</span>
          </div>
        `;
        pastEventsGrid.appendChild(card);
      }
    });
  }
}

// Cancel registration for an event
function cancelRegistration(regId, userEmail) {
  if (
    !window.confirm("Are you sure you want to cancel your registration?")
  ) {
    return;
  }

  // Use direct storage access
  const registrations = getProfileData("registrations", []);
  const updated = registrations.filter((reg) => reg.id !== regId);
  setProfileData("registrations", updated);

  window.alert("Registration cancelled successfully.");
  loadMyEvents();
}

// Export profile API
window.profile = {
  loadMyEvents,
  displayProfile,
  displayRegisteredEvents,
  cancelRegistration
};
