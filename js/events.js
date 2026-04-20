function getStore(key, fallback) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

function setStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function formatDate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function rollDateForward(dateText) {
  const input = String(dateText || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const date = new Date(`${input}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return input;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  while (date < today) {
    date.setFullYear(date.getFullYear() + 1);
  }

  return formatDate(date);
}

function normalizeStoredEventDates() {
  const events = getStore("events", []);
  if (!Array.isArray(events) || events.length === 0) {
    return;
  }

  let changed = false;
  const nextEvents = events.map((event) => {
    const nextDate = rollDateForward(event && event.date);
    if (event && nextDate !== event.date) {
      changed = true;
      return { ...event, date: nextDate };
    }
    return event;
  });

  if (changed) {
    setStore("events", nextEvents);
  }
}

function notify(message, type = "info") {
  if (window.ui && typeof window.ui.notify === "function") {
    window.ui.notify(message, type);
    return;
  }
  window.alert(message);
}

// Get registration count for an event
function getEventRegistrationCount(eventId) {
  const registrations = getStore("registrations", []);
  return registrations.filter((reg) => reg.eventId === eventId).length;
}

// Check if event has available seats
function hasAvailableSeats(event) {
  const count = getEventRegistrationCount(event.id);
  return count < event.seats;
}

// Initialize seed events
function seedEvents() {
  const events = getStore("events", []);
  if (events.length === 0) {
    setStore("events", [
      {
        id: "EVT-1001",
        title: "AI Innovation Conclave",
        category: "Technology",
        club: "Coding Club",
        date: "2026-05-12",
        time: "10:00 AM",
        venue: "Dr. APJ Abdul Kalam Auditorium",
        description:
          "Explore practical AI solutions with startup founders, researchers, and student innovators.",
        seats: 120
      },
      {
        id: "EVT-1002",
        title: "Rangmanch Utsav 2026",
        category: "Culture",
        club: "Cultural Committee",
        date: "2026-06-05",
        time: "05:30 PM",
        venue: "Central Quadrangle",
        description:
          "Celebrate campus culture with folk dance, indie music, theatre, and food stalls.",
        seats: 300
      },
      {
        id: "EVT-1003",
        title: "Campus Placement Prep Bootcamp",
        category: "Career",
        club: "Training and Placement Cell",
        date: "2026-05-22",
        time: "02:00 PM",
        venue: "Training and Placement Cell Hall",
        description:
          "Build interview confidence through resume clinics, mock rounds, and recruiter Q&A.",
        seats: 80
      }
    ]);
  }
}


// Render event cards on listing pages.
function renderEvents() {
  const grid = document.getElementById("events-grid");
  if (!grid) return;

  const events = getStore("events", []);
  const filters = getEventFilters();
  const currentUser = getStore("currentUser", null);
  const isLoggedIn = !!currentUser;

  const filtered = events.filter((event) => {
    const search = filters.search
      ? `${event.title} ${event.description} ${event.venue}`
          .toLowerCase()
          .includes(filters.search)
      : true;
    const category = filters.category
      ? event.category.toLowerCase() === filters.category
      : true;
    const club = filters.club
      ? event.club === filters.club
      : true;
    
    let dateInRange = true;
    if (filters.dateFrom || filters.dateTo) {
      const eventDate = new Date(event.date);
      if (filters.dateFrom) {
        const fromDate = new Date(filters.dateFrom);
        dateInRange = dateInRange && eventDate >= fromDate;
      }
      if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        dateInRange = dateInRange && eventDate <= toDate;
      }
    }
    
    let capacity = true;
    if (filters.capacity === "available") {
      const registrationCount = getEventRegistrationCount(event.id);
      capacity = registrationCount < event.seats;
    } else if (filters.capacity === "almost-full") {
      const registrationCount = getEventRegistrationCount(event.id);
      const occupancy = Math.round((registrationCount / event.seats) * 100);
      capacity = occupancy >= 80;
    }
    
    return search && category && club && dateInRange && capacity;
  });
  grid.innerHTML = "";

  if (filtered.length === 0) {
    grid.innerHTML = "<p>No events available.</p>";
    return;
  }

  filtered.forEach((event) => {
    const card = document.createElement("article");
    card.className = "card";
    
    const registrationCount = getEventRegistrationCount(event.id);
    const availableSeats = event.seats - registrationCount;
    const occupancyPercentage = Math.round((registrationCount / event.seats) * 100);
    const isFull = availableSeats <= 0;
    const isAlmostFull = occupancyPercentage >= 80;
    
    let registerButton;
    if (isFull) {
      registerButton = `<button class="btn btn-secondary" disabled style="opacity: 0.6;">Event Full</button>`;
    } else if (isLoggedIn) {
      registerButton = `<a class="btn btn-outline" href="event-register.html?id=${event.id}">Register</a>`;
    } else {
      registerButton = `<a class="btn btn-outline" href="login.html" style="opacity: 0.7;" title="Login required to register">Register (Login Required)</a>`;
    }
    
    const capacityColor = isFull ? "#b91c1c" : isAlmostFull ? "#f59e0b" : "#0f7a5c";
    
    card.innerHTML = `
      <span class="badge">${event.category}</span>
      <h3>${event.title}</h3>
      <p style="font-size: 14px; color: var(--primary); font-weight: 600; margin: 0;">📍 ${event.club}</p>
      <p class="meta">${event.date} | ${event.time}</p>
      <p>${event.description}</p>
      <div style="margin: 12px 0;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-bottom: 6px;">
          <span>Capacity</span>
          <span style="font-weight: 600; color: var(--text);">${registrationCount}/${event.seats} ${isFull ? '(FULL)' : `(${availableSeats} left)`}</span>
        </div>
        <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden;">
          <div style="height: 100%; width: ${occupancyPercentage}%; background: ${capacityColor}; transition: width 0.3s ease;"></div>
        </div>
      </div>
      <div class="hero-actions">
        <a class="btn btn-primary" href="event-details.html?id=${event.id}">View Details</a>
        ${registerButton}
      </div>
    `;
    grid.appendChild(card);
  });
}

function getEventFilters() {
  const searchInput = document.getElementById("event-search");
  const categoryInput = document.getElementById("event-category");
  const clubInput = document.getElementById("event-club");
  const dateFromInput = document.getElementById("event-date-from");
  const dateToInput = document.getElementById("event-date-to");
  const capacityInput = document.getElementById("event-capacity");

  return {
    search: searchInput ? searchInput.value.trim().toLowerCase() : "",
    category: categoryInput ? categoryInput.value.trim().toLowerCase() : "",
    club: clubInput ? clubInput.value.trim() : "",
    dateFrom: dateFromInput ? dateFromInput.value : "",
    dateTo: dateToInput ? dateToInput.value : "",
    capacity: capacityInput ? capacityInput.value : ""
  };
}

function setupEventFilters() {
  const searchInput = document.getElementById("event-search");
  const categoryInput = document.getElementById("event-category");
  const clubInput = document.getElementById("event-club");
  const dateFromInput = document.getElementById("event-date-from");
  const dateToInput = document.getElementById("event-date-to");
  const capacityInput = document.getElementById("event-capacity");

  if (!searchInput || !categoryInput) return;

  [searchInput, categoryInput, clubInput, dateFromInput, dateToInput, capacityInput].forEach((field) => {
    if (field) {
      field.addEventListener("input", () => {
        renderEvents();
      });
      field.addEventListener("change", () => {
        renderEvents();
      });
    }
  });
}

function renderEventDetails() {
  const details = document.getElementById("event-details");
  if (!details) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const events = getStore("events", []);
  const event = events.find((item) => item.id === id);

  if (!event) {
    details.innerHTML = "<p>Event not found.</p>";
    return;
  }

  const currentUser = getStore("currentUser", null);
  const isLoggedIn = !!currentUser;
  
  const registrationCount = getEventRegistrationCount(event.id);
  const availableSeats = event.seats - registrationCount;
  const occupancyPercentage = Math.round((registrationCount / event.seats) * 100);
  const isFull = availableSeats <= 0;
  
  const avgRating = window.reviews.getEventAverageRating(event.id);
  const hasReviewed = currentUser ? window.reviews.hasUserReviewed(event.id, currentUser.email) : false;

  let registerButton;
  if (isFull) {
    registerButton = `<button class="btn btn-primary" disabled style="opacity: 0.6;">Event is Full - Join Waitlist</button>`;
  } else if (isLoggedIn) {
    registerButton = `<a class="btn btn-primary" href="event-register.html?id=${event.id}">Register Now</a>`;
  } else {
    registerButton = `<a class="btn btn-primary" href="login.html" style="opacity: 0.7;" title="Login required to register">Register Now (Login Required)</a>`;
  }

  let reviewButton = "";
  if (isLoggedIn && !hasReviewed) {
    reviewButton = `<button class="btn btn-secondary" onclick="window.reviews.showReviewForm('${event.id}', '${event.title.replace(/'/g, "\\'")}')">Write a Review</button>`;
  }

  details.innerHTML = `
    <h2>${event.title}</h2>
    ${avgRating > 0 ? `<p style="font-size: 16px; margin: 8px 0;"><span style="font-size: 18px; color: var(--secondary);">${window.reviews.renderStars(avgRating)}</span> <strong>${avgRating}</strong> rating</p>` : ''}
    <p style="font-size: 16px; color: var(--primary); font-weight: 600; margin: 12px 0;">📍 Organized by: ${event.club}</p>
    <p class="meta">${event.date} | ${event.time} | ${event.venue}</p>
    
    <div style="background: var(--bg-accent); padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 4px solid var(--primary);">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
        <div>
          <p style="font-size: 12px; color: var(--muted); text-transform: uppercase; margin: 0;">Capacity</p>
          <p style="font-size: 20px; font-weight: 600; margin: 8px 0;">${registrationCount}/${event.seats}</p>
        </div>
        <div>
          <p style="font-size: 12px; color: var(--muted); text-transform: uppercase; margin: 0;">Available Seats</p>
          <p style="font-size: 20px; font-weight: 600; margin: 8px 0; ${isFull ? 'color: var(--danger);' : 'color: var(--secondary);'}">${isFull ? 'FULL' : availableSeats}</p>
        </div>
      </div>
      <div style="width: 100%; height: 10px; background: rgba(0,0,0,0.1); border-radius: 5px; overflow: hidden;">
        <div style="height: 100%; width: ${occupancyPercentage}%; background: ${isFull ? 'var(--danger)' : occupancyPercentage >= 80 ? 'var(--accent)' : 'var(--secondary)'}; transition: width 0.3s ease;"></div>
      </div>
      <p style="font-size: 12px; margin: 8px 0 0; color: var(--muted);">${occupancyPercentage}% Capacity</p>
    </div>
    
    <p>${event.description}</p>
    <div class="hero-actions">
      ${registerButton}
      ${reviewButton}
      <a class="btn btn-outline" href="events.html">Back to Events</a>
    </div>
  `;
}

