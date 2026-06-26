/**
 * ServicePro — Station Management System
 * app.js — COMPLETE FINAL VERSION
 */
"use strict";

const KEYS = {
  services: "servicepro_services",
  vehicles: "servicepro_vehicles",
  tokens: "servicepro_tokens",
  inventory: "servicepro_inventory",
  invoices: "servicepro_invoices",
  categories: "servicepro_categories",
  expenses: "servicepro_expenses",
  settings: "servicepro_settings",
  counters: "servicepro_counters",
  password: "servicepro_password",
};
const STATE = {
  tokens: JSON.parse(localStorage.getItem(KEYS.tokens)) || [],
  vehicles: JSON.parse(localStorage.getItem(KEYS.vehicles)) || [],
  services: JSON.parse(localStorage.getItem(KEYS.services)) || [],
  inventory: JSON.parse(localStorage.getItem(KEYS.inventory)) || [],
  invoices: JSON.parse(localStorage.getItem(KEYS.invoices)) || [],
  expenses: JSON.parse(localStorage.getItem(KEYS.expenses)) || [],
    categories: JSON.parse(localStorage.getItem(KEYS.categories)) || [  
    { id: 'oil', name: 'Engine Oils', icon: 'oil_barrel' },
    { id: 'filter', name: 'Filters', icon: 'filter_alt' },
    { id: 'coolant', name: 'Coolants', icon: 'water_drop' },
    { id: 'misc', name: 'Miscellaneous', icon: 'category' }
  ],
  settings: JSON.parse(localStorage.getItem(KEYS.settings)) || {
    businessName: "My Service Station",
    address: "Main Road, City",
    phone: "0300-0000000",
    email: "info@mystation.pk",
    invoicePrefix: "INV-",
    taxRate: 0,
    footerNote: "Thank you for your business! Please visit again.",
  },
  counters: JSON.parse(localStorage.getItem(KEYS.counters)) || {
    invoiceCounter: 1,
    tokenCounter: 1,
  },
  confirmCallback: null,
  sessionStart: new Date(),
};

function persist(k, d) {
  try {
    localStorage.setItem(k, JSON.stringify(d));
    return true;
  } catch (e) {
    toast("Storage full!", "error");
    return false;
  }
}
function saveCategories() { persist(KEYS.categories, STATE.categories); }
function saveTokens() {
  persist(KEYS.tokens, STATE.tokens);
}
function saveVehicles() {
  persist(KEYS.vehicles, STATE.vehicles);
}
function saveServices() {
  persist(KEYS.services, STATE.services);
}
function saveInventory() {
  persist(KEYS.inventory, STATE.inventory);
}
function saveInvoices() {
  persist(KEYS.invoices, STATE.invoices);
}
function saveExpenses() {
  persist(KEYS.expenses, STATE.expenses);
}
function saveSettings() {
  persist(KEYS.settings, STATE.settings);
}
function saveCounters() {
  persist(KEYS.counters, STATE.counters);
}

function uid() {
  return (
    "_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  );
}
function fmtTime(d = new Date()) {
  try {
    return d.toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return d.toLocaleTimeString();
  }
}
function fmtDate(d = new Date()) {
  const m = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${String(d.getDate()).padStart(2, "0")}-${m[d.getMonth()]}-${d.getFullYear()}`;
}
function parseDate(s) {
  if (!s) return null;
  const m = {
      Jan: 0,
      Feb: 1,
      Mar: 2,
      Apr: 3,
      May: 4,
      Jun: 5,
      Jul: 6,
      Aug: 7,
      Sep: 8,
      Oct: 9,
      Nov: 10,
      Dec: 11,
    },
    p = s.split("-");
  if (p.length !== 3) return null;
  const d = parseInt(p[0]),
    mo = m[p[1]],
    y = parseInt(p[2]);
  if (mo === undefined || isNaN(d) || isNaN(y)) return null;
  return new Date(y, mo, d);
}
function toDateInputValue(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function fmtPrice(n) {
  return "Rs. " + (Number(n) || 0).toLocaleString("en-PK");
}
function qs(s, c = document) {
  return c.querySelector(s);
}
function qsa(s, c = document) {
  return Array.from(c.querySelectorAll(s));
}
function sanitize(s) {
  if (s == null) return "";
  const d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}
function setValue(s, v) {
  const e = qs(s);
  if (e) e.value = v;
}
function setText(s, v) {
  const e = qs(s);
  if (e) e.textContent = v;
}
function setHTML(s, v) {
  const e = qs(s);
  if (e) e.innerHTML = v;
}

function toast(m, t = "info") {
  const i = {
      success: "check_circle",
      error: "error",
      warning: "warning",
      info: "info",
    },
    c = qs("#toastContainer");
  if (!c) return;
  const e = document.createElement("div");
  e.className = `toast toast--${t}`;
  e.innerHTML = `<span class="material-icons">${i[t] || "info"}</span><span>${sanitize(m)}</span>`;
  c.appendChild(e);
  setTimeout(() => {
    e.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => e.remove(), 300);
  }, 3200);
}

function openModal(id) {
  const m = qs(`#${id}`);
  if (m) {
    m.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
}
function closeModal(id) {
  const m = qs(`#${id}`);
  if (m) {
    m.classList.add("hidden");
    document.body.style.overflow = "";
  }
}
function bindModalClosers() {
  document.addEventListener("click", (e) => {
    const cb = e.target.closest("[data-close]");
    if (cb) {
      closeModal(cb.dataset.close);
      return;
    }
    if (e.target.classList.contains("modal-overlay")) closeModal(e.target.id);
  });
}
function confirm(m, fn, l = "Delete") {
  setText("#confirmMessage", m);
  setHTML(
    "#confirmActionBtn",
    `<span class="material-icons">delete</span> ${l}`,
  );
  STATE.confirmCallback = fn;
  openModal("confirmModal");
}
// Set login screen brand name BEFORE login
function setLoginBrandName() {
  const s = JSON.parse(localStorage.getItem(KEYS.settings));
  const brandName = s?.businessName || "My Service Station";
  const loginBrand = document.getElementById("loginBrandName");
  if (loginBrand) {
    loginBrand.textContent = brandName;
  }
}

function initLogin() {
  const f = qs("#loginForm"),
    er = qs("#loginError"),
    tg = qs("#togglePassword"),
    pi = qs("#loginPassword");
  if (!f || !er) return;
  if (tg && pi)
    tg.addEventListener("click", () => {
      const p = pi.type === "password";
      pi.type = p ? "text" : "password";
      tg.querySelector(".material-icons").textContent = p
        ? "visibility"
        : "visibility_off";
    });
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const u = qs("#loginUsername").value.trim(),
      p = qs("#loginPassword").value;
    er.classList.remove("visible");
    if (
      u === "admin" &&
      p === (localStorage.getItem(KEYS.password) || "admin123")
    ) {
      qs("#loginScreen").classList.add("hidden");
      qs("#app").classList.remove("hidden");
      initApp();
    } else {
      er.textContent = "Invalid credentials.";
      er.classList.add("visible");
      qs("#loginUsername").focus();
    }
  });
}

function initApp() {
  setText("#currentDate", fmtDate());
  updateSessionTime();
  setInterval(updateSessionTime, 60000);
  updateAllBrandNames();

  // ✅ MOBILE MENU HANDLER
  const mobileMenuBtn = qs("#mobileMenuBtn");
  const sidebarCloseBtn = qs("#sidebarCloseBtn");
  const sidebar = qs("#sidebar");
  const backdrop = qs("#sidebarBackdrop");

  function openSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.add("mobile-open");
    backdrop.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeSidebar() {
    if (!sidebar || !backdrop) return;
    sidebar.classList.remove("mobile-open");
    backdrop.classList.add("hidden");
    document.body.style.overflow = "";
  }

  if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", openSidebar);
  if (sidebarCloseBtn) sidebarCloseBtn.addEventListener("click", closeSidebar);
  if (backdrop) backdrop.addEventListener("click", closeSidebar);

  // Desktop sidebar toggle
  qs("#sidebarToggle")?.addEventListener("click", () => {
    const sb = qs("#sidebar"), mw = qs("#mainWrapper");
    if (!sb || !mw) return;
    sb.classList.toggle("collapsed");
    mw.classList.toggle("sidebar-collapsed");
    const ic = qs("#sidebarToggle .material-icons");
    if (ic) ic.textContent = sb.classList.contains("collapsed") ? "menu" : "menu_open";
  });

  // Navigation + close sidebar on mobile
  qsa(".nav-link").forEach((l) =>
    l.addEventListener("click", (e) => {
      e.preventDefault();
      if (l.dataset.module) navigateTo(l.dataset.module);
      if (window.innerWidth <= 768) closeSidebar();
    }),
  );

  document.addEventListener("click", (e) => {
    const ab = e.target.closest("[data-action]");
    if (ab) handleQuickAction(ab.dataset.action);
    const nb = e.target.closest("[data-nav]");
    if (nb) navigateTo(nb.dataset.nav);
  });

  qs("#logoutBtn")?.addEventListener("click", () => {
    if (window.confirm("Sign out?")) {
      qs("#app").classList.add("hidden");
      qs("#loginScreen").classList.remove("hidden");
      setValue("#loginUsername", "");
      setValue("#loginPassword", "");
    }
  });

  qs("#confirmActionBtn")?.addEventListener("click", () => {
    if (STATE.confirmCallback) {
      STATE.confirmCallback();
      STATE.confirmCallback = null;
    }
    closeModal("confirmModal");
  });

  initDashboard();
  initTokens();
  initVehicles();
  initServices();
  initInventory();
  initBilling();
  initReports();
  initExpenses();
  initSettings();
  bindModalClosers();
  navigateTo("dashboard");
}
function updateSessionTime() {
  const e = qs("#sessionTime");
  if (!e) return;
  const d = Math.floor((new Date() - STATE.sessionStart) / 60000);
  e.textContent = `Session started ${d < 1 ? "just now" : d + " min ago"}`;
}
function updateAllBrandNames() {
  const s = STATE.settings;
  const lb = qs("#loginBrandName");
  if (lb) lb.textContent = s.businessName;
  const sb = qs(".sidebar-brand");
  if (sb) sb.textContent = s.businessName;
  const ib = qs("#invBusinessName");
  if (ib) ib.textContent = s.businessName;
  const ia = qs("#invBusinessAddress");
  if (ia) ia.textContent = s.address;
  const ip = qs("#invBusinessPhone");
  if (ip) ip.textContent = "Phone: " + s.phone;
  const iff = qs("#invFooterNote");
  if (iff) iff.textContent = s.footerNote;
}

