// Event Reviews Module
function getReviewsData(key, fallback) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
}

function setReviewsData(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function notify(message, type = "info") {
  if (window.ui && typeof window.ui.notify === "function") {
    window.ui.notify(message, type);
    return;
  }
  window.alert(message);
}

// Get average rating for an event
function getEventAverageRating(eventId) {
  const reviews = getReviewsData("eventReviews", []);
  const eventReviews = reviews.filter((r) => r.eventId === eventId);
  if (eventReviews.length === 0) return 0;
  const total = eventReviews.reduce((sum, r) => sum + r.rating, 0);
  return (total / eventReviews.length).toFixed(1);
}

// Get all reviews for an event
function getEventReviews(eventId) {
  const reviews = getReviewsData("eventReviews", []);
  return reviews.filter((r) => r.eventId === eventId).sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Check if user already reviewed an event
function hasUserReviewed(eventId, userEmail) {
  const reviews = getReviewsData("eventReviews", []);
  return reviews.some((r) => r.eventId === eventId && r.email === userEmail);
}

// Add a review
function addReview(eventId, eventTitle, userEmail, userName, rating, reviewText) {
  const reviews = getReviewsData("eventReviews", []);
  const today = new Date().toISOString().split("T")[0];
  
  reviews.push({
    id: `REV-${Date.now()}`,
    eventId,
    eventTitle,
    email: userEmail,
    name: userName,
    rating: Math.min(5, Math.max(1, parseInt(rating))),
    review: reviewText.trim(),
    date: today
  });
  
  setReviewsData("eventReviews", reviews);
}

// Render star rating display
function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  let stars = "";
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars += "★";
    } else if (i === fullStars && hasHalf) {
      stars += "✪";
    } else {
      stars += "☆";
    }
  }
  
  return stars;
}

// Display reviews for an event
function displayEventReviews(eventId) {
  const reviewsContainer = document.getElementById("event-reviews");
  const reviewFormContainer = document.getElementById("review-form-container");
  const currentUser = getReviewsData("currentUser", null);
  
  if (!reviewsContainer) return;
  
  const reviews = getEventReviews(eventId);
  const avgRating = getEventAverageRating(eventId);
  
  let html = `
    <h3>Reviews & Ratings</h3>
    <div style="display: grid; grid-template-columns: auto 1fr; gap: 20px; margin-bottom: 30px; align-items: center;">
      <div style="text-align: center;">
        <p style="font-size: 36px; font-weight: 700; margin: 0;">${avgRating}</p>
        <p style="font-size: 18px; color: var(--secondary); margin: 4px 0;">${renderStars(avgRating)}</p>
        <p style="font-size: 12px; color: var(--muted); margin: 8px 0;">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</p>
      </div>
      <div></div>
    </div>
  `;
  
  if (reviews.length === 0) {
    html += '<p style="color: var(--muted);">No reviews yet. Be the first to review this event!</p>';
  } else {
    html += '<div style="display: grid; gap: 16px;">';
    reviews.forEach((review) => {
      html += `
        <div style="padding: 16px; background: var(--bg-accent); border-radius: 12px; border-left: 4px solid #f59e0b;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div>
              <p style="font-weight: 600; margin: 0;">${review.name}</p>
              <p style="font-size: 12px; color: var(--muted); margin: 4px 0;">${review.date}</p>
            </div>
            <p style="font-size: 16px; color: var(--secondary); margin: 0;">${renderStars(review.rating)}</p>
          </div>
          <p style="margin: 0; color: var(--text); line-height: 1.6;">${review.review}</p>
        </div>
      `;
    });
    html += '</div>';
  }
  
  reviewsContainer.innerHTML = html;
}

