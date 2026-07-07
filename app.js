/**
 * Wheel Works Service Station — Enterprise Management System V6.0
 * ALL DUPLICATES REMOVED - PRODUCTION READY
 */
"use strict";

const KEYS = {
  services: "servicepro_services",
  vehicles: "servicepro_vehicles",
  tokens: "servicepro_tokens",
  inventory: "servicepro_inventory_variants",
  invoices: "servicepro_invoices",
  categories: "servicepro_categories",
  expenses: "servicepro_expenses",
  settings: "servicepro_settings",
  counters: "servicepro_counters",
  password: "servicepro_password",
  pricingMatrix: "servicepro_pricing_matrix",
  pricingVehicles: "servicepro_pricing_vehicles",
  pricingServices: "servicepro_pricing_services",
  productSales: "servicepro_product_sales",
  brands: "servicepro_brands",
  reminders: "servicepro_reminders",
  inventoryMigratedFinal: "servicepro_inventory_migrated_final",
};

const SERVICE_REMINDER_DAYS = {
  "Full Body Wash": 30,
  "Half Body Wash": 30,
  "Interior Wash": 30,
  "Engine Wash": 60,
  Wax: 45,
  "Full Service": 90,
  "Oil Change": 30,
  default: 30,
};
function getReminderDays(sn) {
  return SERVICE_REMINDER_DAYS[sn] || SERVICE_REMINDER_DAYS["default"];
}

function generateTokenNumber() {
  const today = new Date();
  const ds = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const todayTokens = STATE.tokens.filter(
    (t) => t.number && t.number.startsWith(ds),
  );
  return `${ds}-${String(todayTokens.length + 1).padStart(3, "0")}`;
}

function migrateAllInventory() {
  if (localStorage.getItem(KEYS.inventoryMigratedFinal)) return;
  let all = [];
  const v3 = JSON.parse(localStorage.getItem("servicepro_inventory_v3")) || [];
  const v2 = JSON.parse(localStorage.getItem("servicepro_inventory_v2")) || [];
  const v1 = JSON.parse(localStorage.getItem("servicepro_inventory")) || [];
  const brands = JSON.parse(localStorage.getItem(KEYS.brands)) || [];
  const src = v3.length > 0 ? v3 : v2.length > 0 ? v2 : v1;
  src.forEach((p, i) => {
    const bn = p.brand || "General";
    if (!brands.find((b) => b.name === bn))
      brands.push({ id: uid(), name: bn });
    all.push({
      id: p.id || uid(),
      productType: p.productName || p.name || "Product",
      category: p.category || "misc",
      variants: [
        {
          id: uid(),
          brand: bn,
          model: p.model || p.variant || "Standard",
          grade: p.grade || "",
          size: p.packSize || p.unit || "",
          sku:
            p.sku ||
            generateVariantSKU(
              bn,
              p.model || "STD",
              p.grade || "",
              p.packSize || p.unit || "",
              i,
            ),
          purchasePrice: p.purchasePrice || 0,
          sellingPrice: p.sellingPrice || p.price || 0,
          stock: p.stock || 0,
          minStock: p.minStock || 5,
        },
      ],
    });
  });
  persist(KEYS.inventory, all);
  persist(KEYS.brands, brands);
  localStorage.setItem(KEYS.inventoryMigratedFinal, "true");
}

function generateVariantSKU(brand, model, grade, size, index) {
  const b = brand.replace(/\s+/g, "").substring(0, 3).toUpperCase();
  const m = (model || "STD").replace(/\s+/g, "").substring(0, 4).toUpperCase();
  const g = (grade || "").replace(/\s+/g, "").substring(0, 5).toUpperCase();
  const s = (size || "").replace(/\s+/g, "").substring(0, 4).toUpperCase();
  return `${b}-${m}${g ? "-" + g : ""}${s ? "-" + s : ""}-${String(index + 1).padStart(3, "0")}`;
}

migrateAllInventory();