const MODULE_TITLES = {
  dashboard: ["Dashboard", "Overview & quick actions"],
  tokens: ["Token Management", "Track and manage service tokens"],
  vehicles: ["Vehicle Records", "Customer vehicle history"],
  services: ["Services", "Manage your service catalogue"],
  inventory: ["Inventory", "Stock levels and product management"],
  billing: ["Billing & Invoice", "Create and print invoices"],
  reports: ["Reports", "Financial reports & analytics"],
  expenses: ["Expenses", "Track all business expenses"],
  settings: ["Settings", "Configure your station"],
};
function navigateTo(mod) {
  qsa(".nav-link").forEach((l) =>
    l.classList.toggle("active", l.dataset.module === mod),
  );
  qsa(".module").forEach((m) => m.classList.add("hidden"));
  const tgt = qs(`#module-${mod}`);
  if (tgt) tgt.classList.remove("hidden");
  const [t, s] = MODULE_TITLES[mod] || [mod, ""];
  setText("#pageTitle", t);
  setText("#pageSubtitle", s);
  switch (mod) {
    case "dashboard":
      refreshDashboard();
      break;
    case "tokens":
      renderTokenTable();
      break;
    case "vehicles":
      renderVehicleTable();
      break;
    case "services":
      renderServicesGrid();
      break;
    case "inventory":
      renderInventoryTable();
      break;
    case "reports":
      renderReports();
      break;
    case "expenses":
      renderExpenses();
      break;
    case "settings":
      loadSettingsForm();
      break;
  }
}
function handleQuickAction(a) {
  const m = {
    newToken: () => {
      navigateTo("tokens");
      openNewTokenModal();
    },
    newVehicle: () => {
      navigateTo("vehicles");
      openNewVehicleModal();
    },
    newInvoice: () => navigateTo("billing"),
    stockIn: () => navigateTo("inventory"),
    dailyReport: () => navigateTo("reports"),
    inventory: () => navigateTo("inventory"),
  };
  if (m[a]) m[a]();
}

function getTotalRevenue() {
  let t = 0;
  STATE.tokens.forEach((tk) => {
    if (tk.status === "completed") {
      if (tk.servicePrice > 0) t += tk.servicePrice;
      else {
        const s = STATE.services.find((sv) => sv.name === tk.service);
        if (s) t += s.price;
      }
    }
  });
  return t;
}
function getTotalExpenses() {
  return STATE.expenses
    .filter((e) => e.category !== "labour")
    .reduce((s, e) => s + (e.amount || 0), 0);
}
function getLabourCost() {
  return STATE.expenses
    .filter((e) => e.category === "labour")
    .reduce((s, e) => s + (e.amount || 0), 0);
}
function getAllExpensesTotal() {
  return STATE.expenses.reduce((s, e) => s + (e.amount || 0), 0);
}

function initDashboard() {
  refreshDashboard();
}
function refreshDashboard() {
  const tv = STATE.tokens.length,
    at = STATE.tokens.filter(
      (t) => t.status === "waiting" || t.status === "in-progress",
    ).length,
    ct = STATE.tokens.filter((t) => t.status === "completed").length,
    cr = tv > 0 ? Math.round((ct / tv) * 100) : 0,
    dr = getTotalRevenue(),
    ls = STATE.inventory.filter((i) => i.stock < i.minStock).length,
    oe = getTotalExpenses(),
    lc = getLabourCost(),
    pf = dr - getAllExpensesTotal();
  updateKpiCard("kpiVehicles", "kpiVehiclesTrend", tv, "Total tokens", "");
  updateKpiCard("kpiTokens", "kpiTokensTrend", at, "In service", "");
  updateKpiCard("kpiCompleted", "kpiCompletedTrend", ct, `${cr}% rate`, "");
  updateKpiCard(
    "kpiRevenue",
    "kpiRevenueTrend",
    fmtPrice(dr),
    "Completed services",
    dr > 0 ? "up" : "",
  );
  updateKpiCard(
    "kpiAlerts",
    "kpiAlertsTrend",
    ls,
    "Low stock",
    ls > 0 ? "warn" : "",
  );
  updateKpiCard(
    "kpiLowStock",
    "kpiLowStockTrend",
    ls,
    "Restock needed",
    ls > 0 ? "warn" : "",
  );
  updateKpiCard(
    "kpiTotalExpenses",
    "kpiTotalExpensesTrend",
    fmtPrice(oe),
    "Parts, repair",
    oe > 0 ? "warn" : "",
  );
  updateKpiCard(
    "kpiLabourCost",
    "kpiLabourCostTrend",
    fmtPrice(lc),
    "Workers",
    lc > 0 ? "warn" : "",
  );
  updateKpiCard(
    "kpiNetProfit",
    "kpiNetProfitTrend",
    fmtPrice(pf),
    pf >= 0 ? "Profit" : "Loss",
    pf >= 0 ? "up" : "warn",
  );
  const np = qs("#kpiNetProfit");
  if (np) np.style.color = pf >= 0 ? "var(--success)" : "var(--danger)";
  const ab = qs("#activeTokenBadge");
  if (ab) {
    ab.textContent = at;
    ab.classList.toggle("hidden", at === 0);
  }
  const lb = qs("#lowStockBadge");
  if (lb) {
    lb.textContent = ls;
    lb.classList.toggle("hidden", ls === 0);
  }
  renderRecentActivity();
  updateLowStockAlert(ls);
}
function updateKpiCard(vi, ti, v, tr, tc) {
  setText(`#${vi}`, v);
  const te = qs(`#${ti}`);
  if (te) {
    const ic = { up: "trending_up", warn: "error_outline" };
    te.className = tc ? `kpi-trend kpi-trend--${tc}` : "kpi-trend";
    te.innerHTML = `<span class="material-icons">${ic[tc] || "info_outline"}</span> ${tr}`;
  }
}
function updateLowStockAlert(c) {
  const ae = qs("#lowStockAlert");
  if (!ae) return;
  if (c === 0) {
    ae.classList.add("hidden");
    return;
  }
  ae.classList.remove("hidden");
  const me = ae.querySelector("p");
  if (me) {
    const items = STATE.inventory
      .filter((i) => i.stock < i.minStock)
      .map((i) => i.name)
      .join(", ");
    me.textContent = `${items} running low.`;
  }
}
function renderRecentActivity() {
  const tb = qs("#recentActivityTable");
  if (!tb) return;
  const recent = [...STATE.tokens].reverse();
  if (!recent.length) {
    tb.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:3rem;"><span class="material-icons" style="font-size:36px;opacity:0.4;">history</span><p>No activity yet</p></td></tr>`;
    return;
  }
  tb.innerHTML = recent
    .map(
      (t) =>
        `<tr><td><span class="table-token-no">${sanitize(t.number)}</span></td><td><span class="table-vehicle-no">${sanitize(t.vehicleNo)}</span></td><td>${sanitize(t.service)}</td><td style="color:var(--text-muted);font-size:0.8rem;">${sanitize(t.time)}</td><td>${statusBadge(t.status)}</td></tr>`,
    )
    .join("");
}
function statusBadge(s) {
  const m = {
      waiting: "status-waiting",
      "in-progress": "status-in-progress",
      completed: "status-completed",
    },
    l = {
      waiting: "Waiting",
      "in-progress": "In Progress",
      completed: "Completed",
    };
  return `<span class="status-badge ${m[s] || ""}">${l[s] || s}</span>`;
}

