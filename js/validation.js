const validators = {
  email(value) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(value);
  },
  password(value) {
    const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    return pattern.test(value);
  }
};

function showError(field, message) {
  const error = field.parentElement.querySelector(".error-text");
  if (error) {
    error.textContent = message;
  }
}

function clearError(field) {
  const error = field.parentElement.querySelector(".error-text");
  if (error) {
    error.textContent = "";
  }
}

function validateRequired(field, message) {
  if (!field.value.trim()) {
    showError(field, message);
    return false;
  }
  clearError(field);
  return true;
}

function validateEmail(field) {
  if (!validators.email(field.value.trim())) {
    showError(field, "Enter a valid email address.");
    return false;
  }
  clearError(field);
  return true;
}

function validatePassword(field) {
  if (!validators.password(field.value)) {
    showError(
      field,
      "Password must be 8+ chars and include upper, lower, number, special."
    );
    return false;
  }
  clearError(field);
  return true;
}

function validateConfirmPassword(passwordField, confirmField) {
  if (passwordField.value !== confirmField.value) {
    showError(confirmField, "Passwords do not match.");
    return false;
  }
  clearError(confirmField);
  return true;
}

function attachValidation(formId, handlers) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener("submit", (event) => {
    const isValid = handlers.every((handler) => handler());
    if (!isValid) {
      event.preventDefault();
    }
  });
}

window.validation = {
  attachValidation,
  validateRequired,
  validateEmail,
  validatePassword,
  validateConfirmPassword
};
