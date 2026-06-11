// Srishti AI - Authentication & User Session Manager

const AUTH_USERS_KEY = "srishti_users";
const AUTH_SESSION_KEY = "srishti_session";
const CHAT_HISTORY_KEY_PREFIX = "srishti_history_";

// ─────────────────────────────────────────────────
// User Management
// ─────────────────────────────────────────────────

function hashPassword(password) {
  // Simple deterministic hash for demo (NOT production-grade)
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + password.length.toString(36);
}

function getAllUsers() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveAllUsers(users) {
  localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
}

function registerUser(name, email, password) {
  const users = getAllUsers();
  const key = email.toLowerCase().trim();

  if (users[key]) {
    return {
      success: false,
      error: "An account with this email already exists.",
    };
  }

  const user = {
    id: `user_${Date.now()}`,
    name: name.trim(),
    email: key,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
    avatar: name.trim().charAt(0).toUpperCase(),
  };

  users[key] = user;
  saveAllUsers(users);
  startSession(user);
  return { success: true, user };
}

function loginUser(email, password) {
  const users = getAllUsers();
  const key = email.toLowerCase().trim();
  const user = users[key];

  if (!user) {
    return { success: false, error: "No account found with this email." };
  }

  if (user.passwordHash !== hashPassword(password)) {
    return { success: false, error: "Incorrect password. Please try again." };
  }

  startSession(user);
  return { success: true, user };
}

function startSession(user) {
  const session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    loginTime: new Date().toISOString(),
  };
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function logoutUser() {
  localStorage.removeItem(AUTH_SESSION_KEY);
}

function isLoggedIn() {
  return getSession() !== null;
}

// ─────────────────────────────────────────────────
// Chat History Manager
// ─────────────────────────────────────────────────

function getHistoryKey(email) {
  return `${CHAT_HISTORY_KEY_PREFIX}${email.toLowerCase()}`;
}

function getChatHistory(email) {
  try {
    return JSON.parse(localStorage.getItem(getHistoryKey(email)) || "[]");
  } catch {
    return [];
  }
}

function saveChatSession(email, sessionData) {
  const history = getChatHistory(email);
  history.unshift(sessionData); // newest first
  // Keep only last 30 sessions
  if (history.length > 30) history.splice(30);
  localStorage.setItem(getHistoryKey(email), JSON.stringify(history));
}

function deleteChatSession(email, sessionId) {
  const history = getChatHistory(email);
  const filtered = history.filter((s) => s.id !== sessionId);
  localStorage.setItem(getHistoryKey(email), JSON.stringify(filtered));
}

function clearAllHistory(email) {
  localStorage.removeItem(getHistoryKey(email));
}

// ─────────────────────────────────────────────────
// Auth UI Controller
// ─────────────────────────────────────────────────

function initAuthUI(onLoginSuccess) {
  // Show auth screen if not logged in
  if (!isLoggedIn()) {
    showAuthScreen(onLoginSuccess);
    return false;
  }
  // Already logged in — show main app, hydrate user UI and proceed
  hideAuthScreen();
  hydrateUserUI();
  return true;
}

function showAuthScreen(onLoginSuccess) {
  const screen = document.getElementById("auth-screen");
  if (screen) screen.classList.remove("hidden");
  document.getElementById("app-container-main").classList.add("hidden");

  setupAuthForms(onLoginSuccess);
}

function hideAuthScreen() {
  const screen = document.getElementById("auth-screen");
  if (screen) screen.classList.add("hidden");
  document.getElementById("app-container-main").classList.remove("hidden");
}

function hydrateUserUI() {
  const session = getSession();
  if (!session) return;

  // Update user avatar and name in the sidebar
  const userAvatar = document.getElementById("user-avatar-initials");
  const userName = document.getElementById("user-display-name");
  const userEmail = document.getElementById("user-display-email");

  if (userAvatar) userAvatar.textContent = session.avatar;
  if (userName) userName.textContent = session.name;
  if (userEmail) userEmail.textContent = session.email;
}

function setupAuthForms(onLoginSuccess) {
  // Tab switching
  const tabLogin = document.getElementById("auth-tab-login");
  const tabSignup = document.getElementById("auth-tab-signup");
  const formLogin = document.getElementById("auth-form-login");
  const formSignup = document.getElementById("auth-form-signup");

  tabLogin?.addEventListener("click", () => {
    tabLogin.classList.add("active");
    tabSignup.classList.remove("active");
    formLogin.classList.remove("hidden");
    formSignup.classList.add("hidden");
    clearAuthError();
  });

  tabSignup?.addEventListener("click", () => {
    tabSignup.classList.add("active");
    tabLogin.classList.remove("active");
    formSignup.classList.remove("hidden");
    formLogin.classList.add("hidden");
    clearAuthError();
  });

  // Login form
  document.getElementById("btn-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value;

    if (!email || !password) {
      showAuthError("Please fill in all fields.");
      return;
    }

    const result = loginUser(email, password);
    if (result.success) {
      hideAuthScreen();
      hydrateUserUI();
      onLoginSuccess();
    } else {
      showAuthError(result.error);
    }
  });

  // Signup form
  document.getElementById("btn-signup")?.addEventListener("click", (e) => {
    e.preventDefault();
    const name = document.getElementById("signup-name")?.value.trim();
    const email = document.getElementById("signup-email")?.value.trim();
    const password = document.getElementById("signup-password")?.value;
    const confirm = document.getElementById("signup-confirm")?.value;

    if (!name || !email || !password || !confirm) {
      showAuthError("Please fill in all fields.");
      return;
    }

    if (password !== confirm) {
      showAuthError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      showAuthError("Password must be at least 6 characters.");
      return;
    }

    const result = registerUser(name, email, password);
    if (result.success) {
      hideAuthScreen();
      hydrateUserUI();
      onLoginSuccess();
    } else {
      showAuthError(result.error);
    }
  });

  // Enter key support
  document
    .getElementById("login-password")
    ?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("btn-login")?.click();
    });
  document
    .getElementById("signup-confirm")
    ?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") document.getElementById("btn-signup")?.click();
    });

  // Demo login button
  document.getElementById("btn-demo-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    // Auto-create demo account or login
    const demoEmail = "demo@srishti.ai";
    const demoPass = "demo1234";
    let result = loginUser(demoEmail, demoPass);
    if (!result.success) {
      result = registerUser("Demo User", demoEmail, demoPass);
    }
    if (result.success) {
      hideAuthScreen();
      hydrateUserUI();
      onLoginSuccess();
    }
  });
}

function showAuthError(message) {
  const errEl = document.getElementById("auth-error");
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.remove("hidden");
  }
}

function clearAuthError() {
  const errEl = document.getElementById("auth-error");
  if (errEl) {
    errEl.textContent = "";
    errEl.classList.add("hidden");
  }
}