// Register a student to an event (front-end simulation).
function registerForEvent(formId) {
  const form = document.getElementById(formId);
  if (!form) return;

  const currentUser = getStore("currentUser", null);
  const alertDiv = document.getElementById("auth-alert");

  if (!currentUser) {
    // Hide form and show authentication alert
    form.style.display = "none";
    if (alertDiv) alertDiv.style.display = "block";
    return;
  } else {
    // User is logged in, show form and hide alert
    form.style.display = "block";
    if (alertDiv) alertDiv.style.display = "none";
    
    // Pre-fill form with logged-in user's data
    const nameField = form.querySelector("#studentName");
    const emailField = form.querySelector("#studentEmail");
    if (nameField) nameField.value = currentUser.fullName || "";
    if (emailField) emailField.value = currentUser.email || "";
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get("id");
    const events = getStore("events", []);
    const selected = events.find((item) => item.id === eventId);

    const name = form.querySelector("#studentName");
    const email = form.querySelector("#studentEmail");
    const year = form.querySelector("#studentYear");

    const isValid = [
      window.validation.validateRequired(name, "Student name is required."),
      window.validation.validateRequired(email, "Email is required."),
      window.validation.validateEmail(email),
      window.validation.validateRequired(year, "Year is required.")
    ].every(Boolean);

    if (!isValid) {
      return;
    }

    if (!selected) {
      notify("Event not found.", "error");
      return;
    }

    const registrations = getStore("registrations", []);
    const exists = registrations.some(
      (item) => item.eventId === eventId && item.email === email.value.trim()
    );

    if (exists) {
      notify("You are already registered for this event.", "warning");
      return;
    }

    registrations.push({
      id: `REG-${Date.now()}`,
      eventId,
      eventTitle: selected.title,
      name: name.value.trim(),
      email: email.value.trim(),
      year: year.value.trim()
    });

    setStore("registrations", registrations);
    notify("Registration successful!", "success");
    window.location.href = "events.html";
  });
}