// Show review form for users
function showReviewForm(eventId, eventTitle) {
  const currentUser = getReviewsData("currentUser", null);
  
  if (!currentUser) {
    notify("Please login to leave a review.", "warning");
    return;
  }
  
  if (hasUserReviewed(eventId, currentUser.email)) {
    notify("You have already reviewed this event.", "warning");
    return;
  }
  
  const reviewForm = document.getElementById("review-form-container");
  if (!reviewForm) return;
  
  reviewForm.innerHTML = `
    <h3>Leave a Review</h3>
    <form id="event-review-form" style="display: grid; gap: 16px;">
      <div>
        <label for="review-rating">Rating</label>
        <select id="review-rating" required style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #d1d5db;">
          <option value="">Select rating</option>
          <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
          <option value="4">⭐⭐⭐⭐ Good</option>
          <option value="3">⭐⭐⭐ Average</option>
          <option value="2">⭐⭐ Not Great</option>
          <option value="1">⭐ Poor</option>
        </select>
      </div>
      <div>
        <label for="review-text">Your Review</label>
        <textarea id="review-text" placeholder="Share your experience..." style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #d1d5db; min-height: 100px; font-family: inherit;"></textarea>
      </div>
      <button type="submit" class="btn btn-primary" style="align-self: flex-start;">Post Review</button>
    </form>
  `;
  
  const form = document.getElementById("event-review-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const rating = form.querySelector("#review-rating").value;
    const text = form.querySelector("#review-text").value;
    
    if (!rating) {
      notify("Please select a rating.", "warning");
      return;
    }
    
    if (!text.trim()) {
      notify("Please enter a review.", "warning");
      return;
    }
    
    addReview(eventId, eventTitle, currentUser.email, currentUser.fullName, rating, text);
    notify("Review posted successfully!", "success");
    
    form.style.display = "none";
    displayEventReviews(eventId);
  });
}