const STATE = {
  tokens: JSON.parse(localStorage.getItem(KEYS.tokens)) || [],
  vehicles: JSON.parse(localStorage.getItem(KEYS.vehicles)) || [],
  services: JSON.parse(localStorage.getItem(KEYS.services)) || [],
  inventory: JSON.parse(localStorage.getItem(KEYS.inventory)) || [],
  invoices: JSON.parse(localStorage.getItem(KEYS.invoices)) || [],
  expenses: JSON.parse(localStorage.getItem(KEYS.expenses)) || [],
  categories: JSON.parse(localStorage.getItem(KEYS.categories)) || [
    { id: "oil", name: "Engine Oils" },
    { id: "filter", name: "Filters" },
    { id: "coolant", name: "Coolants" },
    { id: "misc", name: "Miscellaneous" },
  ],
  settings: JSON.parse(localStorage.getItem(KEYS.settings)) || {
    businessName: "Wheel Works Service Station",
    address: "Main Road, City",
    phone: "0300-0000000",
    email: "info@wheelworks.pk",
    invoicePrefix: "INV-",
    taxRate: 0,
  },
  counters: JSON.parse(localStorage.getItem(KEYS.counters)) || {
    invoiceCounter: 1,
  },
  pricingVehicles: JSON.parse(localStorage.getItem(KEYS.pricingVehicles)) || [
    { id: "bike", name: "Bike" },
    { id: "car", name: "Car" },
    { id: "suv", name: "SUV" },
    { id: "hiace", name: "Hiace" },
    { id: "truck", name: "Truck" },
    { id: "bus", name: "Bus" },
  ],
  pricingServices: JSON.parse(localStorage.getItem(KEYS.pricingServices)) || [
    { id: "full_body_wash", name: "Full Body Wash" },
    { id: "half_body_wash", name: "Half Body Wash" },
    { id: "interior_wash", name: "Interior Wash" },
    { id: "engine_wash", name: "Engine Wash" },
    { id: "wax", name: "Wax" },
  ],
  pricingMatrix: JSON.parse(localStorage.getItem(KEYS.pricingMatrix)) || {},
  productSales: JSON.parse(localStorage.getItem(KEYS.productSales)) || [],
  brands: JSON.parse(localStorage.getItem(KEYS.brands)) || [
    { id: "general", name: "General" },
    { id: "shell", name: "Shell" },
    { id: "toyota_genuine", name: "Toyota Genuine" },
    { id: "guard", name: "Guard" },
    { id: "sakura", name: "Sakura" },
    { id: "zic", name: "ZIC" },
  ],
  reminders: JSON.parse(localStorage.getItem(KEYS.reminders)) || [],
  confirmCallback: null,
  sessionStart: new Date(),
  lastProductSaleInvoiceId: null,
  pendingImport: null,
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
function saveTokens() {
  persist(KEYS.tokens, STATE.tokens);
}
function saveVehicles() {
  persist(KEYS.vehicles, STATE.vehicles);
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
function saveCategories() {
  persist(KEYS.categories, STATE.categories);
}
function saveSettings() {
  persist(KEYS.settings, STATE.settings);
}
function saveCounters() {
  persist(KEYS.counters, STATE.counters);
}
function savePricingMatrix() {
  persist(KEYS.pricingMatrix, STATE.pricingMatrix);
}
function savePricingVehicles() {
  persist(KEYS.pricingVehicles, STATE.pricingVehicles);
}
function savePricingServices() {
  persist(KEYS.pricingServices, STATE.pricingServices);
}
function saveProductSales() {
  persist(KEYS.productSales, STATE.productSales);
}
function saveBrands() {
  persist(KEYS.brands, STATE.brands);
}
function saveReminders() {
  persist(KEYS.reminders, STATE.reminders);
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
  const months = {
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
  };
  const p = s.split("-");
  if (p.length !== 3) return null;
  return new Date(parseInt(p[2]), months[p[1]], parseInt(p[0]));
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
  const c = qs("#toastContainer");
  if (!c) return;
  const icons = {
    success: "check_circle",
    error: "error",
    warning: "warning",
    info: "info",
  };
  const e = document.createElement("div");
  e.className = `toast toast--${t}`;
  e.innerHTML = `<span class="material-icons">${icons[t] || "info"}</span><span>${sanitize(m)}</span>`;
  c.appendChild(e);
  setTimeout(() => {
    e.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(() => e.remove(), 300);
  }, 3200);
}

// ==================== MODAL SYSTEM ====================
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

function setupModalClosers() {
  document.addEventListener("click", function (e) {
    const closeBtn = e.target.closest("[data-close]");
    if (closeBtn) {
      closeModal(closeBtn.getAttribute("data-close"));
      return;
    }
    if (e.target.classList.contains("modal-overlay")) {
      closeModal(e.target.id);
      return;
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const openModals = qsa(".modal-overlay:not(.hidden)");
      if (openModals.length > 0)
        closeModal(openModals[openModals.length - 1].id);
    }
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
function setLoginBrandName() {
  const s = JSON.parse(localStorage.getItem(KEYS.settings));
  const lb = document.getElementById("loginBrandName");
  if (lb) lb.textContent = s?.businessName || "Wheel Works Service Station";
}

// ==================== INVENTORY HELPERS ====================
function getVariantDisplayName(v) {
  if (!v) return "Unknown";
  let n = "";
  if (v.brand && v.brand !== "General") n += v.brand + " ";
  if (v.model && v.model !== "Standard") n += v.model + " ";
  if (v.grade) n += v.grade + " ";
  if (v.size) n += v.size;
  return n.trim() || "Product";
}
function getFullProductName(p, v) {
  let n = p.productType || p.name || "Product";
  const vn = getVariantDisplayName(v);
  if (vn) n += " - " + vn;
  return n;
}
function getAllVariantsFlat() {
  const f = [];
  STATE.inventory.forEach((p) => {
    (p.variants || []).forEach((v) => {
      f.push({
        ...v,
        productId: p.id,
        productType: p.productType,
        category: p.category,
        fullName: getFullProductName(p, v),
      });
    });
  });
  return f;
}
function findVariantById(vid) {
  for (const p of STATE.inventory) {
    const v = (p.variants || []).find((v) => v.id === vid);
    if (v)
      return { product: p, variant: v, fullName: getFullProductName(p, v) };
  }
  return null;
}
function getLowStockCount() {
  let c = 0;
  STATE.inventory.forEach((p) => {
    (p.variants || []).forEach((v) => {
      if (v.stock < v.minStock) c++;
    });
  });
  return c;
}

// ==================== CONTACT ====================
function validateContactNumber(phone) {
  if (!phone || phone.trim() === "")
    return {
      valid: false,
      formatted: "",
      message: "Contact number is required",
    };
  let c = phone.replace(/[\s\-\(\)]/g, "").trim();
  if (c.startsWith("+92")) {
    if (/^\+92\d{10}$/.test(c))
      return { valid: true, formatted: c, message: "" };
    return {
      valid: false,
      formatted: "",
      message: "Invalid: +92 followed by 10 digits",
    };
  }
  if (c.startsWith("03")) {
    if (/^03\d{9}$/.test(c)) return { valid: true, formatted: c, message: "" };
    return {
      valid: false,
      formatted: "",
      message: "Invalid: 03 followed by 9 digits (total 11)",
    };
  }
  if (c.startsWith("92")) {
    if (/^92\d{10}$/.test(c))
      return { valid: true, formatted: "+" + c, message: "" };
    return { valid: false, formatted: "", message: "Invalid format" };
  }
  return {
    valid: false,
    formatted: "",
    message: "Enter: 03XXXXXXXXX or +923XXXXXXXXX",
  };
}
function formatContactDisplay(phone) {
  if (!phone || phone === "N/A") return "N/A";
  let c = phone.replace(/[\s\-\(\)]/g, "").trim();
  if (c.startsWith("+923") && c.length === 13)
    return `${c.substring(0, 3)} ${c.substring(3, 6)} ${c.substring(6)}`;
  if (c.startsWith("03") && c.length === 11)
    return `${c.substring(0, 4)}-${c.substring(4)}`;
  return phone;
}

// ==================== WHATSAPP ====================
function getWhatsAppNumber(phone) {
  if (!phone || phone === "N/A") return null;
  let c = phone.replace(/[\s\-\(\)\+]/g, "").trim();
  if (c.startsWith("92") && c.length === 12) return c;
  if (c.startsWith("03") && c.length === 11) return "92" + c.substring(1);
  return c;
}
function openWhatsApp(phone, cn, vn, svc, sd) {
  const wa = getWhatsAppNumber(phone);
  if (!wa) {
    toast("Invalid phone", "error");
    return;
  }
  const bn = STATE.settings.businessName || "Wheel Works Service Station";
  const msg = `Assalamualaikum ${cn}%0A%0AThis is a friendly reminder from ${bn}.%0A%0AYour vehicle service is due.%0A%0AVehicle: ${vn}%0ALast Service: ${svc}%0ALast Service Date: ${sd}%0A%0APlease visit us for your next service.%0A%0AThank you.%0A${bn}`;
  window.open(`https://wa.me/${wa}?text=${msg}`, "_blank");
}

// ==================== REMINDERS ====================
function createReminderFromToken(token) {
  if (!token.contactNumber || token.contactNumber === "N/A") return;
  const rd = getReminderDays(token.service);
  const dd = new Date();
  dd.setDate(dd.getDate() + rd);
  const ex = STATE.reminders.find((r) => r.tokenId === token.id);
  if (ex) {
    ex.customerName = token.ownerName || "Customer";
    ex.phone = token.contactNumber;
    ex.vehicleNo = token.vehicleNo;
    ex.service = token.service;
    ex.serviceDate = fmtDate();
    ex.dueDate = fmtDate(dd);
    ex.status = "upcoming";
  } else {
    STATE.reminders.push({
      id: uid(),
      tokenId: token.id,
      customerName: token.ownerName || "Customer",
      phone: token.contactNumber,
      vehicleNo: token.vehicleNo,
      vehicleType: token.vehicleType,
      service: token.service,
      serviceDate: fmtDate(),
      dueDate: fmtDate(dd),
      reminderDays: rd,
      status: "upcoming",
    });
  }
  saveReminders();
}
function updateReminderStatuses() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  STATE.reminders.forEach((r) => {
    if (r.status === "completed") return;
    const dd = parseDate(r.dueDate);
    if (!dd) return;
    dd.setHours(0, 0, 0, 0);
    const diff = Math.ceil((dd.getTime() - today.getTime()) / 86400000);
    r.status = diff < 0 ? "overdue" : diff === 0 ? "due-today" : "upcoming";
    r.daysRemaining = diff;
  });
  saveReminders();
}
function getReminderStats() {
  updateReminderStatuses();
  const s = {
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
    completed: 0,
    upcomingWeek: 0,
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  STATE.reminders.forEach((r) => {
    if (r.status === "completed") s.completed++;
    else if (r.status === "due-today") s.dueToday++;
    else if (r.status === "overdue") s.overdue++;
    else if (r.status === "upcoming") {
      const dd = parseDate(r.dueDate);
      if (dd) {
        dd.setHours(0, 0, 0, 0);
        if (Math.ceil((dd.getTime() - today.getTime()) / 86400000) <= 7)
          s.upcomingWeek++;
      }
      s.upcoming++;
    }
  });
  return s;
}
function initReminders() {
  qs("#reminderSearch")?.addEventListener("input", renderReminderTable);
  qs("#reminderStatusFilter")?.addEventListener("change", renderReminderTable);
  qs("#markAllCompletedBtn")?.addEventListener("click", () => {
    confirm("Mark all as completed?", () => {
      STATE.reminders.forEach((r) => {
        if (r.status !== "completed") r.status = "completed";
      });
      saveReminders();
      renderReminderTable();
      refreshDashboard();
    });
  });
}
function renderReminderTable() {
  updateReminderStatuses();
  const sr = (qs("#reminderSearch")?.value || "").toLowerCase(),
    sf = qs("#reminderStatusFilter")?.value || "";
  let fl = STATE.reminders.filter((r) => {
    const ms =
      !sr ||
      r.customerName.toLowerCase().includes(sr) ||
      r.phone.includes(sr) ||
      r.vehicleNo.toLowerCase().includes(sr) ||
      r.service.toLowerCase().includes(sr);
    return ms && (!sf || r.status === sf);
  });
  fl.sort(
    (a, b) =>
      (parseDate(a.dueDate) || new Date()) -
      (parseDate(b.dueDate) || new Date()),
  );
  const tb = qs("#reminderTableBody");
  if (!tb) return;
  const bg = qs("#reminderCountBadge");
  if (bg) bg.textContent = `${fl.length}`;
  const stats = getReminderStats();
  setText("#remDueToday", stats.dueToday);
  setText("#remOverdue", stats.overdue);
  setText("#remUpcoming", stats.upcomingWeek);
  setText("#remCompleted", stats.completed);
  const badge = qs("#reminderBadge");
  if (badge) {
    const a = stats.dueToday + stats.overdue;
    badge.textContent = a;
    badge.classList.toggle("hidden", a === 0);
  }
  if (!fl.length) {
    tb.innerHTML =
      '<tr><td colspan="9" style="text-align:center;padding:3rem;">No reminders</td></tr>';
    return;
  }
  tb.innerHTML = fl
    .map((r) => {
      const sc =
        r.status === "overdue"
          ? "badge--red"
          : r.status === "due-today"
            ? "badge--orange"
            : r.status === "completed"
              ? "badge--green"
              : "badge--blue";
      const sl =
        r.status === "due-today"
          ? "Due Today"
          : r.status === "overdue"
            ? "Overdue"
            : r.status === "completed"
              ? "Completed"
              : "Upcoming";
      const dr =
        r.daysRemaining !== undefined
          ? r.daysRemaining < 0
            ? `${Math.abs(r.daysRemaining)}d ago`
            : r.daysRemaining === 0
              ? "Today"
              : `${r.daysRemaining}d left`
          : "—";
      return `<tr><td>${sanitize(r.customerName)}</td><td><span class="contact-display">${sanitize(formatContactDisplay(r.phone))}</span></td><td><span class="table-vehicle-no">${sanitize(r.vehicleNo)}</span></td><td>${sanitize(r.service)}</td><td>${sanitize(r.serviceDate)}</td><td>${sanitize(r.dueDate)}</td><td style="font-weight:600;color:${r.status === "overdue" ? "var(--danger)" : r.status === "due-today" ? "var(--warning)" : "var(--text)"};">${dr}</td><td><span class="badge ${sc}">${sl}</span></td><td><div class="table-actions"><button class="btn btn-sm btn-primary whatsapp-btn" data-wa="${r.id}">WhatsApp</button>${r.status !== "completed" ? `<button class="btn btn-sm btn-outline" data-cr="${r.id}">Done</button>` : ""}<button class="btn-icon btn btn-danger-ghost" data-dr="${r.id}"><span class="material-icons">delete</span></button></div></td></tr>`;
    })
    .join("");
}

// ==================== LOGIN ====================
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

// ==================== INIT APP ====================
function initApp() {
  setText("#currentDate", fmtDate());
  updateSessionTime();
  setInterval(updateSessionTime, 60000);
  updateAllBrandNames();
  setupModalClosers();
  const mb = qs("#mobileMenuBtn"),
    sb = qs("#sidebarCloseBtn"),
    s = qs("#sidebar"),
    bd = qs("#sidebarBackdrop");
  function openSidebar() {
    if (!s || !bd) return;
    s.classList.add("mobile-open");
    bd.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    if (!s || !bd) return;
    s.classList.remove("mobile-open");
    bd.classList.add("hidden");
    document.body.style.overflow = "";
  }
  if (mb) mb.addEventListener("click", openSidebar);
  if (sb) sb.addEventListener("click", closeSidebar);
  if (bd) bd.addEventListener("click", closeSidebar);
  qs("#sidebarToggle")?.addEventListener("click", () => {
    const sb2 = qs("#sidebar"),
      mw = qs("#mainWrapper");
    if (!sb2 || !mw) return;
    sb2.classList.toggle("collapsed");
    mw.classList.toggle("sidebar-collapsed");
  });
  qsa(".nav-link").forEach((l) =>
    l.addEventListener("click", (e) => {
      e.preventDefault();
      if (l.dataset.module) navigateTo(l.dataset.module);
      if (window.innerWidth <= 768) closeSidebar();
    }),
  );
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

  // SINGLE GLOBAL CLICK HANDLER
  document.addEventListener("click", function (e) {
    const ab = e.target.closest("[data-action]");
    if (ab) {
      handleQuickAction(ab.dataset.action);
      return;
    }
    const nb = e.target.closest("[data-nav]");
    if (nb) {
      navigateTo(nb.dataset.nav);
      return;
    }
    const wa = e.target.closest("[data-wa]");
    if (wa) {
      const r = STATE.reminders.find((r) => r.id === wa.dataset.wa);
      if (r)
        openWhatsApp(
          r.phone,
          r.customerName,
          r.vehicleNo,
          r.service,
          r.serviceDate,
        );
      return;
    }
    const cr = e.target.closest("[data-cr]");
    if (cr) {
      const r = STATE.reminders.find((r) => r.id === cr.dataset.cr);
      if (r) {
        r.status = "completed";
        saveReminders();
        renderReminderTable();
        refreshDashboard();
      }
      return;
    }
    const dr = e.target.closest("[data-dr]");
    if (dr) {
      confirm("Delete reminder?", () => {
        STATE.reminders = STATE.reminders.filter((r) => r.id !== dr.dataset.dr);
        saveReminders();
        renderReminderTable();
        refreshDashboard();
      });
      return;
    }
    const tp = e.target.closest("[data-token-progress]");
    if (tp) {
      updateTokenStatus(tp.dataset.tokenProgress, "in-progress");
      return;
    }
    const tc = e.target.closest("[data-token-complete]");
    if (tc) {
      const t = STATE.tokens.find((t) => t.id === tc.dataset.tokenComplete);
      if (t) {
        t.status = "completed";
        saveTokens();
        createReminderFromToken(t);
        renderTokenTable();
        refreshDashboard();
      }
      return;
    }
    const ti = e.target.closest("[data-token-invoice]");
    if (ti) {
      openInvoiceForToken(ti.dataset.tokenInvoice);
      return;
    }
    const te = e.target.closest("[data-token-edit]");
    if (te) {
      openEditTokenModal(te.dataset.tokenEdit);
      return;
    }
    const td = e.target.closest("[data-token-delete]");
    if (td) {
      confirm("Remove token?", () => {
        const t = STATE.tokens.find((t) => t.id === td.dataset.tokenDelete);
        if (t?.products) {
          t.products.forEach((p) => {
            const f = findVariantById(p.variantId);
            if (f) f.variant.stock += p.qty;
          });
          saveInventory();
        }
        STATE.tokens = STATE.tokens.filter(
          (t) => t.id !== td.dataset.tokenDelete,
        );
        saveTokens();
        renderTokenTable();
        refreshDashboard();
      });
      return;
    }
    const ve = e.target.closest("[data-vehicle-edit]");
    if (ve) {
      const v = STATE.vehicles.find((v) => v.id === ve.dataset.vehicleEdit);
      if (v) openNewVehicleModal(v);
      return;
    }
    const vd = e.target.closest("[data-vehicle-delete]");
    if (vd) {
      confirm("Delete vehicle?", () => {
        STATE.vehicles = STATE.vehicles.filter(
          (v) => v.id !== vd.dataset.vehicleDelete,
        );
        saveVehicles();
        renderVehicleTable();
      });
      return;
    }
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
    const vdd = e.target.closest("[data-variant-delete]");
    if (vdd) {
      confirm("Delete variant?", () => {
        STATE.inventory.forEach((p) => {
          p.variants = (p.variants || []).filter(
            (v) => v.id !== vdd.dataset.variantDelete,
          );
        });
        STATE.inventory = STATE.inventory.filter(
          (p) => (p.variants || []).length > 0,
        );
        saveInventory();
        renderInventoryTable();
        updateInventoryKPI();
        refreshDashboard();
      });
      return;
    }
    const vi = e.target.closest("[data-view-invoice]");
    if (vi) {
      viewInvoice(vi.dataset.viewInvoice);
      return;
    }
    const pi = e.target.closest("[data-print-receipt]");
    if (pi) {
      printSavedReceipt(pi.dataset.printReceipt);
      return;
    }
    const di = e.target.closest("[data-delete-invoice]");
    if (di) {
      confirm("Delete invoice?", () => {
        STATE.invoices = STATE.invoices.filter(
          (i) => i.id !== di.dataset.deleteInvoice,
        );
        saveInvoices();
        renderSavedInvoices();
      });
      return;
    }
    const ed = e.target.closest("[data-expense-del]");
    if (ed) {
      confirm("Delete?", () => {
        STATE.expenses = STATE.expenses.filter(
          (ex) => ex.id !== ed.dataset.expenseDel,
        );
        saveExpenses();
        renderExpenses();
        refreshDashboard();
      });
      return;
    }
    const bd2 = e.target.closest("[data-brand-delete]");
    if (bd2) {
      const id = bd2.dataset.brandDelete;
      if (
        getAllVariantsFlat().some(
          (v) => v.brand === STATE.brands.find((b) => b.id === id)?.name,
        )
      ) {
        toast("Brand in use", "warning");
        return;
      }
      STATE.brands = STATE.brands.filter((b) => b.id !== id);
      saveBrands();
      populateBrandDropdowns();
      renderBrandList();
      return;
    }
    const cd = e.target.closest("[data-cat-delete]");
    if (cd) {
      const id = cd.dataset.catDelete;
      if (STATE.inventory.some((p) => p.category === id)) {
        toast("Category in use", "warning");
        return;
      }
      STATE.categories = STATE.categories.filter((c) => c.id !== id);
      saveCategories();
      populateCategoryDropdowns();
      renderCategoryList();
      return;
    }
    const vtd = e.target.closest("[data-vtype-delete]");
    if (vtd) {
      STATE.pricingVehicles = STATE.pricingVehicles.filter(
        (v) => v.id !== vtd.dataset.vtypeDelete,
      );
      savePricingVehicles();
      renderVehicleTypeList();
      renderPricingMatrix();
      return;
    }
    const psd = e.target.closest("[data-psvc-delete]");
    if (psd) {
      STATE.pricingServices = STATE.pricingServices.filter(
        (s) => s.id !== psd.dataset.psvcDelete,
      );
      savePricingServices();
      renderPricingServiceList();
      renderPricingMatrix();
      return;
    }
  });

  initDashboard();
  initTokens();
  initVehicles();
  initInventory();
  initBilling();
  initReports();
  initExpenses();
  initServices();
  initProductSales();
  initReminders();
  initImportExport();
  initSettings();
  navigateTo("dashboard");
}

function updateSessionTime() {
  const e = qs("#sessionTime");
  if (!e) return;
  e.textContent = `Session: ${Math.floor((new Date() - STATE.sessionStart) / 60000)} min`;
}
function updateAllBrandNames() {
  const s = STATE.settings;
  const lb = qs("#loginBrandName");
  if (lb) lb.textContent = s.businessName;
  const sb = qs(".sidebar-brand");
  if (sb) sb.textContent = s.businessName;
  const ib = qs("#invBusinessName");
  if (ib) ib.textContent = s.businessName;
}

const MODULE_TITLES = {
  dashboard: ["Dashboard", "Overview"],
  tokens: ["Token Management", "Track tokens"],
  vehicles: ["Vehicle Records", "Customer vehicles"],
  inventory: ["Inventory", "Stock management"],
  billing: ["Billing & Invoice", "Create invoices"],
  reports: ["Reports", "Analytics"],
  expenses: ["Expenses", "Track expenses"],
  services: ["Services", "Pricing matrix"],
  productsale: ["Product Sale", "Sell products"],
  reminders: ["Customer Reminders", "Service reminders"],
  importexport: ["Import/Export", "Data management"],
  settings: ["Settings", "Configuration"],
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
    case "inventory":
      renderInventoryTable();
      break;
    case "reports":
      renderReports();
      break;
    case "expenses":
      renderExpenses();
      break;
    case "services":
      renderPricingMatrix();
      break;
    case "productsale":
      renderProductSalePage();
      break;
    case "reminders":
      renderReminderTable();
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
      if (tk.products)
        tk.products.forEach((p) => {
          t += p.price * p.qty;
        });
    }
  });
  STATE.productSales.forEach((sale) => {
    t += sale.total;
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
function getMatrixPrice(sn, vt) {
  const key = `${sn}__${vt}`;
  return STATE.pricingMatrix[key] || 0;
}

// ==================== DASHBOARD ====================
function initDashboard() {
  refreshDashboard();
}
function refreshDashboard() {
  const tv = STATE.tokens.length,
    at = STATE.tokens.filter(
      (t) => t.status === "waiting" || t.status === "in-progress",
    ).length;
  const ct = STATE.tokens.filter((t) => t.status === "completed").length;
  const dr = getTotalRevenue(),
    ls = getLowStockCount();
  setText("#kpiVehicles", tv);
  setText("#kpiTokens", at);
  setText("#kpiCompleted", ct);
  setText("#kpiRevenue", fmtPrice(dr));
  setText("#kpiAlerts", ls);
  setText("#kpiLowStock", ls);
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
  const rs = getReminderStats();
  setText("#kpiDueToday", rs.dueToday);
  setText("#kpiOverdue", rs.overdue);
  setText("#kpiUpcomingWeek", rs.upcomingWeek);
  const rb = qs("#reminderBadge");
  if (rb) {
    const a = rs.dueToday + rs.overdue;
    rb.textContent = a;
    rb.classList.toggle("hidden", a === 0);
  }
  renderRecentActivity();
  updateLowStockAlert(ls);
}
function updateLowStockAlert(c) {
  const ae = qs("#lowStockAlert");
  if (!ae) return;
  ae.classList.toggle("hidden", c === 0);
}
function renderRecentActivity() {
  const tb = qs("#recentActivityTable");
  if (!tb) return;
  const recent = [...STATE.tokens].reverse().slice(0, 10);
  if (!recent.length) {
    tb.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:3rem;">No activity yet</td></tr>';
    return;
  }
  tb.innerHTML = recent
    .map(
      (t) =>
        `<tr><td><span class="table-token-no">${sanitize(t.number)}</span></td><td><span class="table-vehicle-no">${sanitize(t.vehicleNo)}</span></td><td style="font-weight:500;">${sanitize(t.ownerName || "—")}</td><td><span class="contact-display">${sanitize(formatContactDisplay(t.contactNumber || "N/A"))}</span></td><td>${sanitize(t.service)}</td><td>${statusBadge(t.status)}</td></tr>`,
    )
    .join("");
}
function statusBadge(s) {
  const m = {
    waiting: "status-waiting",
    "in-progress": "status-in-progress",
    completed: "status-completed",
  };
  const l = {
    waiting: "Waiting",
    "in-progress": "In Progress",
    completed: "Completed",
  };
  return `<span class="status-badge ${m[s] || ""}">${l[s] || s}</span>`;
}

// ==================== TOKEN MANAGEMENT (COMPLETE - NO DUPLICATES) ====================
function initTokens() {
  qs("#newTokenBtn")?.addEventListener("click", openNewTokenModal);
  qs("#newTokenBtn2")?.addEventListener("click", openNewTokenModal);
  qs("#saveTokenBtn")?.addEventListener("click", saveToken);
  qs("#tokenSearch")?.addEventListener("input", renderTokenTable);
  qs("#tokenStatusFilter")?.addEventListener("change", renderTokenTable);
  qs("#tokenServiceType")?.addEventListener("change", function () {
    qs("#customServiceGroup").style.display =
      this.value === "Custom" ? "" : "none";
    updateTokenPrice();
  });
  qs("#tokenVehicleType")?.addEventListener("change", updateTokenPrice);
  renderTokenTable();
}

function populateTokenServices() {
  const sel = qs("#tokenServiceType");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select service</option>';
  STATE.pricingServices.forEach((s) => {
    const o = document.createElement("option");
    o.value = s.name;
    o.textContent = s.name;
    sel.appendChild(o);
  });
  const co = document.createElement("option");
  co.value = "Custom";
  co.textContent = "Custom Service";
  sel.appendChild(co);
}
function populateVehicleTypes() {
  const sel = qs("#tokenVehicleType");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select type</option>';
  STATE.pricingVehicles.forEach((v) => {
    const o = document.createElement("option");
    o.value = v.name;
    o.textContent = v.name;
    sel.appendChild(o);
  });
}
function updateTokenPrice() {
  const sv = qs("#tokenServiceType")?.value || "";
  const vt = qs("#tokenVehicleType")?.value || "";
  setText(
    "#autoTokenPrice",
    sv && sv !== "Custom" && vt ? fmtPrice(getMatrixPrice(sv, vt)) : "—",
  );
  updateTokenTotal();
}
function addTokenProduct() {
  const c = qs("#tokenProductsList");
  if (!c) return;
  const opts = getAllVariantsFlat()
    .filter((v) => v.stock > 0)
    .map(
      (v) =>
        `<option value="${v.id}" data-price="${v.sellingPrice}" data-stock="${v.stock}">${sanitize(v.fullName)} | Stock: ${v.stock} | ${fmtPrice(v.sellingPrice)}</option>`,
    )
    .join("");
  const r = document.createElement("div");
  r.style.cssText =
    "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
  r.innerHTML = `<select class="form-input token-product-select" style="flex:1;padding:6px 4px;font-size:0.72rem;"><option value="">Select variant</option>${opts}</select><input type="number" class="form-input token-product-qty" value="1" min="1" style="width:50px;padding:6px 2px;font-size:0.78rem;text-align:center;" /><input type="number" class="form-input token-product-price" value="0" readonly style="width:70px;padding:6px 2px;font-size:0.78rem;background:var(--surface-active);text-align:right;" /><button class="btn-icon btn btn-danger-ghost" onclick="this.closest('div').remove();updateTokenTotal();"><span class="material-icons">close</span></button>`;
  c.appendChild(r);
  const s = r.querySelector(".token-product-select");
  s.addEventListener("change", function () {
    const o = this.options[this.selectedIndex];
    r.querySelector(".token-product-price").value =
      parseFloat(o?.dataset?.price) || 0;
    r.querySelector(".token-product-qty").max =
      parseInt(o?.dataset?.stock) || 0;
    updateTokenTotal();
  });
  r.querySelector(".token-product-qty").addEventListener(
    "input",
    updateTokenTotal,
  );
}
function updateTokenTotal() {
  let t = 0;
  const sv = qs("#tokenServiceType")?.value || "";
  const vt = qs("#tokenVehicleType")?.value || "";
  if (sv && sv !== "Custom" && vt) t += getMatrixPrice(sv, vt);
  qsa("#tokenProductsList .token-product-select").forEach((s, i) => {
    t +=
      (parseInt(qsa("#tokenProductsList .token-product-qty")[i]?.value) || 0) *
      (parseFloat(qsa("#tokenProductsList .token-product-price")[i]?.value) ||
        0);
  });
  setText("#tokenGrandTotal", fmtPrice(t));
}
function openNewTokenModal() {
  setText("#autoTokenNumber", generateTokenNumber());
  setValue("#tokenVehicleNo", "");
  setValue("#tokenVehicleType", "");
  setValue("#tokenOwnerName", "");
  setValue("#tokenContactNumber", "");
  setValue("#tokenCustomService", "");
  populateVehicleTypes();
  populateTokenServices();
  qs("#customServiceGroup").style.display = "none";
  qs("#tokenProductsList").innerHTML = "";
  setText("#autoTokenPrice", "—");
  setText("#tokenGrandTotal", "Rs. 0");
  qs("#tokenModal").dataset.editId = "";
  qs("#tokenModalTitle").innerHTML =
    '<span class="material-icons">token</span> Generate Token';
  openModal("tokenModal");
  setTimeout(() => qs("#tokenVehicleNo")?.focus(), 100);
}

function saveToken() {
  const editId = qs("#tokenModal")?.dataset?.editId || "";
  const vn = (qs("#tokenVehicleNo")?.value || "").trim().toUpperCase(),
    vt = qs("#tokenVehicleType")?.value || "",
    on = (qs("#tokenOwnerName")?.value || "").trim();
  const cn = (qs("#tokenContactNumber")?.value || "").trim(),
    st = qs("#tokenServiceType")?.value || "",
    cs = (qs("#tokenCustomService")?.value || "").trim();
  if (!vn || !vt || !st) {
    toast("Please fill all required fields", "error");
    return;
  }
  const cv = validateContactNumber(cn);
  if (!cv.valid) {
    toast(cv.message, "error");
    qs("#tokenContactNumber")?.focus();
    return;
  }
  if (st === "Custom" && !cs) {
    toast("Please describe the custom service", "error");
    return;
  }
  let fs = st === "Custom" ? cs : st,
    sp = st !== "Custom" ? getMatrixPrice(st, vt) : 0;
  const newProducts = [];
  let hasError = false;
  qsa("#tokenProductsList .token-product-select").forEach((s, i) => {
    const vid = s.value;
    if (!vid) return;
    const f = findVariantById(vid);
    if (!f) return;
    const q =
      parseInt(qsa("#tokenProductsList .token-product-qty")[i]?.value) || 1;
    if (q > f.variant.stock) {
      toast(
        `Only ${f.variant.stock} units available for ${f.fullName}`,
        "error",
      );
      hasError = true;
      return;
    }
    const p =
      parseFloat(qsa("#tokenProductsList .token-product-price")[i]?.value) ||
      f.variant.sellingPrice;
    newProducts.push({
      variantId: f.variant.id,
      fullName: f.fullName,
      qty: q,
      price: p,
    });
  });
  if (hasError) return;
  if (editId) {
    const t = STATE.tokens.find((t) => t.id === editId);
    if (!t) return;
    if (t.products)
      t.products.forEach((p) => {
        const f = findVariantById(p.variantId);
        if (f) f.variant.stock += p.qty;
      });
    newProducts.forEach((p) => {
      const f = findVariantById(p.variantId);
      if (f) f.variant.stock = Math.max(0, f.variant.stock - p.qty);
    });
    t.vehicleNo = vn;
    t.vehicleType = vt;
    t.ownerName = on;
    t.contactNumber = cv.formatted;
    t.service = fs;
    t.servicePrice = sp;
    t.products = newProducts;
    t.editedAt = fmtDate() + " " + fmtTime();
    saveTokens();
    saveInventory();
    renderTokenTable();
    closeModal("tokenModal");
    refreshDashboard();
    toast("Token updated successfully", "success");
  } else {
    newProducts.forEach((p) => {
      const f = findVariantById(p.variantId);
      if (f) f.variant.stock = Math.max(0, f.variant.stock - p.qty);
    });
    const ex = STATE.vehicles.find((v) => v.vehicleNo === vn);
    if (!ex) {
      STATE.vehicles.push({
        id: uid(),
        vehicleNo: vn,
        owner: on,
        contact: cv.formatted,
        type: vt,
        notes: "",
        visits: 1,
        lastService: fmtDate(),
      });
      saveVehicles();
    } else {
      ex.visits = (ex.visits || 0) + 1;
      ex.lastService = fmtDate();
      if (cv.formatted) ex.contact = cv.formatted;
      saveVehicles();
    }
    const newToken = {
      id: uid(),
      number: qs("#autoTokenNumber")?.textContent || generateTokenNumber(),
      vehicleNo: vn,
      vehicleType: vt,
      ownerName: on,
      contactNumber: cv.formatted,
      service: fs,
      servicePrice: sp,
      products: newProducts,
      time: fmtTime(),
      status: "waiting",
    };
    STATE.tokens.push(newToken);
    saveTokens();
    saveInventory();
    saveCounters();
    closeModal("tokenModal");
    renderTokenTable();
    refreshDashboard();
    toast(`Token ${newToken.number} generated successfully`, "success");
  }
}

// ===== SINGLE renderTokenTable - NO DUPLICATES =====
function renderTokenTable() {
  const sr = (qs("#tokenSearch")?.value || "").toLowerCase();
  const sf = qs("#tokenStatusFilter")?.value || "";

  let fl = STATE.tokens.filter((t) => {
    const ms =
      !sr ||
      t.number.toLowerCase().includes(sr) ||
      t.vehicleNo.toLowerCase().includes(sr) ||
      (t.ownerName || "").toLowerCase().includes(sr) ||
      (t.contactNumber || "").includes(sr) ||
      t.service.toLowerCase().includes(sr);
    return ms && (!sf || t.status === sf);
  });

  // Update KPI stat cards
  setText("#tokenStatsTotal", STATE.tokens.length);
  setText(
    "#tokenStatsWaiting",
    STATE.tokens.filter((t) => t.status === "waiting").length,
  );
  setText(
    "#tokenStatsProgress",
    STATE.tokens.filter((t) => t.status === "in-progress").length,
  );
  setText(
    "#tokenStatsCompleted",
    STATE.tokens.filter((t) => t.status === "completed").length,
  );

  const badge = qs("#tokenCountBadge");
  if (badge)
    badge.textContent = `${fl.length} token${fl.length !== 1 ? "s" : ""}`;

  const tableContainer = qs("#tokenTableContainer");
  const emptyContainer = qs("#tokenEmptyStateContainer");
  const tableBody = qs("#tokenTableBody");

  if (!fl.length) {
    if (tableContainer) tableContainer.style.display = "none";
    if (emptyContainer) emptyContainer.style.display = "";
    if (tableBody) tableBody.innerHTML = "";
  } else {
    if (tableContainer) tableContainer.style.display = "";
    if (emptyContainer) emptyContainer.style.display = "none";
    if (tableBody) {
      tableBody.innerHTML = fl
        .reverse()
        .map(
          (t) => `
        <tr>
          <td><span class="table-token-no">${sanitize(t.number)}</span></td>
          <td><span class="table-vehicle-no">${sanitize(t.vehicleNo)}</span></td>
          <td>${sanitize(t.vehicleType)}</td>
          <td style="font-weight:500;">${sanitize(t.ownerName || "—")}</td>
          <td><span class="contact-display">${sanitize(formatContactDisplay(t.contactNumber || "N/A"))}</span></td>
          <td>${sanitize(t.service)}</td>
          <td style="color:var(--text-muted);font-size:0.78rem;">${sanitize(t.time)}</td>
          <td>${statusBadge(t.status)}</td>
          <td><div class="table-actions">
            ${t.status === "waiting" || t.status === "in-progress" ? `<button class="btn btn-sm btn-ghost" data-token-edit="${t.id}" title="Edit"><span class="material-icons">edit</span></button>` : ""}
            ${t.status === "waiting" ? `<button class="btn btn-sm btn-outline" data-token-progress="${t.id}" title="Start"><span class="material-icons">play_arrow</span></button>` : ""}
            ${t.status === "in-progress" ? `<button class="btn btn-sm btn-primary" data-token-complete="${t.id}" title="Complete"><span class="material-icons">check</span></button>` : ""}
            ${t.status === "completed" ? `<button class="btn btn-sm btn-ghost" data-token-invoice="${t.id}" title="Invoice"><span class="material-icons">receipt</span></button>` : ""}
            <button class="btn-icon btn btn-danger-ghost" data-token-delete="${t.id}" title="Delete"><span class="material-icons">delete</span></button>
          </div></td>
        </tr>`,
        )
        .join("");
    }
  }
}

function updateTokenStatus(id, s) {
  const tk = STATE.tokens.find((t) => t.id === id);
  if (tk) {
    tk.status = s;
    saveTokens();
    if (s === "completed") createReminderFromToken(tk);
    renderTokenTable();
    refreshDashboard();
  }
}
function openInvoiceForToken(id) {
  const t = STATE.tokens.find((t) => t.id === id);
  if (!t) return;
  navigateTo("billing");
  setTimeout(() => {
    setValue("#invoiceToken", t.number);
    autoFillFromToken(t.number);
    updateInvoicePreview();
  }, 150);
}
function openEditTokenModal(tid) {
  const t = STATE.tokens.find((t) => t.id === tid);
  if (!t) return;
  setText("#autoTokenNumber", t.number);
  setValue("#tokenVehicleNo", t.vehicleNo);
  populateVehicleTypes();
  setTimeout(() => setValue("#tokenVehicleType", t.vehicleType), 50);
  setValue("#tokenOwnerName", t.ownerName || "");
  setValue("#tokenContactNumber", t.contactNumber || "");
  populateTokenServices();
  setTimeout(() => {
    const svc = qs("#tokenServiceType");
    if (Array.from(svc.options).some((o) => o.value === t.service)) {
      setValue("#tokenServiceType", t.service);
      qs("#customServiceGroup").style.display = "none";
    } else {
      setValue("#tokenServiceType", "Custom");
      setValue("#tokenCustomService", t.service);
      qs("#customServiceGroup").style.display = "";
    }
  }, 50);
  const pl = qs("#tokenProductsList");
  if (pl) pl.innerHTML = "";
  if (t.products)
    t.products.forEach((p) => {
      const c = qs("#tokenProductsList");
      if (!c) return;
      const av = getAllVariantsFlat();
      const opts = av
        .map(
          (v) =>
            `<option value="${v.id}" data-price="${v.sellingPrice}" ${v.id === p.variantId ? "selected" : ""}>${sanitize(v.fullName)} | ${fmtPrice(v.sellingPrice)}</option>`,
        )
        .join("");
      const r = document.createElement("div");
      r.style.cssText =
        "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
      r.innerHTML = `<select class="form-input token-product-select" style="flex:1;padding:6px 4px;font-size:0.72rem;"><option value="">Select variant</option>${opts}</select><input type="number" class="form-input token-product-qty" value="${p.qty}" min="1" style="width:50px;padding:6px 2px;font-size:0.78rem;text-align:center;" /><input type="number" class="form-input token-product-price" value="${p.price}" readonly style="width:70px;padding:6px 2px;font-size:0.78rem;background:var(--surface-active);text-align:right;" /><button class="btn-icon btn btn-danger-ghost" onclick="this.closest('div').remove();updateTokenTotal();"><span class="material-icons">close</span></button>`;
      c.appendChild(r);
      r.querySelector(".token-product-select").addEventListener(
        "change",
        function () {
          const v = av.find((x) => x.id === this.value);
          if (v) {
            r.querySelector(".token-product-price").value = v.sellingPrice;
            updateTokenTotal();
          }
        },
      );
      r.querySelector(".token-product-qty").addEventListener(
        "input",
        updateTokenTotal,
      );
    });
  setTimeout(() => {
    updateTokenPrice();
    updateTokenTotal();
  }, 100);
  qs("#tokenModal").dataset.editId = tid;
  qs("#tokenModalTitle").innerHTML =
    '<span class="material-icons">edit</span> Edit Token';
  openModal("tokenModal");
}

// ==================== BILLING ====================
let ivc = 0;
function initBilling() {
  qs("#addInvoiceService")?.addEventListener("click", () =>
    addInvoiceServiceRow("", 0),
  );
  qs("#addInvoiceProduct")?.addEventListener("click", () =>
    addInvoiceProductRow("", 0, 1),
  );
  qs("#saveInvoiceBtn")?.addEventListener("click", saveInvoice);
  qs("#printReceiptBtn")?.addEventListener("click", printThermalReceipt);
  qs("#invoiceToken")?.addEventListener("input", function () {
    autoFillFromToken(this.value.trim());
    updateInvoicePreview();
  });
  qs("#invoiceVehicle")?.addEventListener("input", updateInvoicePreview);
  qs("#invoiceCustomer")?.addEventListener("input", updateInvoicePreview);
  qs("#cashReceived")?.addEventListener("input", function () {
    const cash = parseFloat(this.value) || 0;
    const total =
      parseFloat(
        (qs("#invTotal")?.textContent || "0").replace(/[^0-9]/g, ""),
      ) || 0;
    setText(
      "#changeReturned",
      cash >= total ? fmtPrice(cash - total) : "Insufficient",
    );
  });
  renderSavedInvoices();
}
function autoFillFromToken(tn) {
  if (!tn) return;
  const t = STATE.tokens.find(
    (t) => t.number.toLowerCase() === tn.toLowerCase(),
  );
  if (!t) {
    toast("Token not found", "warning");
    return;
  }
  setValue("#invoiceVehicle", t.vehicleNo);
  setValue("#invoiceCustomer", t.ownerName || "");
  qs("#invoiceCustomer").dataset.contact = t.contactNumber || "";
  qs("#invoiceServicesContainer").innerHTML = "";
  qs("#invoiceProductsContainer").innerHTML = "";
  if (t.service)
    addInvoiceServiceRow(
      t.service,
      t.servicePrice || getMatrixPrice(t.service, t.vehicleType) || 0,
    );
  if (t.products)
    t.products.forEach((p) => addInvoiceProductRow(p.fullName, p.price, p.qty));
  updateInvoicePreview();
  setValue("#cashReceived", "");
  setText("#changeReturned", "Rs. 0");
}
function addInvoiceServiceRow(nm = "", pr = 0) {
  const op = STATE.pricingServices
    .map(
      (s) =>
        `<option value="${s.name}" data-price="${getMatrixPrice(s.name, qs("#invoiceVehicle")?.value || "") || 0}" ${s.name === nm ? "selected" : ""}>${sanitize(s.name)}</option>`,
    )
    .join("");
  const r = document.createElement("div");
  r.className = "invoice-line-row";
  r.innerHTML = `<div class="form-group"><select class="form-input invoice-svc-select"><option value="">Select...</option>${op}</select></div><div class="form-group"><input type="number" class="form-input invoice-svc-price" value="${pr}" readonly style="background:var(--surface-active);"></div><div class="form-group"><input type="number" class="form-input invoice-svc-qty" value="1" min="1"></div><button class="btn-icon btn btn-danger-ghost" onclick="this.closest('.invoice-line-row').remove();updateInvoicePreview();"><span class="material-icons">close</span></button>`;
  qs("#invoiceServicesContainer")?.appendChild(r);
  r.querySelector(".invoice-svc-select")?.addEventListener(
    "change",
    function () {
      r.querySelector(".invoice-svc-price").value =
        this.options[this.selectedIndex]?.dataset?.price || 0;
      updateInvoicePreview();
    },
  );
  r.querySelector(".invoice-svc-qty")?.addEventListener(
    "input",
    updateInvoicePreview,
  );
}
function addInvoiceProductRow(nm = "", pr = 0, qt = 1) {
  const av = getAllVariantsFlat();
  const op = av
    .map(
      (v) =>
        `<option value="${v.sellingPrice}" data-fullname="${sanitize(v.fullName)}" ${v.fullName === nm ? "selected" : ""}>${sanitize(v.fullName)} | ${fmtPrice(v.sellingPrice)}</option>`,
    )
    .join("");
  const r = document.createElement("div");
  r.className = "invoice-line-row";
  r.innerHTML = `<div class="form-group"><select class="form-input invoice-prd-select"><option value="">Select...</option>${op}</select></div><div class="form-group"><input type="number" class="form-input invoice-prd-price" value="${pr}" readonly style="background:var(--surface-active);"></div><div class="form-group"><input type="number" class="form-input invoice-prd-qty" value="${qt}" min="1"></div><button class="btn-icon btn btn-danger-ghost" onclick="this.closest('.invoice-line-row').remove();updateInvoicePreview();"><span class="material-icons">close</span></button>`;
  qs("#invoiceProductsContainer")?.appendChild(r);
  r.querySelector(".invoice-prd-select")?.addEventListener(
    "change",
    function () {
      r.querySelector(".invoice-prd-price").value = this.value || 0;
      updateInvoicePreview();
    },
  );
  r.querySelector(".invoice-prd-qty")?.addEventListener(
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
      nm = s?.options[s.selectedIndex]?.dataset?.fullname || "",
      pr = parseFloat(r.querySelector(".invoice-prd-price")?.value) || 0,
      qt = parseInt(r.querySelector(".invoice-prd-qty")?.value) || 1;
    if (nm) it.push({ name: nm, price: pr, qty: qt, type: "product" });
  });
  if (!it.length) {
    toast("Add items", "error");
    return;
  }
  let st = 0;
  it.forEach((i) => (st += i.price * i.qty));
  const tx = st * (STATE.settings.taxRate / 100),
    cr = parseFloat(qs("#cashReceived")?.value) || 0,
    gt = st + tx;
  const inv = {
    id: uid(),
    number:
      STATE.settings.invoicePrefix +
      String(STATE.counters.invoiceCounter).padStart(3, "0"),
    date: fmtDate(),
    time: fmtTime(),
    token: (qs("#invoiceToken")?.value || "").trim(),
    vehicle: (qs("#invoiceVehicle")?.value || "").trim(),
    customer: cu,
    contactNumber: qs("#invoiceCustomer")?.dataset?.contact || "",
    items: it,
    subtotal: st,
    tax: tx,
    total: gt,
    cashReceived: cr,
    changeReturned: cr > 0 ? cr - gt : 0,
    status: cr >= gt && cr > 0 ? "PAID" : "UNPAID",
  };
  STATE.invoices.push(inv);
  STATE.counters.invoiceCounter++;
  saveInvoices();
  saveCounters();
  const tn = inv.token;
  if (tn) {
    const tk = STATE.tokens.find(
      (t) => t.number.toLowerCase() === tn.toLowerCase(),
    );
    if (tk && tk.status !== "completed") {
      tk.status = "completed";
      createReminderFromToken(tk);
      saveTokens();
    }
  }
  toast(`Invoice ${inv.number} saved`, "success");
  setValue("#invoiceToken", "");
  setValue("#invoiceVehicle", "");
  setValue("#invoiceCustomer", "");
  setValue("#cashReceived", "");
  setText("#changeReturned", "Rs. 0");
  qs("#invoiceServicesContainer").innerHTML = "";
  qs("#invoiceProductsContainer").innerHTML = "";
  addInvoiceServiceRow("", 0);
  addInvoiceProductRow("", 0, 1);
  updateInvoicePreview();
  renderSavedInvoices();
  refreshDashboard();
}
function updateInvoicePreview() {
  setText("#invToken", (qs("#invoiceToken")?.value || "").trim() || "—");
  setText("#invVehicle", (qs("#invoiceVehicle")?.value || "").trim() || "—");
  setText("#invCustomer", (qs("#invoiceCustomer")?.value || "").trim() || "—");
  const ct = qs("#invoiceCustomer")?.dataset?.contact || "";
  const ce = qs("#invCustomerContact");
  if (ce) ce.textContent = ct ? `📱 ${formatContactDisplay(ct)}` : "";
  setText("#invDate", fmtDate());
  setText(
    "#invNumber",
    STATE.settings.invoicePrefix +
      String(STATE.counters.invoiceCounter).padStart(3, "0"),
  );
  setText("#invBusinessName", STATE.settings.businessName);
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
      nm = s?.options[s.selectedIndex]?.dataset?.fullname || "",
      pr = parseFloat(r.querySelector(".invoice-prd-price")?.value) || 0,
      qt = parseInt(r.querySelector(".invoice-prd-qty")?.value) || 1;
    if (nm) it.push({ name: nm, price: pr, qty: qt, type: "product" });
  });
  const tb = qs("#invoiceItemsBody");
  if (!it.length) {
    if (tb) tb.innerHTML = '<tr><td colspan="5">No items</td></tr>';
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
  setText("#invTaxRate", STATE.settings.taxRate);
  setText("#invTaxAmount", fmtPrice(tx));
  setText("#invSubtotal", fmtPrice(st));
  setText("#invTotal", fmtPrice(st + tx));
}
function renderSavedInvoices() {
  const tb = qs("#savedInvoiceTableBody");
  if (!tb) return;
  if (!STATE.invoices.length) {
    tb.innerHTML = '<tr><td colspan="8">No invoices</td></tr>';
    return;
  }
  tb.innerHTML = STATE.invoices
    .map(
      (inv) =>
        `<tr><td style="font-weight:700;color:var(--primary);">${sanitize(inv.number)}</td><td>${sanitize(inv.date)}</td><td>${sanitize(inv.customer)}${inv.contactNumber ? `<br><small>${sanitize(formatContactDisplay(inv.contactNumber))}</small>` : ""}</td><td>${sanitize(inv.vehicle || "—")}</td><td>${sanitize(inv.token || "—")}</td><td style="font-weight:600;">${fmtPrice(inv.total)}</td><td><span class="badge ${inv.status === "PAID" ? "badge--green" : "badge--red"}">${inv.status}</span></td><td><div class="table-actions"><button class="btn btn-sm btn-outline" data-view-invoice="${inv.id}"><span class="material-icons">visibility</span></button><button class="btn btn-sm btn-primary" data-print-receipt="${inv.id}"><span class="material-icons">print</span></button><button class="btn-icon btn btn-danger-ghost" data-delete-invoice="${inv.id}"><span class="material-icons">delete</span></button></div></td></tr>`,
    )
    .join("");
}
function viewInvoice(id) {
  const inv = STATE.invoices.find((i) => i.id === id);
  if (!inv) return;
  setValue("#invoiceToken", inv.token || "");
  setValue("#invoiceVehicle", inv.vehicle || "");
  setValue("#invoiceCustomer", inv.customer);
  if (inv.contactNumber)
    qs("#invoiceCustomer").dataset.contact = inv.contactNumber;
  setValue("#cashReceived", inv.cashReceived || "");
  qs("#invoiceServicesContainer").innerHTML = "";
  qs("#invoiceProductsContainer").innerHTML = "";
  inv.items.forEach((item) => {
    if (item.type === "service") addInvoiceServiceRow(item.name, item.price);
    else addInvoiceProductRow(item.name, item.price, item.qty);
  });
  updateInvoicePreview();
  setText("#invNumber", inv.number);
  setText("#invDate", inv.date);
}
function printSavedReceipt(id) {
  viewInvoice(id);
  setTimeout(() => printThermalReceipt(), 400);
}
// ==================== PROFESSIONAL COMPACT 80mm THERMAL RECEIPT ====================
function printThermalReceipt() {
  const invNumber = (qs("#invNumber")?.textContent || "").trim();
  const invDate = (qs("#invDate")?.textContent || "").trim();
  const invToken = (qs("#invToken")?.textContent || "").trim();
  const invVehicle = (qs("#invVehicle")?.textContent || "").trim();
  const invCustomer = (qs("#invCustomer")?.textContent || "").trim();
  const invContact = qs("#invCustomer")?.dataset?.contact || "";
  const businessName = STATE.settings.businessName || "Wheel Works Service Station";
  const address = STATE.settings.address || "Main Road, City";
  const phone = STATE.settings.phone || "0300-0000000";

  // Collect items
  const items = [];
  qsa(".invoice-line-row", qs("#invoiceServicesContainer")).forEach(r => {
    const s = r.querySelector(".invoice-svc-select");
    const nm = s?.options[s.selectedIndex]?.text || "";
    const pr = parseFloat(r.querySelector(".invoice-svc-price")?.value) || 0;
    const qt = parseInt(r.querySelector(".invoice-svc-qty")?.value) || 1;
    if (nm && nm !== "Select...") items.push({ name: nm, price: pr, qty: qt, type: "service" });
  });
  qsa(".invoice-line-row", qs("#invoiceProductsContainer")).forEach(r => {
    const s = r.querySelector(".invoice-prd-select");
    const nm = s?.options[s.selectedIndex]?.dataset?.fullname || "";
    const pr = parseFloat(r.querySelector(".invoice-prd-price")?.value) || 0;
    const qt = parseInt(r.querySelector(".invoice-prd-qty")?.value) || 1;
    if (nm) items.push({ name: nm, price: pr, qty: qt, type: "product" });
  });

  // Calculate totals
  let svcTotal = 0, prdTotal = 0;
  items.forEach(i => {
    const am = i.price * i.qty;
    if (i.type === "service") svcTotal += am;
    else prdTotal += am;
  });
  const grandTotal = svcTotal + prdTotal;
  const cashReceived = parseFloat(qs("#cashReceived")?.value) || 0;
  const changeReturned = cashReceived > 0 ? cashReceived - grandTotal : 0;
  const paymentStatus = cashReceived >= grandTotal && cashReceived > 0 ? "PAID" : "UNPAID";

  const now = new Date();
  const printTime = now.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: true });
  const printDate = fmtDate(now);
  const fmtRs = (n) => "Rs. " + (Number(n) || 0).toLocaleString("en-PK");

  // Build services section
  let svcHTML = "";
  if (svcTotal > 0) {
    svcHTML = `<div class="sec-title">SERVICES</div>`;
    items.filter(i => i.type === "service").forEach(i => {
      const lineTotal = i.price * i.qty;
      svcHTML += `<div class="item-line"><span class="item-name">${sanitize(i.name)}</span><span class="item-qty">x${i.qty}</span><span class="item-amt">${fmtRs(lineTotal)}</span></div>`;
    });
    svcHTML += `<div class="total-line"><span>Service Total</span><span>${fmtRs(svcTotal)}</span></div>`;
  }

  // Build products section
  let prdHTML = "";
  if (prdTotal > 0) {
    prdHTML = `<div class="sec-title">PRODUCTS</div>`;
    items.filter(i => i.type === "product").forEach(i => {
      const lineTotal = i.price * i.qty;
      prdHTML += `<div class="item-line"><span class="item-name">${sanitize(i.name)}</span><span class="item-qty">x${i.qty}</span><span class="item-amt">${fmtRs(lineTotal)}</span></div>`;
    });
    prdHTML += `<div class="total-line"><span>Product Total</span><span>${fmtRs(prdTotal)}</span></div>`;
  }

  // Payment info
  let paymentHTML = "";
  if (cashReceived > 0) {
    paymentHTML = `<div class="divider-dash"></div>
      <div class="info-line"><span>Cash Received</span><span>${fmtRs(cashReceived)}</span></div>
      <div class="info-line"><span>Change Returned</span><span>${fmtRs(changeReturned)}</span></div>`;
  }

  // Contact line
  const contactLine = invContact ? `<div class="info-line"><span>Phone</span><span>${sanitize(formatContactDisplay(invContact))}</span></div>` : "";

  const receiptHTML = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Receipt ${sanitize(invNumber)}</title><style>
@page{size:80mm auto;margin:0;}
*{margin:0;padding:0;box-sizing:border-box;}
html{width:80mm;max-width:80mm;min-width:80mm;margin:0 auto;padding:0;}
body{width:80mm;max-width:80mm;min-width:80mm;margin:0 auto;padding:0;background:#fff;font-family:"Courier New","Consolas","Monaco",monospace;font-size:8.5pt;color:#000;line-height:1.3;word-wrap:break-word;overflow-wrap:break-word;}
.receipt-inner{padding:2mm 2.5mm 3mm 2.5mm;}

/* Header */
.rcpt-header{text-align:center;padding:1.5mm 0;border-bottom:1px solid #000;margin-bottom:2mm;}
.rcpt-name{font-size:10pt;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;line-height:1.2;}
.rcpt-addr{font-size:7.5pt;color:#333;line-height:1.2;}
.rcpt-phone{font-size:7.5pt;color:#333;}

/* Dividers */
.divider{border:none;border-top:1px solid #000;margin:1.5mm 0;height:0;}
.divider-dash{border:none;border-top:1px dashed #000;margin:1.5mm 0;height:0;}
.divider-dot{border:none;border-top:1px dotted #888;margin:1mm 0;height:0;}

/* Info lines */
.info-line{display:flex;justify-content:space-between;align-items:baseline;padding:0.4mm 0;font-size:8pt;line-height:1.3;}
.info-line span:first-child{color:#444;min-width:30mm;}
.info-line span:last-child{font-weight:600;text-align:right;}

/* Section titles */
.sec-title{text-align:center;font-size:8.5pt;font-weight:900;text-transform:uppercase;letter-spacing:1.5px;padding:1.2mm 0;margin:2mm 0 1mm 0;background:#000;color:#fff;}

/* Item lines */
.item-line{display:flex;justify-content:space-between;align-items:baseline;padding:0.5mm 0;font-size:8pt;line-height:1.3;}
.item-name{flex:1;padding-right:1mm;}
.item-qty{min-width:8mm;text-align:center;color:#555;font-size:7.5pt;}
.item-amt{min-width:20mm;text-align:right;font-weight:600;}

/* Total lines */
.total-line{display:flex;justify-content:space-between;align-items:baseline;padding:1.2mm 0;margin-top:0.5mm;border-top:1px solid #000;font-size:8.5pt;font-weight:700;}

/* Grand total */
.grand-box{margin:2mm 0;padding:1.5mm 0;text-align:center;border-top:1.5px solid #000;border-bottom:1.5px solid #000;}
.grand-label{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:0.5mm;}
.grand-value{font-size:12pt;font-weight:900;line-height:1.1;}

/* Status */
.status-line{text-align:center;margin:2mm 0;font-size:9pt;font-weight:900;letter-spacing:2px;text-transform:uppercase;}

/* Footer */
.rcpt-footer{text-align:center;margin-top:2mm;padding-top:1.5mm;border-top:1px dashed #000;font-size:7pt;color:#444;line-height:1.5;}
.rcpt-thanks{font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:0.3px;}
.rcpt-dev{margin-top:1.5mm;font-size:7.5pt;font-weight:900;letter-spacing:1px;}
.rcpt-time{text-align:center;font-size:6.5pt;color:#999;margin-top:1.5mm;padding-top:1mm;border-top:1px dotted #ccc;}

@media print{
  html,body{width:80mm!important;max-width:80mm!important;min-width:80mm!important;margin:0!important;padding:0!important;background:#fff!important;height:auto!important;min-height:0!important;overflow:visible!important;}
  .sec-title{background:#000!important;color:#fff!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
}
@media screen{
  html{background:#e0e0e0;margin:10px auto;}
  body{box-shadow:0 2px 12px rgba(0,0,0,0.2);margin:10px auto;}
}
</style></head><body><div class="receipt-inner">

<!-- HEADER -->
<div class="rcpt-header">
  <div class="rcpt-name">${sanitize(businessName).toUpperCase()}</div>
  <div class="rcpt-addr">${sanitize(address)}</div>
  <div class="rcpt-phone">Tel: ${sanitize(phone)}</div>
</div>

<div class="divider"></div>

<!-- CUSTOMER INFO -->
<div class="info-line"><span>Receipt #</span><span>${sanitize(invNumber)}</span></div>
<div class="info-line"><span>Date / Time</span><span>${sanitize(invDate)} ${sanitize(printTime)}</span></div>
${invToken && invToken !== "—" ? `<div class="info-line"><span>Token #</span><span>${sanitize(invToken)}</span></div>` : ""}
<div class="info-line"><span>Customer</span><span>${sanitize(invCustomer)}</span></div>
${contactLine}
${invVehicle && invVehicle !== "—" ? `<div class="info-line"><span>Vehicle</span><span>${sanitize(invVehicle)}</span></div>` : ""}

<div class="divider"></div>

<!-- SERVICES & PRODUCTS -->
${svcHTML}
${prdHTML ? `<div style="height:1mm;"></div>${prdHTML}` : ""}

<!-- GRAND TOTAL -->
<div class="grand-box">
  <div class="grand-label">Grand Total</div>
  <div class="grand-value">${fmtRs(grandTotal)}</div>
</div>

<!-- PAYMENT -->
${paymentHTML}

<!-- STATUS -->
<div class="status-line">*** ${paymentStatus} ***</div>

<div class="divider-dash"></div>

<!-- FOOTER -->
<div class="rcpt-footer">
  <div class="rcpt-thanks">Thank You For Visiting</div>
  <div>We Appreciate Your Business</div>
  <div>Please Visit Again</div>
  <div class="rcpt-dev">Developed By<br>DESIGN ORBITS</div>
</div>

<div class="rcpt-time">Printed: ${sanitize(printDate)} ${sanitize(printTime)}</div>

</div></body></html>`;

  const oldFrame = document.getElementById("thermalPrintFrame");
  if (oldFrame) oldFrame.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "thermalPrintFrame";
  iframe.style.cssText = "position:fixed;top:0;left:0;width:80mm;height:100%;border:none;z-index:99999;background:#fff;visibility:hidden;";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(receiptHTML);
  iframeDoc.close();

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (e) {
        const pw = window.open("", "_blank", "width=320,height=600");
        if (pw) {
          pw.document.write(receiptHTML);
          pw.document.close();
          pw.focus();
          setTimeout(() => { pw.print(); pw.onafterprint = () => pw.close(); }, 300);
        } else {
          toast("Please allow pop-ups for printing", "error");
        }
      }
    }, 250);
  };

  window.addEventListener("afterprint", function cleanup() {
    setTimeout(() => {
      const f = document.getElementById("thermalPrintFrame");
      if (f) f.remove();
      window.removeEventListener("afterprint", cleanup);
    }, 500);
  }, { once: true });

  setTimeout(() => {
    const f = document.getElementById("thermalPrintFrame");
    if (f && !f.contentWindow.closed) f.remove();
  }, 30000);

  toast("Receipt printing...", "success");
}

// ==================== PRODUCT SALE ====================
function initProductSales() {
  qs("#addSaleProductBtn")?.addEventListener("click", addSaleProductRow);
  qs("#saveProductSaleBtn")?.addEventListener("click", saveProductSale);
  qs("#printProductSaleReceiptBtn")?.addEventListener(
    "click",
    printLastProductSaleReceipt,
  );
}
function addSaleProductRow() {
  const c = qs("#saleProductsContainer");
  if (!c) return;
  const opts = getAllVariantsFlat()
    .filter((v) => v.stock > 0)
    .map(
      (v) =>
        `<option value="${v.id}" data-price="${v.sellingPrice}" data-stock="${v.stock}">${sanitize(v.fullName)} | ${fmtPrice(v.sellingPrice)}</option>`,
    )
    .join("");
  const r = document.createElement("div");
  r.style.cssText =
    "display:grid;grid-template-columns:1fr 50px 75px 75px 28px;gap:5px;align-items:center;margin-bottom:6px;";
  r.innerHTML = `<select class="form-input sale-product-select" style="padding:5px 3px;font-size:0.7rem;"><option value="">Select</option>${opts}</select><input type="number" class="form-input sale-product-qty" value="1" min="1" style="padding:5px 2px;font-size:0.75rem;text-align:center;" /><input type="number" class="form-input sale-product-price" value="0" readonly style="padding:5px 2px;font-size:0.75rem;background:var(--surface-active);text-align:right;" /><span class="sale-product-subtotal" style="font-weight:600;font-size:0.78rem;text-align:right;">Rs. 0</span><button class="btn-icon btn btn-danger-ghost" onclick="this.closest('div').remove();updateSaleTotal();"><span class="material-icons">close</span></button>`;
  c.appendChild(r);
  const s = r.querySelector(".sale-product-select");
  s.addEventListener("change", function () {
    const o = this.options[this.selectedIndex];
    const pr = parseFloat(o?.dataset?.price) || 0;
    r.querySelector(".sale-product-price").value = pr;
    r.querySelector(".sale-product-qty").max = parseInt(o?.dataset?.stock) || 0;
    updateSaleTotal();
  });
  r.querySelector(".sale-product-qty").addEventListener(
    "input",
    updateSaleTotal,
  );
}
function updateSaleTotal() {
  let t = 0;
  qsa("#saleProductsContainer .sale-product-subtotal").forEach((el) => {
    t += parseInt(el.textContent.replace(/[^0-9]/g, "")) || 0;
  });
  setText("#saleGrandTotal", fmtPrice(t));
}
function saveProductSale() {
  const cu = (qs("#saleCustomerName")?.value || "").trim(),
    vn = (qs("#saleVehicleNo")?.value || "").trim();
  const items = [];
  qsa("#saleProductsContainer .sale-product-select").forEach((s, i) => {
    const vid = s.value;
    if (!vid) return;
    const f = findVariantById(vid);
    if (!f) return;
    const q =
      parseInt(qsa("#saleProductsContainer .sale-product-qty")[i]?.value) || 1;
    const p =
      parseFloat(qsa("#saleProductsContainer .sale-product-price")[i]?.value) ||
      f.variant.sellingPrice;
    items.push({ variantId: vid, fullName: f.fullName, qty: q, price: p });
  });
  if (!items.length) {
    toast("Add products", "error");
    return;
  }
  let t = 0;
  items.forEach((i) => (t += i.qty * i.price));
  items.forEach((i) => {
    const f = findVariantById(i.variantId);
    if (f) f.variant.stock = Math.max(0, f.variant.stock - i.qty);
  });
  saveInventory();
  STATE.productSales.push({
    id: uid(),
    customer: cu,
    vehicleNo: vn,
    items,
    total: t,
    date: fmtDate(),
    time: fmtTime(),
  });
  saveProductSales();
  const inv = {
    id: uid(),
    number:
      STATE.settings.invoicePrefix +
      String(STATE.counters.invoiceCounter).padStart(3, "0"),
    date: fmtDate(),
    time: fmtTime(),
    token: "",
    vehicle: vn,
    customer: cu || "Walk-in",
    contactNumber: "",
    items: items.map((i) => ({
      name: i.fullName,
      price: i.price,
      qty: i.qty,
      type: "product",
    })),
    subtotal: t,
    tax: 0,
    total: t,
    cashReceived: t,
    changeReturned: 0,
    status: "PAID",
  };
  STATE.invoices.push(inv);
  STATE.lastProductSaleInvoiceId = inv.id;
  STATE.counters.invoiceCounter++;
  saveInvoices();
  saveCounters();
  refreshDashboard();
  toast(`Sale completed - ${fmtPrice(t)}`, "success");
  qs("#saleProductsContainer").innerHTML = "";
  setValue("#saleCustomerName", "");
  setValue("#saleVehicleNo", "");
  setText("#saleGrandTotal", "Rs. 0");
  addSaleProductRow();
}
function printLastProductSaleReceipt() {
  if (STATE.lastProductSaleInvoiceId)
    printSavedReceipt(STATE.lastProductSaleInvoiceId);
  else if (STATE.invoices.length)
    printSavedReceipt(STATE.invoices[STATE.invoices.length - 1].id);
}
function renderProductSalePage() {
  setText("#saleGrandTotal", "Rs. 0");
  qs("#saleProductsContainer").innerHTML = "";
  addSaleProductRow();
}

// ==================== VEHICLES ====================
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
  const s = qs("#vehicleType");
  if (s) {
    s.innerHTML = '<option value="">Select</option>';
    STATE.pricingVehicles.forEach((v) => {
      const o = document.createElement("option");
      o.value = v.name;
      o.textContent = v.name;
      s.appendChild(o);
    });
  }
  setValue("#vehicleType", d ? d.type : "");
  setValue("#vehicleOwner", d ? d.owner : "");
  setValue("#vehicleContact", d ? d.contact : "");
  openModal("vehicleModal");
}
function saveVehicle() {
  const ei = qs("#vehicleEditId")?.value || "",
    vn = (qs("#vehicleNumber")?.value || "").trim().toUpperCase(),
    tp = qs("#vehicleType")?.value || "",
    ow = (qs("#vehicleOwner")?.value || "").trim(),
    ct = (qs("#vehicleContact")?.value || "").trim();
  if (!vn || !tp || !ow) return;
  if (ei) {
    const v = STATE.vehicles.find((v) => v.id === ei);
    if (v)
      Object.assign(v, { vehicleNo: vn, type: tp, owner: ow, contact: ct });
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
      notes: "",
      visits: 0,
      lastService: "—",
    });
  }
  saveVehicles();
  closeModal("vehicleModal");
  renderVehicleTable();
}
function renderVehicleTable() {
  const fl = STATE.vehicles.filter((v) => {
    const sr = (qs("#vehicleSearch")?.value || "").toLowerCase(),
      tf = (qs("#vehicleTypeFilter")?.value || "").toLowerCase();
    return (
      (!sr ||
        v.vehicleNo.toLowerCase().includes(sr) ||
        v.owner.toLowerCase().includes(sr)) &&
      (!tf || v.type.toLowerCase() === tf)
    );
  });
  const tb = qs("#vehicleTableBody");
  if (!tb) return;
  qs("#vehicleCountBadge").textContent = `${fl.length} vehicles`;
  if (!fl.length) {
    tb.innerHTML = '<tr><td colspan="7">No vehicles</td></tr>';
    return;
  }
  tb.innerHTML = fl
    .map(
      (v) =>
        `<tr><td><span class="table-vehicle-no">${sanitize(v.vehicleNo)}</span></td><td>${sanitize(v.owner)}</td><td><span class="contact-display">${sanitize(formatContactDisplay(v.contact || "N/A"))}</span></td><td><span class="badge badge--blue">${sanitize(v.type)}</span></td><td>${sanitize(v.lastService || "—")}</td><td>${v.visits || 0}</td><td><div class="table-actions"><button class="btn-icon btn btn-ghost" data-vehicle-edit="${v.id}"><span class="material-icons">edit</span></button><button class="btn-icon btn btn-danger-ghost" data-vehicle-delete="${v.id}"><span class="material-icons">delete</span></button></div></td></tr>`,
    )
    .join("");
}

// ==================== INVENTORY ====================
function initInventory() {
  qs("#addProductBtn")?.addEventListener("click", () => openProductModal());
  qs("#saveProductBtn")?.addEventListener("click", saveProduct);
  qs("#addVariantBtn")?.addEventListener("click", () => addVariantRow());
  qs("#stockInBtn")?.addEventListener("click", () =>
    openStockModal(null, "in"),
  );
  qs("#stockOutBtn")?.addEventListener("click", () =>
    openStockModal(null, "out"),
  );
  qs("#saveStockBtn")?.addEventListener("click", saveStock);
  qs("#inventorySearch")?.addEventListener("input", renderInventoryTable);
  qs("#inventoryCategoryFilter")?.addEventListener(
    "change",
    renderInventoryTable,
  );
  qs("#inventoryBrandFilter")?.addEventListener("change", renderInventoryTable);
  qs("#manageBrandsBtn")?.addEventListener("click", openBrandsModal);
  qs("#addBrandBtn")?.addEventListener("click", addBrand);
  qs("#manageCategoriesBtn")?.addEventListener("click", openCategoryModal);
  qs("#addCategoryBtn")?.addEventListener("click", addCategory);
  populateBrandDropdowns();
  populateCategoryDropdowns();
  renderInventoryTable();
}
let vc = 0;
function addVariantRow(data = null) {
  const c = qs("#variantsContainer");
  if (!c) return;
  vc++;
  const brands = STATE.brands
    .map(
      (b) =>
        `<option value="${b.name}" ${data?.brand === b.name ? "selected" : ""}>${sanitize(b.name)}</option>`,
    )
    .join("");
  const card = document.createElement("div");
  card.className = "variant-card";
  card.innerHTML = `<div class="variant-card-header"><span>Variant #${vc}</span><button class="btn-icon btn btn-danger-ghost" onclick="this.closest('.variant-card').remove()"><span class="material-icons">close</span></button></div><div class="variant-grid"><div class="variant-field"><label>Brand</label><select class="form-input variant-brand">${brands}</select></div><div class="variant-field"><label>Model</label><input type="text" class="form-input variant-model" value="${sanitize(data?.model || "")}" placeholder="e.g. HX3" /></div><div class="variant-field"><label>Grade</label><input type="text" class="form-input variant-grade" value="${sanitize(data?.grade || "")}" placeholder="e.g. 20W-50" /></div><div class="variant-field"><label>Size</label><input type="text" class="form-input variant-size" value="${sanitize(data?.size || "")}" placeholder="e.g. 3L" /></div><div class="variant-field"><label>Purchase Price</label><input type="number" class="form-input variant-purchase-price" value="${data?.purchasePrice || ""}" min="0" /></div><div class="variant-field"><label>Selling Price *</label><input type="number" class="form-input variant-selling-price" value="${data?.sellingPrice || ""}" min="0" /></div><div class="variant-field"><label>Stock *</label><input type="number" class="form-input variant-stock" value="${data?.stock || ""}" min="0" /></div><div class="variant-field"><label>Min Stock</label><input type="number" class="form-input variant-min-stock" value="${data?.minStock || "5"}" min="0" /></div><div class="variant-field"><label>SKU</label><input type="text" class="form-input variant-sku" value="${sanitize(data?.sku || "")}" placeholder="Auto" /></div></div>`;
  c.appendChild(card);
}
function openProductModal(d = null) {
  setValue("#productEditId", d ? d.id : "");
  setValue("#productName", d ? d.productType : "");
  populateCategoryDropdowns();
  setValue("#productCategory", d ? d.category : "misc");
  qs("#variantsContainer").innerHTML = "";
  vc = 0;
  if (d?.variants) d.variants.forEach((v) => addVariantRow(v));
  else addVariantRow();
  openModal("productModal");
}
function saveProduct() {
  const ei = qs("#productEditId")?.value || "";
  const pt = (qs("#productName")?.value || "").trim();
  const cat = qs("#productCategory")?.value || "misc";
  if (!pt) return;
  const variants = [];
  qsa("#variantsContainer .variant-card").forEach((card, idx) => {
    const b = card.querySelector(".variant-brand")?.value || "General",
      m = card.querySelector(".variant-model")?.value?.trim() || "Standard",
      g = card.querySelector(".variant-grade")?.value?.trim() || "",
      s = card.querySelector(".variant-size")?.value?.trim() || "",
      pp =
        parseFloat(card.querySelector(".variant-purchase-price")?.value) || 0,
      sp = parseFloat(card.querySelector(".variant-selling-price")?.value) || 0,
      st = parseInt(card.querySelector(".variant-stock")?.value) || 0,
      ms = parseInt(card.querySelector(".variant-min-stock")?.value) || 5;
    let sku = card.querySelector(".variant-sku")?.value?.trim() || "";
    if (!sp) {
      toast(`Variant #${idx + 1}: Enter price`, "error");
      return;
    }
    if (!sku) sku = generateVariantSKU(b, m, g, s, idx);
    variants.push({
      id: uid(),
      brand: b,
      model: m,
      grade: g,
      size: s,
      sku,
      purchasePrice: pp,
      sellingPrice: sp,
      stock: st,
      minStock: ms,
    });
  });
  if (!variants.length) return;
  if (ei) {
    const p = STATE.inventory.find((p) => p.id === ei);
    if (p) {
      p.productType = pt;
      p.category = cat;
      p.variants = variants;
    }
  } else {
    STATE.inventory.push({
      id: uid(),
      productType: pt,
      category: cat,
      variants,
    });
  }
  saveInventory();
  closeModal("productModal");
  renderInventoryTable();
  updateInventoryKPI();
  refreshDashboard();
}
function openStockModal(vid, tp = "in") {
  setValue("#stockQty", "");
  if (vid) {
    const f = findVariantById(vid);
    if (f) {
      setValue("#stockProductId", vid);
      setValue("#stockProductName", `${f.fullName} [SKU: ${f.variant.sku}]`);
    }
  } else {
    setValue("#stockProductId", "");
    setValue("#stockProductName", "Select from table");
  }
  qsa('input[name="stockType"]').forEach((r) => (r.checked = r.value === tp));
  openModal("stockModal");
}
function saveStock() {
  const vid = qs("#stockProductId")?.value || "",
    qt = parseInt(qs("#stockQty")?.value) || 0,
    tp =
      document.querySelector('input[name="stockType"]:checked')?.value || "in";
  if (!vid || !qt) return;
  const f = findVariantById(vid);
  if (!f) return;
  if (tp === "out" && qt > f.variant.stock) {
    toast(`Only ${f.variant.stock} available`, "error");
    return;
  }
  f.variant.stock = tp === "in" ? f.variant.stock + qt : f.variant.stock - qt;
  saveInventory();
  closeModal("stockModal");
  renderInventoryTable();
  updateInventoryKPI();
  refreshDashboard();
}
function updateInventoryKPI() {
  const all = getAllVariantsFlat();
  setText("#invTotalProducts", all.length);
  setText("#invLowStock", all.filter((v) => v.stock < v.minStock).length);
  setText(
    "#invValue",
    fmtPrice(all.reduce((s, v) => s + v.stock * (v.sellingPrice || 0), 0)),
  );
}
function renderInventoryTable() {
  const sr = (qs("#inventorySearch")?.value || "").toLowerCase(),
    cf = qs("#inventoryCategoryFilter")?.value || "",
    bf = qs("#inventoryBrandFilter")?.value || "";
  let all = getAllVariantsFlat().filter(
    (v) =>
      (!sr ||
        v.fullName.toLowerCase().includes(sr) ||
        v.sku.toLowerCase().includes(sr)) &&
      (!cf || v.category === cf) &&
      (!bf || v.brand === bf),
  );
  const tb = qs("#inventoryTableBody");
  if (!tb) return;
  updateInventoryKPI();
  qs("#productCountBadge").textContent = `${all.length} variants`;
  if (!all.length) {
    tb.innerHTML = '<tr><td colspan="9">No variants</td></tr>';
    return;
  }
  tb.innerHTML = all
    .map((v) => {
      const lo = v.stock < v.minStock;
      return `<tr><td><div style="font-weight:500;">${sanitize(v.productType)}</div><div style="font-size:0.7rem;color:var(--text-muted);">${sanitize(v.fullName)}</div></td><td><span class="badge badge--blue" style="font-size:0.6rem;">${sanitize(v.sku)}</span></td><td><span class="badge badge--gray">${sanitize(v.category || "Misc")}</span></td><td><span style="font-weight:700;color:${lo ? "var(--danger)" : "var(--success)"};">${v.stock}</span></td><td>${v.minStock}</td><td>${fmtPrice(v.purchasePrice)}</td><td style="font-weight:600;">${fmtPrice(v.sellingPrice)}</td><td>${lo ? '<span class="badge badge--red">Low</span>' : '<span class="badge badge--green">OK</span>'}</td><td><div class="table-actions"><button class="btn btn-sm btn-outline" data-stock-in="${v.id}">+</button><button class="btn btn-sm btn-ghost" data-stock-out="${v.id}">-</button><button class="btn-icon btn btn-danger-ghost" data-variant-delete="${v.id}"><span class="material-icons">delete</span></button></div></td></tr>`;
    })
    .join("");
}
function openBrandsModal() {
  renderBrandList();
  openModal("brandsModal");
}
function renderBrandList() {
  const c = qs("#brandList");
  if (!c) return;
  c.innerHTML = STATE.brands
    .map(
      (b) =>
        `<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>${sanitize(b.name)}</span>${b.id === "general" ? '<span class="badge badge--gray">Default</span>' : `<button class="btn-icon btn btn-danger-ghost" data-brand-delete="${b.id}"><span class="material-icons">close</span></button>`}</div>`,
    )
    .join("");
}
function addBrand() {
  const n = (qs("#newBrandName")?.value || "").trim();
  if (!n) return;
  STATE.brands.push({ id: uid(), name: n });
  saveBrands();
  populateBrandDropdowns();
  renderBrandList();
  setValue("#newBrandName", "");
}
function populateBrandDropdowns() {
  const el = qs("#inventoryBrandFilter");
  if (!el) return;
  el.innerHTML = '<option value="">All Brands</option>';
  STATE.brands.forEach((b) => {
    const o = document.createElement("option");
    o.value = b.name;
    o.textContent = b.name;
    el.appendChild(o);
  });
}
function populateCategoryDropdowns() {
  ["#inventoryCategoryFilter", "#productCategory"].forEach((sel) => {
    const el = qs(sel);
    if (!el) return;
    el.innerHTML =
      sel === "#inventoryCategoryFilter"
        ? '<option value="">All Categories</option>'
        : "";
    STATE.categories.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.name;
      el.appendChild(o);
    });
  });
}
function openCategoryModal() {
  renderCategoryList();
  openModal("categoryModal");
}
function renderCategoryList() {
  const c = qs("#categoryList");
  if (!c) return;
  c.innerHTML = STATE.categories
    .map(
      (cat) =>
        `<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>${sanitize(cat.name)}</span>${["oil", "filter", "coolant", "misc"].includes(cat.id) ? '<span class="badge badge--gray">Default</span>' : `<button class="btn-icon btn btn-danger-ghost" data-cat-delete="${cat.id}"><span class="material-icons">close</span></button>`}</div>`,
    )
    .join("");
}
function addCategory() {
  const n = (qs("#newCategoryName")?.value || "").trim();
  if (!n) return;
  STATE.categories.push({ id: uid(), name: n });
  saveCategories();
  populateCategoryDropdowns();
  renderCategoryList();
  setValue("#newCategoryName", "");
}

// ==================== REPORTS ====================
function initReports() {
  qs("#applyRptFilter")?.addEventListener("click", renderReports);
  qs("#resetRptFilter")?.addEventListener("click", resetReportFilters);
  qs("#downloadCSV")?.addEventListener("click", () => exportCSV("reports"));
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
  setText("#rptRevenue", fmtPrice(getTotalRevenue()));
  setText("#rptExpenses", fmtPrice(getTotalExpenses()));
  setText("#rptLabour", fmtPrice(getLabourCost()));
  setText("#rptProfit", fmtPrice(getTotalRevenue() - getAllExpensesTotal()));
  const rows = [];
  STATE.tokens.forEach((tk) => {
    if (tk.status === "completed") {
      rows.push({
        date: fmtDate(),
        type: "Revenue",
        cat: "Service",
        desc: `Token ${tk.number}`,
        amt: tk.servicePrice || 0,
        bal: "credit",
      });
      if (tk.products)
        tk.products.forEach((p) =>
          rows.push({
            date: fmtDate(),
            type: "Revenue",
            cat: "Product",
            desc: p.fullName || p.name,
            amt: p.price * p.qty,
            bal: "credit",
          }),
        );
    }
  });
  STATE.productSales.forEach((s) =>
    rows.push({
      date: s.date,
      type: "Revenue",
      cat: "Sale",
      desc: s.customer || "Walk-in",
      amt: s.total,
      bal: "credit",
    }),
  );
  STATE.expenses.forEach((e) =>
    rows.push({
      date: e.date,
      type: "Expense",
      cat: e.category,
      desc: e.title,
      amt: e.amount,
      bal: "debit",
    }),
  );
  rows.sort((a, b) => (parseDate(b.date) || 0) - (parseDate(a.date) || 0));
  const tb = qs("#reportTableBody");
  if (tb)
    tb.innerHTML = rows.length
      ? rows
          .map(
            (r) =>
              `<tr><td>${sanitize(r.date)}</td><td>${r.type}</td><td>${sanitize(r.cat)}</td><td>${sanitize(r.desc)}</td><td style="text-align:right;font-weight:700;">${r.bal === "credit" ? "+" : "-"} ${fmtPrice(r.amt)}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5">No transactions</td></tr>';
  const ss = {};
  STATE.tokens.forEach((t) => {
    if (t.status === "completed" && t.service) {
      if (!ss[t.service]) ss[t.service] = { count: 0, revenue: 0 };
      ss[t.service].count++;
      ss[t.service].revenue += t.servicePrice || 0;
    }
  });
  const sst = qs("#servicesSoldTableBody");
  if (sst) {
    const sd = Object.entries(ss).map(([n, s]) => ({ name: n, ...s }));
    sst.innerHTML = sd.length
      ? sd
          .sort((a, b) => b.count - a.count)
          .map(
            (d) =>
              `<tr><td>${sanitize(d.name)}</td><td>${d.count}x</td><td>${fmtPrice(d.revenue)}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="3">No services</td></tr>';
  }
  const ps = {};
  STATE.invoices.forEach((inv) => {
    inv.items
      .filter((i) => i.type === "product")
      .forEach((item) => {
        if (!ps[item.name]) ps[item.name] = { qty: 0, revenue: 0 };
        ps[item.name].qty += item.qty;
        ps[item.name].revenue += item.price * item.qty;
      });
  });
  const pst = qs("#productsSoldTableBody");
  if (pst) {
    const pd = Object.entries(ps).map(([n, s]) => ({ name: n, ...s }));
    pst.innerHTML = pd.length
      ? pd
          .sort((a, b) => b.qty - a.qty)
          .map(
            (d) =>
              `<tr><td>${sanitize(d.name)}</td><td>${d.qty}x</td><td>${fmtPrice(d.revenue)}</td></tr>`,
          )
          .join("")
      : '<tr><td colspan="3">No products</td></tr>';
  }
}

// ==================== EXPENSES ====================
function initExpenses() {
  qs("#addExpenseBtn")?.addEventListener("click", showExpenseForm);
  qs("#saveExpenseBtn")?.addEventListener("click", saveExpense);
  qs("#cancelExpenseBtn")?.addEventListener("click", hideExpenseForm);
  qs("#expenseSearch")?.addEventListener("input", renderExpenseTable);
  const di = qs("#expenseDate");
  if (di) di.value = toDateInputValue(new Date());
  hideExpenseForm();
  renderExpenses();
}
function showExpenseForm() {
  qs("#expenseFormCard").style.display = "";
  qs("#addExpenseBtn").style.display = "none";
  setValue("#expenseTitle", "");
  setValue("#expenseCategory", "");
  setValue("#expenseAmount", "");
}
function hideExpenseForm() {
  qs("#expenseFormCard").style.display = "none";
  qs("#addExpenseBtn").style.display = "";
}
function saveExpense() {
  const tl = (qs("#expenseTitle")?.value || "").trim(),
    ct = qs("#expenseCategory")?.value || "",
    am = parseFloat(qs("#expenseAmount")?.value) || 0;
  if (!tl || !ct || !am) return;
  STATE.expenses.push({
    id: uid(),
    title: tl,
    category: ct,
    amount: am,
    date: fmtDate(),
    time: fmtTime(),
  });
  saveExpenses();
  hideExpenseForm();
  renderExpenses();
  refreshDashboard();
}
function renderExpenses() {
  setText("#totalRevenueAmt", fmtPrice(getTotalRevenue()));
  setText("#totalExpenseAmt", fmtPrice(getTotalExpenses()));
  setText("#labourCostAmt", fmtPrice(getLabourCost()));
  setText("#netProfitAmt", fmtPrice(getTotalRevenue() - getAllExpensesTotal()));
  const fl = STATE.expenses.sort(
    (a, b) => (parseDate(b.date) || 0) - (parseDate(a.date) || 0),
  );
  const tb = qs("#expenseTableBody");
  if (tb)
    tb.innerHTML = fl.length
      ? fl
          .map(
            (e) =>
              `<tr><td>${sanitize(e.date)}</td><td>${sanitize(e.title)}</td><td>${sanitize(e.category)}</td><td style="font-weight:600;color:var(--danger);">${fmtPrice(e.amount)}</td><td><button class="btn-icon btn btn-danger-ghost" data-expense-del="${e.id}"><span class="material-icons">delete</span></button></td></tr>`,
          )
          .join("")
      : '<tr><td colspan="5">No expenses</td></tr>';
}

// ==================== SERVICES ====================
function initServices() {
  qs("#manageVehicleTypesBtn")?.addEventListener("click", () =>
    openModal("vehicleTypesModal"),
  );
  qs("#managePricingServicesBtn")?.addEventListener("click", () =>
    openModal("pricingServicesModal"),
  );
  qs("#addVehicleTypeBtn")?.addEventListener("click", addVehicleType);
  qs("#addPricingServiceBtn")?.addEventListener("click", addPricingService);
  renderVehicleTypeList();
  renderPricingServiceList();
}
function addVehicleType() {
  const n = (qs("#newVehicleTypeName")?.value || "").trim();
  if (!n) return;
  STATE.pricingVehicles.push({ id: uid(), name: n });
  savePricingVehicles();
  renderVehicleTypeList();
  renderPricingMatrix();
  setValue("#newVehicleTypeName", "");
}
function addPricingService() {
  const n = (qs("#newPricingServiceName")?.value || "").trim();
  if (!n) return;
  STATE.pricingServices.push({ id: uid(), name: n });
  savePricingServices();
  renderPricingServiceList();
  renderPricingMatrix();
  setValue("#newPricingServiceName", "");
}
function renderVehicleTypeList() {
  const c = qs("#vehicleTypeList");
  if (!c) return;
  c.innerHTML = STATE.pricingVehicles
    .map(
      (v) =>
        `<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>${sanitize(v.name)}</span><button class="btn-icon btn btn-danger-ghost" data-vtype-delete="${v.id}"><span class="material-icons">close</span></button></div>`,
    )
    .join("");
}
function renderPricingServiceList() {
  const c = qs("#pricingServiceList");
  if (!c) return;
  c.innerHTML = STATE.pricingServices
    .map(
      (s) =>
        `<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>${sanitize(s.name)}</span><button class="btn-icon btn btn-danger-ghost" data-psvc-delete="${s.id}"><span class="material-icons">close</span></button></div>`,
    )
    .join("");
}
function renderPricingMatrix() {
  const th = qs("#pricingMatrixHead"),
    tb = qs("#pricingMatrixBody");
  if (!th || !tb) return;
  const sv = STATE.pricingServices,
    vh = STATE.pricingVehicles;
  let ec = 0;
  Object.values(STATE.pricingMatrix).forEach((v) => {
    if (v > 0) ec++;
  });
  setText("#pricingServiceCount", sv.length);
  setText("#pricingVehicleCount", vh.length);
  setText("#pricingEntryCount", ec);
  if (!sv.length || !vh.length) {
    th.innerHTML = "<tr><th>Service / Vehicle</th></tr>";
    tb.innerHTML = "<tr><td>Add services and types</td></tr>";
    return;
  }
  th.innerHTML = `<tr><th>Service / Vehicle</th>${vh.map((v) => `<th>${sanitize(v.name)}</th>`).join("")}</tr>`;
  tb.innerHTML = sv
    .map(
      (s) =>
        `<tr><td>${sanitize(s.name)}</td>${vh
          .map((v) => {
            const k = `${s.name}__${v.name}`;
            const p = STATE.pricingMatrix[k] || 0;
            return `<td style="cursor:pointer" data-pkey="${k}"><span style="font-weight:700;">${p > 0 ? fmtPrice(p) : "—"}</span></td>`;
          })
          .join("")}</tr>`,
    )
    .join("");
  tb.querySelectorAll("[data-pkey]").forEach((cell) =>
    cell.addEventListener("click", function () {
      const k = this.dataset.pkey;
      const cp = STATE.pricingMatrix[k] || 0;
      const np = prompt("Set price:", cp);
      if (np === null) return;
      const pr = parseInt(np);
      if (isNaN(pr) || pr < 0) return;
      if (pr === 0) delete STATE.pricingMatrix[k];
      else STATE.pricingMatrix[k] = pr;
      savePricingMatrix();
      renderPricingMatrix();
    }),
  );
}

// ==================== IMPORT/EXPORT ====================
function initImportExport() {
  qs("#exportJSONBtn")?.addEventListener("click", () => exportJSON());
  qs("#exportCSVBtn")?.addEventListener("click", () => exportCSV());
  qs("#exportPDFBtn")?.addEventListener("click", () => exportPDF());
  qs("#importDataBtn2")?.addEventListener("click", () => importFile());
  qs("#quickBackupBtn")?.addEventListener("click", () => quickBackup());
  qs("#quickRestoreBtn")?.addEventListener("click", () => quickRestore());
  qs("#confirmImportBtn")?.addEventListener("click", () => confirmImport());
}
function getModuleData(mod) {
  switch (mod) {
    case "all":
      return {
        inventory: STATE.inventory,
        tokens: STATE.tokens,
        vehicles: STATE.vehicles,
        invoices: STATE.invoices,
        expenses: STATE.expenses,
        reminders: STATE.reminders,
        productSales: STATE.productSales,
        pricingMatrix: STATE.pricingMatrix,
        categories: STATE.categories,
        brands: STATE.brands,
        settings: STATE.settings,
        version: "6.0",
      };
    case "inventory":
      return STATE.inventory;
    case "tokens":
      return STATE.tokens;
    case "vehicles":
      return STATE.vehicles;
    case "invoices":
      return STATE.invoices;
    case "expenses":
      return STATE.expenses;
    case "reminders":
      return STATE.reminders;
    case "productSales":
      return STATE.productSales;
    default:
      return {};
  }
}
function exportJSON() {
  const m = qs("#exportModule")?.value || "all";
  const d = getModuleData(m);
  const b = new Blob([JSON.stringify(d, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = `${m}_${fmtDate()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Exported JSON", "success");
}
function exportCSV(mo) {
  const m = mo || qs("#exportModule")?.value || "all";
  let csv = "";
  const esc = (v) => `"${String(v || "").replace(/"/g, '""')}"`;
  if (m === "all" || m === "inventory") {
    csv +=
      "Product Type,Brand,Model,Grade,Size,SKU,Purchase Price,Selling Price,Stock,Min Stock\n";
    getAllVariantsFlat().forEach((v) => {
      csv += `${esc(v.productType)},${esc(v.brand)},${esc(v.model)},${esc(v.grade)},${esc(v.size)},${esc(v.sku)},${v.purchasePrice},${v.sellingPrice},${v.stock},${v.minStock}\n`;
    });
  }
  if (m === "all" || m === "tokens") {
    if (csv) csv += "\n";
    csv += "Token,Vehicle No,Type,Customer,Contact,Service,Status,Time\n";
    STATE.tokens.forEach((t) => {
      csv += `${esc(t.number)},${esc(t.vehicleNo)},${esc(t.vehicleType)},${esc(t.ownerName)},${esc(t.contactNumber)},${esc(t.service)},${t.status},${t.time}\n`;
    });
  }
  const b = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = `${m}_${fmtDate()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Exported CSV", "success");
}
function exportPDF() {
  const m = qs("#exportModule")?.value || "all";
  let h = `<html><head><meta charset="UTF-8"><style>body{font-family:Arial;padding:20px;font-size:11px}h1{font-size:16px;text-align:center}h2{font-size:13px}table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}th{background:#2563eb;color:#fff;padding:5px}td{padding:4px;border-bottom:1px solid #ddd}</style></head><body><h1>${sanitize(STATE.settings.businessName)}</h1><h2>${m.toUpperCase()} Report - ${fmtDate()}</h2>`;
  if (m === "all" || m === "inventory") {
    h +=
      "<h2>Inventory</h2><table><tr><th>Product</th><th>Brand</th><th>Model</th><th>SKU</th><th>Stock</th><th>Price</th></tr>";
    getAllVariantsFlat().forEach((v) => {
      h += `<tr><td>${sanitize(v.productType)}</td><td>${sanitize(v.brand)}</td><td>${sanitize(v.model)}</td><td>${sanitize(v.sku)}</td><td>${v.stock}</td><td>${fmtPrice(v.sellingPrice)}</td></tr>`;
    });
    h += "</table>";
  }
  if (m === "all" || m === "tokens") {
    h +=
      "<h2>Tokens</h2><table><tr><th>Token</th><th>Vehicle</th><th>Customer</th><th>Contact</th><th>Service</th><th>Status</th></tr>";
    STATE.tokens.forEach((t) => {
      h += `<tr><td>${sanitize(t.number)}</td><td>${sanitize(t.vehicleNo)}</td><td>${sanitize(t.ownerName || "")}</td><td>${sanitize(formatContactDisplay(t.contactNumber || ""))}</td><td>${sanitize(t.service)}</td><td>${t.status}</td></tr>`;
    });
    h += "</table>";
  }
  h += "</body></html>";
  const pw = window.open("", "_blank");
  if (pw) {
    pw.document.write(h);
    pw.document.close();
    setTimeout(() => pw.print(), 500);
  }
}
function quickBackup() {
  const d = getModuleData("all");
  const b = new Blob([JSON.stringify(d, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = `full_backup_${fmtDate()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Backup downloaded!", "success");
}
function quickRestore() {
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
        confirm(
          "Restore all data?",
          () => {
            if (d.inventory) {
              STATE.inventory = d.inventory;
              saveInventory();
            }
            if (d.tokens) {
              STATE.tokens = d.tokens;
              saveTokens();
            }
            if (d.vehicles) {
              STATE.vehicles = d.vehicles;
              saveVehicles();
            }
            if (d.invoices) {
              STATE.invoices = d.invoices;
              saveInvoices();
            }
            if (d.expenses) {
              STATE.expenses = d.expenses;
              saveExpenses();
            }
            if (d.reminders) {
              STATE.reminders = d.reminders;
              saveReminders();
            }
            if (d.settings) {
              STATE.settings = d.settings;
              saveSettings();
              updateAllBrandNames();
            }
            toast("Restored!", "success");
            setTimeout(() => location.reload(), 1000);
          },
          "Restore",
        );
      } catch {
        toast("Invalid file", "error");
      }
    };
    r.readAsText(f);
  });
  inp.click();
}
function importFile() {
  const m = qs("#importModule")?.value || "inventory";
  const fmt = qs("#importFormat")?.value || "json";
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = fmt === "json" ? ".json" : ".csv";
  inp.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        let d;
        if (fmt === "json") {
          d = JSON.parse(ev.target.result);
          if (!Array.isArray(d)) d = d.inventory || [];
        } else {
          const lines = ev.target.result.split("\n").filter((l) => l.trim());
          if (lines.length < 2) return;
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/"/g, ""));
          d = [];
          for (let i = 1; i < lines.length; i++) {
            const vals = lines[i]
              .split(",")
              .map((v) => v.trim().replace(/"/g, ""));
            const obj = {};
            headers.forEach((h, idx) => {
              obj[h] = vals[idx] || "";
            });
            d.push(obj);
          }
        }
        previewImport(m, d);
      } catch {
        toast("Invalid file", "error");
      }
    };
    r.readAsText(f);
  });
  inp.click();
}
function previewImport(m, d) {
  if (!Array.isArray(d)) d = [d];
  setText("#importAddCount", d.length);
  setText("#importUpdateCount", 0);
  setText("#importSkipCount", 0);
  const el = qs("#importPreviewContent");
  if (el && d.length > 0) {
    const keys = Object.keys(d[0]).slice(0, 8);
    let h = '<table class="import-preview-table"><thead><tr>';
    keys.forEach((k) => {
      h += `<th>${sanitize(k)}</th>`;
    });
    h += "</tr></thead><tbody>";
    d.slice(0, 10).forEach((row) => {
      h += "<tr>";
      keys.forEach((k) => {
        h += `<td>${sanitize(String(row[k] || ""))}</td>`;
      });
      h += "</tr>";
    });
    h += "</tbody></table>";
    el.innerHTML = h;
  }
  STATE.pendingImport = { module: m, data: d };
  qs("#importPreview").style.display = "block";
  openModal("importPreviewModal");
}
function confirmImport() {
  if (!STATE.pendingImport) return;
  const { module: m, data: d } = STATE.pendingImport;
  if (m === "inventory") {
    d.forEach((item) => {
      const pn = item["Product Type"] || item.productType || "Product";
      const b = item["Brand"] || item.brand || "General";
      const md = item["Model"] || item.model || "Standard";
      const g = item["Grade"] || item.grade || "";
      const s = item["Size"] || item.size || "";
      const sku =
        item["SKU"] ||
        item.sku ||
        generateVariantSKU(b, md, g, s, STATE.inventory.length);
      const sp = parseFloat(item["Selling Price"] || item.sellingPrice || 0);
      const pp = parseFloat(item["Purchase Price"] || item.purchasePrice || 0);
      const st = parseInt(item["Stock"] || item.stock || 0);
      const ms = parseInt(item["Min Stock"] || item.minStock || 5);
      const ep = STATE.inventory.find((p) => p.productType === pn);
      if (ep)
        ep.variants.push({
          id: uid(),
          brand: b,
          model: md,
          grade: g,
          size: s,
          sku,
          purchasePrice: pp,
          sellingPrice: sp,
          stock: st,
          minStock: ms,
        });
      else
        STATE.inventory.push({
          id: uid(),
          productType: pn,
          category: "misc",
          variants: [
            {
              id: uid(),
              brand: b,
              model: md,
              grade: g,
              size: s,
              sku,
              purchasePrice: pp,
              sellingPrice: sp,
              stock: st,
              minStock: ms,
            },
          ],
        });
    });
    saveInventory();
  }
  if (m === "tokens") {
    d.forEach((item) => {
      STATE.tokens.push({
        id: uid(),
        number: item["Token"] || generateTokenNumber(),
        vehicleNo: item["Vehicle No"] || "",
        vehicleType: item["Type"] || "",
        ownerName: item["Customer"] || "",
        contactNumber: item["Contact"] || "",
        service: item["Service"] || "",
        servicePrice: 0,
        products: [],
        time: fmtTime(),
        status: "waiting",
      });
    });
    saveTokens();
  }
  STATE.pendingImport = null;
  closeModal("importPreviewModal");
  toast(`${d.length} records imported!`, "success");
  renderInventoryTable();
  renderTokenTable();
  refreshDashboard();
}

// ==================== SETTINGS ====================
function initSettings() {
  qs("#saveBusinessSettings")?.addEventListener("click", () => {
    STATE.settings.businessName =
      qs("#settingBusinessName")?.value?.trim() || STATE.settings.businessName;
    STATE.settings.address =
      qs("#settingAddress")?.value?.trim() || STATE.settings.address;
    STATE.settings.phone =
      qs("#settingPhone")?.value?.trim() || STATE.settings.phone;
    saveSettings();
    updateAllBrandNames();
    setLoginBrandName();
  });
  qs("#saveInvoiceSettings")?.addEventListener("click", () => {
    STATE.settings.invoicePrefix =
      qs("#settingInvPrefix")?.value?.trim() || "INV-";
    STATE.settings.taxRate = parseFloat(qs("#settingTaxRate")?.value) || 0;
    saveSettings();
  });
  qs("#changePasswordBtn")?.addEventListener("click", () => {
    const cp = qs("#currentPassword")?.value || "",
      np = qs("#newPassword")?.value || "",
      cf = qs("#confirmPassword")?.value || "";
    if (!cp || !np || np.length < 6 || np !== cf) return;
    if (cp !== (localStorage.getItem(KEYS.password) || "admin123")) {
      toast("Wrong password", "error");
      return;
    }
    localStorage.setItem(KEYS.password, np);
    toast("Updated!", "success");
  });
  qs("#resetCountersBtn")?.addEventListener("click", () => {
    confirm(
      "Reset?",
      () => {
        STATE.counters = { invoiceCounter: 1 };
        saveCounters();
      },
      "Reset",
    );
  });
  qs("#clearDataBtn")?.addEventListener("click", () => {
    confirm(
      "DELETE ALL?",
      () => {
        Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
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
}

// ==================== BOOT ====================
document.addEventListener("DOMContentLoaded", function () {
  setLoginBrandName();
  initLogin();
});