function initTokens() {
  qs("#newTokenBtn")?.addEventListener("click", openNewTokenModal);
  qs("#newTokenBtn2")?.addEventListener("click", openNewTokenModal);
  qs("#saveTokenBtn")?.addEventListener("click", saveToken);
  qs("#tokenSearch")?.addEventListener("input", renderTokenTable);
  qs("#tokenStatusFilter")?.addEventListener("change", renderTokenTable);
  qs("#tokenServiceType")?.addEventListener("change", function () {
    const cg = qs("#customServiceGroup");
    if (cg) cg.style.display = this.value === "Custom" ? "" : "none";
  });
  renderTokenTable();
}
function populateTokenServices() {
  const sel = qs("#tokenServiceType");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select service</option>';
  STATE.services.forEach((s) => {
    const o = document.createElement("option");
    o.value = s.name;
    o.textContent = `${s.name} (${fmtPrice(s.price)})`;
    sel.appendChild(o);
  });
  const co = document.createElement("option");
  co.value = "Custom";
  co.textContent = "Custom Service";
  sel.appendChild(co);
}
function openNewTokenModal() {
  setText(
    "#autoTokenNumber",
    "TK-" + String(STATE.counters.tokenCounter).padStart(3, "0"),
  );
  setValue("#tokenVehicleNo", "");
  setValue("#tokenVehicleType", "");
  setValue("#tokenOwnerName", "");
  setValue("#tokenCustomService", "");
  populateTokenServices();
  const cg = qs("#customServiceGroup");
  if (cg) cg.style.display = "none";
  openModal("tokenModal");
  setTimeout(() => qs("#tokenVehicleNo")?.focus(), 100);
}
function saveToken() {
  const vn = (qs("#tokenVehicleNo")?.value || "").trim().toUpperCase(),
    vt = qs("#tokenVehicleType")?.value || "",
    on = (qs("#tokenOwnerName")?.value || "").trim(),
    st = qs("#tokenServiceType")?.value || "",
    cs = (qs("#tokenCustomService")?.value || "").trim();
  if (!vn) {
    toast("Enter vehicle number", "error");
    return;
  }
  if (!vt) {
    toast("Select vehicle type", "error");
    return;
  }
  if (!st) {
    toast("Select service", "error");
    return;
  }
  if (st === "Custom" && !cs) {
    toast("Describe service", "error");
    return;
  }
  let fs = st === "Custom" ? cs : st,
    sp = 0;
  if (st !== "Custom") {
    const sv = STATE.services.find((s) => s.name === st);
    if (sv) {
      fs = sv.name;
      sp = sv.price;
    }
  }
  const tk = {
    id: uid(),
    number: qs("#autoTokenNumber")?.textContent || "TK-001",
    vehicleNo: vn,
    vehicleType: vt,
    ownerName: on,
    service: fs,
    servicePrice: sp,
    time: fmtTime(),
    status: "waiting",
  };
  const ex = STATE.vehicles.find((v) => v.vehicleNo === vn);
  if (!ex) {
    STATE.vehicles.push({
      id: uid(),
      vehicleNo: vn,
      owner: on,
      contact: "",
      type: vt,
      notes: "",
      visits: 1,
      lastService: fmtDate(),
    });
    saveVehicles();
  } else {
    ex.visits = (ex.visits || 0) + 1;
    ex.lastService = fmtDate();
    saveVehicles();
  }
  STATE.tokens.push(tk);
  STATE.counters.tokenCounter++;
  saveTokens();
  saveCounters();
  closeModal("tokenModal");
  renderTokenTable();
  refreshDashboard();
  toast(`Token ${tk.number} generated`, "success");
}
function renderTokenTable() {
  const sr = (qs("#tokenSearch")?.value || "").toLowerCase(),
    sf = qs("#tokenStatusFilter")?.value || "";
  let fl = STATE.tokens.filter((t) => {
    const ms =
      !sr ||
      t.number.toLowerCase().includes(sr) ||
      t.vehicleNo.toLowerCase().includes(sr) ||
      (t.ownerName || "").toLowerCase().includes(sr) ||
      t.service.toLowerCase().includes(sr);
    return ms && (!sf || t.status === sf);
  });
  const tb = qs("#tokenTableBody"),
    em = qs("#tokenEmptyState"),
    bg = qs("#tokenCountBadge");
  if (bg) bg.textContent = `${fl.length} token${fl.length !== 1 ? "s" : ""}`;
  if (!fl.length) {
    if (tb) tb.innerHTML = "";
    if (em) em.classList.remove("hidden");
    return;
  }
  if (em) em.classList.add("hidden");
  if (tb)
    tb.innerHTML = fl
      .slice()
      .reverse()
      .map(
        (t) =>
          `<tr><td><span class="table-token-no">${sanitize(t.number)}</span></td><td><span class="table-vehicle-no">${sanitize(t.vehicleNo)}</span></td><td>${sanitize(t.vehicleType)}</td><td>${sanitize(t.service)}</td><td style="color:var(--text-muted);font-size:0.8rem;">${sanitize(t.time)}</td><td>${statusBadge(t.status)}</td><td><div class="table-actions">${t.status === "waiting" ? `<button class="btn btn-sm btn-outline" data-token-progress="${t.id}"><span class="material-icons">play_arrow</span></button>` : ""}${t.status === "in-progress" ? `<button class="btn btn-sm btn-primary" data-token-complete="${t.id}"><span class="material-icons">check</span></button>` : ""}${t.status === "completed" ? `<button class="btn btn-sm btn-ghost" data-token-invoice="${t.id}"><span class="material-icons">receipt</span></button>` : ""}<button class="btn-icon btn btn-danger-ghost" data-token-delete="${t.id}"><span class="material-icons">delete</span></button></div></td></tr>`,
      )
      .join("");
}
document.addEventListener("click", (e) => {
  const pb = e.target.closest("[data-token-progress]");
  if (pb) {
    updateTokenStatus(pb.dataset.tokenProgress, "in-progress");
    return;
  }
  const cb = e.target.closest("[data-token-complete]");
  if (cb) {
    updateTokenStatus(cb.dataset.tokenComplete, "completed");
    return;
  }
  const ib = e.target.closest("[data-token-invoice]");
  if (ib) {
    openInvoiceForToken(ib.dataset.tokenInvoice);
    return;
  }
  const db = e.target.closest("[data-token-delete]");
  if (db) {
    confirm("Remove token?", () => {
      STATE.tokens = STATE.tokens.filter(
        (t) => t.id !== db.dataset.tokenDelete,
      );
      saveTokens();
      renderTokenTable();
      refreshDashboard();
      toast("Token removed", "success");
    });
  }
});
function updateTokenStatus(id, s) {
  const tk = STATE.tokens.find((t) => t.id === id);
  if (tk) {
    tk.status = s;
    if (s === "completed" && (!tk.servicePrice || tk.servicePrice === 0)) {
      const sv = STATE.services.find((sv) => sv.name === tk.service);
      if (sv) tk.servicePrice = sv.price;
    }
    saveTokens();
    renderTokenTable();
    refreshDashboard();
    toast(`Token ${tk.number} ${s.replace("-", " ")}`, "success");
  }
}
function openInvoiceForToken(id) {
  const token = STATE.tokens.find((t) => t.id === id);
  if (!token) return;
  navigateTo("billing");
  setTimeout(() => {
    setValue("#invoiceToken", token.number);
    autoFillFromToken(token.number);
    updateInvoicePreview();
  }, 100);
}

function initVehicles() {
  qs("#newVehicleBtn")?.addEventListener("click", () => openNewVehicleModal());
  qs("#saveVehicleBtn")?.addEventListener("click", saveVehicle);
  qs("#vehicleSearch")?.addEventListener("input", renderVehicleTable);
  qs("#vehicleTypeFilter")?.addEventListener("change", renderVehicleTable);
  renderVehicleTable();
}
function openNewVehicleModal(d = null) {
  setValue("#vehicleEditId", d ? d.id : "");
  setValue("#vehicleNumber", d ? d.vehicleNo : "");
  setValue("#vehicleType", d ? d.type : "");
  setValue("#vehicleOwner", d ? d.owner : "");
  setValue("#vehicleContact", d ? d.contact : "");
  setValue("#vehicleNotes", d ? d.notes : "");
  const t = qs("#vehicleModalTitle");
  if (t)
    t.innerHTML = `<span class="material-icons">directions_car</span> ${d ? "Edit" : "Add"} Vehicle`;
  openModal("vehicleModal");
  setTimeout(() => qs("#vehicleNumber")?.focus(), 100);
}
function saveVehicle() {
  const ei = qs("#vehicleEditId")?.value || "",
    vn = (qs("#vehicleNumber")?.value || "").trim().toUpperCase(),
    tp = qs("#vehicleType")?.value || "",
    ow = (qs("#vehicleOwner")?.value || "").trim(),
    ct = (qs("#vehicleContact")?.value || "").trim(),
    nt = (qs("#vehicleNotes")?.value || "").trim();
  if (!vn) {
    toast("Enter vehicle number", "error");
    return;
  }
  if (!tp) {
    toast("Select type", "error");
    return;
  }
  if (!ow) {
    toast("Enter owner", "error");
    return;
  }
  if (ei) {
    const v = STATE.vehicles.find((v) => v.id === ei);
    if (v)
      Object.assign(v, {
        vehicleNo: vn,
        type: tp,
        owner: ow,
        contact: ct,
        notes: nt,
      });
    toast("Updated", "success");
  } else {
    if (STATE.vehicles.find((v) => v.vehicleNo === vn)) {
      toast("Already registered", "warning");
      return;
    }
    STATE.vehicles.push({
      id: uid(),
      vehicleNo: vn,
      owner: ow,
      contact: ct,
      type: tp,
      notes: nt,
      visits: 0,
      lastService: "—",
    });
    toast(`Vehicle ${vn} added`, "success");
  }
  saveVehicles();
  closeModal("vehicleModal");
  renderVehicleTable();
}
function renderVehicleTable() {
  const sr = (qs("#vehicleSearch")?.value || "").toLowerCase(),
    tf = (qs("#vehicleTypeFilter")?.value || "").toLowerCase();
  const fl = STATE.vehicles.filter((v) => {
    const ms =
      !sr ||
      v.vehicleNo.toLowerCase().includes(sr) ||
      v.owner.toLowerCase().includes(sr) ||
      (v.contact || "").includes(sr);
    return ms && (!tf || v.type.toLowerCase() === tf);
  });
  const tb = qs("#vehicleTableBody"),
    em = qs("#vehicleEmptyState"),
    bg = qs("#vehicleCountBadge");
  if (bg) bg.textContent = `${fl.length} vehicle${fl.length !== 1 ? "s" : ""}`;
  if (!fl.length) {
    if (tb) tb.innerHTML = "";
    if (em) em.classList.remove("hidden");
    return;
  }
  if (em) em.classList.add("hidden");
  if (tb)
    tb.innerHTML = fl
      .map(
        (v) =>
          `<tr><td><span class="table-vehicle-no">${sanitize(v.vehicleNo)}</span></td><td style="font-weight:500;">${sanitize(v.owner)}</td><td style="color:var(--text-secondary);">${sanitize(v.contact || "—")}</td><td><span class="badge badge--blue">${sanitize(v.type)}</span></td><td style="color:var(--text-secondary);font-size:0.8rem;">${sanitize(v.lastService || "—")}</td><td style="font-weight:600;color:var(--primary);">${v.visits || 0}</td><td><div class="table-actions"><button class="btn-icon btn btn-ghost" data-vehicle-edit="${v.id}"><span class="material-icons">edit</span></button><button class="btn-icon btn btn-danger-ghost" data-vehicle-delete="${v.id}"><span class="material-icons">delete</span></button></div></td></tr>`,
      )
      .join("");
}
document.addEventListener("click", (e) => {
  const eb = e.target.closest("[data-vehicle-edit]");
  if (eb) {
    const v = STATE.vehicles.find((v) => v.id === eb.dataset.vehicleEdit);
    if (v) openNewVehicleModal(v);
    return;
  }
  const db = e.target.closest("[data-vehicle-delete]");
  if (db) {
    confirm("Delete vehicle?", () => {
      STATE.vehicles = STATE.vehicles.filter(
        (v) => v.id !== db.dataset.vehicleDelete,
      );
      saveVehicles();
      renderVehicleTable();
      toast("Deleted", "success");
    });
  }
});

