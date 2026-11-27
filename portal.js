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
  async function financeAction(path, successMessage) {
    try {
      const result = await api(path, { method: "POST", body: "{}" });
      message("#dashboardMessage", result.message || successMessage, "info");
      await loadProject(activeProjectId);
      await loadOperationsSummary().catch(() => undefined);
      await loadNotifications().catch(() => undefined);
    } catch (error) { message("#dashboardMessage", error.message, "error"); }
  }
  function renderFinanceQueue(queue) {
    const ledger = $("#financeLedgerQueue"); ledger.replaceChildren();
    const labour = $("#financeLabourQueue"); labour.replaceChildren();
    const orders = $("#financePurchaseQueue"); orders.replaceChildren();
    const ledgerEntries = queue.ledgerEntries || [];
    if (!ledgerEntries.length) empty(ledger, "No expense ledger entries are awaiting Finance action.");
    ledgerEntries.forEach(entry => {
      row(ledger, "₹", entry.description, [titleCase(entry.type), entry.createdBy?.name, entry.reference, titleCase(entry.status)].filter(Boolean).join(" · "), money(entry.amount));
      const action = window.document.createElement("button"); action.type = "button"; action.className = "task-action";
      action.textContent = entry.status === "PENDING" ? "Approve expense" : "Post expense";
      action.addEventListener("click", () => financeAction("/ledger/" + encodeURIComponent(entry.id) + (entry.status === "PENDING" ? "/approve" : "/post"), "Expense updated."));
      ledger.lastElementChild.append(action);
    });
    const labourRecords = queue.labourRecords || [];
    if (!labourRecords.length) empty(labour, "No labour records are awaiting approval.");
    labourRecords.forEach(record => {
      row(labour, "◷", record.workerName, [record.workType, date(record.workDate), record.recordedBy?.name].filter(Boolean).join(" · "), money(record.amount));
      const action = window.document.createElement("button"); action.type = "button"; action.className = "task-action"; action.textContent = "Approve labour";
      action.addEventListener("click", () => financeAction("/labour/" + encodeURIComponent(record.id) + "/approve", "Labour approved and queued as a pending expense."));
      labour.lastElementChild.append(action);
    });
    const purchaseOrders = queue.purchaseOrders || [];
    if (!purchaseOrders.length) empty(orders, "No purchase orders are awaiting approval.");
    purchaseOrders.forEach(po => {
      row(orders, "▦", po.orderNumber, [po.vendor?.name, po.createdBy?.name, (po.lines || []).length + " line(s)"].filter(Boolean).join(" · "), money(po.subtotal));
      const action = window.document.createElement("button"); action.type = "button"; action.className = "task-action"; action.textContent = "Approve PO";
      action.addEventListener("click", () => financeAction("/purchase-orders/" + encodeURIComponent(po.id) + "/approve", "Purchase order approved."));
      orders.lastElementChild.append(action);
    });
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
    if (!result.documents?.length) return empty(container, currentUser?.role === "CUSTOMER" ? "No customer-shareable project documents have been published yet." : "No documents have been uploaded for this project yet.");
    result.documents.forEach(document => {
      const line = window.document.createElement("div"); line.className = "document-row";
      const info = window.document.createElement("div");
      const name = window.document.createElement("b"); name.textContent = document.originalName;
      const meta = window.document.createElement("small"); meta.textContent = titleCase(document.category) + " · " + date(document.availableAt || document.createdAt) + " · " + Math.max(1, Math.round(document.sizeBytes / 1024)) + " KB" + (document.uploadedBy?.name ? " · " + document.uploadedBy.name : "") + (document.description ? " · " + document.description : "") + (currentUser?.role === "CUSTOMER" ? "" : document.customerVisible ? " · Customer visible" : " · Internal");
      info.append(name, meta);
      const link = window.document.createElement("button"); link.type = "button"; link.textContent = "Download";
      link.addEventListener("click", async () => {
        link.disabled = true; link.textContent = "Preparing…";
        try { const signed = await api("/documents/" + encodeURIComponent(document.id) + "/download-url", { method: "POST", body: "{}" }); window.location.assign(signed.downloadUrl); }
        catch (error) { message("#dashboardMessage", error.message, "error"); }
        finally { link.disabled = false; link.textContent = "Download"; }
      });
      line.append(info, link);
      if (["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER"].includes(currentUser?.role)) {
        const visibility = window.document.createElement("button"); visibility.type = "button"; visibility.className = "task-action"; visibility.textContent = document.customerVisible ? "Make internal" : "Publish";
        visibility.addEventListener("click", async () => {
          visibility.disabled = true;
          try {
            const result = await api("/documents/" + encodeURIComponent(document.id) + "/customer-visibility", { method: "POST", body: JSON.stringify({ customerVisible: !document.customerVisible }) });
            message("#dashboardMessage", result.message, "info"); await renderDocuments(projectId);
          } catch (error) { message("#dashboardMessage", error.message, "error"); visibility.disabled = false; }
        });
        line.append(visibility);
      }
      container.append(line);
    });
  }
  function renderProjectTeam(members, staff) {
    const container = $("#projectTeamList"); container.replaceChildren();
    const select = $("#projectStaffSelect"); select.replaceChildren();
    const placeholder = window.document.createElement("option"); placeholder.value = ""; placeholder.textContent = staff.length ? "Select staff member" : "No active staff accounts"; select.append(placeholder);
    staff.forEach(person => {
      const option = window.document.createElement("option"); option.value = person.id; option.textContent = person.name + " · " + titleCase(person.role); select.append(option);
    });
    if (!members.length) return empty(container, "No staff members have been assigned to this project yet.");
    members.forEach(member => {
      const rowNode = window.document.createElement("div"); rowNode.className = "team-member-row";
      const info = window.document.createElement("div");
      const name = window.document.createElement("b"); name.textContent = member.name;
      const meta = window.document.createElement("small"); meta.textContent = titleCase(member.role) + " · " + titleCase(member.access) + (member.isCreator ? " · Project creator" : "");
      info.append(name, meta); rowNode.append(info);
      if (!member.isCreator) {
        const remove = window.document.createElement("button"); remove.type = "button"; remove.className = "task-action secondary-decline"; remove.textContent = "Remove";
        remove.addEventListener("click", async () => {
          if (!window.confirm("Remove " + member.name + " from this project? Their project access will be revoked.")) return;
          remove.disabled = true;
          try {
            const result = await api("/projects/" + encodeURIComponent(activeProjectId) + "/members/" + encodeURIComponent(member.id), { method: "DELETE" });
            message("#projectMemberMessage", result.message, "info"); await loadProject(activeProjectId);
          } catch (error) { message("#projectMemberMessage", error.message, "error"); remove.disabled = false; }
        });
        rowNode.append(remove);
      }
      container.append(rowNode);
    });
  }
  function populateVendorSelect(vendors) {
    const select = $("#poVendor"); select.replaceChildren();
    const placeholder = window.document.createElement("option"); placeholder.value = ""; placeholder.textContent = vendors.length ? "Select vendor" : "Add a vendor first"; select.append(placeholder);
    vendors.forEach(vendor => { const option = window.document.createElement("option"); option.value = vendor.id; option.textContent = vendor.name; select.append(option); });
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
  function renderEstimates(estimates) {
    const container = $("#estimateList"); container.replaceChildren();
    if (!estimates?.length) return empty(container, "No estimates have been created for this project yet.");
    estimates.forEach(estimate => {
      const total = (estimate.lines || []).reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitRate), 0);
      const card = window.document.createElement("article"); card.className = "estimate-item";
      const head = window.document.createElement("div"); head.className = "estimate-item-head";
      const title = window.document.createElement("b"); title.textContent = "Version " + estimate.version + " · " + estimate.title;
      const amount = window.document.createElement("strong"); amount.textContent = money(total);
      head.append(title, amount);
      const meta = window.document.createElement("small"); meta.textContent = titleCase(estimate.status) + " · " + (estimate.lines || []).length + " BOQ line(s)" + (estimate.validUntil ? " · Valid until " + date(estimate.validUntil) : "");
      card.append(head, meta);
      const details = window.document.createElement("details");
      const summary = window.document.createElement("summary"); summary.textContent = "View BOQ and assumptions";
      details.append(summary);
      (estimate.lines || []).forEach(line => {
        const item = window.document.createElement("p"); item.className = "estimate-line";
        item.textContent = line.description + " · " + line.quantity + " " + line.unit + " × " + money(line.unitRate) + " = " + money(Number(line.quantity) * Number(line.unitRate));
        details.append(item);
      });
      if (estimate.assumptions) { const assumptions = window.document.createElement("p"); assumptions.textContent = "Assumptions: " + estimate.assumptions; details.append(assumptions); }
      if (estimate.exclusions) { const exclusions = window.document.createElement("p"); exclusions.textContent = "Exclusions: " + estimate.exclusions; details.append(exclusions); }
      card.append(details);
      if (currentUser?.role === "CUSTOMER" && estimate.status === "APPROVED") {
        if (!estimate.customerDecision) {
          const actions = window.document.createElement("div"); actions.className = "estimate-customer-actions";
          const accept = window.document.createElement("button"); accept.type = "button"; accept.className = "task-action"; accept.textContent = "Acknowledge indicative estimate";
          const decline = window.document.createElement("button"); decline.type = "button"; decline.className = "task-action secondary-decline"; decline.textContent = "Request changes";
          accept.addEventListener("click", async () => {
            accept.disabled = true;
            try {
              const result = await api("/estimates/" + encodeURIComponent(estimate.id) + "/customer-response", { method: "POST", body: JSON.stringify({ decision: "ACCEPTED" }) });
              message("#dashboardMessage", result.message, "info"); await loadProject(activeProjectId);
            } catch (error) { message("#dashboardMessage", error.message, "error"); accept.disabled = false; }
          });
          decline.addEventListener("click", async () => {
            const notes = window.prompt("What would you like Sanora to revise in this estimate?");
            if (!notes || notes.trim().length < 3) return;
            decline.disabled = true;
            try {
              const result = await api("/estimates/" + encodeURIComponent(estimate.id) + "/customer-response", { method: "POST", body: JSON.stringify({ decision: "DECLINED", notes: notes.trim() }) });
              message("#dashboardMessage", result.message, "info"); await loadProject(activeProjectId);
            } catch (error) { message("#dashboardMessage", error.message, "error"); decline.disabled = false; }
          });
          actions.append(accept, decline); card.append(actions);
        } else {
          const decision = window.document.createElement("small"); decision.className = "estimate-decision";
          decision.textContent = "Your response: " + titleCase(estimate.customerDecision) + (estimate.customerDecisionAt ? " · " + date(estimate.customerDecisionAt) : "");
          card.append(decision);
          if (estimate.customerDecisionNotes) { const notes = window.document.createElement("p"); notes.className = "estimate-decision-notes"; notes.textContent = "Your note: " + estimate.customerDecisionNotes; card.append(notes); }
        }
      }
      if (estimate.status === "SUBMITTED" && ["SUPER_ADMIN", "DIRECTOR", "FINANCE"].includes(currentUser?.role)) {
        const approve = window.document.createElement("button"); approve.type = "button"; approve.className = "task-action"; approve.textContent = "Approve estimate";
        approve.addEventListener("click", async () => {
          approve.disabled = true;
          try {
            const result = await api("/estimates/" + encodeURIComponent(estimate.id) + "/approve", { method: "POST", body: "{}" });
            message("#dashboardMessage", result.message || "Estimate approved.", "info"); await loadProject(activeProjectId);
          } catch (error) { message("#dashboardMessage", error.message, "error"); approve.disabled = false; }
        });
        card.append(approve);
      }
      container.append(card);
    });
  }
  function renderWorkPlan(plan) {
    const summary = plan.summary || {};
    const percent = Math.max(0, Math.min(100, Number(summary.progressPercent || 0)));
    setText("#workProgressValue", percent + "%");
    $("#workProgressBar").style.width = percent + "%";
    setText("#workProgressMeta", (summary.completedTasks || 0) + " of " + (summary.totalTasks || 0) + " tasks completed · weighted by relative effort" + ((summary.blockedTasks || 0) ? " · " + summary.blockedTasks + " blocked" : ""));
    setText("#overdueTaskCount", (summary.overdueTasks || 0) + " overdue");
    const lookAhead = $("#lookAheadList"); lookAhead.replaceChildren();
    if (!summary.lookAheadTasks?.length) empty(lookAhead, "No upcoming tasks are scheduled in the next 14 days.");
    else summary.lookAheadTasks.forEach(task => {
      const rowNode = window.document.createElement("div"); rowNode.className = "lookahead-row";
      const title = window.document.createElement("b"); title.textContent = task.title;
      const details = window.document.createElement("small"); details.textContent = [task.assignedTo?.name, task.startDate ? "Starts " + date(task.startDate) : null, task.dueDate ? "Due " + date(task.dueDate) : null].filter(Boolean).join(" · ");
      const weight = window.document.createElement("span"); weight.textContent = "Weight " + Number(task.weight || 1).toLocaleString("en-IN", { maximumFractionDigits: 2 });
      rowNode.append(title, details, weight); lookAhead.append(rowNode);
    });
    const gantt = $("#ganttList"); gantt.replaceChildren();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const horizon = new Date(today.getTime() + 28 * 24 * 60 * 60 * 1000);
    const datedTasks = (plan.tasks || []).filter(task => task.startDate || task.dueDate);
    if (!datedTasks.length) empty(gantt, "Add planned start and due dates to tasks to populate the schedule.");
    else {
      const header = window.document.createElement("div"); header.className = "gantt-header";
      for (let week = 0; week < 4; week++) {
        const cell = window.document.createElement("span");
        const weekStart = new Date(today.getTime() + week * 7 * 24 * 60 * 60 * 1000);
        cell.textContent = "W" + (week + 1) + " · " + date(weekStart);
        header.append(cell);
      }
      gantt.append(header);
      datedTasks.forEach(task => {
        const rawStart = task.startDate ? new Date(task.startDate) : new Date(task.dueDate);
        const rawEnd = task.dueDate ? new Date(task.dueDate) : new Date(task.startDate);
        if (rawEnd < today || rawStart > horizon) return;
        const start = Math.max(today.getTime(), rawStart.getTime());
        const end = Math.min(horizon.getTime(), Math.max(start + 24 * 60 * 60 * 1000, rawEnd.getTime()));
        const left = Math.max(0, Math.min(100, ((start - today.getTime()) / (horizon.getTime() - today.getTime())) * 100));
        const width = Math.max(1.5, Math.min(100 - left, ((end - start) / (horizon.getTime() - today.getTime())) * 100));
        const rowNode = window.document.createElement("div"); rowNode.className = "gantt-row";
        const label = window.document.createElement("div"); label.className = "gantt-task-label";
        const title = window.document.createElement("b"); title.textContent = task.title;
        const meta = window.document.createElement("small"); meta.textContent = [task.assignedTo?.name, task.startDate ? date(task.startDate) : "Start TBD", task.dueDate ? "→ " + date(task.dueDate) : ""].filter(Boolean).join(" · ");
        label.append(title, meta);
        const track = window.document.createElement("div"); track.className = "gantt-track";
        const bar = window.document.createElement("span"); bar.className = "gantt-bar " + String(task.status || "TODO").toLowerCase();
        bar.style.left = left + "%"; bar.style.width = width + "%";
        bar.textContent = Math.max(0, Math.min(100, Number(task.progressPercent || 0))) + "%";
        track.append(bar); rowNode.append(label, track); gantt.append(rowNode);
      });
      if (!gantt.querySelector(".gantt-row")) empty(gantt, "No tasks fall within the next four weeks.");
    }
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
      const meta = window.document.createElement("small"); meta.textContent = [titleCase(task.status), task.assignedTo?.name, task.dueDate ? "Due " + date(task.dueDate) : null, "Weight " + Number(task.weight || 1).toLocaleString("en-IN", { maximumFractionDigits: 2 })].filter(Boolean).join(" · ");
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
  async function renderSiteUpdates(updates) {
    const container = $("#siteUpdateList"); container.replaceChildren();
    if (!updates?.length) return empty(container, "No customer-visible site updates have been published yet.");
    const manager = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER"].includes(currentUser?.role);
    for (const update of updates.slice(0, 12)) {
      const card = window.document.createElement("article"); card.className = "site-update";
      const category = window.document.createElement("span"); category.className = "eyebrow"; category.textContent = titleCase(update.category);
      const heading = window.document.createElement("b"); heading.textContent = update.title;
      const description = window.document.createElement("p"); description.textContent = update.description;
      const meta = window.document.createElement("small"); meta.textContent = date(update.recordedAt) + " · " + (update.createdBy?.name || "Sanora team") + (update.customerVisible ? " · Published" : " · Internal");
      card.append(category, heading, description, meta);
      if (update.latitude != null && update.longitude != null) {
        const coords = window.document.createElement("a");
        const lat = Number(update.latitude), lon = Number(update.longitude);
        coords.href = "https://www.google.com/maps?q=" + encodeURIComponent(lat + "," + lon);
        coords.target = "_blank"; coords.rel = "noopener noreferrer"; coords.textContent = "View recorded location ↗";
        card.append(coords);
      }
      for (const photo of (update.documents || []).filter(doc => doc.contentType?.startsWith("image/"))) {
        try {
          const signed = await api("/documents/" + encodeURIComponent(photo.id) + "/download-url", { method: "POST", body: JSON.stringify({ inline: true }) });
          const img = window.document.createElement("img"); img.className = "site-photo"; img.src = signed.downloadUrl; img.alt = photo.originalName; img.loading = "lazy"; card.append(img);
        } catch { /* Expired or unavailable photo links do not break the diary. */ }
      }
      if (manager && !update.customerVisible) {
        const publish = window.document.createElement("button"); publish.type = "button"; publish.className = "task-action"; publish.textContent = "Publish to customer";
        publish.addEventListener("click", async () => {
          publish.disabled = true;
          try {
            const result = await api("/project-updates/" + encodeURIComponent(update.id) + "/customer-visibility", { method: "POST", body: JSON.stringify({ customerVisible: true }) });
            message("#dashboardMessage", result.message, "info"); await loadProject(activeProjectId);
          } catch (error) { message("#dashboardMessage", error.message, "error"); publish.disabled = false; }
        });
        card.append(publish);
      }
      container.append(card);
    }
  }
  function renderInspections(inspections) {
    const container = $("#inspectionList"); container.replaceChildren();
    if (!inspections?.length) return empty(container, currentUser?.role === "CUSTOMER" ? "No customer-visible inspections have been published yet." : "No inspections have been recorded for this project.");
    const editable = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "SITE_ENGINEER", "FINANCE", "PROCUREMENT"].includes(currentUser?.role);
    inspections.forEach(inspection => {
      const card = window.document.createElement("article"); card.className = "inspection-card";
      const head = window.document.createElement("div"); head.className = "inspection-card-head";
      const titleWrap = window.document.createElement("div");
      const category = window.document.createElement("span"); category.className = "eyebrow"; category.textContent = titleCase(inspection.category) + " · " + date(inspection.scheduledAt);
      const title = window.document.createElement("b"); title.textContent = inspection.title;
      const status = window.document.createElement("span"); status.className = "inspection-status"; status.textContent = titleCase(inspection.status);
      titleWrap.append(category, title); head.append(titleWrap, status); card.append(head);
      if (inspection.description) { const desc = window.document.createElement("p"); desc.className = "inspection-description"; desc.textContent = inspection.description; card.append(desc); }
      const checks = window.document.createElement("div"); checks.className = "inspection-checks";
      inspection.checks.forEach(check => {
        const line = window.document.createElement("div"); line.className = "inspection-check";
        const name = window.document.createElement("span"); name.textContent = check.title + (check.isRequired ? " *" : "");
        const result = window.document.createElement("select"); result.dataset.checkId = check.id;
        [["PENDING","Pending"],["PASS","Pass"],["FAIL","Fail"],["NOT_APPLICABLE","N/A"]].forEach(([value,label]) => {
          const option = window.document.createElement("option"); option.value = value; option.textContent = label; result.append(option);
        });
        result.value = check.result; result.disabled = !editable || ["PASSED","CANCELLED"].includes(inspection.status);
        const note = window.document.createElement("input"); note.type = "text"; note.maxLength = 800; note.placeholder = "Check note (optional)"; note.value = check.notes || "";
        note.dataset.checkNote = check.id; note.disabled = result.disabled;
        line.append(name, result, note); checks.append(line);
      });
      card.append(checks);
      if (inspection.resultSummary) { const summary = window.document.createElement("p"); summary.className = "inspection-summary"; summary.textContent = "Result: " + inspection.resultSummary; card.append(summary); }
      if (inspection.correctiveAction) { const action = window.document.createElement("p"); action.className = "inspection-corrective"; action.textContent = "Corrective action: " + inspection.correctiveAction; card.append(action); }
      const meta = window.document.createElement("small"); meta.className = "inspection-meta";
      meta.textContent = "Created by " + (inspection.createdBy?.name || "Sanora team") + (inspection.inspectedBy?.name ? " · Inspected by " + inspection.inspectedBy.name : "") + (inspection.customerVisible ? " · Customer visible" : " · Internal");
      card.append(meta);
      if (editable && !["PASSED","CANCELLED"].includes(inspection.status)) {
        const summaryInput = window.document.createElement("textarea"); summaryInput.rows = 2; summaryInput.maxLength = 1500; summaryInput.placeholder = "Inspection result summary"; summaryInput.value = inspection.resultSummary || "";
        const actionInput = window.document.createElement("textarea"); actionInput.rows = 2; actionInput.maxLength = 1500; actionInput.placeholder = "Corrective action (required when failed)"; actionInput.value = inspection.correctiveAction || "";
        card.append(summaryInput, actionInput);
        const actions = window.document.createElement("div"); actions.className = "inspection-actions";
        const save = window.document.createElement("button"); save.type = "button"; save.className = "secondary-action"; save.textContent = "Save checklist";
        save.addEventListener("click", async () => {
          save.disabled = true;
          try {
            const values = [...checks.querySelectorAll("select[data-check-id]")].map(select => ({
              id: select.dataset.checkId, result: select.value,
              notes: checks.querySelector('[data-check-note="' + select.dataset.checkId + '"]').value || null
            }));
            const result = await api("/inspections/" + encodeURIComponent(inspection.id), { method: "PATCH", body: JSON.stringify({ checks: values }) });
            message("#inspectionMessage", result.message, "info"); await loadProject(activeProjectId);
          } catch (error) { message("#inspectionMessage", error.message, "error"); }
          finally { save.disabled = false; }
        });
        actions.append(save);
        const addAction = (label, statusValue) => {
          const button = window.document.createElement("button"); button.type = "button"; button.textContent = label;
          button.addEventListener("click", async () => {
            button.disabled = true;
            try {
              const result = await api("/inspections/" + encodeURIComponent(inspection.id), { method: "PATCH", body: JSON.stringify({
                status: statusValue, resultSummary: summaryInput.value || undefined,
                correctiveAction: actionInput.value || undefined
              }) });
              message("#inspectionMessage", result.message, "info"); await loadProject(activeProjectId);
            } catch (error) { message("#inspectionMessage", error.message, "error"); }
            finally { button.disabled = false; }
          });
          actions.append(button);
        };
        if (inspection.status === "DRAFT") addAction("Schedule", "SCHEDULED");
        if (inspection.status === "SCHEDULED" || inspection.status === "FAILED") addAction("Start inspection", "IN_PROGRESS");
        if (inspection.status === "IN_PROGRESS") { addAction("Mark passed", "PASSED"); addAction("Mark failed", "FAILED"); }
        card.append(actions);
      }
      container.append(card);
    });
  }
  function renderProject(project, ledger, orders, labour, updates, inspections, workPlan, financeQueue, statement) {
    const summary = ledger.summary || {};
    setText("#projectCode", project.code);
    setText("#projectName", project.name);
    setText("#projectDescription", project.description || "Project information and verified financial activity.");
    setText("#heroProjectName", project.name);
    setText("#projectLocation", project.location || "Location to be updated by the project team");
    setText("#heroProjectCode", project.code);
    setText("#projectStatus", titleCase(project.status));
    setText("#lastUpdated", date(project.updatedAt));
    setText("#approvedEstimate", statement?.estimate ? money(statement.estimate.total) : "Not yet approved");
    const variance = statement?.summary?.estimateVariance;
    setText("#estimateVariance", variance === null || variance === undefined ? "—" : money(Math.abs(Number(variance))));
    setText("#estimateVarianceLabel", variance === null || variance === undefined ? "No approved indicative estimate" : Number(variance) > 0 ? "Above indicative estimate" : "At or below indicative estimate");
    setText("#projectedFunds", money(summary.projectedAfterCommitments));
    setText("#fundsReceived", money(summary.fundsReceived));
    setText("#actualExpenses", money(summary.actualExpenses));
    setText("#availableFunds", money(summary.availableFunds));
    setText("#pendingCommitments", money(summary.pendingCommitments));
    renderTransactions(ledger.entries || []);
    renderOrders(orders.purchaseOrders || []);
    renderLabour(labour.labourRecords || []);
    renderSiteUpdates(updates.updates || []).catch(error => empty($("#siteUpdateList"), error.message));
    renderInspections(inspections.inspections || []);
    renderEstimates(project.estimates || []);
    renderWorkPlan(workPlan);
    renderFinanceQueue(financeQueue || {});
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
      empty($("#inspectionList"), "No project has been assigned.");
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
    const [projectResult, ledger, orders, labour, updates, inspections, workPlan, members, financeQueue, statementResult, vendorsResult, staffDirectory] = await Promise.all([
      api("/projects/" + encodeURIComponent(projectId)),
      api("/projects/" + encodeURIComponent(projectId) + "/ledger"),
      api("/projects/" + encodeURIComponent(projectId) + "/purchase-orders"),
      api("/projects/" + encodeURIComponent(projectId) + "/labour"),
      api("/projects/" + encodeURIComponent(projectId) + "/updates"),
      api("/projects/" + encodeURIComponent(projectId) + "/inspections"),
      api("/projects/" + encodeURIComponent(projectId) + "/work-plan"),
      (["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "SITE_ENGINEER"].includes(currentUser?.role) ? api("/projects/" + encodeURIComponent(projectId) + "/members") : Promise.resolve({ members: [] })),
      (["SUPER_ADMIN", "DIRECTOR", "FINANCE"].includes(currentUser?.role) ? api("/projects/" + encodeURIComponent(projectId) + "/finance-queue") : Promise.resolve({})),
      api("/projects/" + encodeURIComponent(projectId) + "/statement"),
      (["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "PROCUREMENT"].includes(currentUser?.role) ? api("/vendors") : Promise.resolve({ vendors: [] })),
      (["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER"].includes(currentUser?.role) ? api("/staff") : Promise.resolve({ staff: [] }))
    ]);
    populatePlanningForms(members.members || [], workPlan.milestones || []);
    populateVendorSelect(vendorsResult.vendors || []);
    renderProjectTeam(members.members || [], staffDirectory.staff || []);
    renderProject(projectResult.project, ledger, orders, labour, updates, inspections, workPlan, financeQueue, statementResult.statement);
  }
  async function loadCustomers() {
    const result = await api("/customers");
    const select = $("#projectCustomer"); select.replaceChildren();
    if (!result.customers?.length) {
      const option = window.document.createElement("option"); option.value = ""; option.textContent = "No activated customer accounts yet"; select.append(option);
      return;
    }
    result.customers.forEach(customer => {
      const option = window.document.createElement("option"); option.value = customer.id; option.textContent = customer.name + " · " + customer.email; select.append(option);
    });
  }
  async function updateLead(id, changes) {
    try {
      const result = await api("/leads/" + encodeURIComponent(id), { method: "PATCH", body: JSON.stringify(changes) });
      message("#opsMessage", result.message || "Enquiry updated.", "info");
      await loadLeads(); await loadOperationsSummary();
    } catch (error) { message("#opsMessage", error.message, "error"); }
  }
  async function loadLeads() {
    const result = await api("/leads");
    const container = $("#leadList"); container.replaceChildren();
    if (!result.leads?.length) return empty(container, "No website enquiries are waiting in your pipeline.");
    const statuses = ["NEW", "CONTACTED", "QUALIFIED", "SITE_VISIT", "PROPOSAL", "CONVERTED", "LOST"];
    result.leads.forEach(lead => {
      const card = window.document.createElement("article"); card.className = "lead-card";
      const header = window.document.createElement("div"); header.className = "lead-card-head";
      const title = window.document.createElement("b"); title.textContent = lead.name;
      const status = window.document.createElement("select"); status.className = "lead-status";
      statuses.forEach(value => { const option = window.document.createElement("option"); option.value = value; option.textContent = titleCase(value); status.append(option); });
      status.value = lead.status;
      status.addEventListener("change", () => updateLead(lead.id, { status: status.value }));
      header.append(title, status);
      const contact = window.document.createElement("div"); contact.className = "lead-contact";
      const phone = window.document.createElement("a"); phone.href = "tel:" + lead.phone; phone.textContent = lead.phone; contact.append(phone);
      if (lead.email) { const email = window.document.createElement("a"); email.href = "mailto:" + lead.email; email.textContent = lead.email; contact.append(email); }
      const interest = window.document.createElement("small"); interest.textContent = lead.interest + " · " + date(lead.createdAt) + (lead.assignedTo?.name ? " · Assigned to " + lead.assignedTo.name : " · Unassigned");
      const messageNode = window.document.createElement("p"); messageNode.textContent = lead.message || "No additional project details supplied.";
      card.append(header, contact, interest, messageNode);
      if (!lead.assignedToId) {
        const assign = window.document.createElement("button"); assign.type = "button"; assign.className = "task-action"; assign.textContent = "Assign to me";
        assign.addEventListener("click", () => updateLead(lead.id, { assignedToId: currentUser.id }));
        card.append(assign);
      }
      container.append(card);
    });
  }
  async function loadNotifications() {
    const result = await api("/notifications");
    const count = Number(result.unreadCount || 0);
    const countNode = $("#notificationCount"); countNode.textContent = count > 99 ? "99+" : String(count); countNode.hidden = count === 0;
    const container = $("#notificationList"); container.replaceChildren();
    if (!result.notifications?.length) return empty(container, "You're all caught up. New assignments and project updates will appear here.");
    result.notifications.forEach(notification => {
      const item = window.document.createElement("article"); item.className = "notification-item" + (notification.readAt ? "" : " unread");
      const heading = window.document.createElement("b"); heading.textContent = notification.title;
      const body = window.document.createElement("p"); body.textContent = notification.message;
      const meta = window.document.createElement("small"); meta.textContent = [notification.project?.code, date(notification.createdAt)].filter(Boolean).join(" · ");
      item.append(heading, body, meta);
      const action = window.document.createElement("button"); action.type = "button"; action.textContent = notification.projectId ? "Open project" : notification.entityType === "Lead" ? "Open enquiry" : notification.readAt ? "Read" : "Mark read";
      action.addEventListener("click", async () => {
        try {
          if (!notification.readAt) await api("/notifications/" + encodeURIComponent(notification.id) + "/read", { method: "POST", body: "{}" });
          if (notification.projectId) {
            $("#notificationPanel").hidden = true; $("#notificationButton").setAttribute("aria-expanded", "false");
            $("#projectSelect").value = notification.projectId; await loadProject(notification.projectId);
            $("#overview").scrollIntoView({ behavior: "smooth", block: "start" });
          } else if (notification.entityType === "Lead") {
            $("#notificationPanel").hidden = true; $("#notificationButton").setAttribute("aria-expanded", "false");
            await loadLeads(); $("#leadInbox").scrollIntoView({ behavior: "smooth", block: "start" });
          } else await loadNotifications();
        } catch (error) { message("#dashboardMessage", error.message, "error"); }
      });
      item.append(action); container.append(item);
    });
  }
  async function loadOperationsSummary() {
    const result = await api("/operations/summary");
    const metrics = [
      ["Active projects", result.summary.activeProjects],
      ["Pending top-ups", result.summary.pendingTopUps],
      ["Expense reviews", result.summary.pendingExpenseReviews],
      ["PO approvals", result.summary.purchaseOrdersAwaitingApproval],
      ["Labour approvals", result.summary.labourRecordsAwaitingApproval],
      ["Blocked tasks", result.summary.blockedTasks],
      ["Overdue tasks", result.summary.overdueTasks],
      ["Total projects", result.summary.totalProjects],
      ["New enquiries", result.summary.newLeads]
    ];
    const container = $("#opsMetrics"); container.replaceChildren();
    metrics.forEach(([label, value]) => {
      const card = window.document.createElement("article"); card.className = "ops-metric";
      const name = window.document.createElement("small"); name.textContent = label;
      const number = window.document.createElement("strong"); number.textContent = String(value ?? 0);
      card.append(name, number); container.append(card);
    });
    const recent = $("#opsRecentProjects"); recent.replaceChildren();
    if (!result.recentProjects?.length) return empty(recent, "No projects are assigned to this account yet.");
    result.recentProjects.forEach(project => {
      const item = window.document.createElement("article"); item.className = "ops-project";
      const details = window.document.createElement("div");
      const name = window.document.createElement("b"); name.textContent = project.name;
      const meta = window.document.createElement("small"); meta.textContent = project.code + " · " + titleCase(project.status) + (project.location ? " · " + project.location : "");
      details.append(name, meta);
      const open = window.document.createElement("button"); open.type = "button"; open.textContent = "Open project";
      open.addEventListener("click", async () => {
        const select = $("#projectSelect"); select.value = project.id;
        await loadProject(project.id).catch(error => message("#dashboardMessage", error.message, "error"));
        $("#overview").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      item.append(details, open); recent.append(item);
    });
    message("#opsMessage", "Showing " + result.summary.totalProjects + " projects available to your account.", "info");
  }

  const receptionCopy = {
    PROPERTY_BUY: { title: "Explore properties with Sanora Spaces", body: "Thank you for your interest in Sanora Spaces. We can help you explore available plots and properties, understand the location and documentation, and arrange a discussion or site visit. Reply to this message with your preferred location, budget range and requirements so our team can assist you." },
    PROPERTY_SELL: { title: "Property selling assistance | Sanora Spaces", body: "Thank you for contacting Sanora Spaces. Our team can understand your property details and connect with you regarding the selling process. Please share the property location, type, approximate area and your preferred contact time so we can take this forward." },
    CONSTRUCTION: { title: "Construction solutions | Sanora Spaces", body: "Thank you for considering Sanora Spaces. We support PEB structures, factory sheds, warehouses, farm villas and related construction requirements. Share your project location, approximate dimensions, intended use and timeline so our team can arrange an initial discussion. Estimates are indicative and final material and labour costs are based on actual project requirements." },
    GENERAL_INTRO: { title: "Welcome to Sanora Spaces", body: "Thank you for your interest in Sanora Spaces. We work across property, PEB and industrial structures, farm villas and construction support. Our team would be happy to understand what you are looking for and guide you to the right service. Reply with your requirement and preferred contact time." }
  };
  function updateReceptionPreview() {
    const copy = receptionCopy[$("#receptionCategory").value] || receptionCopy.GENERAL_INTRO;
    setText("#receptionPreviewTitle", copy.title);
    setText("#receptionPreviewBody", copy.body);
  }
  async function loadReceptionHistory() {
    const result = await api("/reception/messages");
    const container = $("#receptionHistory"); container.replaceChildren();
    if (!result.messages?.length) return empty(container, "No messages have been sent from the reception desk yet.");
    result.messages.forEach(item => {
      const line = document.createElement("div"); line.className = "transaction";
      const icon = document.createElement("span"); icon.className = "tx-icon" + (item.status === "SENT" ? " income" : ""); icon.textContent = item.status === "SENT" ? "✓" : "!";
      const info = document.createElement("div"); const heading = document.createElement("b"); heading.textContent = item.recipient + " · " + titleCase(item.category);
      const detail = document.createElement("small"); detail.textContent = item.channel + " · " + date(item.createdAt) + " · " + (item.actor?.name || "Staff");
      info.append(heading, detail); const status = document.createElement("strong"); status.textContent = item.status === "SENT" ? "Accepted" : "Failed"; status.className = item.status === "SENT" ? "positive" : "";
      line.append(icon, info, status);
      if (item.errorMessage) { const error = document.createElement("small"); error.textContent = item.errorMessage; error.style.flexBasis = "100%"; line.append(error); }
      container.append(line);
    });
  }
  async function sendReceptionMessage(channel) {
    const recipient = channel === "EMAIL" ? $("#receptionEmail").value.trim() : $("#receptionPhone").value.trim();
    if (!recipient) return message("#receptionMessage", channel === "EMAIL" ? "Enter the customer's email address." : "Enter the WhatsApp number with country code.", "error");
    const button = channel === "EMAIL" ? $("#sendReceptionEmail") : $("#sendReceptionWhatsApp");
    button.disabled = true; const oldText = button.textContent; button.textContent = "Sending…";
    try {
      const result = await api("/reception/messages", { method: "POST", body: JSON.stringify({
        channel, category: $("#receptionCategory").value, recipient,
        recipientName: $("#receptionName").value.trim()
      }) });
      message("#receptionMessage", result.message || "Message sent.", "info");
      await loadReceptionHistory();
    } catch (error) {
      message("#receptionMessage", error.message, "error");
      await loadReceptionHistory().catch(() => undefined);
    } finally { button.disabled = false; button.textContent = oldText; }
  }
  $("#receptionCategory").addEventListener("change", updateReceptionPreview);
  $("#sendReceptionEmail").addEventListener("click", () => sendReceptionMessage("EMAIL"));
  $("#sendReceptionWhatsApp").addEventListener("click", () => sendReceptionMessage("WHATSAPP"));
  $("#refreshReceptionHistory").addEventListener("click", () => loadReceptionHistory().catch(error => message("#receptionMessage", error.message, "error")));
  async function enterWorkspace() {
    show("dashboard");
    setText("#userName", currentUser?.name || "Customer");
    setText("#userEmail", currentUser?.email || "");
    setText("#userInitials", initials(currentUser?.name));
    $("#operationsOverview").hidden = currentUser?.role === "CUSTOMER";
    $("#topUpPanel").hidden = currentUser?.role !== "CUSTOMER";
    const financeRole = ["SUPER_ADMIN", "DIRECTOR", "FINANCE"].includes(currentUser?.role);
    $("#financeTopUpPanel").hidden = !financeRole;
    $("#financeQueuePanel").hidden = !financeRole;
    const planningRole = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "SITE_ENGINEER"].includes(currentUser?.role);
    const managerRole = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER"].includes(currentUser?.role);
    $("#planningControls").hidden = !planningRole;
    $("#projectTeamPanel").hidden = !managerRole;
    const procurementRole = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "PROCUREMENT"].includes(currentUser?.role);
    const estimateRole = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "SITE_ENGINEER"].includes(currentUser?.role);
    const labourRole = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "SITE_ENGINEER"].includes(currentUser?.role);
    $("#vendorCreatePanel").hidden = !procurementRole;
    $("#purchaseOrderCreatePanel").hidden = !procurementRole;
    $("#estimateCreatePanel").hidden = !estimateRole;
    $("#labourCreatePanel").hidden = !labourRole;
    $("#staffOperationsForms").hidden = !procurementRole && !estimateRole && !labourRole;
    $("#siteUpdateForm").hidden = !planningRole;
    $("#inspectionForm").hidden = !planningRole;
    $("#inspectionVisibilityLabel").hidden = !managerRole;
    const documentUploadRole = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "PROCUREMENT", "SITE_ENGINEER", "FINANCE"].includes(currentUser?.role);
    $("#documentUploadForm").hidden = !documentUploadRole;
    $("#documentVisibilityLabel").hidden = !managerRole;
    $("#siteUpdateVisibilityLabel").hidden = !managerRole;
    $("#milestoneVisibilityLabel").hidden = !managerRole;
    $("#taskVisibilityLabel").hidden = !managerRole;
    try {
      await loadProjects();
      if (currentUser?.role !== "CUSTOMER") await loadOperationsSummary();
      const leadRole = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "SALES"].includes(currentUser?.role);
      $("#leadInbox").hidden = !leadRole;
      if (leadRole) await loadLeads();
      const receptionRole = ["FRONT_DESK", "SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS"].includes(currentUser?.role);
      $("#receptionDesk").hidden = !receptionRole;
      if (receptionRole) { updateReceptionPreview(); await loadReceptionHistory(); }
      const customerAdminRole = ["SUPER_ADMIN", "DIRECTOR", "CORPORATE_OPS", "BRANCH_MANAGER", "BRANCH_PARTNER", "SALES"].includes(currentUser?.role);
      $("#customerAdminPanel").hidden = !customerAdminRole;
      if (customerAdminRole) await loadCustomers();
      await loadNotifications();
    } catch (error) { message("#dashboardMessage", error.message, "error"); }
  }
  function signOut(showMessage = true) {
    token = null; currentUser = null; sessionStorage.removeItem(tokenKey);
    $("#notificationPanel").hidden = true;
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
  $("#captureSiteLocation").addEventListener("click", () => {
    if (!navigator.geolocation) return message("#siteUpdateMessage", "Location is not available in this browser.", "error");
    message("#siteUpdateMessage", "Requesting phone location…", "info");
    navigator.geolocation.getCurrentPosition(position => {
      $("#siteLatitude").value = position.coords.latitude.toFixed(7);
      $("#siteLongitude").value = position.coords.longitude.toFixed(7);
      message("#siteUpdateMessage", "Current location captured.", "info");
    }, error => {
      message("#siteUpdateMessage", error.code === 1 ? "Location permission was denied. You can enter coordinates manually." : "Unable to get your location. Try again or enter coordinates manually.", "error");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  });
  $("#notificationButton").addEventListener("click", async () => {
    const panel = $("#notificationPanel");
    panel.hidden = !panel.hidden;
    $("#notificationButton").setAttribute("aria-expanded", String(!panel.hidden));
    if (!panel.hidden) {
      try { await loadNotifications(); }
      catch (error) { empty($("#notificationList"), error.message); }
    }
  });
  $("#markAllNotificationsRead").addEventListener("click", async () => {
    try {
      await api("/notifications/read-all", { method: "POST", body: "{}" });
      await loadNotifications();
    } catch (error) { message("#dashboardMessage", error.message, "error"); }
  });
  $("#downloadStatementButton").addEventListener("click", async () => {
    if (!activeProjectId || !token) return;
    const button = $("#downloadStatementButton"); button.disabled = true; button.textContent = "Preparing statement…";
    try {
      const response = await fetch(API + "/projects/" + encodeURIComponent(activeProjectId) + "/statement.csv", { headers: { Authorization: "Bearer " + token } });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error?.message || "The project statement could not be downloaded.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = "sanora-project-statement.csv";
      window.document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      message("#statementMessage", "Project statement downloaded.", "info");
    } catch (error) { message("#statementMessage", error.message, "error"); }
    finally { button.disabled = false; button.textContent = "Download project statement (CSV)"; }
  });
  $("#documentUploadForm").addEventListener("submit", async event => {
    event.preventDefault(); if (!activeProjectId) return;
    const formElement = event.currentTarget; const form = new FormData(formElement);
    const file = $("#documentFile").files?.[0];
    if (!file) return message("#documentUploadMessage", "Choose a file to upload.", "error");
    if (file.size < 1 || file.size > 15 * 1024 * 1024) return message("#documentUploadMessage", "File size must be between 1 byte and 15 MiB.", "error");
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!allowedTypes.includes(file.type)) return message("#documentUploadMessage", "This file type is not supported.", "error");
    const button = $("#documentUploadButton"); button.disabled = true; button.textContent = "Uploading…";
    try {
      const ticket = await api("/projects/" + encodeURIComponent(activeProjectId) + "/documents/upload-url", {
        method: "POST",
        body: JSON.stringify({
          fileName: file.name, contentType: file.type, sizeBytes: file.size,
          category: form.get("category"), description: form.get("description") || undefined,
          customerVisible: $("#documentCustomerVisible").checked
        })
      });
      const response = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.requiredHeaders, body: file });
      if (!response.ok) throw new Error("The file upload did not complete. Please retry.");
      const completed = await api("/documents/" + encodeURIComponent(ticket.document.id) + "/complete", { method: "POST", body: "{}" });
      message("#documentUploadMessage", completed.message || "Document uploaded and verified.", "info");
      formElement.reset(); await renderDocuments(activeProjectId);
    } catch (error) { message("#documentUploadMessage", error.message, "error"); }
    finally { button.disabled = false; button.textContent = "Upload document"; }
  });
  $("#siteUpdateForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!activeProjectId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const files = Array.from($("#sitePhotos").files || []);
    if (files.length > 5) return message("#siteUpdateMessage", "Select up to five photos per update.", "error");
    if (files.some(file => file.size > 15 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type))) return message("#siteUpdateMessage", "Each photo must be JPG, PNG or WebP and no larger than 15 MiB.", "error");
    const button = $("#siteUpdateSubmit"); button.disabled = true; button.textContent = "Saving…";
    try {
      const latitude = form.get("latitude"), longitude = form.get("longitude");
      const result = await api("/projects/" + encodeURIComponent(activeProjectId) + "/updates", {
        method: "POST",
        body: JSON.stringify({
          category: form.get("category"), title: form.get("title"), description: form.get("description"),
          latitude: latitude === "" || latitude === null ? undefined : Number(latitude),
          longitude: longitude === "" || longitude === null ? undefined : Number(longitude),
          customerVisible: $("#siteUpdateVisibility").checked
        })
      });
      const updateId = result.update.id;
      let uploaded = 0;
      for (const file of files) {
        const ticket = await api("/projects/" + encodeURIComponent(activeProjectId) + "/documents/upload-url", {
          method: "POST",
          body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size, category: "SITE_PHOTO", description: "Site diary photo", projectUpdateId: updateId, customerVisible: $("#siteUpdateVisibility").checked })
        });
        const response = await fetch(ticket.uploadUrl, { method: ticket.method, headers: ticket.requiredHeaders, body: file });
        if (!response.ok) throw new Error("Photo upload failed for " + file.name + ". The site update itself was saved.");
        await api("/documents/" + encodeURIComponent(ticket.document.id) + "/complete", { method: "POST", body: "{}" });
        uploaded += 1;
      }
      message("#siteUpdateMessage", "Site update saved" + (files.length ? " with " + uploaded + " photo(s)." : "."), "info");
      formElement.reset();
      await loadProject(activeProjectId);
    } catch (error) {
      message("#siteUpdateMessage", error.message, "error");
      await loadProject(activeProjectId).catch(() => undefined);
    } finally { button.disabled = false; button.textContent = "Save site update"; }
  });
  $("#inspectionForm").addEventListener("submit", async event => {
    event.preventDefault(); if (!activeProjectId) return;
    const formElement = event.currentTarget; const form = new FormData(formElement);
    const checks = String(form.get("checks") || "").split(/\r?\n/).map(value => value.trim()).filter(Boolean).map(title => ({ title, isRequired: true }));
    if (!checks.length) return message("#inspectionMessage", "Add at least one checklist item.", "error");
    const scheduled = form.get("scheduledAt");
    const button = formElement.querySelector('button[type="submit"]'); button.disabled = true;
    try {
      const result = await api("/projects/" + encodeURIComponent(activeProjectId) + "/inspections", {
        method: "POST",
        body: JSON.stringify({
          category: form.get("category"), title: form.get("title"),
          description: form.get("description") || undefined,
          scheduledAt: scheduled ? new Date(String(scheduled) + "T09:00:00").toISOString() : undefined,
          customerVisible: $("#inspectionVisibility").checked, checks
        })
      });
      message("#inspectionMessage", result.message || "Inspection checklist created.", "info");
      formElement.reset(); await loadProject(activeProjectId);
    } catch (error) { message("#inspectionMessage", error.message, "error"); }
    finally { button.disabled = false; }
  });
  $("#projectMemberForm").addEventListener("submit", async event => {
    event.preventDefault(); if (!activeProjectId) return;
    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('button[type="submit"]'); button.disabled = true;
    try {
      const result = await api("/projects/" + encodeURIComponent(activeProjectId) + "/members", {
        method: "POST", body: JSON.stringify({ userId: form.get("userId"), access: form.get("access") })
      });
      message("#projectMemberMessage", result.message || "Project team access updated.", "info");
      event.currentTarget.reset(); await loadProject(activeProjectId);
    } catch (error) { message("#projectMemberMessage", error.message, "error"); }
    finally { button.disabled = false; }
  });
  $("#customerInviteForm").addEventListener("submit", async event => {
    event.preventDefault();
    const formElement = event.currentTarget; const form = new FormData(formElement);
    const button = formElement.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = "Creating link…";
    try {
      const result = await api("/customer-invitations", { method: "POST", body: JSON.stringify({
        name: form.get("name"), email: form.get("email"), phone: form.get("phone") || undefined
      }) });
      $("#invitationUrl").value = /^https?:\/\//i.test(result.invitationUrl) ? result.invitationUrl : (window.location.origin + result.invitationUrl);
      $("#invitationResult").hidden = false;
      message("#customerInviteMessage", result.message, "info");
      formElement.reset();
    } catch (error) { message("#customerInviteMessage", error.message, "error"); }
    finally { button.disabled = false; button.textContent = "Create invitation link"; }
  });
  $("#copyInvitationUrl").addEventListener("click", async () => {
    const url = $("#invitationUrl").value;
    try {
      await navigator.clipboard.writeText(url);
      message("#customerInviteMessage", "Invitation link copied. Share it securely with the customer.", "info");
    } catch { $("#invitationUrl").focus(); $("#invitationUrl").select(); message("#customerInviteMessage", "Copy is unavailable here. Select the invitation link and copy it manually.", "error"); }
  });
  $("#projectCreateForm").addEventListener("submit", async event => {
    event.preventDefault();
    const formElement = event.currentTarget; const form = new FormData(formElement);
    const button = formElement.querySelector('button[type="submit"]'); button.disabled = true; button.textContent = "Creating project…";
    try {
      const result = await api("/projects", { method: "POST", body: JSON.stringify({
        customerId: form.get("customerId"), name: form.get("name"),
        location: form.get("location") || undefined, description: form.get("description") || undefined
      }) });
      message("#projectCreateMessage", "Project " + result.project.code + " created.", "info");
      formElement.reset();
      await loadProjects(result.project.id);
      await loadOperationsSummary();
      $("#overview").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) { message("#projectCreateMessage", error.message, "error"); }
    finally { button.disabled = false; button.textContent = "Create project"; }
  });
  $("#vendorCreateForm").addEventListener("submit", async event => {
    event.preventDefault();
    const formElement = event.currentTarget; const form = new FormData(formElement);
    try {
      const result = await api("/vendors", { method: "POST", body: JSON.stringify({
        name: form.get("name"), contactName: form.get("contactName") || undefined,
        phone: form.get("phone") || undefined, email: form.get("email") || undefined,
        gstin: form.get("gstin") || undefined, address: form.get("address") || undefined
      }) });
      message("#vendorFormMessage", "Vendor saved: " + result.vendor.name, "info"); formElement.reset();
      const vendors = await api("/vendors"); populateVendorSelect(vendors.vendors || []);
    } catch (error) { message("#vendorFormMessage", error.message, "error"); }
  });
  $("#purchaseOrderCreateForm").addEventListener("submit", async event => {
    event.preventDefault(); if (!activeProjectId) return;
    const formElement = event.currentTarget; const form = new FormData(formElement);
    const quantity = Number(form.get("quantity")), unitRate = Number(form.get("unitRate"));
    if (!Number.isFinite(quantity) || !Number.isFinite(unitRate)) return message("#poFormMessage", "Enter a valid quantity and unit rate.", "error");
    try {
      const created = await api("/projects/" + encodeURIComponent(activeProjectId) + "/purchase-orders", {
        method: "POST", body: JSON.stringify({ vendorId: form.get("vendorId"), notes: form.get("notes") || undefined,
          lines: [{ description: form.get("description"), quantity, unit: form.get("unit"), unitRate }] })
      });
      const submitted = await api("/purchase-orders/" + encodeURIComponent(created.purchaseOrder.id) + "/submit", { method: "POST", body: "{}" });
      message("#poFormMessage", submitted.message || "Purchase order submitted for Finance approval.", "info");
      formElement.reset(); await loadProject(activeProjectId); await loadOperationsSummary().catch(() => undefined);
    } catch (error) { message("#poFormMessage", error.message, "error"); }
  });
  $("#estimateCreateForm").addEventListener("submit", async event => {
    event.preventDefault(); if (!activeProjectId) return;
    const formElement = event.currentTarget; const form = new FormData(formElement);
    const quantity = Number(form.get("quantity")), unitRate = Number(form.get("unitRate"));
    if (!Number.isFinite(quantity) || !Number.isFinite(unitRate)) return message("#estimateFormMessage", "Enter a valid quantity and unit rate.", "error");
    try {
      const created = await api("/projects/" + encodeURIComponent(activeProjectId) + "/estimates", {
        method: "POST", body: JSON.stringify({ title: form.get("title"), assumptions: form.get("assumptions") || undefined,
          exclusions: form.get("exclusions") || undefined,
          lines: [{ category: form.get("category"), description: form.get("description"), quantity, unit: form.get("unit"), unitRate }] })
      });
      const submitted = await api("/estimates/" + encodeURIComponent(created.estimate.id) + "/submit", { method: "POST", body: "{}" });
      message("#estimateFormMessage", "Estimate v" + created.estimate.version + " submitted. Indicative total: " + money(created.indicativeTotal) + ". " + (submitted.message || ""), "info");
      formElement.reset(); await loadProject(activeProjectId);
    } catch (error) { message("#estimateFormMessage", error.message, "error"); }
  });
  $("#labourCreateForm").addEventListener("submit", async event => {
    event.preventDefault(); if (!activeProjectId) return;
    const formElement = event.currentTarget; const form = new FormData(formElement);
    const quantity = Number(form.get("quantity")), rate = Number(form.get("rate"));
    if (!Number.isFinite(quantity) || !Number.isFinite(rate)) return message("#labourFormMessage", "Enter a valid quantity and rate.", "error");
    try {
      const result = await api("/projects/" + encodeURIComponent(activeProjectId) + "/labour", {
        method: "POST", body: JSON.stringify({ workerName: form.get("workerName"), workType: form.get("workType"),
          workDate: new Date(String(form.get("workDate")) + "T00:00:00.000Z").toISOString(),
          description: form.get("description"), quantity, unit: form.get("unit"), rate })
      });
      message("#labourFormMessage", result.message, "info"); formElement.reset();
      await loadProject(activeProjectId); await loadOperationsSummary().catch(() => undefined);
    } catch (error) { message("#labourFormMessage", error.message, "error"); }
  });
  $("#milestoneForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (!activeProjectId) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
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
    const due = form.get("dueDate"), start = form.get("startDate");
    try {
      const result = await api("/projects/" + encodeURIComponent(activeProjectId) + "/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"), workPackage: form.get("workPackage") || undefined,
          weight: Number(form.get("weight") || 1),
          milestoneId: form.get("milestoneId") || undefined, assignedToId: form.get("assignedToId") || undefined,
          startDate: start ? new Date(String(start) + "T00:00:00").toISOString() : undefined,
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