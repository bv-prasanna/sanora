const menu = document.querySelector(".menu-toggle");
if (menu) {
  menu.addEventListener("click", () => {
    let nav = document.querySelector(".mobile-nav");
    if (nav) { nav.remove(); return; }
    nav = document.createElement("nav");
    nav.className = "mobile-nav";
    nav.innerHTML = '<a href="#approach">Our approach</a><a href="#services">Services</a><a href="#work">Selected work</a><a href="#process">How it works</a><a href="#contact">Contact</a>';
    document.querySelector(".site-header").after(nav);
    nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => nav.remove()));
  });
}
document.getElementById("year").textContent = new Date().getFullYear();

const form = document.getElementById("enquiryForm");
form?.addEventListener("submit", async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const button = formElement.querySelector('button[type="submit"]');
  const note = document.getElementById("formNote");
  const data = new FormData(formElement);
  const payload = {
    name: data.get("name"),
    phone: data.get("phone"),
    email: data.get("email") || undefined,
    interest: data.get("interest"),
    message: data.get("message") || undefined,
    companyWebsite: data.get("companyWebsite") || ""
  };
  const apiBase = (window.SANORA_API_BASE_URL || document.querySelector('meta[name="api-base-url"]')?.content?.trim() || (window.location.origin + "/api")).replace(/\/+$/, "");
  button.disabled = true;
  button.textContent = "Sending enquiry…";
  note.textContent = "Submitting your enquiry securely…";
  try {
    const response = await fetch(apiBase + "/public/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.error?.message || "We could not submit your enquiry. Please try again or call +91 82960 22107.");
    formElement.reset();
    note.textContent = result.message || "Thank you. The Sanora team will contact you shortly.";
    note.dataset.kind = "success";
  } catch (error) {
    note.textContent = error.message || "Unable to submit right now. Please email info@sanoraspaces.com or call +91 82960 22107.";
    note.dataset.kind = "error";
  } finally {
    button.disabled = false;
    button.innerHTML = 'Send enquiry <span>↗</span>';
  }
});