// Populate admin dashboard tables and stats.
function renderAdminDashboard() {
  const adminCard = document.getElementById("admin-stats");
  const adminTable = document.getElementById("admin-events");
  const registrationTable = document.getElementById("admin-registrations");
  if (!adminCard || !adminTable || !registrationTable) return;

  const events = getStore("events", []);
  const registrations = getStore("registrations", []);

  adminCard.innerHTML = `
    <div class="stat">
      <h3>Total Events</h3>
      <p>${events.length}</p>
    </div>
    <div class="stat">
      <h3>Total Registrations</h3>
      <p>${registrations.length}</p>
    </div>
  `;

  adminTable.innerHTML = events
    .map(
      (event) => `
      <tr>
        <td>${event.title}</td>
        <td>${event.club}</td>
        <td>${event.date}</td>
        <td>${event.venue}</td>
        <td>
          <a class="btn btn-outline" href="edit-event.html?id=${event.id}">Edit</a>
          <button class="btn btn-secondary" data-delete="${event.id}">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");

  registrationTable.innerHTML = registrations
    .map(
      (reg) => `
      <tr>
        <td>${reg.eventTitle}</td>
        <td>${reg.name}</td>
        <td>${reg.email}</td>
        <td>${reg.year}</td>
      </tr>
    `
    )
    .join("");

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.getAttribute("data-delete");
      const updated = events.filter((event) => event.id !== id);
      setStore("events", updated);
      renderAdminDashboard();
    });
  });
}

function createEvent(formId, isEdit = false) {
  const form = document.getElementById(formId);
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");
  const events = getStore("events", []);

  if (isEdit && editId) {
    const current = events.find((item) => item.id === editId);
    if (current) {
      form.querySelector("#eventTitle").value = current.title;
      form.querySelector("#eventCategory").value = current.category;
      form.querySelector("#eventDate").value = current.date;
      form.querySelector("#eventTime").value = current.time;
      form.querySelector("#eventClub").value = current.club || "";
      form.querySelector("#eventVenue").value = current.venue;
      form.querySelector("#eventSeats").value = current.seats;
      form.querySelector("#eventDescription").value = current.description;
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = form.querySelector("#eventTitle");
    const category = form.querySelector("#eventCategory");
    const date = form.querySelector("#eventDate");
    const time = form.querySelector("#eventTime");
    const club = form.querySelector("#eventClub");
    const venue = form.querySelector("#eventVenue");
    const seats = form.querySelector("#eventSeats");
    const description = form.querySelector("#eventDescription");

    const isValid = [
      window.validation.validateRequired(title, "Title is required."),
      window.validation.validateRequired(category, "Category is required."),
      window.validation.validateRequired(date, "Date is required."),
      window.validation.validateRequired(time, "Time is required."),
      window.validation.validateRequired(club, "Organizing club is required."),
      window.validation.validateRequired(venue, "Venue is required."),
      window.validation.validateRequired(seats, "Seats are required."),
      window.validation.validateRequired(description, "Description is required.")
    ].every(Boolean);

    if (!isValid) {
      return;
    }

    if (isEdit && editId) {
      const updated = events.map((item) =>
        item.id === editId
          ? {
              ...item,
              title: title.value.trim(),
              category: category.value.trim(),
              date: date.value,
              time: time.value,
              club: club.value.trim(),
              venue: venue.value.trim(),
              seats: Number(seats.value),
              description: description.value.trim()
            }
          : item
      );
      setStore("events", updated);
    } else {
      events.push({
        id: `EVT-${Date.now()}`,
        title: title.value.trim(),
        category: category.value.trim(),
        date: date.value,
        time: time.value,
        club: club.value.trim(),
        venue: venue.value.trim(),
        seats: Number(seats.value),
        description: description.value.trim()
      });
      setStore("events", events);
    }

    window.location.href = "admin-dashboard.html";
  });
}

seedEvents();
normalizeStoredEventDates();
window.events = {
  renderEvents,
  renderEventDetails,
  registerForEvent,
  renderAdminDashboard,
  createEvent,
  setupEventFilters,
  getStore,
  setStore,
  getEventRegistrationCount,
  hasAvailableSeats,
  seedEvents,
  getAllEvents: function() {
    return getStore("events", []);
  }
};

// Backward compatibility
window.eventsApi = window.events;

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

  async function getEventRegistrationCountApi(eventId) {
    const result = await apiRequest(`/registrations?eventId=${encodeURIComponent(eventId)}`);
    return result.data.length;
  }

  async function hasAvailableSeatsApi(event) {
    const count = await getEventRegistrationCountApi(event.id);
    return count < event.seats;
  }

  function renderEventSkeletons(grid, count = 6) {
    if (!grid) return;
    grid.innerHTML = "";
    for (let index = 0; index < count; index++) {
      const card = document.createElement("article");
      card.className = "skeleton-card";
      grid.appendChild(card);
    }
  }

  function syncFilterInputsFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const map = {
      search: "event-search",
      category: "event-category",
      club: "event-club",
      dateFrom: "event-date-from",
      dateTo: "event-date-to",
      capacity: "event-capacity",
      sort: "event-sort"
    };

    Object.entries(map).forEach(([paramKey, inputId]) => {
      const input = document.getElementById(inputId);
      if (!input) return;
      const value = params.get(paramKey);
      if (value != null) {
        input.value = value;
      }
    });
  }

  function syncUrlFromFilters(filters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      const normalized = String(value || "").trim();
      if (normalized) {
        params.set(key, normalized);
      }
    });

    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState({}, "", nextUrl);
  }

  function resetFilterInputs() {
    const ids = [
      "event-search",
      "event-category",
      "event-club",
      "event-date-from",
      "event-date-to",
      "event-capacity",
      "event-sort"
    ];

    ids.forEach((id) => {
      const input = document.getElementById(id);
      if (!input) return;
      input.value = id === "event-sort" ? "date-asc" : "";
    });
  }

  function getEventFiltersApi() {
    const searchInput = document.getElementById("event-search");
    const categoryInput = document.getElementById("event-category");
    const clubInput = document.getElementById("event-club");
    const dateFromInput = document.getElementById("event-date-from");
    const dateToInput = document.getElementById("event-date-to");
    const capacityInput = document.getElementById("event-capacity");
    const sortInput = document.getElementById("event-sort");

    return {
      search: searchInput ? searchInput.value.trim().toLowerCase() : "",
      category: categoryInput ? categoryInput.value.trim().toLowerCase() : "",
      club: clubInput ? clubInput.value.trim() : "",
      dateFrom: dateFromInput ? dateFromInput.value : "",
      dateTo: dateToInput ? dateToInput.value : "",
      capacity: capacityInput ? capacityInput.value : "",
      sort: sortInput ? sortInput.value : "date-asc"
    };
  }

  async function renderEventsApi() {
    const grid = document.getElementById("events-grid");
    if (!grid) return;

    renderEventSkeletons(grid);

    try {
      const [eventsResult, registrationsResult] = await Promise.all([
        apiRequest("/events"),
        apiRequest("/registrations")
      ]);

      const events = eventsResult.data;
      const registrations = registrationsResult.data;
      const filters = getEventFiltersApi();
      const currentUser = getStore("currentUser", null);
      const isLoggedIn = !!currentUser;

      const registrationCountMap = registrations.reduce((accumulator, registration) => {
        accumulator[registration.eventId] = (accumulator[registration.eventId] || 0) + 1;
        return accumulator;
      }, {});

      const filtered = events.filter((event) => {
        const search = filters.search
          ? `${event.title} ${event.description} ${event.venue}`
              .toLowerCase()
              .includes(filters.search)
          : true;
        const category = filters.category
          ? event.category.toLowerCase() === filters.category
          : true;
        const club = filters.club ? event.club === filters.club : true;

        let dateInRange = true;
        if (filters.dateFrom || filters.dateTo) {
          const eventDate = new Date(event.date);
          if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            dateInRange = dateInRange && eventDate >= fromDate;
          }
          if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            dateInRange = dateInRange && eventDate <= toDate;
          }
        }

        let capacity = true;
        const registrationCount = registrationCountMap[event.id] || 0;
        if (filters.capacity === "available") {
          capacity = registrationCount < event.seats;
        } else if (filters.capacity === "almost-full") {
          const occupancy = Math.round((registrationCount / event.seats) * 100);
          capacity = occupancy >= 80;
        }

        return search && category && club && dateInRange && capacity;
      });

      filtered.sort((left, right) => {
        const leftCount = registrationCountMap[left.id] || 0;
        const rightCount = registrationCountMap[right.id] || 0;
        const leftSeats = left.seats - leftCount;
        const rightSeats = right.seats - rightCount;

        switch (filters.sort) {
          case "date-desc":
            return String(right.date).localeCompare(String(left.date));
          case "seats-low":
            return leftSeats - rightSeats;
          case "seats-high":
            return rightSeats - leftSeats;
          case "title-asc":
            return String(left.title).localeCompare(String(right.title));
          case "date-asc":
          default:
            return String(left.date).localeCompare(String(right.date));
        }
      });

      syncUrlFromFilters(filters);

      grid.innerHTML = "";

      if (filtered.length === 0) {
        grid.innerHTML = "<p>No events available.</p>";
        return;
      }

      filtered.forEach((event) => {
        const card = document.createElement("article");
        card.className = "card";

        const registrationCount = registrationCountMap[event.id] || 0;
        const availableSeats = event.seats - registrationCount;
        const occupancyPercentage = Math.round((registrationCount / event.seats) * 100);
        const isFull = availableSeats <= 0;
        const isAlmostFull = occupancyPercentage >= 80;

        let registerButton;
        if (isFull) {
          registerButton = "<button class=\"btn btn-secondary\" disabled style=\"opacity: 0.6;\">Event Full</button>";
        } else if (isLoggedIn) {
          registerButton = `<a class=\"btn btn-outline\" href=\"event-register.html?id=${event.id}\">Register</a>`;
        } else {
          registerButton = "<a class=\"btn btn-outline\" href=\"login.html\" style=\"opacity: 0.7;\" title=\"Login required to register\">Register (Login Required)</a>";
        }

        const capacityColor = isFull ? "#b91c1c" : isAlmostFull ? "#f59e0b" : "#0f7a5c";

        card.innerHTML = `
          <span class="badge">${event.category}</span>
          <h3>${event.title}</h3>
          <p style="font-size: 14px; color: var(--primary); font-weight: 600; margin: 0;">📍 ${event.club}</p>
          <p class="meta">${event.date} | ${event.time}</p>
          <p>${event.description}</p>
          <div style="margin: 12px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: var(--muted); margin-bottom: 6px;">
              <span>Capacity</span>
              <span style="font-weight: 600; color: var(--text);">${registrationCount}/${event.seats} ${isFull ? "(FULL)" : `(${availableSeats} left)`}</span>
            </div>
            <div style="width: 100%; height: 8px; background: rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden;">
              <div style="height: 100%; width: ${occupancyPercentage}%; background: ${capacityColor}; transition: width 0.3s ease;"></div>
            </div>
          </div>
          <div class="hero-actions">
            <a class="btn btn-primary" href="event-details.html?id=${event.id}">View Details</a>
            ${registerButton}
          </div>
        `;

        grid.appendChild(card);
      });
    } catch (error) {
      grid.innerHTML = `<p>${error.message || "Unable to load events."}</p>`;
    }
  }

  function setupEventFiltersApi() {
    const searchInput = document.getElementById("event-search");
    const categoryInput = document.getElementById("event-category");
    const clubInput = document.getElementById("event-club");
    const dateFromInput = document.getElementById("event-date-from");
    const dateToInput = document.getElementById("event-date-to");
    const capacityInput = document.getElementById("event-capacity");
    const sortInput = document.getElementById("event-sort");
    const resetBtn = document.getElementById("event-reset");

    if (!searchInput || !categoryInput) return;

    syncFilterInputsFromUrl();

    [searchInput, categoryInput, clubInput, dateFromInput, dateToInput, capacityInput, sortInput].forEach((field) => {
      if (field) {
        field.addEventListener("input", () => {
          renderEventsApi();
        });
        field.addEventListener("change", () => {
          renderEventsApi();
        });
      }
    });

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        resetFilterInputs();
        renderEventsApi();
      });
    }
  }

  async function renderEventDetailsApi() {
    const details = document.getElementById("event-details");
    if (!details) return;

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    try {
      const [eventResult, registrationsResult] = await Promise.all([
        apiRequest(`/events/${encodeURIComponent(id)}`),
        apiRequest(`/registrations?eventId=${encodeURIComponent(id)}`)
      ]);
      const event = eventResult.data;

      const currentUser = getStore("currentUser", null);
      const isLoggedIn = !!currentUser;

      const registrationCount = registrationsResult.data.length;
      const availableSeats = event.seats - registrationCount;
      const occupancyPercentage = Math.round((registrationCount / event.seats) * 100);
      const isFull = availableSeats <= 0;

      const avgRating = window.reviews && window.reviews.getEventAverageRating
        ? await window.reviews.getEventAverageRating(event.id)
        : 0;
      const hasReviewed = currentUser && window.reviews && window.reviews.hasUserReviewed
        ? await window.reviews.hasUserReviewed(event.id, currentUser.email)
        : false;

      let registerButton;
      if (isFull) {
        registerButton = "<button class=\"btn btn-primary\" disabled style=\"opacity: 0.6;\">Event is Full - Join Waitlist</button>";
      } else if (isLoggedIn) {
        registerButton = `<a class="btn btn-primary" href="event-register.html?id=${event.id}">Register Now</a>`;
      } else {
        registerButton = "<a class=\"btn btn-primary\" href=\"login.html\" style=\"opacity: 0.7;\" title=\"Login required to register\">Register Now (Login Required)</a>";
      }

      let reviewButton = "";
      if (isLoggedIn && !hasReviewed && window.reviews) {
        reviewButton = `<button class="btn btn-secondary" onclick="window.reviews.showReviewForm('${event.id}', '${event.title.replace(/'/g, "\\'")}')">Write a Review</button>`;
      }

      details.innerHTML = `
        <h2>${event.title}</h2>
        ${Number(avgRating) > 0 ? `<p style="font-size: 16px; margin: 8px 0;"><span style="font-size: 18px; color: var(--secondary);">${window.reviews.renderStars(avgRating)}</span> <strong>${avgRating}</strong> rating</p>` : ""}
        <p style="font-size: 16px; color: var(--primary); font-weight: 600; margin: 12px 0;">📍 Organized by: ${event.club}</p>
        <p class="meta">${event.date} | ${event.time} | ${event.venue}</p>

        <div style="background: var(--bg-accent); padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 4px solid var(--primary);">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <p style="font-size: 12px; color: var(--muted); text-transform: uppercase; margin: 0;">Capacity</p>
              <p style="font-size: 20px; font-weight: 600; margin: 8px 0;">${registrationCount}/${event.seats}</p>
            </div>
            <div>
              <p style="font-size: 12px; color: var(--muted); text-transform: uppercase; margin: 0;">Available Seats</p>
              <p style="font-size: 20px; font-weight: 600; margin: 8px 0; ${isFull ? "color: var(--danger);" : "color: var(--secondary);"}">${isFull ? "FULL" : availableSeats}</p>
            </div>
          </div>
          <div style="width: 100%; height: 10px; background: rgba(0,0,0,0.1); border-radius: 5px; overflow: hidden;">
            <div style="height: 100%; width: ${occupancyPercentage}%; background: ${isFull ? "var(--danger)" : occupancyPercentage >= 80 ? "var(--accent)" : "var(--secondary)"}; transition: width 0.3s ease;"></div>
          </div>
          <p style="font-size: 12px; margin: 8px 0 0; color: var(--muted);">${occupancyPercentage}% Capacity</p>
        </div>

        <p>${event.description}</p>
        <div class="hero-actions">
          ${registerButton}
          ${reviewButton}
          <a class="btn btn-outline" href="events.html">Back to Events</a>
        </div>
      `;
    } catch (error) {
      details.innerHTML = `<p>${error.message || "Event not found."}</p>`;
    }
  }

  function registerForEventApi(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    const currentUser = getStore("currentUser", null);
    const alertDiv = document.getElementById("auth-alert");

    if (!currentUser) {
      form.style.display = "none";
      if (alertDiv) alertDiv.style.display = "block";
      return;
    }

    form.style.display = "block";
    if (alertDiv) alertDiv.style.display = "none";

    const nameField = form.querySelector("#studentName");
    const emailField = form.querySelector("#studentEmail");
    if (nameField) nameField.value = currentUser.fullName || "";
    if (emailField) emailField.value = currentUser.email || "";

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const params = new URLSearchParams(window.location.search);
      const eventId = params.get("id");

      const name = form.querySelector("#studentName");
      const email = form.querySelector("#studentEmail");
      const year = form.querySelector("#studentYear");

      const isValid = [
        window.validation.validateRequired(name, "Student name is required."),
        window.validation.validateRequired(email, "Email is required."),
        window.validation.validateEmail(email),
        window.validation.validateRequired(year, "Year is required.")
      ].every(Boolean);

      if (!isValid) {
        return;
      }

      try {
        await apiRequest("/registrations", {
          method: "POST",
          body: JSON.stringify({
            eventId,
            name: name.value.trim(),
            email: email.value.trim(),
            year: year.value.trim()
          })
        });

        notify("Registration successful!", "success");
        window.location.href = "events.html";
      } catch (error) {
        notify(error.message || "Registration failed.", "error");
      }
    });
  }

  async function renderAdminDashboardApi() {
    const adminCard = document.getElementById("admin-stats");
    const adminTable = document.getElementById("admin-events");
    const registrationTable = document.getElementById("admin-registrations");
    const adminEventsCards = document.getElementById("admin-events-cards");
    const adminRegistrationsCards = document.getElementById("admin-registrations-cards");
    if (!adminCard || !adminTable || !registrationTable) return;

    adminCard.innerHTML = "<article class='skeleton-card'></article><article class='skeleton-card'></article>";

    try {
      const result = await apiRequest("/dashboard");
      const { totalEvents, totalRegistrations, events, registrations } = result.data;

      adminCard.innerHTML = `
        <div class="stat">
          <h3>Total Events</h3>
          <p>${totalEvents}</p>
        </div>
        <div class="stat">
          <h3>Total Registrations</h3>
          <p>${totalRegistrations}</p>
        </div>
      `;

      adminTable.innerHTML = events
        .map(
          (event) => `
          <tr>
            <td>${event.title}</td>
            <td>${event.club}</td>
            <td>${event.date}</td>
            <td>${event.venue}</td>
            <td>
              <a class="btn btn-outline" href="edit-event.html?id=${event.id}">Edit</a>
              <button class="btn btn-secondary" data-delete="${event.id}">Delete</button>
            </td>
          </tr>
        `
        )
        .join("");

      registrationTable.innerHTML = registrations
        .map(
          (reg) => `
          <tr>
            <td>${reg.eventTitle}</td>
            <td>${reg.name}</td>
            <td>${reg.email}</td>
            <td>${reg.year}</td>
          </tr>
        `
        )
        .join("");

      if (adminEventsCards) {
        adminEventsCards.innerHTML = events
          .map(
            (event) => `
            <article class="admin-card">
              <p class="meta-label">Event</p>
              <p><strong>${event.title}</strong></p>
              <p class="meta-label">Club</p>
              <p>${event.club}</p>
              <p class="meta-label">Date & Venue</p>
              <p>${event.date} | ${event.venue}</p>
              <div class="hero-actions">
                <a class="btn btn-outline" href="edit-event.html?id=${event.id}">Edit</a>
                <button class="btn btn-secondary" data-delete="${event.id}">Delete</button>
              </div>
            </article>
          `
          )
          .join("");
      }

      if (adminRegistrationsCards) {
        adminRegistrationsCards.innerHTML = registrations
          .map(
            (reg) => `
            <article class="admin-card">
              <p class="meta-label">Event</p>
              <p><strong>${reg.eventTitle}</strong></p>
              <p class="meta-label">Student</p>
              <p>${reg.name}</p>
              <p class="meta-label">Email</p>
              <p>${reg.email}</p>
              <p class="meta-label">Year</p>
              <p>${reg.year}</p>
            </article>
          `
          )
          .join("");
      }

      document.querySelectorAll("[data-delete]").forEach((button) => {
        button.addEventListener("click", async () => {
          const id = button.getAttribute("data-delete");
          try {
            await apiRequest(`/events/${encodeURIComponent(id)}`, {
              method: "DELETE"
            });
            renderAdminDashboardApi();
          } catch (error) {
            notify(error.message || "Failed to delete event.", "error");
          }
        });
      });
    } catch (error) {
      adminCard.innerHTML = `<p>${error.message || "Unable to load dashboard."}</p>`;
    }
  }

  function createEventApi(formId, isEdit = false) {
    const form = document.getElementById(formId);
    if (!form) return;

    const params = new URLSearchParams(window.location.search);
    const editId = params.get("id");

    if (isEdit && editId) {
      apiRequest(`/events/${encodeURIComponent(editId)}`)
        .then((result) => {
          const current = result.data;
          form.querySelector("#eventTitle").value = current.title;
          form.querySelector("#eventCategory").value = current.category;
          form.querySelector("#eventDate").value = current.date;
          form.querySelector("#eventTime").value = current.time;
          if (form.querySelector("#eventClub")) {
            form.querySelector("#eventClub").value = current.club || "";
          }
          form.querySelector("#eventVenue").value = current.venue;
          form.querySelector("#eventSeats").value = current.seats;
          form.querySelector("#eventDescription").value = current.description;
        })
        .catch(() => {
          notify("Event not found.", "error");
          window.location.href = "admin-dashboard.html";
        });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const title = form.querySelector("#eventTitle");
      const category = form.querySelector("#eventCategory");
      const date = form.querySelector("#eventDate");
      const time = form.querySelector("#eventTime");
      const club = form.querySelector("#eventClub");
      const venue = form.querySelector("#eventVenue");
      const seats = form.querySelector("#eventSeats");
      const description = form.querySelector("#eventDescription");

      const isValid = [
        window.validation.validateRequired(title, "Title is required."),
        window.validation.validateRequired(category, "Category is required."),
        window.validation.validateRequired(date, "Date is required."),
        window.validation.validateRequired(time, "Time is required."),
        club ? window.validation.validateRequired(club, "Organizing club is required.") : true,
        window.validation.validateRequired(venue, "Venue is required."),
        window.validation.validateRequired(seats, "Seats are required."),
        window.validation.validateRequired(description, "Description is required.")
      ].every(Boolean);

      if (!isValid) {
        return;
      }

      const body = {
        title: title.value.trim(),
        category: category.value.trim(),
        date: date.value,
        time: time.value,
        club: club ? club.value.trim() : "General",
        venue: venue.value.trim(),
        seats: Number(seats.value),
        description: description.value.trim()
      };

      try {
        if (isEdit && editId) {
          await apiRequest(`/events/${encodeURIComponent(editId)}`, {
            method: "PUT",
            body: JSON.stringify(body)
          });
        } else {
          await apiRequest("/events", {
            method: "POST",
            body: JSON.stringify(body)
          });
        }

        notify(isEdit ? "Event updated successfully." : "Event created successfully.", "success");
        window.location.href = "admin-dashboard.html";
      } catch (error) {
        notify(error.message || "Failed to save event.", "error");
      }
    });
  }

  window.events = {
    ...window.events,
    renderEvents: renderEventsApi,
    renderEventDetails: renderEventDetailsApi,
    registerForEvent: registerForEventApi,
    renderAdminDashboard: renderAdminDashboardApi,
    createEvent: createEventApi,
    setupEventFilters: setupEventFiltersApi,
    getEventRegistrationCount: getEventRegistrationCountApi,
    hasAvailableSeats: hasAvailableSeatsApi,
    seedEvents: function() {},
    getAllEvents: async function() {
      const result = await apiRequest("/events");
      return result.data;
    }
  };

  window.eventsApi = window.events;
})();
