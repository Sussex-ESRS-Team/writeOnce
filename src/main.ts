const hankoAuth = document.getElementById("auth-form");
const dashboard = document.getElementById("dashboard");
const userEmail = document.getElementById("user-email");
const authBtn = document.getElementById("auth-btn") as HTMLButtonElement;
const toggleBtn = document.getElementById("toggle-btn") as HTMLButtonElement;

let isSignUp = false;

function showDashboard(email: string) {
  hankoAuth?.classList.remove("active");
  dashboard?.classList.add("active");
  if (userEmail) {
    userEmail.textContent = `Logged in as: ${email}`;
  }
}

function showLogin() {
  hankoAuth?.classList.add("active");
  dashboard?.classList.remove("active");
  isSignUp = false;
  updateAuthUI();
}

function updateAuthUI() {
  if (authBtn) {
    authBtn.textContent = isSignUp ? "Sign Up" : "Login";
  }
  if (toggleBtn) {
    toggleBtn.textContent = isSignUp ? "Back to Login" : "Sign Up";
  }
}

window.toggleSignUp = function () {
  isSignUp = !isSignUp;
  updateAuthUI();
};

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

  const endpoint = isSignUp ? "/api/auth/signup" : "/api/auth/login";

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = (await res
      .json()
      .catch(() => ({ error: "Unknown error" }))) as { error?: string };
    alert(body.error ?? "Unknown error");
    return false;
  }

  emailInput.value = "";
  passwordInput.value = "";
  showDashboard(email);
  return false;
};

window.logout = async function () {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  showLogin();
};

async function checkAuth() {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (res.ok) {
    const body = (await res.json()) as { email: string };
    showDashboard(body.email);
  } else {
    showLogin();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    updateAuthUI();
    checkAuth();
  });
} else {
  updateAuthUI();
  checkAuth();
}