const SVC_ICONS = {};
function initServices() {
  qs("#newServiceBtn")?.addEventListener("click", () => openServiceModal());
  qs("#saveServiceBtn")?.addEventListener("click", saveService);
  qs("#serviceSearch")?.addEventListener("input", renderServicesGrid);
  renderServicesGrid();
}
function openServiceModal(d = null) {
  setValue("#serviceEditId", d ? d.id : "");
  setValue("#serviceName", d ? d.name : "");
  setValue("#servicePrice", d ? d.price : "");
  setValue("#serviceDuration", d ? d.duration : "");
  setValue("#serviceDescription", d ? d.description : "");
  const t = qs("#serviceModalTitle");
  if (t)
    t.innerHTML = `<span class="material-icons">build</span> ${d ? "Edit" : "Add"} Service`;
  openModal("serviceModal");
  setTimeout(() => qs("#serviceName")?.focus(), 100);
}
function saveService() {
  const ei = qs("#serviceEditId")?.value || "",
    nm = (qs("#serviceName")?.value || "").trim(),
    pr = parseFloat(qs("#servicePrice")?.value) || 0,
    dr = parseInt(qs("#serviceDuration")?.value) || 30,
    ds = (qs("#serviceDescription")?.value || "").trim();
  if (!nm) {
    toast("Enter name", "error");
    return;
  }
  if (!pr) {
    toast("Enter price", "error");
    return;
  }
  if (ei) {
    const s = STATE.services.find((s) => s.id === ei);
    if (s)
      Object.assign(s, { name: nm, price: pr, duration: dr, description: ds });
    toast("Updated", "success");
  } else {
    STATE.services.push({
      id: uid(),
      name: nm,
      price: pr,
      duration: dr,
      description: ds,
    });
    toast(`Service "${nm}" added`, "success");
  }
  saveServices();
  closeModal("serviceModal");
  renderServicesGrid();
}
function renderServicesGrid() {
  const sr = (qs("#serviceSearch")?.value || "").toLowerCase(),
    gd = qs("#servicesGrid");
  if (!gd) return;
  const fl = STATE.services.filter(
    (s) =>
      !sr ||
      s.name.toLowerCase().includes(sr) ||
      (s.description || "").toLowerCase().includes(sr),
  );
  if (!fl.length) {
    gd.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><span class="material-icons">build</span><h3>No services</h3></div>`;
    return;
  }
  gd.innerHTML = fl
    .map(
      (s) =>
        `<div class="service-card"><div class="service-card-icon"><span class="material-icons">${SVC_ICONS[s.name] || "build"}</span></div><div class="service-card-name">${sanitize(s.name)}</div><div class="service-card-desc">${sanitize(s.description || "")}</div><div class="service-card-footer"><span class="service-price">${fmtPrice(s.price)}</span><span class="service-duration"><span class="material-icons">schedule</span>${s.duration}m</span></div><div class="service-card-actions"><button class="btn btn-sm btn-outline" data-service-edit="${s.id}"><span class="material-icons">edit</span></button><button class="btn btn-sm btn-ghost btn-danger-ghost" data-service-delete="${s.id}"><span class="material-icons">delete</span></button></div></div>`,
    )
    .join("");
}
document.addEventListener("click", (e) => {
  const eb = e.target.closest("[data-service-edit]");
  if (eb) {
    const s = STATE.services.find((s) => s.id === eb.dataset.serviceEdit);
    if (s) openServiceModal(s);
    return;
  }
  const db = e.target.closest("[data-service-delete]");
  if (db) {
    confirm("Delete service?", () => {
      STATE.services = STATE.services.filter(
        (s) => s.id !== db.dataset.serviceDelete,
      );
      saveServices();
      renderServicesGrid();
      toast("Deleted", "success");
    });
  }
});

function initInventory() {
  qs("#addProductBtn")?.addEventListener("click", () => openProductModal());
  qs("#saveProductBtn")?.addEventListener("click", saveProduct);
  qs("#stockInBtn")?.addEventListener("click", () => openStockModal(null, "in"));
  qs("#stockOutBtn")?.addEventListener("click", () => openStockModal(null, "out"));
  qs("#saveStockBtn")?.addEventListener("click", saveStock);
  qs("#inventorySearch")?.addEventListener("input", renderInventoryTable);
  qs("#inventoryCategoryFilter")?.addEventListener("change", renderInventoryTable);
  qs("#manageCategoriesBtn")?.addEventListener("click", openCategoryModal);
  qs("#addCategoryBtn")?.addEventListener("click", addCategory);
  populateCategoryDropdowns();
  renderInventoryTable();
}
function updateInventoryKPI() {
  setText("#invTotalProducts", STATE.inventory.length);
  setText(
    "#invLowStock",
    STATE.inventory.filter((i) => i.stock < i.minStock).length,
  );
  setText(
    "#invValue",
    fmtPrice(STATE.inventory.reduce((s, i) => s + i.stock * (i.price || 0), 0)),
  );
}
function openProductModal(d = null) {
  setValue("#productEditId", d ? d.id : "");
  setValue("#productName", d ? d.name : "");
  setValue("#productUnit", d ? d.unit : "");
  setValue("#productStock", d ? d.stock : "");
  setValue("#productMinStock", d ? d.minStock : "5");
  setValue("#productPrice", d ? d.price : "");
  populateCategoryDropdowns();
  setValue("#productCategory", d ? d.category : "oil");
  const t = qs("#productModalTitle");
  if (t) t.innerHTML = `<span class="material-icons">inventory_2</span> ${d ? "Edit" : "Add"} Product`;
  openModal("productModal");
  setTimeout(() => qs("#productName")?.focus(), 100);
}
function saveProduct() {
  const ei = qs("#productEditId")?.value || "",
    nm = (qs("#productName")?.value || "").trim(),
    ct = qs("#productCategory")?.value || "oil",
    un = (qs("#productUnit")?.value || "").trim(),
    sk = parseInt(qs("#productStock")?.value) || 0,
    ms = parseInt(qs("#productMinStock")?.value) || 5,
    pr = parseFloat(qs("#productPrice")?.value) || 0;
  if (!nm) {
    toast("Enter name", "error");
    return;
  }
  if (ei) {
    const p = STATE.inventory.find((p) => p.id === ei);
    if (p)
      Object.assign(p, {
        name: nm,
        category: ct,
        unit: un,
        stock: sk,
        minStock: ms,
        price: pr,
      });
    toast("Updated", "success");
  } else {
    STATE.inventory.push({
      id: uid(),
      name: nm,
      category: ct,
      unit: un,
      stock: sk,
      minStock: ms,
      price: pr,
    });
    toast(`Product "${nm}" added`, "success");
  }
  saveInventory();
  closeModal("productModal");
  renderInventoryTable();
  updateInventoryKPI();
  refreshDashboard();
}
function openStockModal(pid, tp = "in") {
  setValue("#stockQty", "");
  if (pid) {
    const p = STATE.inventory.find((p) => p.id === pid);
    if (p) {
      setValue("#stockProductId", p.id);
      setValue("#stockProductName", p.name);
    }
  } else {
    setValue("#stockProductId", "");
    setValue("#stockProductName", "Select a product");
  }
  qsa('input[name="stockType"]').forEach((r) => (r.checked = r.value === tp));
  const t = qs("#stockModalTitle");
  if (t)
    t.innerHTML = `<span class="material-icons">${tp === "in" ? "add_box" : "remove_circle_outline"}</span> Stock ${tp === "in" ? "In" : "Out"}`;
  openModal("stockModal");
  setTimeout(() => qs("#stockQty")?.focus(), 100);
}
function saveStock() {
  const id = qs("#stockProductId")?.value || "",
    qt = parseInt(qs("#stockQty")?.value) || 0,
    tp =
      document.querySelector('input[name="stockType"]:checked')?.value || "in";
  if (!id) {
    toast("Select product", "warning");
    return;
  }
  if (!qt || qt <= 0) {
    toast("Enter quantity", "error");
    return;
  }
  const p = STATE.inventory.find((p) => p.id === id);
  if (!p) return;
  if (tp === "out" && qt > p.stock) {
    toast(`Only ${p.stock} available`, "error");
    return;
  }
  p.stock = tp === "in" ? p.stock + qt : p.stock - qt;
  saveInventory();
  closeModal("stockModal");
  renderInventoryTable();
  updateInventoryKPI();
  refreshDashboard();
  toast(`${tp === "in" ? "+" : "-"}${qt} units`, "success");
}
function renderInventoryTable() {
  const sr = (qs("#inventorySearch")?.value || "").toLowerCase(),
    cf = qs("#inventoryCategoryFilter")?.value || "";
  const fl = STATE.inventory.filter((p) => (!sr || p.name.toLowerCase().includes(sr)) && (!cf || p.category === cf));
  const tb = qs("#inventoryTableBody"), bg = qs("#productCountBadge");
  if (!tb) return;
  updateInventoryKPI();
  if (bg) bg.textContent = `${fl.length} product${fl.length !== 1 ? "s" : ""}`;
  if (!fl.length) {
    tb.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;">No products. <a href="#" id="addFirstProduct" style="color:var(--primary);">Add one.</a></td></tr>`;
    qs("#addFirstProduct")?.addEventListener("click", (e) => { e.preventDefault(); openProductModal(); });
    return;
  }
  tb.innerHTML = fl.map((p) => {
    const lo = p.stock < p.minStock;
    const cat = STATE.categories.find(c => c.id === p.category);
    const catName = cat ? cat.name : (p.category || 'Misc');
    return `<tr>
      <td style="font-weight:500;">${sanitize(p.name)}</td>
      <td><span class="badge badge--blue">${sanitize(catName)}</span></td>
      <td><span style="font-weight:700;color:${lo ? "var(--danger)" : "var(--success)"};">${p.stock}</span> <span style="color:var(--text-muted);font-size:0.78rem;">${sanitize(p.unit || "")}</span></td>
      <td style="color:var(--text-secondary);">${p.minStock}</td>
      <td style="font-weight:500;">${fmtPrice(p.price)}</td>
      <td>${lo ? `<span class="badge badge--red status-low">Low</span>` : `<span class="badge badge--green status-ok">OK</span>`}</td>
      <td><div class="table-actions">
        <button class="btn btn-sm btn-outline" data-stock-in="${p.id}">+</button>
        <button class="btn btn-sm btn-ghost" data-stock-out="${p.id}">-</button>
        <button class="btn-icon btn btn-ghost" data-product-edit="${p.id}"><span class="material-icons">edit</span></button>
        <button class="btn-icon btn btn-danger-ghost" data-product-delete="${p.id}"><span class="material-icons">delete</span></button>
      </div></td>
    </tr>`;
  }).join("");
}
// ✅ CATEGORY MANAGEMENT FUNCTIONS
function populateCategoryDropdowns() {
  const dropdowns = ['#inventoryCategoryFilter', '#productCategory'];
  dropdowns.forEach(sel => {
    const el = qs(sel);
    if (!el) return;
    const val = el.value;
    el.innerHTML = sel === '#inventoryCategoryFilter' ? '<option value="">All Categories</option>' : '';
    STATE.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      el.appendChild(opt);
    });
    if (val) el.value = val;
  });
}
function openCategoryModal() {
  renderCategoryList();
  openModal('categoryModal');
  setTimeout(() => qs('#newCategoryName')?.focus(), 100);
}
function renderCategoryList() {
  const container = qs('#categoryList');
  if (!container) return;
  container.innerHTML = STATE.categories.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:8px;">
        <span class="material-icons" style="font-size:18px;color:var(--primary);">${c.icon || 'category'}</span>
        <span style="font-weight:500;">${sanitize(c.name)}</span>
      </div>
      ${c.id === 'oil' || c.id === 'filter' || c.id === 'coolant' || c.id === 'misc' 
        ? '<span class="badge badge--gray">Default</span>'
        : `<button class="btn-icon btn btn-danger-ghost" data-cat-delete="${c.id}"><span class="material-icons">close</span></button>`
      }
    </div>
  `).join('');
  container.querySelectorAll('[data-cat-delete]').forEach(btn => {
    btn.addEventListener('click', () => {
      const catId = btn.dataset.catDelete;
      const used = STATE.inventory.some(p => p.category === catId);
      if (used) { toast('Category in use. Reassign products first.', 'warning'); return; }
      STATE.categories = STATE.categories.filter(c => c.id !== catId);
      saveCategories();
      populateCategoryDropdowns();
      renderCategoryList();
      renderInventoryTable();
      toast('Category removed', 'success');
    });
  });
}
function addCategory() {
  const name = (qs('#newCategoryName')?.value || '').trim();
  if (!name) { toast('Enter category name', 'error'); return; }
  const id = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  if (STATE.categories.find(c => c.id === id)) { toast('Category already exists', 'warning'); return; }
  STATE.categories.push({ id, name, icon: 'category' });
  saveCategories();
  populateCategoryDropdowns();
  renderCategoryList();
  setValue('#newCategoryName', '');
  toast(`Category "${name}" added`, 'success');
}
// ✅ END CATEGORY MANAGEMENT
document.addEventListener("click", (e) => {
  const si = e.target.closest("[data-stock-in]");
  if (si) {
    openStockModal(si.dataset.stockIn, "in");
    return;
  }
  const so = e.target.closest("[data-stock-out]");
  if (so) {
    openStockModal(so.dataset.stockOut, "out");
    return;
  }
  const pe = e.target.closest("[data-product-edit]");
  if (pe) {
    const p = STATE.inventory.find((p) => p.id === pe.dataset.productEdit);
    if (p) openProductModal(p);
    return;
  }
  const pd = e.target.closest("[data-product-delete]");
  if (pd) {
    confirm("Delete product?", () => {
      STATE.inventory = STATE.inventory.filter(
        (p) => p.id !== pd.dataset.productDelete,
      );
      saveInventory();
      renderInventoryTable();
      updateInventoryKPI();
      refreshDashboard();
      toast("Deleted", "success");
    });
  }
});

let ivc = 0;
function initBilling() {
  qs("#addInvoiceService")?.addEventListener("click", () =>
    addInvoiceServiceRow("", 0),
  );
  qs("#addInvoiceProduct")?.addEventListener("click", () =>
    addInvoiceProductRow("", 0, 1),
  );
  qs("#saveInvoiceBtn")?.addEventListener("click", saveInvoice);
  qs("#printInvoiceBtn")?.addEventListener("click", printInvoice);
  qs("#invoiceToken")?.addEventListener("input", function () {
    autoFillFromToken(this.value.trim());
    updateInvoicePreview();
  });
  qs("#invoiceVehicle")?.addEventListener("input", updateInvoicePreview);
  qs("#invoiceCustomer")?.addEventListener("input", updateInvoicePreview);
  renderSavedInvoices();
}
function addInvoiceServiceRow(nm = "", pr = 0) {
  const id = `svc_${++ivc}`,
    op = STATE.services
      .map(
        (s) =>
          `<option value="${s.price}" data-name="${sanitize(s.name)}" ${s.name === nm ? "selected" : ""}>${sanitize(s.name)}</option>`,
      )
      .join("");
  const rw = document.createElement("div");
  rw.className = "invoice-line-row";
  rw.id = id;
  rw.innerHTML = `<div class="form-group"><select class="form-input invoice-svc-select"><option value="">Select...</option>${op}</select></div><div class="form-group"><input type="number" class="form-input invoice-svc-price" value="${pr}" min="0"></div><div class="form-group"><input type="number" class="form-input invoice-svc-qty" value="1" min="1"></div><button class="btn-icon btn btn-danger-ghost" onclick="this.closest('.invoice-line-row').remove();updateInvoicePreview();"><span class="material-icons">close</span></button>`;
  qs("#invoiceServicesContainer")?.appendChild(rw);
  rw.querySelector(".invoice-svc-select")?.addEventListener(
    "change",
    function () {
      rw.querySelector(".invoice-svc-price").value = this.value || 0;
      updateInvoicePreview();
    },
  );
  rw.querySelector(".invoice-svc-price")?.addEventListener(
    "input",
    updateInvoicePreview,
  );
  rw.querySelector(".invoice-svc-qty")?.addEventListener(
    "input",
    updateInvoicePreview,
  );
}
function addInvoiceProductRow(nm = "", pr = 0, qt = 1) {
  const id = `prd_${++ivc}`,
    op = STATE.inventory
      .map(
        (p) =>
          `<option value="${p.price}" data-name="${sanitize(p.name)}" ${p.name === nm ? "selected" : ""}>${sanitize(p.name)}</option>`,
      )
      .join("");
  const rw = document.createElement("div");
  rw.className = "invoice-line-row";
  rw.id = id;
  rw.innerHTML = `<div class="form-group"><select class="form-input invoice-prd-select"><option value="">Select...</option>${op}</select></div><div class="form-group"><input type="number" class="form-input invoice-prd-price" value="${pr}" min="0"></div><div class="form-group"><input type="number" class="form-input invoice-prd-qty" value="${qt}" min="1"></div><button class="btn-icon btn btn-danger-ghost" onclick="this.closest('.invoice-line-row').remove();updateInvoicePreview();"><span class="material-icons">close</span></button>`;
  qs("#invoiceProductsContainer")?.appendChild(rw);
  rw.querySelector(".invoice-prd-select")?.addEventListener(
    "change",
    function () {
      rw.querySelector(".invoice-prd-price").value = this.value || 0;
      updateInvoicePreview();
    },
  );
  rw.querySelector(".invoice-prd-price")?.addEventListener(
    "input",
    updateInvoicePreview,
  );
  rw.querySelector(".invoice-prd-qty")?.addEventListener(
    "input",
    updateInvoicePreview,
  );
}
function saveInvoice() {
  const cu = (qs("#invoiceCustomer")?.value || "").trim();
  if (!cu) {
    toast("Enter customer", "error");
    return;
  }
  const it = [];
  qsa(".invoice-line-row", qs("#invoiceServicesContainer")).forEach((r) => {
    const s = r.querySelector(".invoice-svc-select"),
      nm = s?.options[s.selectedIndex]?.text || "",
      pr = parseFloat(r.querySelector(".invoice-svc-price")?.value) || 0,
      qt = parseInt(r.querySelector(".invoice-svc-qty")?.value) || 1;
    if (nm && nm !== "Select...")
      it.push({ name: nm, price: pr, qty: qt, type: "service" });
  });
  qsa(".invoice-line-row", qs("#invoiceProductsContainer")).forEach((r) => {
    const s = r.querySelector(".invoice-prd-select"),
      nm = s?.options[s.selectedIndex]?.text || "",
      pr = parseFloat(r.querySelector(".invoice-prd-price")?.value) || 0,
      qt = parseInt(r.querySelector(".invoice-prd-qty")?.value) || 1;
    if (nm && nm !== "Select...")
      it.push({ name: nm, price: pr, qty: qt, type: "product" });
  });
  if (!it.length) {
    toast("Add items", "error");
    return;
  }
  let st = 0;
  it.forEach((i) => (st += i.price * i.qty));
  const tx = st * (STATE.settings.taxRate / 100);
  const inv = {
    id: uid(),
    number:
      STATE.settings.invoicePrefix +
      String(STATE.counters.invoiceCounter).padStart(3, "0"),
    date: fmtDate(),
    token: (qs("#invoiceToken")?.value || "").trim(),
    vehicle: (qs("#invoiceVehicle")?.value || "").trim(),
    customer: cu,
    items: it,
    subtotal: st,
    tax: tx,
    total: st + tx,
    notes: (qs("#invoiceNotes")?.value || "").trim(),
  };
  STATE.invoices.push(inv);
  STATE.counters.invoiceCounter++;
  saveInvoices();
  saveCounters();
  toast(`Invoice ${inv.number} saved`, "success");
  setValue("#invoiceToken", "");
  setValue("#invoiceVehicle", "");
  setValue("#invoiceCustomer", "");
  setValue("#invoiceNotes", "");
  const sc = qs("#invoiceServicesContainer");
  if (sc) sc.innerHTML = "";
  const pc = qs("#invoiceProductsContainer");
  if (pc) pc.innerHTML = "";
  addInvoiceServiceRow("", 0);
  addInvoiceProductRow("", 0, 1);
  updateInvoicePreview();
  renderSavedInvoices();
}
function updateInvoicePreview() {
  setText("#invToken", (qs("#invoiceToken")?.value || "").trim() || "—");
  setText("#invVehicle", (qs("#invoiceVehicle")?.value || "").trim() || "—");
  setText("#invCustomer", (qs("#invoiceCustomer")?.value || "").trim() || "—");
  setText("#invDate", fmtDate());
  setText(
    "#invNumber",
    STATE.settings.invoicePrefix +
      String(STATE.counters.invoiceCounter).padStart(3, "0"),
  );
  setText("#invBusinessName", STATE.settings.businessName);
  setText("#invBusinessAddress", STATE.settings.address);
  setText("#invBusinessPhone", "Phone: " + STATE.settings.phone);
  const it = [];
  qsa(".invoice-line-row", qs("#invoiceServicesContainer")).forEach((r) => {
    const s = r.querySelector(".invoice-svc-select"),
      nm =
        s?.options[s.selectedIndex]?.dataset?.name ||
        s?.options[s.selectedIndex]?.text ||
        "",
      pr = parseFloat(r.querySelector(".invoice-svc-price")?.value) || 0,
      qt = parseInt(r.querySelector(".invoice-svc-qty")?.value) || 1;
    if (nm && nm !== "Select...") it.push({ name: nm, price: pr, qty: qt });
  });
  qsa(".invoice-line-row", qs("#invoiceProductsContainer")).forEach((r) => {
    const s = r.querySelector(".invoice-prd-select"),
      nm =
        s?.options[s.selectedIndex]?.dataset?.name ||
        s?.options[s.selectedIndex]?.text ||
        "",
      pr = parseFloat(r.querySelector(".invoice-prd-price")?.value) || 0,
      qt = parseInt(r.querySelector(".invoice-prd-qty")?.value) || 1;
    if (nm && nm !== "Select...") it.push({ name: nm, price: pr, qty: qt });
  });
  const tb = qs("#invoiceItemsBody");
  if (!it.length) {
    if (tb)
      tb.innerHTML =
        '<tr><td colspan="5" style="text-align:center;padding:1.5rem;">No items</td></tr>';
    setText("#invSubtotal", fmtPrice(0));
    setText("#invTotal", fmtPrice(0));
    return;
  }
  let st = 0;
  if (tb)
    tb.innerHTML = it
      .map((item, i) => {
        const am = item.price * item.qty;
        st += am;
        return `<tr><td>${i + 1}</td><td>${sanitize(item.name)}</td><td>${item.qty}</td><td>${fmtPrice(item.price)}</td><td style="font-weight:600;">${fmtPrice(am)}</td></tr>`;
      })
      .join("");
  const tx = st * (STATE.settings.taxRate / 100);
  setText("#invSubtotal", fmtPrice(st));
  setText("#invTotal", fmtPrice(st + tx));
  setText("#invFooterNote", STATE.settings.footerNote);
}
function printInvoice() {
  updateInvoicePreview();
  STATE.counters.invoiceCounter++;
  saveCounters();
  window.print();
  toast("Printed", "success");
}
function autoFillFromToken(tn) {
  if (!tn) return;
  const token = STATE.tokens.find(
    (t) => t.number.toLowerCase() === tn.toLowerCase(),
  );
  if (!token) return;
  setValue("#invoiceVehicle", token.vehicleNo);
  if (token.ownerName) setValue("#invoiceCustomer", token.ownerName);
  const svcContainer = qs("#invoiceServicesContainer");
  if (svcContainer) {
    svcContainer.innerHTML = "";
    const svc = STATE.services.find((s) => s.name === token.service);
    if (svc) {
      addInvoiceServiceRow(svc.name, svc.price);
    } else {
      const id = `svc_${++ivc}`;
      const row = document.createElement("div");
      row.className = "invoice-line-row";
      row.id = id;
      row.innerHTML = `<div class="form-group"><input type="text" class="form-input" value="${sanitize(token.service)}" readonly style="background:#f9fafb;"></div><div class="form-group"><input type="number" class="form-input invoice-svc-price" value="${token.servicePrice || 0}" min="0"></div><div class="form-group"><input type="number" class="form-input invoice-svc-qty" value="1" min="1"></div><button class="btn-icon btn btn-danger-ghost" onclick="this.closest('.invoice-line-row').remove();updateInvoicePreview();"><span class="material-icons">close</span></button>`;
      svcContainer.appendChild(row);
      row
        .querySelector(".invoice-svc-price")
        ?.addEventListener("input", updateInvoicePreview);
      row
        .querySelector(".invoice-svc-qty")
        ?.addEventListener("input", updateInvoicePreview);
    }
  }
  toast(`Token ${token.number} loaded - ${token.vehicleNo}`, "info");
}
function renderSavedInvoices() {
  const tbody = qs("#savedInvoiceTableBody"),
    badge = qs("#savedInvoiceCount");
  if (badge)
    badge.textContent = `${STATE.invoices.length} invoice${STATE.invoices.length !== 1 ? "s" : ""}`;
  if (!STATE.invoices.length) {
    if (tbody)
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:3rem;"><span class="material-icons" style="font-size:40px;opacity:0.4;">receipt_long</span><p>No saved invoices yet</p></td></tr>`;
    return;
  }
  if (tbody)
    tbody.innerHTML = STATE.invoices
      .map(
        (inv) =>
          `<tr><td><span style="font-weight:700;color:var(--primary);">${sanitize(inv.number)}</span></td><td>${sanitize(inv.date)}</td><td style="font-weight:500;">${sanitize(inv.customer)}</td><td><span class="table-vehicle-no">${sanitize(inv.vehicle || "—")}</span></td><td>${inv.token ? `<span class="table-token-no">${sanitize(inv.token)}</span>` : "—"}</td><td style="font-weight:600;">${fmtPrice(inv.total)}</td><td><div class="table-actions"><button class="btn btn-sm btn-outline" data-view-invoice="${inv.id}"><span class="material-icons">visibility</span></button><button class="btn btn-sm btn-primary" data-print-invoice="${inv.id}"><span class="material-icons">print</span></button><button class="btn-icon btn btn-danger-ghost" data-delete-invoice="${inv.id}"><span class="material-icons">delete</span></button></div></td></tr>`,
      )
      .join("");
}
function viewInvoice(id) {
  const inv = STATE.invoices.find((i) => i.id === id);
  if (!inv) return;
  setValue("#invoiceToken", inv.token || "");
  setValue("#invoiceVehicle", inv.vehicle || "");
  setValue("#invoiceCustomer", inv.customer);
  setValue("#invoiceNotes", inv.notes || "");
  const sc = qs("#invoiceServicesContainer");
  if (sc) sc.innerHTML = "";
  const pc = qs("#invoiceProductsContainer");
  if (pc) pc.innerHTML = "";
  inv.items.forEach((item) => {
    if (item.type === "service") {
      addInvoiceServiceRow(item.name, item.price);
      const rows = qsa(".invoice-line-row", sc);
      const lr = rows[rows.length - 1];
      if (lr) {
        const qi = lr.querySelector(".invoice-svc-qty");
        if (qi) qi.value = item.qty;
      }
    } else {
      addInvoiceProductRow(item.name, item.price, item.qty);
    }
  });
  updateInvoicePreview();
  setText("#invNumber", inv.number);
  setText("#invDate", inv.date);
  toast(`Invoice ${inv.number} loaded`, "info");
}
function printSavedInvoice(id) {
  viewInvoice(id);
  setTimeout(() => window.print(), 300);
}
document.addEventListener("click", (e) => {
  const vb = e.target.closest("[data-view-invoice]");
  if (vb) {
    viewInvoice(vb.dataset.viewInvoice);
    return;
  }
  const pb = e.target.closest("[data-print-invoice]");
  if (pb) {
    printSavedInvoice(pb.dataset.printInvoice);
    return;
  }
  const db = e.target.closest("[data-delete-invoice]");
  if (db) {
    confirm("Delete this invoice?", () => {
      STATE.invoices = STATE.invoices.filter(
        (i) => i.id !== db.dataset.deleteInvoice,
      );
      saveInvoices();
      renderSavedInvoices();
      toast("Invoice deleted", "success");
    });
  }
});

