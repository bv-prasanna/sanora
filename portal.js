(() => {
  const metaApi = document.querySelector('meta[name="api-base-url"]')?.content?.trim();
  const API = (window.SANORA_API_BASE_URL || metaApi || (window.location.origin + "/api")).replace(/\/+$/, "");
  const $ = (selector) => document.querySelector(selector);
  const tokenKey = "sanora_customer_session";
  let token = sessionStorage.getItem(tokenKey);
  let currentUser = null;
  let projects = [];
  let activeProjectId = null;
  let projectMembers = [];
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
  async function renderTopUps(projectId) {
    const result = await api("/projects/" + encodeURIComponent(projectId) + "/top-ups");
    const customerContainer = $("#topUpHistory");
    customerContainer.replaceChildren();
    const financeContainer = $("#financeTopUpHistory");
    financeContainer.replaceChildren();
    if (!result.topUps?.length) {
      empty(customerContainer, "No top-up requests have been submitted yet.");
      empty(financeContainer, "No top-up requests are awaiting or have completed reconciliation.");
      return;
    }
    const finance = ["SUPER_ADMIN", "DIRECTOR", "FINANCE"].includes(currentUser?.role);
    result.topUps.forEach(request => {
      const status = titleCase(request.status);
      const detail = [titleCase(request.paymentMode), request.reference, date(request.submittedAt), request.reviewReason].filter(Boolean).join(" · ");
      if (currentUser?.role === "CUSTOMER") {
        row(customerContainer, request.status === "CONFIRMED" ? "✓" : request.status === "REJECTED" ? "!" : "↻", status, detail, money(request.amount), request.status === "CONFIRMED");
      }
      if (finance) {
        row(financeContainer, request.status === "CONFIRMED" ? "✓" : request.status === "REJECTED" ? "!" : "↻", status, (request.requestedBy?.name || "Customer") + " · " + detail, money(request.amount), request.status === "CONFIRMED");
        if (request.status === "SUBMITTED") {
          const line = financeContainer.lastElementChild;
          const actions = window.document.createElement("div"); actions.className = "topup-actions";
          const confirmButton = window.document.createElement("button"); confirmButton.type = "button"; confirmButton.textContent = "Confirm receipt";
          const rejectButton = window.document.createElement("button"); rejectButton.type = "button"; rejectButton.textContent = "Reject";
          confirmButton.addEventListener("click", async () => {
            confirmButton.disabled = true;
            try {
              const response = await api("/top-ups/" + encodeURIComponent(request.id) + "/reconcile", { method: "POST", body: JSON.stringify({ decision: "CONFIRM" }) });
              message("#dashboardMessage", response.message, "info"); await renderTopUps(projectId); await loadProject(projectId);
            } catch (error) { message("#dashboardMessage", error.message, "error"); confirmButton.disabled = false; }
          });
          rejectButton.addEventListener("click", async () => {
            const reason = window.prompt("Enter the reason for rejecting this top-up:");
            if (!reason || reason.trim().length < 3) return;
            rejectButton.disabled = true;
            try {
              const response = await api("/top-ups/" + encodeURIComponent(request.id) + "/reconcile", { method: "POST", body: JSON.stringify({ decision: "REJECT", reason: reason.trim() }) });
              message("#dashboardMessage", response.message, "info"); await renderTopUps(projectId);
            } catch (error) { message("#dashboardMessage", error.message, "error"); rejectButton.disabled = false; }
          });
          actions.append(confirmButton, rejectButton); line.append(actions);
        }
      }
    });
    if (currentUser?.role !== "CUSTOMER") empty(customerContainer, "Top-up submissions are available from the customer account.");
    if (!finance) empty(financeContainer, "Finance reconciliation is available to authorised Finance users.");
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
  function populatePlanningForms(members, milestones) {
    projectMembers = members || [];
    const milestoneSelect = $("#taskMilestone"); milestoneSelect.replaceChildren();
    const none = window.document.createElement("option"); none.value = ""; none.textContent = "No milestone"; milestoneSelect.append(none);
    (milestones || []).forEach(milestone => { const option = window.document.createElement("option"); option.value = milestone.id; option.textContent = milestone.title; milestoneSelect.append(option); });
    const assigneeSelect = $("#taskAssignee"); assigneeSelect.replaceChildren();
    const unassigned = window.document.createElement("option"); unassigned.value = ""; unassigned.textContent = "Unassigned"; assigneeSelect.append(unassigned);
    projectMembers.forEach(member => { const option = window.document.createElement("option"); option.value = member.id; option.textContent = member.name + " · " + titleCase(member.role); assigneeSelect.append(option); });
  }
  async function updateTaskStatus(task, nextStatus) {
    try {
      const result = await api("/tasks/" + encodeURIComponent(task.id), { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      message("#dashboardMessage", result.message || "Task updated.", "info");
      await loadProject(activeProjectId);
    } catch (error) { message("#dashboardMessage", error.message, "error"); }
  }
  function renderWorkPlan(plan) {
    const summary = plan.summary || {};
    const percent = Math.max(0, Math.min(100, Number(summary.progressPercent || 0)));
    setText("#workProgressValue", percent + "%");
    $("#workProgressBar").style.width = percent + "%";
    setText("#workProgressMeta", (summary.completedTasks || 0) + " of " + (summary.totalTasks || 0) + " visible tasks completed" + ((summary.blockedTasks || 0) ? " · " + summary.blockedTasks + " blocked" : ""));
    const milestoneList = $("#milestoneList"); milestoneList.replaceChildren();
    if (!plan.milestones?.length) empty(milestoneList, "No customer-visible milestones have been published yet.");
    else plan.milestones.forEach(milestone => {
      const item = window.document.createElement("article"); item.className = "milestone-item";
      const marker = window.document.createElement("span"); marker.className = "milestone-marker " + String(milestone.status || "PLANNED").toLowerCase();
      const content = window.document.createElement("div");
      const title = window.document.createElement("b"); title.textContent = milestone.title;
      const description = window.document.createElement("p"); description.textContent = milestone.description || "";
      const meta = window.document.createElement("small"); meta.textContent = titleCase(milestone.status) + " · Target " + date(milestone.forecastDate || milestone.targetDate) + " · " + (milestone._count?.tasks || 0) + " tasks";
      content.append(title, description, meta); item.append(marker, content); milestoneList.append(item);
    });
    const taskList = $("#taskList"); taskList.replaceChildren();
    if (!plan.tasks?.length) empty(taskList, "No customer-visible work items have been published yet.");
    else plan.tasks.slice(0, 12).forEach(task => {
      const item = window.document.createElement("article"); item.className = "plan-task";
      const main = window.document.createElement("div");
      const title = window.document.createElement("b"); title.textContent = task.title;
      const meta = window.document.createElement("small"); meta.textContent = [titleCase(task.status), task.assignedTo?.name, task.dueDate ? "Due " + date(task.dueDate) : null].filter(Boolean).join(" · ");
      main.append(title, meta);
      const progress = window.document.createElement("span"); progress.className = "task-percent"; progress.textContent = Math.max(0, Math.min(100, Number(task.progressPercent || 0))) + "%";
      item.append(main, progress);
      if (currentUser?.role !== "CUSTOMER" && ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "SITE_ENGINEER"].includes(currentUser?.role)) {
        const action = window.document.createElement("button"); action.type = "button"; action.className = "task-action";
        const nextStatus = task.status === "TODO" || task.status === "BLOCKED" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" || task.status === "IN_REVIEW" ? "COMPLETED" : null;
        if (nextStatus) { action.textContent = nextStatus === "COMPLETED" ? "Complete" : "Start / resume"; action.addEventListener("click", () => updateTaskStatus(task, nextStatus)); item.append(action); }
      }
      if (currentUser?.role !== "CUSTOMER" && task.blockedReason) {
        const reason = window.document.createElement("small"); reason.className = "blocked-reason"; reason.textContent = "Blocked: " + task.blockedReason; item.append(reason);
      }
      taskList.append(item);
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
  function renderProject(project, ledger, orders, labour, updates, workPlan) {
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
    renderWorkPlan(workPlan);
    renderDocuments(project.id).catch(error => empty($("#projectDocuments"), error.message));
    renderTopUps(project.id).catch(error => empty($("#topUpHistory"), error.message));
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
      empty($("#milestoneList"), "No project has been assigned.");
      empty($("#taskList"), "No project has been assigned.");
      return;
    }
    projects.forEach(project => { const option = document.createElement("option"); option.value = project.id; option.textContent = project.name + " · " + project.code; select.append(option); });
    const selected = projects.find(p => p.id === preferredId) || projects[0];
    select.value = selected.id;
    await loadProject(selected.id);
  }
  async function loadProject(projectId) {
    if (!projectId) return;
    activeProjectId = projectId;
    message("#dashboardMessage", "Refreshing project information…", "info");
    const [projectResult, ledger, orders, labour, updates, workPlan, members] = await Promise.all([
      api("/projects/" + encodeURIComponent(projectId)),
      api("/projects/" + encodeURIComponent(projectId) + "/ledger"),
      api("/projects/" + encodeURIComponent(projectId) + "/purchase-orders"),
      api("/projects/" + encodeURIComponent(projectId) + "/labour"),
      api("/projects/" + encodeURIComponent(projectId) + "/updates"),
      api("/projects/" + encodeURIComponent(projectId) + "/work-plan"),
      api("/projects/" + encodeURIComponent(projectId) + "/members")
    ]);
    populatePlanningForms(members.members || [], workPlan.milestones || []);
    renderProject(projectResult.project, ledger, orders, labour, updates, workPlan);
  }
  async function enterWorkspace() {
    show("dashboard");
    setText("#userName", currentUser?.name || "Customer");
    setText("#userEmail", currentUser?.email || "");
    setText("#userInitials", initials(currentUser?.name));
    $("#topUpPanel").hidden = currentUser?.role !== "CUSTOMER";
    $("#financeTopUpPanel").hidden = !["SUPER_ADMIN", "DIRECTOR", "FINANCE"].includes(currentUser?.role);
    const planningRole = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "SITE_ENGINEER"].includes(currentUser?.role);
    const managerRole = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER"].includes(currentUser?.role);
    $("#planningControls").hidden = !planningRole;
    $("#milestoneVisibilityLabel").hidden = !managerRole;
    $("#taskVisibilityLabel").hidden = !managerRole;
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
  $("#milestoneForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!activeProjectId) return;
    const form = new FormData(event.currentTarget);
    const target = form.get("targetDate");
    try {
      const result = await api("/projects/" + encodeURIComponent(activeProjectId) + "/milestones", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"), description: form.get("description") || undefined,
          targetDate: target ? new Date(String(target) + "T23:59:59").toISOString() : undefined,
          customerVisible: $("#milestoneVisibility").checked
        })
      });
      message("#planningMessage", result.message, "info"); formElement.reset(); await loadProject(activeProjectId);
    } catch (error) { message("#planningMessage", error.message, "error"); }
  });
  $("#taskForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!activeProjectId) return;
    const form = new FormData(event.currentTarget);
    const due = form.get("dueDate");
    try {
      const result = await api("/projects/" + encodeURIComponent(activeProjectId) + "/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"), workPackage: form.get("workPackage") || undefined,
          milestoneId: form.get("milestoneId") || undefined, assignedToId: form.get("assignedToId") || undefined,
          dueDate: due ? new Date(String(due) + "T23:59:59").toISOString() : undefined,
          customerVisible: $("#taskVisibility").checked
        })
      });
      message("#planningMessage", result.message, "info"); event.currentTarget.reset(); await loadProject(activeProjectId);
    } catch (error) { message("#planningMessage", error.message, "error"); }
  });
  $("#topUpForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!activeProjectId) return message("#topUpMessage", "Select a project before submitting a top-up.", "error");
    const button = $("#topUpSubmit"); button.disabled = true; button.textContent = "Submitting…";
    const form = new FormData(event.currentTarget);
    try {
      const result = await api("/projects/" + encodeURIComponent(activeProjectId) + "/top-ups", {
        method: "POST",
        body: JSON.stringify({ amount: String(form.get("amount")), paymentMode: form.get("paymentMode"), reference: form.get("reference"), notes: form.get("notes") || undefined })
      });
      message("#topUpMessage", result.message || "Top-up request submitted for verification.", "info");
      event.currentTarget.reset();
      await renderTopUps(activeProjectId);
    } catch (error) { message("#topUpMessage", error.message, "error"); }
    finally { button.disabled = false; button.textContent = "Submit for reconciliation"; }
  });
  $("#logoutButton").addEventListener("click", () => signOut());
  $("#year").textContent = new Date().getFullYear();
  if (token) {
    api("/auth/me").then(result => { currentUser = result.user; return enterWorkspace(); })
      .catch(() => { signOut(false); });
  } else show("login");
})();