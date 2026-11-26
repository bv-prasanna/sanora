(() => {
  const metaApi = document.querySelector('meta[name="api-base-url"]')?.content?.trim();
  const API = (window.SANORA_API_BASE_URL || metaApi || (window.location.origin + "/api")).replace(/\/+$/, "");
  const $ = (selector) => document.querySelector(selector);
  const tokenKey = "sanora_customer_session";
  let token = sessionStorage.getItem(tokenKey);
  let currentUser = null;
  let projects = [];
  const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
  const date = (value) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)) : "—";
  const titleCase = (value) => String(value || "—").toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const initials = (name) => String(name || "S").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();
  const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = value ?? "—"; };
  const message = (selector, value, kind = "") => { const node = $(selector); if (node) { node.textContent = value || ""; node.dataset.kind = kind; } };
  const show = (view) => { $("#loginView").hidden = view !== "login"; $("#dashboardView").hidden = view !== "dashboard"; };
  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
    if (token) headers.Authorization = "Bearer " + token;
    const response = await fetch(API + path, { ...options, headers });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) signOut(false);
      throw new Error(payload?.error?.message || "We couldn't complete that request. Please try again.");
    }
    return payload;
  }
  function empty(node, text) { node.replaceChildren(); const p = document.createElement("p"); p.className = "empty-state"; p.textContent = text; node.append(p); }
  function row(container, icon, heading, detail, amount, positive = false) {
    const item = document.createElement("div"); item.className = "transaction";
    const badge = document.createElement("span"); badge.className = "tx-icon" + (positive ? " income" : ""); badge.textContent = icon;
    const content = document.createElement("div"); const title = document.createElement("b"); title.textContent = heading;
    const sub = document.createElement("small"); sub.textContent = detail; content.append(title, sub);
    const value = document.createElement("strong"); value.className = positive ? "positive" : ""; value.textContent = amount;
    item.append(badge, content, value); container.append(item);
  }
  function renderTransactions(entries) {
    const container = $("#transactions"); container.replaceChildren();
    if (!entries?.length) return empty(container, "No posted transactions are available for this project yet.");
    entries.slice(0, 8).forEach(entry => {
      const income = entry.type === "TOP_UP";
      const sign = income ? "+ " : "− ";
      row(container, income ? "+" : "₹", titleCase(entry.type), [entry.reference, entry.invoiceNumber, date(entry.postedAt)].filter(Boolean).join(" · "), sign + money(entry.amount), income);
    });
  }
  function renderOrders(orders) {
    const container = $("#purchaseOrders"); container.replaceChildren();
    if (!orders?.length) return empty(container, "No purchase orders have been recorded for this project.");
    orders.slice(0, 6).forEach(po => row(container, "▦", po.orderNumber, (po.vendor?.name || "Vendor") + " · " + titleCase(po.status), money(po.subtotal), false));
  }
  function renderLabour(records) {
    const container = $("#labourRecords"); container.replaceChildren();
    if (!records?.length) return empty(container, "No labour records have been submitted for this project.");
    records.slice(0, 6).forEach(item => row(container, "◷", item.workerName, titleCase(item.workType) + " · " + date(item.workDate) + " · " + titleCase(item.status), money(item.amount), false));
  }
  async function renderDocuments(projectId) {
    const container = $("#projectDocuments");
    const result = await api("/projects/" + encodeURIComponent(projectId) + "/documents");
    container.replaceChildren();
    if (!result.documents?.length) return empty(container, "No customer-shareable project documents have been published yet.");
    result.documents.forEach(document => {
      const line = window.document.createElement("div"); line.className = "document-row";
      const info = window.document.createElement("div");
      const name = window.document.createElement("b"); name.textContent = document.originalName;
      const meta = window.document.createElement("small"); meta.textContent = titleCase(document.category) + " · " + date(document.availableAt || document.createdAt) + " · " + Math.max(1, Math.round(document.sizeBytes / 1024)) + " KB";
      info.append(name, meta);
      const link = window.document.createElement("button"); link.type = "button"; link.textContent = "Download";
      link.addEventListener("click", async () => {
        link.disabled = true; link.textContent = "Preparing…";
        try { const signed = await api("/documents/" + encodeURIComponent(document.id) + "/download-url", { method: "POST", body: "{}" }); window.location.assign(signed.downloadUrl); }
        catch (error) { message("#dashboardMessage", error.message, "error"); }
        finally { link.disabled = false; link.textContent = "Download"; }
      });
      line.append(info, link); container.append(line);
    });
  }
  function renderSiteUpdates(updates) {
    const container = $("#siteUpdateList"); container.replaceChildren();
    if (!updates?.length) return empty(container, "No site updates have been recorded for this project yet.");
    updates.slice(0, 8).forEach(update => {
      const card = document.createElement("article"); card.className = "site-update";
      const category = document.createElement("span"); category.className = "eyebrow"; category.textContent = titleCase(update.category);
      const heading = document.createElement("b"); heading.textContent = update.title;
      const description = document.createElement("p"); description.textContent = update.description;
      const meta = document.createElement("small"); meta.textContent = date(update.recordedAt) + " · " + (update.createdBy?.name || "Sanora team");
      card.append(category, heading, description, meta);
      if (update.latitude != null && update.longitude != null) {
        const coords = document.createElement("a");
        const lat = Number(update.latitude), lon = Number(update.longitude);
        coords.href = "https://www.google.com/maps?q=" + encodeURIComponent(lat + "," + lon);
        coords.target = "_blank"; coords.rel = "noopener noreferrer"; coords.textContent = "View recorded location ↗";
        card.append(coords);
      }
      container.append(card);
    });
  }
  function renderProject(project, ledger, orders, labour, updates) {
    const summary = ledger.summary || {};
    setText("#projectCode", project.code);
    setText("#projectName", project.name);
    setText("#projectDescription", project.description || "Project information and verified financial activity.");
    setText("#heroProjectName", project.name);
    setText("#projectLocation", project.location || "Location to be updated by the project team");
    setText("#heroProjectCode", project.code);
    setText("#projectStatus", titleCase(project.status));
    setText("#lastUpdated", date(project.updatedAt));
    const approved = (project.estimates || []).find(x => x.status === "APPROVED");
    const estimateTotal = approved?.lines?.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitRate), 0);
    setText("#approvedEstimate", approved ? money(estimateTotal) : "Not yet approved");
    setText("#fundsReceived", money(summary.fundsReceived));
    setText("#actualExpenses", money(summary.actualExpenses));
    setText("#availableFunds", money(summary.availableFunds));
    setText("#pendingCommitments", money(summary.pendingCommitments));
    renderTransactions(ledger.entries || []);
    renderOrders(orders.purchaseOrders || []);
    renderLabour(labour.labourRecords || []);
    renderSiteUpdates(updates.updates || []);
    renderDocuments(project.id).catch(error => empty($("#projectDocuments"), error.message));
    message("#dashboardMessage", ledger.note || "Account figures are calculated from posted ledger entries. Pending items remain separate.", "info");
  }
  async function loadProjects(preferredId) {
    const result = await api("/projects");
    projects = result.projects || [];
    const select = $("#projectSelect"); select.replaceChildren();
    if (!projects.length) {
      const option = document.createElement("option"); option.textContent = "No projects assigned"; option.value = ""; select.append(option);
      $("#heroProjectName").textContent = "No project assigned";
      ["#fundsReceived", "#actualExpenses", "#availableFunds", "#pendingCommitments"].forEach(id => setText(id, "—"));
      empty($("#transactions"), "Your project account will appear here when a project is assigned to your account.");
      empty($("#purchaseOrders"), "No project has been assigned.");
      empty($("#labourRecords"), "No project has been assigned.");
      empty($("#siteUpdateList"), "No project has been assigned.");
      empty($("#projectDocuments"), "No project has been assigned.");
      return;
    }
    projects.forEach(project => { const option = document.createElement("option"); option.value = project.id; option.textContent = project.name + " · " + project.code; select.append(option); });
    const selected = projects.find(p => p.id === preferredId) || projects[0];
    select.value = selected.id;
    await loadProject(selected.id);
  }
  async function loadProject(projectId) {
    if (!projectId) return;
    message("#dashboardMessage", "Refreshing project information…", "info");
    const [projectResult, ledger, orders, labour, updates] = await Promise.all([
      api("/projects/" + encodeURIComponent(projectId)),
      api("/projects/" + encodeURIComponent(projectId) + "/ledger"),
      api("/projects/" + encodeURIComponent(projectId) + "/purchase-orders"),
      api("/projects/" + encodeURIComponent(projectId) + "/labour"),
      api("/projects/" + encodeURIComponent(projectId) + "/updates")
    ]);
    renderProject(projectResult.project, ledger, orders, labour, updates);
  }
  async function enterWorkspace() {
    show("dashboard");
    setText("#userName", currentUser?.name || "Customer");
    setText("#userEmail", currentUser?.email || "");
    setText("#userInitials", initials(currentUser?.name));
    try { await loadProjects(); }
    catch (error) { message("#dashboardMessage", error.message, "error"); }
  }
  function signOut(showMessage = true) {
    token = null; currentUser = null; sessionStorage.removeItem(tokenKey);
    show("login");
    if (showMessage) message("#loginMessage", "You have signed out securely.", "info");
  }
  $("#loginForm").addEventListener("submit", async event => {
    event.preventDefault();
    const button = $("#loginButton"); button.disabled = true; button.textContent = "Signing in…";
    message("#loginMessage", "");
    const form = new FormData(event.currentTarget);
    try {
      const result = await api("/auth/login", { method: "POST", body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
      token = result.token; sessionStorage.setItem(tokenKey, token); currentUser = result.user;
      await enterWorkspace();
    } catch (error) { message("#loginMessage", error.message, "error"); }
    finally { button.disabled = false; button.textContent = "Sign in securely"; }
  });
  $("#projectSelect").addEventListener("change", async event => {
    try { await loadProject(event.target.value); }
    catch (error) { message("#dashboardMessage", error.message, "error"); }
  });
  $("#logoutButton").addEventListener("click", () => signOut());
  $("#year").textContent = new Date().getFullYear();
  if (token) {
    api("/auth/me").then(result => { currentUser = result.user; return enterWorkspace(); })
      .catch(() => { signOut(false); });
  } else show("login");
})();