function initReports() {
  qs("#applyRptFilter")?.addEventListener("click", renderReports);
  qs("#resetRptFilter")?.addEventListener("click", resetReportFilters);
  qs("#downloadCSV")?.addEventListener("click", downloadCSV);
  qs("#rptType")?.addEventListener("change", renderReports);
  const td = new Date(),
    wa = new Date(td);
  wa.setDate(wa.getDate() - 30);
  setValue("#rptFromDate", toDateInputValue(wa));
  setValue("#rptToDate", toDateInputValue(td));
  renderReports();
}
function resetReportFilters() {
  const td = new Date(),
    wa = new Date(td);
  wa.setDate(wa.getDate() - 30);
  setValue("#rptFromDate", toDateInputValue(wa));
  setValue("#rptToDate", toDateInputValue(td));
  setValue("#rptType", "all");
  renderReports();
}
function renderReports() {
  updateReportKPIs();
  renderServicesSold();
  
  renderProductsSold();
 
  renderReportTable();
  updateFinancialSummary();
}
function updateFinancialSummary() {
  const tr = getTotalRevenue();
  const te = getAllExpensesTotal();
  const pf = tr - te;
  setText("#rptFootRevenue", fmtPrice(tr));
  const revEl = qs("#rptFootRevenue");
  if (revEl) revEl.style.color = tr > 0 ? "#059669" : "#94a3b8";
  setText("#rptFootExpenses", fmtPrice(te));
  const expEl = qs("#rptFootExpenses");
  if (expEl) expEl.style.color = te > 0 ? "#dc2626" : "#94a3b8";
  setText("#rptFootProfit", fmtPrice(pf));
  const profEl = qs("#rptFootProfit");
  if (profEl) profEl.style.color = pf >= 0 ? "#2563eb" : "#dc2626";
}
function renderReportTable() {
  const fd = qs("#rptFromDate")?.value || "",
    td = qs("#rptToDate")?.value || "",
    rt = qs("#rptType")?.value || "all";
  const rows = [],
    fromD = fd ? new Date(fd) : new Date(0),
    toD = td ? new Date(td + "T23:59:59") : new Date(9999, 11, 31);
  if (rt === "all" || rt === "revenue" || rt === "tokens") {
    STATE.tokens.forEach((tk) => {
      if (tk.status === "completed") {
        let pr = tk.servicePrice || 0;
        if (!pr) { const sv = STATE.services.find((s) => s.name === tk.service); if (sv) pr = sv.price; }
        rows.push({ date: fmtDate(), type: "Revenue", cat: "Service", desc: `Token ${tk.number} - ${tk.service}`, amt: pr, bal: "credit" });
      }
    });
  }
  if (rt === "all" || rt === "expenses") {
    STATE.expenses.forEach((e) => {
      const ed = parseDate(e.date);
      if (!ed || ed < fromD || ed > toD) return;
      const cl = { labour: "Labour", parts: "Parts", repair: "Repair", utility: "Utility", other: "Other" };
      rows.push({ date: e.date, type: e.category === "labour" ? "Labour" : "Expense", cat: cl[e.category] || e.category, desc: e.title, amt: e.amount, bal: "debit" });
    });
  }
  rows.sort((a, b) => (parseDate(b.date) || new Date(0)) - (parseDate(a.date) || new Date(0)));
  const tb = qs("#reportTableBody");
  if (!rows.length) {
    if (tb) tb.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text-muted);"><span class="material-icons" style="font-size:40px;display:block;margin-bottom:8px;opacity:0.3;">inbox</span><p style="font-weight:500;color:var(--text);">No transactions found</p><p style="font-size:0.82rem;">Adjust filters to see results</p></td></tr>`;
    return;
  }
  if (tb) {
    tb.innerHTML = rows.map((r) => {
      const cl = r.bal === "credit" ? "var(--success)" : "var(--danger)";
      const px = r.bal === "credit" ? "+" : "−";
      const bgBadge = r.bal === "credit" ? "badge--green" : "badge--red";
      return `<tr>
        <td style="font-size:0.82rem;color:var(--text-secondary);">${sanitize(r.date)}</td>
        <td><span style="font-weight:500;">${r.type}</span></td>
        <td><span class="badge ${bgBadge}">${sanitize(r.cat)}</span></td>
        <td>${sanitize(r.desc)}</td>
        <td style="text-align:right;font-weight:700;font-family:var(--font-mono);color:${cl};font-size:0.9rem;">${px} ${fmtPrice(r.amt)}</td>
      </tr>`;
    }).join("");
  }
  updateFinancialSummary();
}
function updateReportKPIs() {
  const r = getTotalRevenue(),
    oe = getTotalExpenses(),
    lc = getLabourCost(),
    pf = r - getAllExpensesTotal();
  setText("#rptRevenue", fmtPrice(r));
  setText("#rptExpenses", fmtPrice(oe));
  setText("#rptLabour", fmtPrice(lc));
  setText("#rptProfit", fmtPrice(pf));
  setText("#rptVehicles", STATE.vehicles.length);
  setText(
    "#rptServices",
    STATE.tokens.filter((t) => t.status === "completed").length,
  );
  const pe = qs("#rptProfit");
  if (pe) pe.style.color = pf >= 0 ? "var(--success)" : "var(--danger)";
}
function renderServicesSold() {
  const tbody = qs("#servicesSoldTableBody"),
    badge = qs("#servicesSoldCount");
  if (!tbody) return;
  const ss = {};
  STATE.tokens.forEach((t) => {
    if (t.status === "completed") {
      if (!ss[t.service])
        ss[t.service] = { count: 0, revenue: 0, lastDate: "" };
      ss[t.service].count++;
      let price = t.servicePrice || 0;
      if (!price) {
        const svc = STATE.services.find((s) => s.name === t.service);
        if (svc) price = svc.price;
      }
      ss[t.service].revenue += price;
      ss[t.service].lastDate = t.time || fmtDate();
    }
  });
  const data = Object.entries(ss).map(([name, stats]) => ({ name, ...stats }));
  if (badge) badge.textContent = `${data.length}`;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;"><span class="material-icons" style="font-size:36px;opacity:0.4;">build</span><p>No services sold yet</p></td></tr>`;
    return;
  }
  data.sort((a, b) => b.count - a.count);
  tbody.innerHTML = data
    .map(
      (d) =>
        `<tr><td style="font-weight:500;">${sanitize(d.name)}</td><td><span class="badge badge--blue">${d.count}x</span></td><td style="font-weight:600;color:var(--success);">${fmtPrice(d.revenue)}</td><td style="font-size:0.82rem;color:var(--text-secondary);">${sanitize(d.lastDate)}</td></tr>`,
    )
    .join("");
}
function renderTopService() {
  const container = qs("#topServiceCard");
  if (!container) return;
  const ss = {};
  STATE.tokens.forEach((t) => {
    if (t.status === "completed") {
      if (!ss[t.service]) ss[t.service] = { count: 0, revenue: 0 };
      ss[t.service].count++;
      let price = t.servicePrice || 0;
      if (!price) {
        const svc = STATE.services.find((s) => s.name === t.service);
        if (svc) price = svc.price;
      }
      ss[t.service].revenue += price;
    }
  });
  const data = Object.entries(ss).map(([name, stats]) => ({ name, ...stats }));
  data.sort((a, b) => b.count - a.count);
  const top = data[0];
  if (!top) {
    container.innerHTML = `<div style="text-align:center;padding:3rem;"><span class="material-icons" style="font-size:48px;opacity:0.4;">military_tech</span><p>No data yet</p></div>`;
    return;
  }
  container.innerHTML = `<div style="text-align:center;padding:2rem;"><span class="material-icons" style="font-size:56px;color:var(--primary);">military_tech</span><h3 style="font-size:1.3rem;font-weight:700;margin:0.75rem 0 0.25rem;">${sanitize(top.name)}</h3><p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:1rem;">Most used service</p><div style="display:flex;gap:2rem;justify-content:center;"><div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;color:var(--primary);">${top.count}x</div><div style="font-size:0.75rem;color:var(--text-muted);">Times</div></div><div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;color:var(--success);">${fmtPrice(top.revenue)}</div><div style="font-size:0.75rem;color:var(--text-muted);">Revenue</div></div></div></div>`;
}
function renderProductsSold() {
  const tbody = qs("#productsSoldTableBody"),
    badge = qs("#productsSoldCount");
  if (!tbody) return;
  const ps = {};
  STATE.invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (item.type === "product") {
        if (!ps[item.name])
          ps[item.name] = { qty: 0, revenue: 0, lastDate: "" };
        ps[item.name].qty += item.qty;
        ps[item.name].revenue += item.price * item.qty;
        ps[item.name].lastDate = inv.date;
      }
    });
  });
  const data = Object.entries(ps).map(([name, stats]) => ({ name, ...stats }));
  if (badge) badge.textContent = `${data.length}`;
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:2rem;"><span class="material-icons" style="font-size:36px;opacity:0.4;">inventory_2</span><p>No products sold yet</p></td></tr>`;
    return;
  }
  data.sort((a, b) => b.qty - a.qty);
  tbody.innerHTML = data
    .map(
      (d) =>
        `<tr><td style="font-weight:500;">${sanitize(d.name)}</td><td><span class="badge badge--blue">${d.qty}x</span></td><td style="font-weight:600;color:var(--success);">${fmtPrice(d.revenue)}</td><td style="font-size:0.82rem;color:var(--text-secondary);">${sanitize(d.lastDate)}</td></tr>`,
    )
    .join("");
}
function renderTopProduct() {
  const container = qs("#topProductCard");
  if (!container) return;
  const ps = {};
  STATE.invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (item.type === "product") {
        if (!ps[item.name]) ps[item.name] = { qty: 0, revenue: 0 };
        ps[item.name].qty += item.qty;
        ps[item.name].revenue += item.price * item.qty;
      }
    });
  });
  const data = Object.entries(ps).map(([name, stats]) => ({ name, ...stats }));
  data.sort((a, b) => b.qty - a.qty);
  const top = data[0];
  if (!top) {
    container.innerHTML = `<div style="text-align:center;padding:3rem;"><span class="material-icons" style="font-size:48px;opacity:0.4;">star</span><p>No data yet</p></div>`;
    return;
  }
  container.innerHTML = `<div style="text-align:center;padding:2rem;"><span class="material-icons" style="font-size:56px;color:#f59e0b;">star</span><h3 style="font-size:1.3rem;font-weight:700;margin:0.75rem 0 0.25rem;">${sanitize(top.name)}</h3><p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:1rem;">Most sold product</p><div style="display:flex;gap:2rem;justify-content:center;"><div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;color:var(--primary);">${top.qty}x</div><div style="font-size:0.75rem;color:var(--text-muted);">Qty</div></div><div style="text-align:center;"><div style="font-size:1.5rem;font-weight:700;color:var(--success);">${fmtPrice(top.revenue)}</div><div style="font-size:0.75rem;color:var(--text-muted);">Revenue</div></div></div></div>`;
}
function downloadCSV() {
  const rw = [["Date", "Type", "Category", "Description", "Amount"].join(",")];
  STATE.tokens.forEach((tk) => {
    if (tk.status === "completed") {
      let pr = tk.servicePrice || 0;
      if (!pr) {
        const sv = STATE.services.find((s) => s.name === tk.service);
        if (sv) pr = sv.price;
      }
      rw.push(
        [fmtDate(), "Revenue", "Service", `"Token ${tk.number}"`, pr].join(","),
      );
    }
  });
  STATE.expenses.forEach((e) => {
    rw.push(
      [
        e.date,
        e.category === "labour" ? "Labour" : "Expense",
        e.category,
        `"${e.title}"`,
        e.amount,
      ].join(","),
    );
  });
  const csv = rw.join("\n"),
    bl = new Blob([csv], { type: "text/csv" }),
    a = document.createElement("a");
  a.href = URL.createObjectURL(bl);
  a.download = `report_${fmtDate().replace(/\s/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("CSV downloaded", "success");
}

function initExpenses() {
  qs("#addExpenseBtn")?.addEventListener("click", showExpenseForm);
  qs("#saveExpenseBtn")?.addEventListener("click", saveExpense);
  qs("#cancelExpenseBtn")?.addEventListener("click", hideExpenseForm);
  qs("#expenseSearch")?.addEventListener("input", renderExpenseTable);
  qs("#expenseCategoryFilter")?.addEventListener("change", renderExpenseTable);
  const di = qs("#expenseDate");
  if (di) di.value = toDateInputValue(new Date());
  hideExpenseForm();
  renderExpenses();
}
function showExpenseForm() {
  const cd = qs("#expenseFormCard");
  if (cd) cd.style.display = "";
  const bt = qs("#addExpenseBtn");
  if (bt) bt.style.display = "none";
  setValue("#expenseTitle", "");
  setValue("#expenseCategory", "");
  setValue("#expenseAmount", "");
  setValue("#expenseDescription", "");
  const di = qs("#expenseDate");
  if (di) di.value = toDateInputValue(new Date());
  setTimeout(() => qs("#expenseTitle")?.focus(), 100);
}
function hideExpenseForm() {
  const cd = qs("#expenseFormCard");
  if (cd) cd.style.display = "none";
  const bt = qs("#addExpenseBtn");
  if (bt) bt.style.display = "";
}
function saveExpense() {
  const tl = (qs("#expenseTitle")?.value || "").trim(),
    ct = qs("#expenseCategory")?.value || "",
    am = parseFloat(qs("#expenseAmount")?.value) || 0,
    dr = qs("#expenseDate")?.value || "",
    ds = (qs("#expenseDescription")?.value || "").trim();
  if (!tl) {
    toast("Enter title", "error");
    return;
  }
  if (!ct) {
    toast("Select category", "error");
    return;
  }
  if (!am || am <= 0) {
    toast("Enter amount", "error");
    return;
  }
  let fd = dr ? fmtDate(new Date(dr)) : fmtDate();
  STATE.expenses.push({
    id: uid(),
    title: tl,
    category: ct,
    amount: am,
    date: fd,
    description: ds,
    time: fmtTime(),
  });
  saveExpenses();
  hideExpenseForm();
  renderExpenses();
  refreshDashboard();
  toast(`"${tl}" saved: ${fmtPrice(am)}`, "success");
}
function renderExpenses() {
  updateExpenseKPIs();
  renderExpenseTable();
}
function updateExpenseKPIs() {
  const today = fmtDate();
  const now = new Date(),
    wa = new Date(now);
  wa.setDate(wa.getDate() - 7);
  const ms = new Date(now.getFullYear(), now.getMonth(), 1);
  setText(
    "#expTodayTotal",
    fmtPrice(
      STATE.expenses
        .filter((e) => e.date === today)
        .reduce((s, e) => s + e.amount, 0),
    ),
  );
  setText(
    "#expWeekTotal",
    fmtPrice(
      STATE.expenses
        .filter((e) => {
          const d = parseDate(e.date);
          return d && d >= wa;
        })
        .reduce((s, e) => s + e.amount, 0),
    ),
  );
  setText(
    "#expMonthTotal",
    fmtPrice(
      STATE.expenses
        .filter((e) => {
          const d = parseDate(e.date);
          return d && d >= ms;
        })
        .reduce((s, e) => s + e.amount, 0),
    ),
  );
  const r = getTotalRevenue(),
    oe = getTotalExpenses(),
    lc = getLabourCost(),
    pf = r - getAllExpensesTotal();
  setText("#totalRevenueAmt", fmtPrice(r));
  setText("#totalExpenseAmt", fmtPrice(oe));
  setText("#labourCostAmt", fmtPrice(lc));
  setText("#netProfitAmt", fmtPrice(pf));
  const pe = qs("#netProfitAmt");
  if (pe) pe.style.color = pf >= 0 ? "var(--success)" : "var(--danger)";
}
function renderExpenseTable() {
  const sr = (qs("#expenseSearch")?.value || "").toLowerCase(),
    cf = qs("#expenseCategoryFilter")?.value || "";
  const fl = STATE.expenses
    .filter((e) => {
      const ms =
        !sr ||
        e.title.toLowerCase().includes(sr) ||
        (e.description || "").toLowerCase().includes(sr);
      return ms && (!cf || e.category === cf);
    })
    .sort(
      (a, b) =>
        (parseDate(b.date) || new Date(0)) - (parseDate(a.date) || new Date(0)),
    );
  const tb = qs("#expenseTableBody"),
    bg = qs("#expenseCountBadge");
  if (bg) bg.textContent = `${fl.length}`;
  if (!fl.length) {
    if (tb)
      tb.innerHTML =
        '<tr><td colspan="6" style="text-align:center;padding:3rem;">No expenses</td></tr>';
    return;
  }
  const cl = {
      labour: "Labour",
      parts: "Parts",
      repair: "Repair",
      utility: "Utility",
      other: "Other",
    },
    bc = {
      labour: "badge--orange",
      parts: "badge--blue",
      repair: "badge--red",
      utility: "badge--gray",
      other: "badge--gray",
    };
  if (tb)
    tb.innerHTML = fl
      .map(
        (e) =>
          `<tr><td>${sanitize(e.date)}</td><td style="font-weight:500;">${sanitize(e.title)}</td><td><span class="badge ${bc[e.category] || "badge--gray"}">${cl[e.category] || e.category}</span></td><td style="font-weight:600;color:var(--danger);">${fmtPrice(e.amount)}</td><td style="font-size:0.82rem;color:var(--text-secondary);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sanitize(e.description || "—")}</td><td><button class="btn-icon btn btn-danger-ghost" data-expense-del="${e.id}"><span class="material-icons">delete</span></button></td></tr>`,
      )
      .join("");
}
document.addEventListener("click", (e) => {
  const db = e.target.closest("[data-expense-del]");
  if (db) {
    confirm("Delete expense?", () => {
      STATE.expenses = STATE.expenses.filter(
        (ex) => ex.id !== db.dataset.expenseDel,
      );
      saveExpenses();
      renderExpenses();
      refreshDashboard();
      toast("Deleted", "success");
    });
  }
});