// Export reviews API
window.reviews = {
  getEventAverageRating,
  getEventReviews,
  displayEventReviews,
  showReviewForm,
  hasUserReviewed
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

  function renderStarsApi(rating) {
    const numericRating = Number(rating) || 0;
    const fullStars = Math.floor(numericRating);
    const hasHalf = numericRating % 1 >= 0.5;
    let stars = "";

    for (let index = 0; index < 5; index++) {
      if (index < fullStars) {
        stars += "★";
      } else if (index === fullStars && hasHalf) {
        stars += "✪";
      } else {
        stars += "☆";
      }
    }

    return stars;
  }

  async function getEventReviewsApi(eventId) {
    const result = await apiRequest(`/reviews?eventId=${encodeURIComponent(eventId)}`);
    return result.data.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  async function getEventAverageRatingApi(eventId) {
    const reviews = await getEventReviewsApi(eventId);
    if (reviews.length === 0) return 0;
    const total = reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0);
    return (total / reviews.length).toFixed(1);
  }

  async function hasUserReviewedApi(eventId, userEmail) {
    if (!userEmail) return false;
    const reviews = await getEventReviewsApi(eventId);
    return reviews.some((item) => item.email.toLowerCase() === String(userEmail).toLowerCase());
  }

  async function addReviewApi(eventId, eventTitle, userEmail, userName, rating, reviewText) {
    const result = await apiRequest("/reviews", {
      method: "POST",
      body: JSON.stringify({
        eventId,
        eventTitle,
        email: userEmail,
        name: userName,
        rating,
        review: reviewText
      })
    });
    return result.data;
  }

  async function displayEventReviewsApi(eventId) {
    const reviewsContainer = document.getElementById("event-reviews");
    if (!reviewsContainer) return;

    try {
      const [reviews, avgRating] = await Promise.all([
        getEventReviewsApi(eventId),
        getEventAverageRatingApi(eventId)
      ]);

      let html = `
        <h3>Reviews & Ratings</h3>
        <div style="display: grid; grid-template-columns: auto 1fr; gap: 20px; margin-bottom: 30px; align-items: center;">
          <div style="text-align: center;">
            <p style="font-size: 36px; font-weight: 700; margin: 0;">${avgRating}</p>
            <p style="font-size: 18px; color: var(--secondary); margin: 4px 0;">${renderStarsApi(avgRating)}</p>
            <p style="font-size: 12px; color: var(--muted); margin: 8px 0;">${reviews.length} review${reviews.length !== 1 ? "s" : ""}</p>
          </div>
          <div></div>
        </div>
      `;

      if (reviews.length === 0) {
        html += '<p style="color: var(--muted);">No reviews yet. Be the first to review this event!</p>';
      } else {
        html += '<div style="display: grid; gap: 16px;">';
        reviews.forEach((review) => {
          html += `
            <div style="padding: 16px; background: var(--bg-accent); border-radius: 12px; border-left: 4px solid #f59e0b;">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                <div>
                  <p style="font-weight: 600; margin: 0;">${review.name}</p>
                  <p style="font-size: 12px; color: var(--muted); margin: 4px 0;">${review.date}</p>
                </div>
                <p style="font-size: 16px; color: var(--secondary); margin: 0;">${renderStarsApi(review.rating)}</p>
              </div>
              <p style="margin: 0; color: var(--text); line-height: 1.6;">${review.review}</p>
            </div>
          `;
        });
        html += "</div>";
      }

      reviewsContainer.innerHTML = html;
    } catch (error) {
      reviewsContainer.innerHTML = `<p>${error.message || "Unable to load reviews."}</p>`;
    }
  }

  async function showReviewFormApi(eventId, eventTitle) {
    const currentUser = localStorage.getItem("currentUser")
      ? JSON.parse(localStorage.getItem("currentUser"))
      : null;

    if (!currentUser) {
      notify("Please login to leave a review.", "warning");
      return;
    }

    try {
      const reviewed = await hasUserReviewedApi(eventId, currentUser.email);
      if (reviewed) {
        notify("You have already reviewed this event.", "warning");
        return;
      }

      const reviewForm = document.getElementById("review-form-container");
      if (!reviewForm) return;

      reviewForm.innerHTML = `
        <h3>Leave a Review</h3>
        <form id="event-review-form" style="display: grid; gap: 16px;">
          <div>
            <label for="review-rating">Rating</label>
            <select id="review-rating" required style="width: 100%; padding: 10px 12px; border-radius: 8px; border: 1px solid #d1d5db;">
              <option value="">Select rating</option>
              <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
              <option value="4">⭐⭐⭐⭐ Good</option>
              <option value="3">⭐⭐⭐ Average</option>
              <option value="2">⭐⭐ Not Great</option>
              <option value="1">⭐ Poor</option>
            </select>
          </div>
          <div>
            <label for="review-text">Your Review</label>
            <textarea id="review-text" placeholder="Share your experience..." style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #d1d5db; min-height: 100px; font-family: inherit;"></textarea>
          </div>
          <button type="submit" class="btn btn-primary" style="align-self: flex-start;">Post Review</button>
        </form>
      `;

      const form = document.getElementById("event-review-form");
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const rating = form.querySelector("#review-rating").value;
        const text = form.querySelector("#review-text").value;

        if (!rating) {
          notify("Please select a rating.", "warning");
          return;
        }

        if (!text.trim()) {
          notify("Please enter a review.", "warning");
          return;
        }

        try {
          await addReviewApi(eventId, eventTitle, currentUser.email, currentUser.fullName, rating, text.trim());
          notify("Review posted successfully!", "success");
          form.style.display = "none";
          displayEventReviewsApi(eventId);
        } catch (error) {
          notify(error.message || "Failed to post review.", "error");
        }
      });
    } catch (error) {
      notify(error.message || "Unable to open review form.", "error");
    }
  }

  window.reviews = {
    ...window.reviews,
    getEventAverageRating: getEventAverageRatingApi,
    getEventReviews: getEventReviewsApi,
    displayEventReviews: displayEventReviewsApi,
    showReviewForm: showReviewFormApi,
    hasUserReviewed: hasUserReviewedApi,
    renderStars: renderStarsApi
  };
})();
