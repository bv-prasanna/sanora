(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  if (token) window.history.replaceState({}, document.title, window.location.pathname);
  const form = document.getElementById("activationForm");
  const button = document.getElementById("activateButton");
  const message = document.getElementById("activationMessage");
  const signIn = document.getElementById("signInLink");
  const apiBase = (window.SANORA_API_BASE_URL || document.querySelector('meta[name="api-base-url"]')?.content?.trim() || (window.location.origin + "/api")).replace(/\/+$/, "");
  if (!token) {
    form.hidden = true;
    message.textContent = "This invitation link is missing its activation token. Ask the Sanora team for a new link.";
    message.dataset.kind = "error";
    return;
  }
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const password = document.getElementById("password").value;
    const confirmation = document.getElementById("confirmPassword").value;
    if (password.length < 12) {
      message.textContent = "Choose a password with at least 12 characters.";
      message.dataset.kind = "error"; return;
    }
    if (password !== confirmation) {
      message.textContent = "The passwords do not match.";
      message.dataset.kind = "error"; return;
    }
    button.disabled = true; button.textContent = "Activating…"; message.textContent = "";
    try {
      const response = await fetch(apiBase + "/public/customer-invitations/accept", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.error?.message || "We could not activate this account.");
      message.textContent = result.message || "Your account is active. You can now sign in.";
      message.dataset.kind = "success";
      document.getElementById("password").value = "";
      document.getElementById("confirmPassword").value = "";
      signIn.hidden = false; button.hidden = true;
    } catch (error) {
      message.textContent = error.message;
      message.dataset.kind = "error";
    } finally {
      button.disabled = false;
      if (!button.hidden) button.textContent = "Activate account";
    }
  });
})();