function initSettings() {
  qs("#saveBusinessSettings")?.addEventListener("click", () => {
    STATE.settings.businessName =
      qs("#settingBusinessName")?.value?.trim() || STATE.settings.businessName;
    STATE.settings.address =
      qs("#settingAddress")?.value?.trim() || STATE.settings.address;
    STATE.settings.phone =
      qs("#settingPhone")?.value?.trim() || STATE.settings.phone;
    STATE.settings.email =
      qs("#settingEmail")?.value?.trim() || STATE.settings.email;
    saveSettings();
    updateAllBrandNames();
    setLoginBrandName();
    updateInvoicePreview();
    toast("Saved", "success");
  });
  qs("#saveInvoiceSettings")?.addEventListener("click", () => {
    STATE.settings.invoicePrefix =
      qs("#settingInvPrefix")?.value?.trim() || "INV-";
    STATE.settings.taxRate = parseFloat(qs("#settingTaxRate")?.value) || 0;
    STATE.settings.footerNote = qs("#settingFooterNote")?.value?.trim() || "";
    saveSettings();
    updateInvoicePreview();
    toast("Saved", "success");
  });
  qs("#changePasswordBtn")?.addEventListener("click", () => {
    const cp = qs("#currentPassword")?.value || "",
      np = qs("#newPassword")?.value || "",
      cf = qs("#confirmPassword")?.value || "",
      sv = localStorage.getItem(KEYS.password) || "admin123";
    if (!cp) {
      toast("Current password?", "error");
      return;
    }
    if (!np || np.length < 6) {
      toast("Min 6 chars", "error");
      return;
    }
    if (np !== cf) {
      toast("Not match", "error");
      return;
    }
    if (cp !== sv) {
      toast("Wrong current", "error");
      return;
    }
    localStorage.setItem(KEYS.password, np);
    toast("Updated!", "success");
    setValue("#currentPassword", "");
    setValue("#newPassword", "");
    setValue("#confirmPassword", "");
  });
  qs("#exportDataBtn")?.addEventListener("click", exportData);
  qs("#importDataBtn")?.addEventListener("click", importData);
    qs("#resetCountersBtn")?.addEventListener("click", () => {
    confirm("Reset all counter IDs to 1? (All data stays safe)", () => {
      STATE.counters = { invoiceCounter: 1, tokenCounter: 1 };
      saveCounters();
      toast("Counters reset! Next Token = TK-001, Next Invoice = INV-001", "success");
    }, "Reset Counters");
  });
  qs("#clearDataBtn")?.addEventListener("click", () => {
    confirm(
      "DELETE ALL?",
      () => {
        Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
        toast("Cleared. Reloading...", "warning");
        setTimeout(() => location.reload(), 1500);
      },
      "Clear All",
    );
  });
}
function loadSettingsForm() {
  const s = STATE.settings;
  setValue("#settingBusinessName", s.businessName);
  setValue("#settingAddress", s.address);
  setValue("#settingPhone", s.phone);
  setValue("#settingEmail", s.email);
  setValue("#settingInvPrefix", s.invoicePrefix);
  setValue("#settingTaxRate", s.taxRate);
  setValue("#settingFooterNote", s.footerNote);
  updateSessionTime();
  updateInvoicePreview();
}
function exportData() {
  const obj = {
    services: STATE.services,
    vehicles: STATE.vehicles,
    tokens: STATE.tokens,
    inventory: STATE.inventory,
    invoices: STATE.invoices,
    expenses: STATE.expenses,
    categories: STATE.categories,
    settings: STATE.settings,
    counters: STATE.counters,
    exportedAt: new Date().toISOString(),
    version: "1.0",
  };
  const bl = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    }),
    a = document.createElement("a");
  a.href = URL.createObjectURL(bl);
  a.download = `backup_${fmtDate().replace(/\s/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Exported", "success");
}
function importData() {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = ".json";
  inp.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        if (!d.version) throw new Error("Invalid");
        if (d.services) { STATE.services = d.services; saveServices(); }
        if (d.vehicles) { STATE.vehicles = d.vehicles; saveVehicles(); }
        if (d.tokens) { STATE.tokens = d.tokens; saveTokens(); }
        if (d.inventory) { STATE.inventory = d.inventory; saveInventory(); }
        if (d.invoices) { STATE.invoices = d.invoices; saveInvoices(); }
        if (d.expenses) { STATE.expenses = d.expenses; saveExpenses(); }
        if (d.categories) { STATE.categories = d.categories; saveCategories(); populateCategoryDropdowns(); }
        if (d.settings) { STATE.settings = d.settings; saveSettings(); updateAllBrandNames(); }
        if (d.counters) { STATE.counters = d.counters; saveCounters(); }
        toast("Imported", "success");
        navigateTo("dashboard");
      } catch {
        toast("Invalid file", "error");
      }
    };
    r.readAsText(f);
  });
  inp.click();
}

document.addEventListener("DOMContentLoaded", function() {
  setLoginBrandName();  
  initLogin();
});