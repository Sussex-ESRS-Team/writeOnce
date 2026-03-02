const hankoAuth = document.getElementById("auth-form");
const dashboard = document.getElementById("dashboard");
const userEmail = document.getElementById("user-email");
const authBtn = document.getElementById("auth-btn") as HTMLButtonElement;
const toggleBtn = document.getElementById("toggle-btn") as HTMLButtonElement;

let isSignUp = false;

// Hash password using Web Crypto API (PBKDF2)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = encoder.encode("writeonce-salt"); // Fixed salt for simplicity

  const key = await crypto.subtle.importKey("raw", data, "PBKDF2", false, [
    "deriveBits",
  ]);

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );

  // Convert to hex string
  const derivedArray = new Uint8Array(derivedBits);
  return Array.from(derivedArray)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Function to show dashboard
function showDashboard(email: string) {
  hankoAuth?.classList.remove("active");
  dashboard?.classList.add("active");
  if (userEmail) {
    userEmail.textContent = `Logged in as: ${email}`;
  }
}

// Function to show login
function showLogin() {
  hankoAuth?.classList.add("active");
  dashboard?.classList.remove("active");
  isSignUp = false;
  updateAuthUI();
}

// Toggle between login and signup
window.toggleSignUp = function () {
  isSignUp = !isSignUp;
  updateAuthUI();
};

// Update UI based on login/signup mode
function updateAuthUI() {
  if (authBtn) {
    authBtn.textContent = isSignUp ? "Sign Up" : "Login";
  }
  if (toggleBtn) {
    toggleBtn.textContent = isSignUp ? "Back to Login" : "Sign Up";
  }
}

// Handle authentication (login or signup)
window.handleAuth = async function (event: Event) {
  event.preventDefault();
  const emailInput = document.getElementById("email") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;

  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please fill in all fields");
    return false;
  }

  // Get all users from localStorage
  const usersJson = localStorage.getItem("users");
  const users: { [key: string]: string } = usersJson
    ? JSON.parse(usersJson)
    : {};

  if (isSignUp) {
    // Sign up mode
    if (users[email]) {
      alert("Account already exists with this email");
      return false;
    }
    // Hash password before storing
    const hashedPassword = await hashPassword(password);
    users[email] = hashedPassword;
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("currentUser", email);
    showDashboard(email);
    emailInput.value = "";
    passwordInput.value = "";
  } else {
    // Login mode
    if (!users[email]) {
      alert("Invalid email or password");
      return false;
    }
    // Compare password with stored hash
    const hashedPassword = await hashPassword(password);
    if (hashedPassword !== users[email]) {
      alert("Invalid email or password");
      return false;
    }
    localStorage.setItem("currentUser", email);
    showDashboard(email);
    emailInput.value = "";
    passwordInput.value = "";
  }

  return false;
};

// Logout function
window.logout = function () {
  localStorage.removeItem("currentUser");
  showLogin();
};

// Check if user is already logged in
function checkAuth() {
  const currentUser = localStorage.getItem("currentUser");
  if (currentUser) {
    showDashboard(currentUser);
  } else {
    showLogin();
  }
}

// Initialize on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();
    checkAuth();
  });
} else {
  updateAuthUI();
  checkAuth();
}
