/**
 * Wheel Works Service Station — Enterprise Management System V6.2
 * DUAL BUSINESS SUPPORT: Wheel Works & Meta Built
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
  businesses: "servicepro_businesses",
  currentBusiness: "servicepro_current_business",
  vendorPayments: "servicepro_vendor_payments",
  vendors: "servicepro_vendors",
  purchaseOrders: "servicepro_purchase_orders",
};

function getBusinesses() {
  try {
    return (
      JSON.parse(localStorage.getItem(KEYS.businesses)) ||
      getDefaultBusinesses()
    );
  } catch (e) {
    return getDefaultBusinesses();
  }
}
function getDefaultBusinesses() {
  return [
    {
      id: "wheelworks",
      name: "Wheel Works Service station",
      address: "Main Road, City",
      phone: "0300-0000000",
      email: "info@wheelworks.pk",
      prefix: "WW",
      active: true,
    },
    {
      id: "metabuilt",
      name: "Metabuilt Solutions",
      address: "Second Branch, City",
      phone: "0300-0000001",
      email: "info@metabuilt.pk",
      prefix: "MB",
      active: true,
    },
  ];
}
function saveBusinesses(data) {
  try {
    localStorage.setItem(KEYS.businesses, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}
function getCurrentBusiness() {
  try {
    var id = localStorage.getItem(KEYS.currentBusiness);
    if (id) {
      var businesses = getBusinesses();
      var biz = businesses.find(function (b) {
        return b.id === id;
      });
      if (biz) return biz;
    }
    var businesses = getBusinesses();
    var def = businesses.find(function (b) {
      return b.active;
    });
    if (def) {
      setCurrentBusiness(def.id);
      return def;
    }
    return businesses[0];
  } catch (e) {
    return getBusinesses()[0];
  }
}
function setCurrentBusiness(id) {
  try {
    localStorage.setItem(KEYS.currentBusiness, id);
  } catch (e) {}
}
function getCurrentBusinessPrefix() {
  var biz = getCurrentBusiness();
  return biz ? biz.prefix : "WW";
}

if (!localStorage.getItem(KEYS.businesses)) {
  saveBusinesses(getDefaultBusinesses());
}
if (!localStorage.getItem(KEYS.currentBusiness)) {
  setCurrentBusiness("wheelworks");
}

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
  var today = new Date();
  var ds =
    today.getFullYear() +
    "" +
    String(today.getMonth() + 1).padStart(2, "0") +
    String(today.getDate()).padStart(2, "0");
  var prefix = getCurrentBusinessPrefix();
  var bizTokens = STATE.tokens.filter(function (t) {
    return (
      t.businessPrefix === prefix &&
      t.number &&
      t.number.startsWith(prefix + "-" + ds)
    );
  });
  return (
    prefix + "-" + ds + "-" + String(bizTokens.length + 1).padStart(3, "0")
  );
}

function migrateAllInventory() {
  if (localStorage.getItem(KEYS.inventoryMigratedFinal)) return;
  var all = [];
  var v3 = JSON.parse(localStorage.getItem("servicepro_inventory_v3")) || [];
  var v2 = JSON.parse(localStorage.getItem("servicepro_inventory_v2")) || [];
  var v1 = JSON.parse(localStorage.getItem("servicepro_inventory")) || [];
  var brands = JSON.parse(localStorage.getItem(KEYS.brands)) || [];
  var src = v3.length > 0 ? v3 : v2.length > 0 ? v2 : v1;
  src.forEach(function (p, i) {
    var bn = p.brand || "General";
    if (
      !brands.find(function (b) {
        return b.name === bn;
      })
    )
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
  var b = brand.replace(/\s+/g, "").substring(0, 3).toUpperCase();
  var m = (model || "STD").replace(/\s+/g, "").substring(0, 4).toUpperCase();
  var g = (grade || "").replace(/\s+/g, "").substring(0, 5).toUpperCase();
  var s = (size || "").replace(/\s+/g, "").substring(0, 4).toUpperCase();
  return (
    b +
    "-" +
    m +
    (g ? "-" + g : "") +
    (s ? "-" + s : "") +
    "-" +
    String(index + 1).padStart(3, "0")
  );
}
migrateAllInventory();

var STATE = {
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
    invoiceCounterWW: 1,
    invoiceCounterMB: 1,
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
  vendorPayments: JSON.parse(localStorage.getItem(KEYS.vendorPayments)) || [],
  vendors: JSON.parse(localStorage.getItem(KEYS.vendors)) || [],
  purchaseOrders: JSON.parse(localStorage.getItem(KEYS.purchaseOrders)) || [],
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
function saveVendorPayments() {
  persist(KEYS.vendorPayments, STATE.vendorPayments);
}
function saveVendors() {
  persist(KEYS.vendors, STATE.vendors);
}
function savePurchaseOrders() {
  persist(KEYS.purchaseOrders, STATE.purchaseOrders);
}

function uid() {
  return (
    "_" + Math.random().toString(36).substr(2, 9) + Date.now().toString(36)
  );
}
function fmtTime(d) {
  d = d || new Date();
  try {
    return d.toLocaleTimeString("en-PK", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (e) {
    return d.toLocaleTimeString();
  }
}
function fmtDate(d) {
  d = d || new Date();
  var m = [
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
  return (
    String(d.getDate()).padStart(2, "0") +
    "-" +
    m[d.getMonth()] +
    "-" +
    d.getFullYear()
  );
}
function parseDate(s) {
  if (!s) return null;
  var months = {
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
  var p = s.split("-");
  if (p.length !== 3) return null;
  return new Date(parseInt(p[2]), months[p[1]], parseInt(p[0]));
}
function toDateInputValue(d) {
  d = d || new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}
function fmtPrice(n) {
  return "Rs. " + (Number(n) || 0).toLocaleString("en-PK");
}
function qs(s, c) {
  return (c || document).querySelector(s);
}
function qsa(s, c) {
  return Array.from((c || document).querySelectorAll(s));
}
function sanitize(s) {
  if (s == null) return "";
  var d = document.createElement("div");
  d.textContent = String(s);
  return d.innerHTML;
}
function setValue(s, v) {
  var e = qs(s);
  if (e) e.value = v;
}
function setText(s, v) {
  var e = qs(s);
  if (e) e.textContent = v;
}
function setHTML(s, v) {
  var e = qs(s);
  if (e) e.innerHTML = v;
}
function toast(m, t) {
  t = t || "info";
  var c = qs("#toastContainer");
  if (!c) return;
  var icons = {
    success: "check_circle",
    error: "error",
    warning: "warning",
    info: "info",
  };
  var e = document.createElement("div");
  e.className = "toast toast--" + t;
  e.innerHTML =
    '<span class="material-icons">' +
    (icons[t] || "info") +
    "</span><span>" +
    sanitize(m) +
    "</span>";
  c.appendChild(e);
  setTimeout(function () {
    e.style.animation = "toastOut 0.3s ease forwards";
    setTimeout(function () {
      e.remove();
    }, 300);
  }, 3200);
}

function openModal(id) {
  var m = qs("#" + id);
  if (m) {
    m.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }
}
function closeModal(id) {
  var m = qs("#" + id);
  if (m) {
    m.classList.add("hidden");
    document.body.style.overflow = "";
  }
}
function setupModalClosers() {
  document.addEventListener("click", function (e) {
    var cb = e.target.closest("[data-close]");
    if (cb) {
      closeModal(cb.getAttribute("data-close"));
      return;
    }
    if (e.target.classList.contains("modal-overlay")) {
      closeModal(e.target.id);
      return;
    }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      var om = qsa(".modal-overlay:not(.hidden)");
      if (om.length > 0) closeModal(om[om.length - 1].id);
    }
  });
}
function confirm(m, fn, l) {
  l = l || "Delete";
  setText("#confirmMessage", m);
  setHTML(
    "#confirmActionBtn",
    '<span class="material-icons">delete</span> ' + l,
  );
  STATE.confirmCallback = fn;
  openModal("confirmModal");
}
function setLoginBrandName() {
  var s = JSON.parse(localStorage.getItem(KEYS.settings));
  var lb = document.getElementById("loginBrandName");
  if (lb)
    lb.textContent =
      s && s.businessName ? s.businessName : "Wheel Works Service Station";
}

function getVariantDisplayName(v) {
  if (!v) return "Unknown";
  var n = "";
  if (v.brand && v.brand !== "General") n += v.brand + " ";
  if (v.model && v.model !== "Standard") n += v.model + " ";
  if (v.grade) n += v.grade + " ";
  if (v.size) n += v.size;
  return n.trim() || "Product";
}
function getFullProductName(p, v) {
  var n = p.productType || p.name || "Product";
  var vn = getVariantDisplayName(v);
  if (vn) n += " - " + vn;
  return n;
}
function getAllVariantsFlat() {
  var f = [];
  STATE.inventory.forEach(function (p) {
    (p.variants || []).forEach(function (v) {
      f.push({
        id: v.id,
        brand: v.brand,
        model: v.model,
        grade: v.grade,
        size: v.size,
        sku: v.sku,
        purchasePrice: v.purchasePrice,
        sellingPrice: v.sellingPrice,
        stock: v.stock,
        minStock: v.minStock,
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
  for (var i = 0; i < STATE.inventory.length; i++) {
    var p = STATE.inventory[i];
    var v = (p.variants || []).find(function (v) {
      return v.id === vid;
    });
    if (v)
      return { product: p, variant: v, fullName: getFullProductName(p, v) };
  }
  return null;
}
function getLowStockCount() {
  var c = 0;
  STATE.inventory.forEach(function (p) {
    (p.variants || []).forEach(function (v) {
      if (v.stock < v.minStock) c++;
    });
  });
  return c;
}

function validateContactNumber(phone) {
  if (!phone || phone.trim() === "")
    return {
      valid: false,
      formatted: "",
      message: "Contact number is required",
    };
  var c = phone.replace(/[\s\-\(\)]/g, "").trim();
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
  var c = phone.replace(/[\s\-\(\)]/g, "").trim();
  if (c.startsWith("+923") && c.length === 13)
    return c.substring(0, 3) + " " + c.substring(3, 6) + " " + c.substring(6);
  if (c.startsWith("03") && c.length === 11)
    return c.substring(0, 4) + "-" + c.substring(4);
  return phone;
}
function getWhatsAppNumber(phone) {
  if (!phone || phone === "N/A") return null;
  var c = phone.replace(/[\s\-\(\)\+]/g, "").trim();
  if (c.startsWith("92") && c.length === 12) return c;
  if (c.startsWith("03") && c.length === 11) return "92" + c.substring(1);
  return c;
}
// function openWhatsApp(phone, cn, vn, svc, sd) {
//   var wa = getWhatsAppNumber(phone);
//   if (!wa) {
//     toast("Invalid phone", "error");
//     return;
//   }
//   var biz = getCurrentBusiness();
//   var allBizNames = "Wheel Works. Service station & Metabuilt Solutions";

//   var msg =
//     "Assalamualaikum " +
//     cn +
//     "\n\n" +
//     "Friendly reminder from " +
//     allBizNames +
//     "\n\n" +
//     "Vehicle: " +
//     vn +
//     "\n" +
//     "Service: " +
//     svc +
//     "\n" +
//     "Date: " +
//     sd +
//     "\n\n" +
//     "Visit us:\n" +
//     biz.address +
//     "\n" +
//     biz.phone +
//     "\n\n" +
//     allBizNames;

//   var url = "https://wa.me/" + wa + "?text=" + encodeURIComponent(msg);
//   window.open(url, "_blank");
// }
function createReminderFromToken(token) {
  if (!token.contactNumber || token.contactNumber === "N/A") return;
  var rd = getReminderDays(token.service);
  var dd = new Date();
  dd.setDate(dd.getDate() + rd);
  var ex = STATE.reminders.find(function (r) {
    return r.tokenId === token.id;
  });
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
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  STATE.reminders.forEach(function (r) {
    if (r.status === "completed") return;
    var dd = parseDate(r.dueDate);
    if (!dd) return;
    dd.setHours(0, 0, 0, 0);
    var diff = Math.ceil((dd.getTime() - today.getTime()) / 86400000);
    r.status = diff < 0 ? "overdue" : diff === 0 ? "due-today" : "upcoming";
    r.daysRemaining = diff;
  });
  saveReminders();
}
function getReminderStats() {
  updateReminderStatuses();
  var s = {
    dueToday: 0,
    overdue: 0,
    upcoming: 0,
    completed: 0,
    upcomingWeek: 0,
  };
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  STATE.reminders.forEach(function (r) {
    if (r.status === "completed") s.completed++;
    else if (r.status === "due-today") s.dueToday++;
    else if (r.status === "overdue") s.overdue++;
    else if (r.status === "upcoming") {
      var dd = parseDate(r.dueDate);
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
  qs("#markAllCompletedBtn")?.addEventListener("click", function () {
    confirm("Mark all as completed?", function () {
      STATE.reminders.forEach(function (r) {
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
  var sr = (qs("#reminderSearch")?.value || "").toLowerCase();
  var sf = qs("#reminderStatusFilter")?.value || "";
  var fl = STATE.reminders.filter(function (r) {
    var ms =
      !sr ||
      r.customerName.toLowerCase().includes(sr) ||
      r.phone.includes(sr) ||
      r.vehicleNo.toLowerCase().includes(sr) ||
      r.service.toLowerCase().includes(sr);
    return ms && (!sf || r.status === sf);
  });
  fl.sort(function (a, b) {
    return (
      (parseDate(a.dueDate) || new Date()) -
      (parseDate(b.dueDate) || new Date())
    );
  });
  var tb = qs("#reminderTableBody");
  if (!tb) return;
  var bg = qs("#reminderCountBadge");
  if (bg) bg.textContent = fl.length;
  var stats = getReminderStats();
  setText("#remDueToday", stats.dueToday);
  setText("#remOverdue", stats.overdue);
  setText("#remUpcoming", stats.upcomingWeek);
  setText("#remCompleted", stats.completed);
  var badge = qs("#reminderBadge");
  if (badge) {
    var a = stats.dueToday + stats.overdue;
    badge.textContent = a;
    badge.classList.toggle("hidden", a === 0);
  }
  if (!fl.length) {
    tb.innerHTML =
      '<tr><td colspan="9" style="text-align:center;padding:3rem;">No reminders</td></tr>';
    return;
  }
  tb.innerHTML = fl
    .map(function (r) {
      var sc =
        r.status === "overdue"
          ? "badge--red"
          : r.status === "due-today"
            ? "badge--orange"
            : r.status === "completed"
              ? "badge--green"
              : "badge--blue";
      var sl =
        r.status === "due-today"
          ? "Due Today"
          : r.status === "overdue"
            ? "Overdue"
            : r.status === "completed"
              ? "Completed"
              : "Upcoming";
      var dr =
        r.daysRemaining !== undefined
          ? r.daysRemaining < 0
            ? Math.abs(r.daysRemaining) + "d ago"
            : r.daysRemaining === 0
              ? "Today"
              : r.daysRemaining + "d left"
          : "—";
      return (
        "<tr><td>" +
        sanitize(r.customerName) +
        '</td><td><span class="contact-display">' +
        sanitize(formatContactDisplay(r.phone)) +
        '</span></td><td><span class="table-vehicle-no">' +
        sanitize(r.vehicleNo) +
        "</span></td><td>" +
        sanitize(r.service) +
        "</td><td>" +
        sanitize(r.serviceDate) +
        "</td><td>" +
        sanitize(r.dueDate) +
        '</td><td style="font-weight:600;color:' +
        (r.status === "overdue"
          ? "var(--danger)"
          : r.status === "due-today"
            ? "var(--warning)"
            : "var(--text)") +
        ';">' +
        dr +
        '</td><td><span class="badge ' +
        sc +
        '">' +
        sl +
        '</span></td><td><div class="table-actions"><button class="btn btn-sm btn-primary whatsapp-btn" data-wa="' +
        r.id +
        '">WhatsApp</button>' +
        (r.status !== "completed"
          ? '<button class="btn btn-sm btn-outline" data-cr="' +
            r.id +
            '">Done</button>'
          : "") +
        '<button class="btn-icon btn btn-danger-ghost" data-dr="' +
        r.id +
        '"><span class="material-icons">delete</span></button></div></td></tr>'
      );
    })
    .join("");
}

// ==================== SESSION MANAGEMENT ====================
var SESSION_TIMEOUT = 10 * 60 * 1000;
var sessionTimer = null;

function checkLoginSession() {
  var lastActivity = sessionStorage.getItem("servicepro_last_activity");
  var loggedIn = sessionStorage.getItem("servicepro_logged_in");
  if (loggedIn === "true" && lastActivity) {
    var now = new Date().getTime();
    var diff = now - parseInt(lastActivity);
    if (diff < SESSION_TIMEOUT) {
      qs("#loginScreen").classList.add("hidden");
      qs("#app").classList.remove("hidden");
      updateLastActivity();
      initApp();
      return true;
    } else {
      logoutSession();
    }
  }
  return false;
}
function updateLastActivity() {
  if (sessionStorage.getItem("servicepro_logged_in") !== "true") return;
  sessionStorage.setItem("servicepro_last_activity", new Date().getTime());
  resetSessionTimer();
}
function resetSessionTimer() {
  if (sessionTimer) clearTimeout(sessionTimer);
  sessionTimer = setTimeout(function () {
    logoutSession();
    toast("Session expired due to inactivity", "warning");
  }, SESSION_TIMEOUT);
}
function logoutSession() {
  sessionStorage.removeItem("servicepro_logged_in");
  sessionStorage.removeItem("servicepro_last_activity");
  if (sessionTimer) clearTimeout(sessionTimer);
  qs("#app").classList.add("hidden");
  qs("#loginScreen").classList.remove("hidden");
  setValue("#loginUsername", "");
  setValue("#loginPassword", "");
}
document.addEventListener("click", function () {
  updateLastActivity();
});
document.addEventListener("keydown", function () {
  updateLastActivity();
});
document.addEventListener("scroll", function () {
  updateLastActivity();
});
document.addEventListener("mousemove", function () {
  if (sessionStorage.getItem("servicepro_logged_in") !== "true") return;
  var now = new Date().getTime();
  var last = parseInt(
    sessionStorage.getItem("servicepro_last_activity") || "0",
  );
  if (now - last > 30000) updateLastActivity();
});

// ==================== LOGIN ====================
function initLogin() {
  var f = qs("#loginForm"),
    er = qs("#loginError"),
    tg = qs("#togglePassword"),
    pi = qs("#loginPassword");
  if (!f || !er) return;
  if (tg && pi) {
    tg.setAttribute("type", "button");
    tg.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var p = pi.type === "password";
      pi.type = p ? "text" : "password";
      var ic = tg.querySelector(".material-icons");
      if (ic) ic.textContent = p ? "visibility" : "visibility_off";
    });
  }
  var submitting = false;
  f.addEventListener("submit", function (e) {
    e.preventDefault();
    e.stopPropagation();
    if (submitting) return;
    submitting = true;
    setTimeout(function () {
      submitting = false;
    }, 500);
    var u = (qs("#loginUsername")?.value || "").trim(),
      p = qs("#loginPassword")?.value || "";
    er.classList.remove("visible");
    if (
      u === "admin" &&
      p === (localStorage.getItem(KEYS.password) || "admin123")
    ) {
      sessionStorage.setItem("servicepro_logged_in", "true");
      updateLastActivity();
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
  updateLastActivity();
  setText("#currentDate", fmtDate());
  updateSessionTime();
  setInterval(updateSessionTime, 60000);
  updateAllBrandNames();
  setupModalClosers();
  initBusinessSwitcher();
  var mb = qs("#mobileMenuBtn"),
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
  qs("#sidebarToggle")?.addEventListener("click", function () {
    var sb2 = qs("#sidebar"),
      mw = qs("#mainWrapper");
    if (!sb2 || !mw) return;
    sb2.classList.toggle("collapsed");
    mw.classList.toggle("sidebar-collapsed");
  });
  qsa(".nav-link").forEach(function (l) {
    l.addEventListener("click", function (e) {
      e.preventDefault();
      if (l.dataset.module) navigateTo(l.dataset.module);
      if (window.innerWidth <= 768) closeSidebar();
    });
  });
  qs("#logoutBtn")?.addEventListener("click", function () {
    confirm(
      "Are you sure you want to sign out?",
      function () {
        logoutSession();
      },
      "Sign Out",
    );
  });
  qs("#confirmActionBtn")?.addEventListener("click", function () {
    if (STATE.confirmCallback) {
      STATE.confirmCallback();
      STATE.confirmCallback = null;
    }
    closeModal("confirmModal");
  });
  document.addEventListener("click", function (e) {
    var ab = e.target.closest("[data-action]");
    if (ab) { handleQuickAction(ab.dataset.action); return; }
    var nb = e.target.closest("[data-nav]");
    if (nb) { navigateTo(nb.dataset.nav); return; }
    var wa = e.target.closest("[data-wa]");
    if (wa) { var r = STATE.reminders.find(function (r) { return r.id === wa.dataset.wa; }); if (r) openWhatsApp(r.phone, r.customerName, r.vehicleNo, r.service, r.serviceDate); return; }
    var cr = e.target.closest("[data-cr]");
    if (cr) { var r = STATE.reminders.find(function (r) { return r.id === cr.dataset.cr; }); if (r) { r.status = "completed"; saveReminders(); renderReminderTable(); refreshDashboard(); } return; }
    var dr = e.target.closest("[data-dr]");
    if (dr) { confirm("Delete reminder?", function () { STATE.reminders = STATE.reminders.filter(function (r) { return r.id !== dr.dataset.dr; }); saveReminders(); renderReminderTable(); refreshDashboard(); }); return; }
    var tpr = e.target.closest("[data-token-print]");
    if (tpr) { printTokenReceipt(tpr.dataset.tokenPrint); return; }
    var tp = e.target.closest("[data-token-progress]");
    if (tp) { updateTokenStatus(tp.dataset.tokenProgress, "in-progress"); return; }
    var tc = e.target.closest("[data-token-complete]");
    if (tc) { var t = STATE.tokens.find(function (t) { return t.id === tc.dataset.tokenComplete; }); if (t) { t.status = "completed"; saveTokens(); createReminderFromToken(t); renderTokenTable(); refreshDashboard(); } return; }
    var ti = e.target.closest("[data-token-invoice]");
    if (ti) { openInvoiceForToken(ti.dataset.tokenInvoice); return; }
    var te = e.target.closest("[data-token-edit]");
    if (te) { openEditTokenModal(te.dataset.tokenEdit); return; }
    var td = e.target.closest("[data-token-delete]");
    if (td) { confirm("Remove token?", function () { var t = STATE.tokens.find(function (t) { return t.id === td.dataset.tokenDelete; }); if (t && t.products) { t.products.forEach(function (p) { var f = findVariantById(p.variantId); if (f) f.variant.stock += p.qty; }); saveInventory(); } STATE.tokens = STATE.tokens.filter(function (t) { return t.id !== td.dataset.tokenDelete; }); saveTokens(); renderTokenTable(); refreshDashboard(); }); return; }
    var ve = e.target.closest("[data-vehicle-edit]");
    if (ve) { var v = STATE.vehicles.find(function (v) { return v.id === ve.dataset.vehicleEdit; }); if (v) openNewVehicleModal(v); return; }
    var vd = e.target.closest("[data-vehicle-delete]");
    if (vd) { confirm("Delete vehicle?", function () { STATE.vehicles = STATE.vehicles.filter(function (v) { return v.id !== vd.dataset.vehicleDelete; }); saveVehicles(); renderVehicleTable(); }); return; }
    var si = e.target.closest("[data-stock-in]");
    if (si) { openStockModal(si.dataset.stockIn, "in"); return; }
    var so = e.target.closest("[data-stock-out]");
    if (so) { openStockModal(so.dataset.stockOut, "out"); return; }
    var vdd = e.target.closest("[data-variant-delete]");
    if (vdd) { confirm("Delete variant?", function () { STATE.inventory.forEach(function (p) { p.variants = (p.variants || []).filter(function (v) { return v.id !== vdd.dataset.variantDelete; }); }); STATE.inventory = STATE.inventory.filter(function (p) { return (p.variants || []).length > 0; }); saveInventory(); renderInventoryTable(); updateInventoryKPI(); refreshDashboard(); }); return; }
    var vi = e.target.closest("[data-view-invoice]");
    if (vi) { viewInvoice(vi.dataset.viewInvoice); return; }
    var pi = e.target.closest("[data-print-receipt]");
    if (pi) { printSavedReceipt(pi.dataset.printReceipt); return; }
    var pa4 = e.target.closest("[data-print-a4]");
    if (pa4) { printA4Invoice(pa4.dataset.printA4); return; }
    var di = e.target.closest("[data-delete-invoice]");
    if (di) { confirm("Delete invoice?", function () { STATE.invoices = STATE.invoices.filter(function (i) { return i.id !== di.dataset.deleteInvoice; }); saveInvoices(); renderSavedInvoices(); }); return; }
    var ed = e.target.closest("[data-expense-del]");
    if (ed) { confirm("Delete?", function () { STATE.expenses = STATE.expenses.filter(function (ex) { return ex.id !== ed.dataset.expenseDel; }); saveExpenses(); renderExpenses(); refreshDashboard(); }); return; }
    var bd2 = e.target.closest("[data-brand-delete]");
    if (bd2) { var id = bd2.dataset.brandDelete; if (getAllVariantsFlat().some(function (v) { return v.brand === (STATE.brands.find(function (b) { return b.id === id; }) || {}).name; })) { toast("Brand in use", "warning"); return; } STATE.brands = STATE.brands.filter(function (b) { return b.id !== id; }); saveBrands(); populateBrandDropdowns(); renderBrandList(); return; }
    var cd = e.target.closest("[data-cat-delete]");
    if (cd) { var id = cd.dataset.catDelete; if (STATE.inventory.some(function (p) { return p.category === id; })) { toast("Category in use", "warning"); return; } STATE.categories = STATE.categories.filter(function (c) { return c.id !== id; }); saveCategories(); populateCategoryDropdowns(); renderCategoryList(); return; }
    var vtd = e.target.closest("[data-vtype-delete]");
    if (vtd) { STATE.pricingVehicles = STATE.pricingVehicles.filter(function (v) { return v.id !== vtd.dataset.vtypeDelete; }); savePricingVehicles(); renderVehicleTypeList(); renderPricingMatrix(); return; }
    var psd = e.target.closest("[data-psvc-delete]");
    if (psd) { STATE.pricingServices = STATE.pricingServices.filter(function (s) { return s.id !== psd.dataset.psvcDelete; }); savePricingServices(); renderPricingServiceList(); renderPricingMatrix(); return; }
    var bed = e.target.closest("[data-biz-edit]");
    if (bed) { openBusinessEditModal(bed.dataset.bizEdit); return; }
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
  initVendors();
  navigateTo("dashboard");
}
// ==================== BUSINESS SWITCHER ====================
function initBusinessSwitcher() {
  var topbarRight = qs(".topbar-right");
  if (!topbarRight) return;
  var currentBiz = getCurrentBusiness();
  var container = document.createElement("div");
  container.style.cssText = "position:relative;display:inline-block;";
  container.innerHTML =
    '<div class="topbar-date" style="margin-right:8px;cursor:pointer;" id="businessSwitcher"><span class="material-icons" style="font-size:15px;color:var(--primary);">business</span><span id="currentBusinessName" style="font-weight:600;">' +
    sanitize(currentBiz.name) +
    '</span><span class="material-icons" style="font-size:14px;">arrow_drop_down</span></div><div class="business-dropdown hidden" id="businessDropdown" style="position:absolute;top:100%;right:0;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);box-shadow:var(--shadow-lg);z-index:200;min-width:200px;margin-top:4px;"></div>';
  var dateEl = topbarRight.querySelector(".topbar-date");
  if (dateEl) {
    dateEl.parentNode.insertBefore(container, dateEl);
  } else {
    topbarRight.insertBefore(container, topbarRight.firstChild);
  }
  qs("#businessSwitcher")?.addEventListener("click", function (e) {
    e.stopPropagation();
    renderBusinessDropdown();
    var dd = qs("#businessDropdown");
    if (dd) dd.classList.toggle("hidden");
  });
  document.addEventListener("click", function (e) {
    var dd = qs("#businessDropdown");
    if (dd && !e.target.closest("#businessSwitcher")) {
      dd.classList.add("hidden");
    }
  });
}

function renderBusinessDropdown() {
  var dd = qs("#businessDropdown");
  if (!dd) return;
  var businesses = getBusinesses();
  var currentBiz = getCurrentBusiness();
  var h = "";
  for (var i = 0; i < businesses.length; i++) {
    var biz = businesses[i];
    h +=
      '<div style="padding:10px 14px;cursor:pointer;display:flex;align-items:center;gap:8px;' +
      (biz.id === currentBiz.id
        ? "background:var(--primary-light);font-weight:600;"
        : "") +
      'border-bottom:1px solid var(--border);" data-switch-biz="' +
      biz.id +
      '"><span class="material-icons" style="font-size:16px;color:' +
      (biz.id === currentBiz.id ? "var(--primary)" : "var(--text-muted)") +
      ';">' +
      (biz.id === currentBiz.id
        ? "radio_button_checked"
        : "radio_button_unchecked") +
      "</span><span>" +
      sanitize(biz.name) +
      '</span><span style="font-size:0.65rem;color:var(--text-muted);margin-left:auto;">' +
      sanitize(biz.prefix) +
      "</span></div>";
  }
  h +=
    '<div style="padding:8px 14px;text-align:center;border-top:1px solid var(--border);"><button class="btn btn-sm btn-outline" id="manageBusinessesBtn" style="width:100%;"><span class="material-icons" style="font-size:14px;">settings</span> Manage Businesses</button></div>';
  dd.innerHTML = h;
  qsa("[data-switch-biz]", dd).forEach(function (el) {
    el.addEventListener("click", function () {
      setCurrentBusiness(this.dataset.switchBiz);
      updateAllBrandNames();
      setText("#currentBusinessName", getCurrentBusiness().name);
      dd.classList.add("hidden");
      var biz = getCurrentBusiness();
      var invBizSelect = qs("#invoiceBusinessSelect");
      if (invBizSelect) {
        invBizSelect.value = biz.id;
      }
      updateInvoicePreview();
      refreshDashboard();
      renderTokenTable();
      renderSavedInvoices();
      toast("Switched to " + getCurrentBusiness().name, "success");
    });
  });
  qs("#manageBusinessesBtn")?.addEventListener("click", function () {
    dd.classList.add("hidden");
    openBusinessManageModal();
  });
}

function openBusinessManageModal() {
  var existing = qs("#businessManageModal");
  if (existing) existing.remove();
  var businesses = getBusinesses();
  var h = "";
  for (var i = 0; i < businesses.length; i++) {
    var biz = businesses[i];
    h +=
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid var(--border);"><div><strong>' +
      sanitize(biz.name) +
      '</strong><br><small style="color:var(--text-muted);">' +
      sanitize(biz.prefix) +
      " | " +
      sanitize(biz.phone) +
      '</small></div><button class="btn btn-sm btn-ghost" data-biz-edit="' +
      biz.id +
      '"><span class="material-icons">edit</span></button></div>';
  }
  var modalHTML =
    '<div class="modal-overlay" id="businessManageModal"><div class="modal modal--sm"><div class="modal-header"><h2 class="modal-title"><span class="material-icons">business</span> Manage Businesses</h2><button class="modal-close" data-close="businessManageModal"><span class="material-icons">close</span></button></div><div class="modal-body">' +
    h +
    '</div><div class="modal-footer"><button class="btn btn-ghost" data-close="businessManageModal">Close</button></div></div></div>';
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  openModal("businessManageModal");
}

function openBusinessEditModal(bizId) {
  var businesses = getBusinesses();
  var biz = businesses.find(function (b) {
    return b.id === bizId;
  });
  if (!biz) return;
  closeModal("businessManageModal");
  var existing = qs("#businessEditModal");
  if (existing) existing.remove();
  var modalHTML =
    '<div class="modal-overlay" id="businessEditModal"><div class="modal"><div class="modal-header"><h2 class="modal-title"><span class="material-icons">edit</span> Edit Business</h2><button class="modal-close" data-close="businessEditModal"><span class="material-icons">close</span></button></div><div class="modal-body"><div class="form-group"><label class="form-label">Business Name</label><input type="text" class="form-input" id="editBizName" value="' +
    sanitize(biz.name) +
    '" /></div><div class="form-group"><label class="form-label">Address</label><input type="text" class="form-input" id="editBizAddress" value="' +
    sanitize(biz.address) +
    '" /></div><div class="form-row"><div class="form-group"><label class="form-label">Phone</label><input type="text" class="form-input" id="editBizPhone" value="' +
    sanitize(biz.phone) +
    '" /></div><div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="editBizEmail" value="' +
    sanitize(biz.email) +
    '" /></div></div><div class="form-group"><label class="form-label">Prefix (WW/MB)</label><input type="text" class="form-input" id="editBizPrefix" value="' +
    sanitize(biz.prefix) +
    '" maxlength="4" /></div><input type="hidden" id="editBizId" value="' +
    biz.id +
    '" /></div><div class="modal-footer"><button class="btn btn-ghost" data-close="businessEditModal">Cancel</button><button class="btn btn-primary" id="saveBizEditBtn">Save</button></div></div></div>';
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  openModal("businessEditModal");
  qs("#saveBizEditBtn")?.addEventListener("click", function () {
    var name = qs("#editBizName")?.value?.trim();
    var prefix = qs("#editBizPrefix")?.value?.trim().toUpperCase();
    if (!name || !prefix) {
      toast("Name and Prefix required", "warning");
      return;
    }
    var bs = getBusinesses();
    for (var i = 0; i < bs.length; i++) {
      if (bs[i].id === bizId) {
        bs[i].name = name;
        bs[i].address = qs("#editBizAddress")?.value?.trim() || "";
        bs[i].phone = qs("#editBizPhone")?.value?.trim() || "";
        bs[i].email = qs("#editBizEmail")?.value?.trim() || "";
        bs[i].prefix = prefix;
        break;
      }
    }
    saveBusinesses(bs);
    closeModal("businessEditModal");
    updateAllBrandNames();
    setText("#currentBusinessName", name);
    if (getCurrentBusiness().id === bizId) {
      setCurrentBusiness(bizId);
    }
    var invBizSelect = qs("#invoiceBusinessSelect");
    if (invBizSelect) {
      var updatedBusinesses = getBusinesses();
      var currentBiz = getCurrentBusiness();
      invBizSelect.innerHTML = '<option value="">Select Business</option>';
      for (var j = 0; j < updatedBusinesses.length; j++) {
        var sel = updatedBusinesses[j].id === currentBiz.id ? " selected" : "";
        invBizSelect.innerHTML +=
          '<option value="' +
          updatedBusinesses[j].id +
          '" data-prefix="' +
          updatedBusinesses[j].prefix +
          '" data-name="' +
          sanitize(updatedBusinesses[j].name) +
          '"' +
          sel +
          ">" +
          updatedBusinesses[j].name +
          " (" +
          updatedBusinesses[j].prefix +
          ")</option>";
      }
    }
    updateInvoicePreview();
    var tokenBizSelect = qs("#tokenBusinessSelect");
    if (tokenBizSelect) {
      var updatedBusinesses = getBusinesses();
      var currentBiz = getCurrentBusiness();
      tokenBizSelect.innerHTML = '<option value="">Select Business</option>';
      for (var k = 0; k < updatedBusinesses.length; k++) {
        var sel2 = updatedBusinesses[k].id === currentBiz.id ? " selected" : "";
        tokenBizSelect.innerHTML +=
          '<option value="' +
          updatedBusinesses[k].id +
          '" data-prefix="' +
          updatedBusinesses[k].prefix +
          '" data-name="' +
          sanitize(updatedBusinesses[k].name) +
          '"' +
          sel2 +
          ">" +
          updatedBusinesses[k].name +
          " (" +
          updatedBusinesses[k].prefix +
          ")</option>";
      }
    }
    toast(name + " updated", "success");
  });
}

function updateSessionTime() {
  var e = qs("#sessionTime");
  if (!e) return;
  e.textContent =
    "Session: " +
    Math.floor((new Date() - STATE.sessionStart) / 60000) +
    " min";
}
function updateAllBrandNames() {
  var biz = getCurrentBusiness();
  var lb = qs("#loginBrandName");
  if (lb) lb.textContent = biz.name;
  var sb = qs(".sidebar-brand");
  if (sb) sb.textContent = biz.name;
  var ib = qs("#invBusinessName");
  if (ib) ib.textContent = biz.name;
  var cn = qs("#currentBusinessName");
  if (cn) cn.textContent = biz.name;
  var invBizSelect = qs("#invoiceBusinessSelect");
  if (invBizSelect) {
    invBizSelect.value = biz.id;
    updateInvoicePreview();
  }
  var addr = qs("#invBusinessAddress");
  if (addr) addr.textContent = biz.address || "";
  var phone = qs("#invBusinessPhone");
  if (phone) phone.textContent = biz.phone || "";
}

var MODULE_TITLES = {
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
  vendors: ["Vendor Management", "Payments & Purchases"],
};
function navigateTo(mod) {
  qsa(".nav-link").forEach(function (l) {
    l.classList.toggle("active", l.dataset.module === mod);
  });
  qsa(".module").forEach(function (m) {
    m.classList.add("hidden");
  });
  var tgt = qs("#module-" + mod);
  if (tgt) tgt.classList.remove("hidden");
  var title = MODULE_TITLES[mod] || [mod, ""];
  setText("#pageTitle", title[0]);
  setText("#pageSubtitle", title[1]);
  if (mod === "dashboard") refreshDashboard();
  else if (mod === "tokens") renderTokenTable();
  else if (mod === "vehicles") renderVehicleTable();
  else if (mod === "inventory") renderInventoryTable();
  else if (mod === "reports") renderReports();
  else if (mod === "expenses") renderExpenses();
  else if (mod === "services") renderPricingMatrix();
  else if (mod === "productsale") renderProductSalePage();
  else if (mod === "reminders") renderReminderTable();
  else if (mod === "settings") loadSettingsForm();
  else if (mod === "vendors") {
    renderVendorKPIs();
    renderVendorTable();
  }
}
function handleQuickAction(a) {
  var m = {
    newToken: function () {
      navigateTo("tokens");
      openNewTokenModal();
    },
    newVehicle: function () {
      navigateTo("vehicles");
      openNewVehicleModal();
    },
    newInvoice: function () {
      navigateTo("billing");
    },
    stockIn: function () {
      navigateTo("inventory");
    },
    dailyReport: function () {
      navigateTo("reports");
    },
    inventory: function () {
      navigateTo("inventory");
    },
  };
  if (m[a]) m[a]();
}

function getTotalRevenue() {
  var t = 0;
  STATE.tokens.forEach(function (tk) {
    if (tk.status === "completed") {
      if (tk.servicePrice > 0) t += tk.servicePrice;
      if (tk.products)
        tk.products.forEach(function (p) {
          t += p.price * p.qty;
        });
    }
  });
  STATE.productSales.forEach(function (sale) {
    t += sale.total;
  });
  return t;
}
function getTotalExpenses() {
  return STATE.expenses
    .filter(function (e) {
      return e.category !== "labour";
    })
    .reduce(function (s, e) {
      return s + (e.amount || 0);
    }, 0);
}
function getLabourCost() {
  return STATE.expenses
    .filter(function (e) {
      return e.category === "labour";
    })
    .reduce(function (s, e) {
      return s + (e.amount || 0);
    }, 0);
}
function getAllExpensesTotal() {
  var expTotal = STATE.expenses.reduce(function (s, e) {
    return s + (e.amount || 0);
  }, 0);
  var vendorTotal = STATE.vendorPayments.reduce(function (s, p) {
    return s + (p.amount || 0);
  }, 0);
  return expTotal + vendorTotal;
}
function getMatrixPrice(sn, vt) {
  var key = sn + "__" + vt;
  return STATE.pricingMatrix[key] || 0;
}

// ==================== DASHBOARD ====================
function initDashboard() {
  refreshDashboard();
}
function refreshDashboard() {
  var tv = STATE.tokens.length,
    at = STATE.tokens.filter(function (t) {
      return t.status === "waiting" || t.status === "in-progress";
    }).length;
  var ct = STATE.tokens.filter(function (t) {
    return t.status === "completed";
  }).length;
  var totalVendorPaid = STATE.vendorPayments.reduce(function(s, p) { return s + (p.amount || 0); }, 0);
setText("#kpiVendorPaid", fmtPrice(totalVendorPaid));
  var dr = getTotalRevenue(),
    ls = getLowStockCount();
  setText("#kpiVehicles", tv);
  setText("#kpiTokens", at);
  setText("#kpiCompleted", ct);
  setText("#kpiRevenue", fmtPrice(dr));
  setText("#kpiAlerts", ls);
  setText("#kpiLowStock", ls);
  setText("#kpiNetProfit", fmtPrice(getTotalRevenue() - getAllExpensesTotal()));
  var ab = qs("#activeTokenBadge");
  if (ab) {
    ab.textContent = at;
    ab.classList.toggle("hidden", at === 0);
  }
  var lb = qs("#lowStockBadge");
  if (lb) {
    lb.textContent = ls;
    lb.classList.toggle("hidden", ls === 0);
  }
  var rs = getReminderStats();
  setText("#kpiDueToday", rs.dueToday);
  setText("#kpiOverdue", rs.overdue);
  setText("#kpiUpcomingWeek", rs.upcomingWeek);
  var rb = qs("#reminderBadge");
  if (rb) {
    var a = rs.dueToday + rs.overdue;
    rb.textContent = a;
    rb.classList.toggle("hidden", a === 0);
  }
  renderRecentActivity();
  updateLowStockAlert(ls);
}
function updateLowStockAlert(c) {
  var ae = qs("#lowStockAlert");
  if (!ae) return;
  ae.classList.toggle("hidden", c === 0);
}
function renderRecentActivity() {
  var tb = qs("#recentActivityTable");
  if (!tb) return;
  var recent = STATE.tokens.slice().reverse().slice(0, 10);
  if (!recent.length) {
    tb.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:3rem;">No activity yet</td></tr>';
    return;
  }
  tb.innerHTML = recent
    .map(function (t) {
      return (
        '<tr><td><span class="table-token-no">' +
        sanitize(t.number) +
        '</span></td><td><span class="table-vehicle-no">' +
        sanitize(t.vehicleNo) +
        '</span></td><td style="font-weight:500;">' +
        sanitize(t.ownerName || "—") +
        '</td><td><span class="contact-display">' +
        sanitize(formatContactDisplay(t.contactNumber || "N/A")) +
        "</span></td><td>" +
        sanitize(t.service) +
        "</td><td>" +
        statusBadge(t.status) +
        "</td></tr>"
      );
    })
    .join("");
}
function statusBadge(s) {
  var m = {
    waiting: "status-waiting",
    "in-progress": "status-in-progress",
    completed: "status-completed",
  };
  var l = {
    waiting: "Waiting",
    "in-progress": "In Progress",
    completed: "Completed",
  };
  return (
    '<span class="status-badge ' + (m[s] || "") + '">' + (l[s] || s) + "</span>"
  );
}

// ==================== TOKEN MANAGEMENT ====================
function initTokens() {
  qs("#newTokenBtn")?.addEventListener("click", openNewTokenModal);
  qs("#newTokenBtn2")?.addEventListener("click", openNewTokenModal);
  qs("#customTokenBtn")?.addEventListener("click", openCustomTokenModal);
  qs("#saveTokenBtn")?.addEventListener("click", function() {
    var customSection = document.getElementById("customTokenServicesSection");
    if (customSection && customSection.style.display !== "none") {
      saveCustomToken();
    } else {
      saveToken();
    }
  });
  qs("#tokenSearch")?.addEventListener("input", renderTokenTable);
  qs("#tokenStatusFilter")?.addEventListener("change", renderTokenTable);
  qs("#tokenVehicleType")?.addEventListener("change", function() {
    var vt = this.value;
    qsa("#tokenServicesList .token-service-select").forEach(function(s) {
      var sv = s.value;
      var pr = sv && vt ? getMatrixPrice(sv, vt) : 0;
      s.parentElement.querySelector(".token-service-price").value = pr;
    });
    updateTokenTotal();
  });
  qs("#tokenDiscount")?.addEventListener("input", function() {
    updateTokenTotal();
    updateCustomTokenTotal();
  });
  renderTokenTable();
}
function populateTokenServices() {
  var sel = qs("#tokenServiceType");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select service</option>';
  STATE.pricingServices.forEach(function (s) {
    var o = document.createElement("option");
    o.value = s.name;
    o.textContent = s.name;
    sel.appendChild(o);
  });
  var co = document.createElement("option");
  co.value = "Custom";
  co.textContent = "Custom Service";
  sel.appendChild(co);
}
function populateVehicleTypes() {
  var sel = qs("#tokenVehicleType");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select type</option>';
  STATE.pricingVehicles.forEach(function (v) {
    var o = document.createElement("option");
    o.value = v.name;
    o.textContent = v.name;
    sel.appendChild(o);
  });
}
function updateTokenPrice() {
  var sv = qs("#tokenServiceType")?.value || "";
  var vt = qs("#tokenVehicleType")?.value || "";
  setText(
    "#autoTokenPrice",
    sv && sv !== "Custom" && vt ? fmtPrice(getMatrixPrice(sv, vt)) : "—",
  );
  updateTokenTotal();
}




function openNewTokenModal() {
  var bizSelect = qs("#tokenBusinessSelect");
  if (bizSelect) {
    var businesses = getBusinesses(); var currentBiz = getCurrentBusiness();
    bizSelect.innerHTML = '<option value="">Select Business</option>';
    for (var i = 0; i < businesses.length; i++) {
      var sel = businesses[i].id === currentBiz.id ? " selected" : "";
      bizSelect.innerHTML += '<option value="' + businesses[i].id + '" data-prefix="' + businesses[i].prefix + '" data-name="' + sanitize(businesses[i].name) + '"' + sel + ">" + businesses[i].name + " (" + businesses[i].prefix + ")</option>";
    }
    bizSelect.onchange = function() {
      var opt = this.options[this.selectedIndex];
      if (opt && opt.value) {
        var prefix = opt.getAttribute("data-prefix"); var today = new Date();
        var ds = today.getFullYear() + "" + String(today.getMonth() + 1).padStart(2, "0") + String(today.getDate()).padStart(2, "0");
        var bizTokens = STATE.tokens.filter(function(t) { return t.businessPrefix === prefix && t.number && t.number.startsWith(prefix + "-" + ds); });
        setText("#autoTokenNumber", prefix + "-" + ds + "-" + String(bizTokens.length + 1).padStart(3, "0"));
      }
    };
  }
  setText("#autoTokenNumber", generateTokenNumber());
  setValue("#tokenVehicleNo", ""); setValue("#tokenVehicleType", "");
  setValue("#tokenOwnerName", ""); setValue("#tokenContactNumber", "");
  populateVehicleTypes();
  setValue("#tokenDiscount", "0");
  qs("#tokenServicesList").innerHTML = "";
  qs("#tokenProductsList").innerHTML = "";
  setText("#tokenGrandTotal", "Rs. 0");
  qs("#tokenModal").dataset.editId = "";
  qs("#tokenModalTitle").innerHTML = '<span class="material-icons">token</span> Generate Token';
  document.getElementById("tokenServicesSection").style.display = "";
  document.getElementById("tokenProductsSection").style.display = "";
  document.getElementById("customTokenServicesSection").style.display = "none";
  document.getElementById("customTokenProductsSection").style.display = "none";
  openModal("tokenModal");
  setTimeout(function() {
    qs("#tokenVehicleNo")?.focus();
    var discEl = qs("#tokenDiscount");
    if (discEl) {
      discEl.oninput = function() { updateTokenTotal(); updateCustomTokenTotal(); };
    }
  }, 100);
}
function saveToken() {

  updateTokenTotal();
  var editId = qs("#tokenModal")?.dataset?.editId || "";
  var vn = (qs("#tokenVehicleNo")?.value || "").trim().toUpperCase();
  var vt = qs("#tokenVehicleType")?.value || "";
  var on = (qs("#tokenOwnerName")?.value || "").trim();
  var cn = (qs("#tokenContactNumber")?.value || "").trim();
  var bizSelect = qs("#tokenBusinessSelect"); var businesses = getBusinesses(); var biz;
  if (bizSelect && bizSelect.value) { biz = businesses.find(function(b) { return b.id === bizSelect.value; }); }
  if (!biz) { biz = getCurrentBusiness(); }
  var prefix = biz.prefix;
  
  var hasServices = qsa("#tokenServicesList .token-service-select").some(function(s) { return s.value; });
  if (!vn || !vt || !hasServices) { toast("Please fill all required fields", "error"); return; }
  
  var cv = validateContactNumber(cn);
  if (!cv.valid) { toast(cv.message, "error"); qs("#tokenContactNumber")?.focus(); return; }
  
  var selectedServices = []; var totalServicePrice = 0;
  qsa("#tokenServicesList .token-service-select").forEach(function(s) {
    var sv = s.value;
    if (sv) {
      var pr = parseFloat(s.parentElement.querySelector(".token-service-price")?.value) || getMatrixPrice(sv, vt) || 0;
      selectedServices.push(sv); totalServicePrice += pr;
    }
  });
  var fs = selectedServices.join(", ");
  var sp = totalServicePrice;
  
  var discount = parseFloat(qs("#tokenDiscount")?.value) || 0;
  
  
  var newProducts = []; var hasError = false;
  qsa("#tokenProductsList .token-product-select").forEach(function(s, i) {
    var vid = s.value; if (!vid) return;
    var f = findVariantById(vid); if (!f) return;
    var q = parseInt(qsa("#tokenProductsList .token-product-qty")[i]?.value) || 1;
    if (q > f.variant.stock) { toast("Only " + f.variant.stock + " units available for " + f.fullName, "error"); hasError = true; return; }
    var p = parseFloat(qsa("#tokenProductsList .token-product-price")[i]?.value) || f.variant.sellingPrice;
    newProducts.push({ variantId: f.variant.id, fullName: f.fullName, qty: q, price: p });
  });
  if (hasError) return;
  
  if (editId) {
    var t = STATE.tokens.find(function(t) { return t.id === editId; }); if (!t) return;
    if (t.products) t.products.forEach(function(p) { var f = findVariantById(p.variantId); if (f) f.variant.stock += p.qty; });
    newProducts.forEach(function(p) { var f = findVariantById(p.variantId); if (f) f.variant.stock = Math.max(0, f.variant.stock - p.qty); });
    t.vehicleNo = vn; t.vehicleType = vt; t.ownerName = on; t.contactNumber = cv.formatted;
    t.service = fs; t.servicePrice = sp; t.products = newProducts; t.discount = discount;
    t.editedAt = fmtDate() + " " + fmtTime(); t.businessPrefix = prefix; t.businessId = biz.id; t.businessName = biz.name;
    saveTokens(); saveInventory(); renderTokenTable(); closeModal("tokenModal"); refreshDashboard();
    toast("Token updated successfully", "success");
  } else {
    newProducts.forEach(function(p) { var f = findVariantById(p.variantId); if (f) f.variant.stock = Math.max(0, f.variant.stock - p.qty); });
    var ex = STATE.vehicles.find(function(v) { return v.vehicleNo === vn; });
    if (!ex) { STATE.vehicles.push({ id: uid(), vehicleNo: vn, owner: on, contact: cv.formatted, type: vt, notes: "", visits: 1, lastService: fmtDate() }); saveVehicles(); }
    else { ex.visits = (ex.visits || 0) + 1; ex.lastService = fmtDate(); if (cv.formatted) ex.contact = cv.formatted; saveVehicles(); }
    var newToken = { id: uid(), number: qs("#autoTokenNumber")?.textContent || generateTokenNumber(), vehicleNo: vn, vehicleType: vt, ownerName: on, contactNumber: cv.formatted, service: fs, servicePrice: sp, discount: discount, products: newProducts, time: fmtTime(), status: "waiting", businessPrefix: prefix, businessId: biz.id, businessName: biz.name };
    STATE.tokens.push(newToken); saveTokens(); saveInventory(); saveCounters();
    closeModal("tokenModal"); renderTokenTable(); refreshDashboard();
    toast("Token " + newToken.number + " generated successfully", "success");
    setTimeout(function() { var tb = qs("#tokenModal"); if (tb) { var printBtn = document.createElement("button"); printBtn.className = "btn btn-primary"; printBtn.style.background = "#000"; printBtn.innerHTML = '<span class="material-icons">print</span> Print Token'; printBtn.onclick = function() { printTokenReceipt(newToken.id); this.remove(); }; var footer = tb.querySelector(".modal-footer"); if (footer) { footer.insertBefore(printBtn, footer.firstChild); } } }, 200);
  }
}
function openCustomTokenModal() {
  var bizSelect = qs("#tokenBusinessSelect");
  if (bizSelect) {
    var businesses = getBusinesses(); var currentBiz = getCurrentBusiness();
    bizSelect.innerHTML = '<option value="">Select Business</option>';
    for (var i = 0; i < businesses.length; i++) {
      var sel = businesses[i].id === currentBiz.id ? " selected" : "";
      bizSelect.innerHTML += '<option value="' + businesses[i].id + '" data-prefix="' + businesses[i].prefix + '" data-name="' + sanitize(businesses[i].name) + '"' + sel + ">" + businesses[i].name + " (" + businesses[i].prefix + ")</option>";
    }
    bizSelect.onchange = function() {
      var opt = this.options[this.selectedIndex];
      if (opt && opt.value) {
        var prefix = opt.getAttribute("data-prefix"); var today = new Date();
        var ds = today.getFullYear() + "" + String(today.getMonth() + 1).padStart(2, "0") + String(today.getDate()).padStart(2, "0");
        var bizTokens = STATE.tokens.filter(function(t) { return t.businessPrefix === prefix && t.number && t.number.startsWith(prefix + "-" + ds); });
        setText("#autoTokenNumber", prefix + "-" + ds + "-" + String(bizTokens.length + 1).padStart(3, "0"));
      }
    };
  }
  setText("#autoTokenNumber", generateTokenNumber());
  setValue("#tokenVehicleNo", ""); setValue("#tokenVehicleType", "");
  setValue("#tokenOwnerName", ""); setValue("#tokenContactNumber", "");
  populateVehicleTypes();
  setValue("#tokenDiscount", "0");
  qs("#customTokenServicesList").innerHTML = "";
  qs("#customTokenProductsList").innerHTML = "";
  setText("#tokenGrandTotal", "Rs. 0");
  qs("#tokenModal").dataset.editId = "";
  qs("#tokenModalTitle").innerHTML = '<span class="material-icons">edit_note</span> Custom Token';
  document.getElementById("tokenServicesSection").style.display = "none";
  document.getElementById("tokenProductsSection").style.display = "none";
  document.getElementById("customTokenServicesSection").style.display = "";
  document.getElementById("customTokenProductsSection").style.display = "";
  openModal("tokenModal");
  setTimeout(function() {
    qs("#tokenVehicleNo")?.focus();
    var discEl = qs("#tokenDiscount");
    if (discEl) {
      discEl.oninput = function() { updateTokenTotal(); updateCustomTokenTotal(); };
    }
  }, 100);
}


function customServiceChanged(el) {
  var row = el.parentElement;
  if (el.value === "__custom__") {
    el.style.display = "none";
    row.querySelector(".custom-svc-name").style.display = "";
    row.querySelector(".custom-svc-name").focus();
  }
}


function customProductChanged(el) {
  var row = el.parentElement;
  if (el.value === "__custom__") {
    el.style.display = "none";
    row.querySelector(".custom-prd-name").style.display = "";
    row.querySelector(".custom-prd-name").focus();
  }
}



function saveCustomToken() {
  var vn = (qs("#tokenVehicleNo")?.value || "").trim().toUpperCase();
  var vt = qs("#tokenVehicleType")?.value || "";
  var on = (qs("#tokenOwnerName")?.value || "").trim();
  var cn = (qs("#tokenContactNumber")?.value || "").trim();
  var bizSelect = qs("#tokenBusinessSelect"); var businesses = getBusinesses(); var biz;
  if (bizSelect && bizSelect.value) { biz = businesses.find(function(b) { return b.id === bizSelect.value; }); }
  if (!biz) { biz = getCurrentBusiness(); }
  var prefix = biz.prefix;
  if (!vn || !vt) { toast("Please fill vehicle details", "error"); return; }
  var cv = validateContactNumber(cn);
  if (!cv.valid) { toast(cv.message, "error"); qs("#tokenContactNumber")?.focus(); return; }
  
  var customServices = [];
  qsa("#customTokenServicesList > div").forEach(function(row) {
    var sel = row.querySelector(".custom-svc-select");
    var name = row.querySelector(".custom-svc-name");
    var price = parseFloat(row.querySelector(".custom-svc-price")?.value) || 0;
    var svcName = "";
    if (sel && (sel.style.display === "none" || sel.value === "__custom__")) {
      svcName = name ? (name.value || "").trim() : "";
    } else if (sel) {
      svcName = sel.value;
    }
    if (svcName && price > 0) customServices.push({ name: svcName, price: price });
  });
  
  var customProducts = [];
  qsa("#customTokenProductsList > div").forEach(function(row) {
    var sel = row.querySelector(".custom-prd-select");
    var name = row.querySelector(".custom-prd-name");
    var qty = parseInt(row.querySelector(".custom-prd-qty")?.value) || 1;
    var price = parseFloat(row.querySelector(".custom-prd-price")?.value) || 0;
    var prdName = "";
    if (sel && (sel.style.display === "none" || sel.value === "__custom__")) {
      prdName = name ? (name.value || "").trim() : "";
    } else if (sel) {
      prdName = sel.value;
    }
    if (prdName && price > 0) customProducts.push({ fullName: prdName, qty: qty, price: price });
  });
  
  var serviceNames = customServices.map(function(s) { return s.name; }).join(", ");
  var totalServicePrice = customServices.reduce(function(t, s) { return t + s.price; }, 0);
  var discount = parseFloat(qs("#tokenDiscount")?.value) || 0;
  
  var ex = STATE.vehicles.find(function(v) { return v.vehicleNo === vn; });
  if (!ex) { STATE.vehicles.push({ id: uid(), vehicleNo: vn, owner: on, contact: cv.formatted, type: vt, notes: "", visits: 1, lastService: fmtDate() }); saveVehicles(); }
  else { ex.visits = (ex.visits || 0) + 1; ex.lastService = fmtDate(); if (cv.formatted) ex.contact = cv.formatted; saveVehicles(); }
  
  var newToken = {
    id: uid(), number: qs("#autoTokenNumber")?.textContent || generateTokenNumber(),
    vehicleNo: vn, vehicleType: vt, ownerName: on, contactNumber: cv.formatted,
    service: serviceNames, servicePrice: totalServicePrice,
    discount: discount, products: customProducts,
    time: fmtTime(), status: "waiting",
    businessPrefix: prefix, businessId: biz.id, businessName: biz.name,
    isCustom: true
  };
  STATE.tokens.push(newToken); saveTokens(); saveCounters();
  closeModal("tokenModal"); renderTokenTable(); refreshDashboard();
  toast("Custom Token " + newToken.number + " generated", "success");
}
function renderTokenTable() {
  var sr = (qs("#tokenSearch")?.value || "").toLowerCase();
  var sf = qs("#tokenStatusFilter")?.value || "";
  var fl = STATE.tokens.filter(function (t) {
    var ms =
      !sr ||
      t.number.toLowerCase().includes(sr) ||
      t.vehicleNo.toLowerCase().includes(sr) ||
      (t.ownerName || "").toLowerCase().includes(sr) ||
      (t.contactNumber || "").includes(sr) ||
      t.service.toLowerCase().includes(sr);
    return ms && (!sf || t.status === sf);
  });
  setText("#tokenStatsTotal", STATE.tokens.length);
  setText(
    "#tokenStatsWaiting",
    STATE.tokens.filter(function (t) {
      return t.status === "waiting";
    }).length,
  );
  setText(
    "#tokenStatsProgress",
    STATE.tokens.filter(function (t) {
      return t.status === "in-progress";
    }).length,
  );
  setText(
    "#tokenStatsCompleted",
    STATE.tokens.filter(function (t) {
      return t.status === "completed";
    }).length,
  );
  var badge = qs("#tokenCountBadge");
  if (badge)
    badge.textContent = fl.length + " token" + (fl.length !== 1 ? "s" : "");
  var tableContainer = qs("#tokenTableContainer");
  var emptyContainer = qs("#tokenEmptyStateContainer");
  var tableBody = qs("#tokenTableBody");
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
        .map(function (t) {
          return (
            '<tr><td><span class="table-token-no">' +
            sanitize(t.number) +
            (t.businessName
              ? ' <small style="color:var(--text-muted);">(' +
                sanitize(t.businessPrefix || t.businessName) +
                ")</small>"
              : "") +
            '</span></td><td><span class="table-vehicle-no">' +
            sanitize(t.vehicleNo) +
            "</span></td><td>" +
            sanitize(t.vehicleType) +
            '</td><td style="font-weight:500;">' +
            sanitize(t.ownerName || "—") +
            '</td><td><span class="contact-display">' +
            sanitize(formatContactDisplay(t.contactNumber || "N/A")) +
            "</span></td><td>" +
            sanitize(t.service) +
            '</td><td style="color:var(--text-muted);font-size:0.78rem;">' +
            sanitize(t.time) +
            "</td><td>" +
            statusBadge(t.status) +
            '</td><td><div class="table-actions"><button class="btn btn-sm btn-primary" data-token-print="' +
            t.id +
            '" title="Print Token" style="background:#000;color:#fff;min-width:32px;"><span class="material-icons" style="font-size:16px;">print</span></button>' +
            (t.status === "waiting" || t.status === "in-progress"
              ? '<button class="btn btn-sm btn-ghost" data-token-edit="' +
                t.id +
                '" title="Edit"><span class="material-icons">edit</span></button>'
              : "") +
            (t.status === "waiting"
              ? '<button class="btn btn-sm btn-outline" data-token-progress="' +
                t.id +
                '" title="Start"><span class="material-icons">play_arrow</span></button>'
              : "") +
            (t.status === "in-progress"
              ? '<button class="btn btn-sm btn-primary" data-token-complete="' +
                t.id +
                '" title="Complete"><span class="material-icons">check</span></button>'
              : "") +
            (t.status === "completed"
              ? '<button class="btn btn-sm btn-ghost" data-token-invoice="' +
                t.id +
                '" title="Invoice"><span class="material-icons">receipt</span></button>'
              : "") +
            '<button class="btn-icon btn btn-danger-ghost" data-token-delete="' +
            t.id +
            '" title="Delete"><span class="material-icons">delete</span></button></div></td></tr>'
          );
        })
        .join("");
    }
  }
}
function updateTokenStatus(id, s) {
  var tk = STATE.tokens.find(function (t) {
    return t.id === id;
  });
  if (tk) {
    tk.status = s;
    saveTokens();
    if (s === "completed") createReminderFromToken(tk);
    renderTokenTable();
    refreshDashboard();
  }
}
function openInvoiceForToken(id) {
  var t = STATE.tokens.find(function (t) {
    return t.id === id;
  });
  if (!t) return;
  navigateTo("billing");
  setTimeout(function () {
    setValue("#invoiceToken", t.number);
    autoFillFromToken(t.number);
    updateInvoicePreview();
  }, 150);
}
function openEditTokenModal(tid) {
  var t = STATE.tokens.find(function (t) {
    return t.id === tid;
  });
  if (!t) return;
  setText("#autoTokenNumber", t.number);
  setValue("#tokenVehicleNo", t.vehicleNo);
  populateVehicleTypes();
  setTimeout(function () {
    setValue("#tokenVehicleType", t.vehicleType);
  }, 50);
  setValue("#tokenOwnerName", t.ownerName || "");
  setValue("#tokenContactNumber", t.contactNumber || "");
  populateTokenServices();
  setTimeout(function () {
    var svc = qs("#tokenServiceType");
    if (
      Array.from(svc.options).some(function (o) {
        return o.value === t.service;
      })
    ) {
      setValue("#tokenServiceType", t.service);
      qs("#customServiceGroup").style.display = "none";
    } else {
      setValue("#tokenServiceType", "Custom");
      setValue("#tokenCustomService", t.service);
      qs("#customServiceGroup").style.display = "";
    }
  }, 50);
  var pl = qs("#tokenProductsList");
  if (pl) pl.innerHTML = "";
  if (t.products)
    t.products.forEach(function (p) {
      var c = qs("#tokenProductsList");
      if (!c) return;
      var av = getAllVariantsFlat();
      var opts = av
        .map(function (v) {
          return (
            '<option value="' +
            v.id +
            '" data-price="' +
            v.sellingPrice +
            '" ' +
            (v.id === p.variantId ? "selected" : "") +
            ">" +
            sanitize(v.fullName) +
            " | " +
            fmtPrice(v.sellingPrice) +
            "</option>"
          );
        })
        .join("");
      var r = document.createElement("div");
      r.style.cssText =
        "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
      r.innerHTML =
        '<select class="form-input token-product-select" style="flex:1;padding:6px 4px;font-size:0.72rem;"><option value="">Select variant</option>' +
        opts +
        '</select><input type="number" class="form-input token-product-qty" value="' +
        p.qty +
        '" min="1" style="width:50px;padding:6px 2px;font-size:0.78rem;text-align:center;" /><input type="number" class="form-input token-product-price" value="' +
        p.price +
        '" readonly style="width:70px;padding:6px 2px;font-size:0.78rem;background:var(--surface-active);text-align:right;" /><button class="btn-icon btn btn-danger-ghost" onclick="this.closest(\'div\').remove();updateTokenTotal();"><span class="material-icons">close</span></button>';
      c.appendChild(r);
      r.querySelector(".token-product-select").addEventListener(
        "change",
        function () {
          var v = av.find(
            function (x) {
              return x.id === this.value;
            }.bind(this),
          );
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
  setTimeout(function () {
    updateTokenPrice();
    updateTokenTotal();
  }, 100);
  qs("#tokenModal").dataset.editId = tid;
  var bizDisplay = qs("#tokenBusinessDisplay");
  if (bizDisplay)
    bizDisplay.textContent =
      (t.businessName || "N/A") + " (" + (t.businessPrefix || "N/A") + ")";
  qs("#tokenModalTitle").innerHTML =
    '<span class="material-icons">edit</span> Edit Token';
  openModal("tokenModal");
}

// ==================== BILLING ====================
function initBilling() {
  var invBizSelect = qs("#invoiceBusinessSelect");
  if (invBizSelect) {
    var businesses = getBusinesses();
    var currentBiz = getCurrentBusiness();
    invBizSelect.innerHTML = '<option value="">Select Business</option>';
    for (var i = 0; i < businesses.length; i++) {
      var sel = businesses[i].id === currentBiz.id ? " selected" : "";
      invBizSelect.innerHTML +=
        '<option value="' +
        businesses[i].id +
        '" data-prefix="' +
        businesses[i].prefix +
        '" data-name="' +
        sanitize(businesses[i].name) +
        '"' +
        sel +
        ">" +
        businesses[i].name +
        " (" +
        businesses[i].prefix +
        ")</option>";
    }
    invBizSelect.onchange = function () {
      updateInvoicePreview();
    };
  }
  qs("#addInvoiceService")?.addEventListener("click", function () {
    addInvoiceServiceRow("", 0);
  });
  qs("#addInvoiceProduct")?.addEventListener("click", function () {
    addInvoiceProductRow("", 0, 1);
  });
  qs("#saveInvoiceBtn")?.addEventListener("click", saveInvoice);
  qs("#printReceiptBtn")?.addEventListener("click", function () {
    var invNumber = (qs("#invNumber")?.textContent || "").trim();
    var invCustomer = (qs("#invCustomer")?.textContent || "").trim();
    var invDate = (qs("#invDate")?.textContent || "").trim();
    var invVehicle = (qs("#invVehicle")?.textContent || "").trim();
    var invToken = (qs("#invToken")?.textContent || "").trim();

    if (!invCustomer || invCustomer === "—") {
      toast("Please add customer and items first", "warning");
      return;
    }

    var items = [];
    qsa(".invoice-line-row", qs("#invoiceServicesContainer")).forEach(
      function (r) {
        var s = r.querySelector(".invoice-svc-select");
        var nm = s?.options[s.selectedIndex]?.text || "";
        var pr = parseFloat(r.querySelector(".invoice-svc-price")?.value) || 0;
        var qt = parseInt(r.querySelector(".invoice-svc-qty")?.value) || 1;
        if (nm && nm !== "Select...")
          items.push({ name: nm, price: pr, qty: qt });
      },
    );
    qsa(".invoice-line-row", qs("#invoiceProductsContainer")).forEach(
      function (r) {
        var s = r.querySelector(".invoice-prd-select");
        var nm = s?.options[s.selectedIndex]?.dataset?.fullname || "";
        var pr = parseFloat(r.querySelector(".invoice-prd-price")?.value) || 0;
        var qt = parseInt(r.querySelector(".invoice-prd-qty")?.value) || 1;
        if (nm) items.push({ name: nm, price: pr, qty: qt });
      },
    );

    if (!items.length) {
      toast("Add items first", "warning");
      return;
    }

    var subtotal = 0;
    items.forEach(function (i) {
      subtotal += i.price * i.qty;
    });
    var total = subtotal;
    var cash = parseFloat(qs("#cashReceived")?.value) || 0;
    var change = cash >= total ? cash - total : 0;

 var discount = parseFloat(qs("#invoiceDiscount")?.value) || 0;
var totalAfterDiscount = Math.max(0, total - discount);
var tempInv = {
      number: invNumber || "—",
      date: invDate || fmtDate(),
      time: fmtTime(),
      customer: invCustomer,
      contactNumber: qs("#invoiceCustomer")?.dataset?.contact || "",
      vehicle:
        invVehicle !== "—" ? invVehicle : qs("#invoiceVehicle")?.value || "",
      token: invToken !== "—" ? invToken : "",
      items: items,
      discount: discount,
      total: totalAfterDiscount,
      cashReceived: cash,
      changeReturned: Math.max(0, cash - totalAfterDiscount),
      status: cash >= totalAfterDiscount && cash > 0 ? "PAID" : "UNPAID",
    };

    var biz = getCurrentBusiness();
    var content = generateThermalInvoice(tempInv, biz);

    if (window.electronAPI && window.electronAPI.printReceipt) {
      window.electronAPI.printReceipt(content, {
        pageSize: { width: 80000, height: 297000 },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });
    } else {
      var w = window.open("", "_blank");
      w.document.write(content);
      w.document.close();
      setTimeout(function () {
        w.print();
      }, 500);
    }
  });
  qs("#invoiceToken")?.addEventListener("input", function () {
    autoFillFromToken(this.value.trim());
    updateInvoicePreview();
  });
  qs("#invoiceVehicle")?.addEventListener("input", updateInvoicePreview);
  qs("#invoiceCustomer")?.addEventListener("input", updateInvoicePreview);
  qs("#cashReceived")?.addEventListener("input", function () {
    var cash = parseFloat(this.value) || 0;
    var total =
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
  var t = STATE.tokens.find(function (t) {
    return t.number.toLowerCase() === tn.toLowerCase();
  });
  if (!t) {
    toast("Token not found", "warning");
    return;
  }
  setValue("#invoiceVehicle", t.vehicleNo);
  setValue("#invoiceCustomer", t.ownerName || "");
  qs("#invoiceCustomer").dataset.contact = t.contactNumber || "";
  qs("#invoiceServicesContainer").innerHTML = "";
  qs("#invoiceProductsContainer").innerHTML = "";
  
  if (t.service) {
    var services = t.service.split(", ");
    services.forEach(function(svc) {
      if (svc) addInvoiceServiceRow(svc, getMatrixPrice(svc, t.vehicleType) || 0);
    });
  }
  
  if (t.products)
    t.products.forEach(function (p) {
      addInvoiceProductRow(p.fullName, p.price, p.qty);
    });
  
  if (t.discount) setValue("#invoiceDiscount", t.discount);
  else setValue("#invoiceDiscount", "0");
  
  updateInvoicePreview();
  setValue("#cashReceived", "");
  setText("#changeReturned", "Rs. 0");
}
function addInvoiceServiceRow(nm, pr) {
  nm = nm || "";
  pr = pr || 0;
  var op = STATE.pricingServices
    .map(function (s) {
      return (
        '<option value="' +
        s.name +
        '" data-price="' +
        (getMatrixPrice(s.name, qs("#invoiceVehicle")?.value || "") || 0) +
        '" ' +
        (s.name === nm ? "selected" : "") +
        ">" +
        sanitize(s.name) +
        "</option>"
      );
    })
    .join("");
  var r = document.createElement("div");
  r.className = "invoice-line-row";
  r.innerHTML =
    '<div class="form-group"><select class="form-input invoice-svc-select"><option value="">Select...</option>' +
    op +
    '</select></div><div class="form-group"><input type="number" class="form-input invoice-svc-price" value="' +
    pr +
    '" readonly style="background:var(--surface-active);"></div><div class="form-group"><input type="number" class="form-input invoice-svc-qty" value="1" min="1"></div><button class="btn-icon btn btn-danger-ghost" onclick="this.closest(\'.invoice-line-row\').remove();updateInvoicePreview();"><span class="material-icons">close</span></button>';
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
function addInvoiceProductRow(nm, pr, qt) {
  nm = nm || "";
  pr = pr || 0;
  qt = qt || 1;
  var av = getAllVariantsFlat();
  var op = av
    .map(function (v) {
      return (
        '<option value="' +
        v.sellingPrice +
        '" data-fullname="' +
        sanitize(v.fullName) +
        '" ' +
        (v.fullName === nm ? "selected" : "") +
        ">" +
        sanitize(v.fullName) +
        " | " +
        fmtPrice(v.sellingPrice) +
        "</option>"
      );
    })
    .join("");
  var r = document.createElement("div");
  r.className = "invoice-line-row";
  r.innerHTML =
    '<div class="form-group"><select class="form-input invoice-prd-select"><option value="">Select...</option>' +
    op +
    '</select></div><div class="form-group"><input type="number" class="form-input invoice-prd-price" value="' +
    pr +
    '" readonly style="background:var(--surface-active);"></div><div class="form-group"><input type="number" class="form-input invoice-prd-qty" value="' +
    qt +
    '" min="1"></div><button class="btn-icon btn btn-danger-ghost" onclick="this.closest(\'.invoice-line-row\').remove();updateInvoicePreview();"><span class="material-icons">close</span></button>';
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
  var cu = (qs("#invoiceCustomer")?.value || "").trim();
  if (!cu) {
    toast("Enter customer", "error");
    return;
  }
  var it = [];
  qsa(".invoice-line-row", qs("#invoiceServicesContainer")).forEach(
    function (r) {
      var s = r.querySelector(".invoice-svc-select"),
        nm = s?.options[s.selectedIndex]?.text || "",
        pr = parseFloat(r.querySelector(".invoice-svc-price")?.value) || 0,
        qt = parseInt(r.querySelector(".invoice-svc-qty")?.value) || 1;
      if (nm && nm !== "Select...")
        it.push({ name: nm, price: pr, qty: qt, type: "service" });
    },
  );
  qsa(".invoice-line-row", qs("#invoiceProductsContainer")).forEach(
    function (r) {
      var s = r.querySelector(".invoice-prd-select"),
        nm = s?.options[s.selectedIndex]?.dataset?.fullname || "",
        pr = parseFloat(r.querySelector(".invoice-prd-price")?.value) || 0,
        qt = parseInt(r.querySelector(".invoice-prd-qty")?.value) || 1;
      if (nm) it.push({ name: nm, price: pr, qty: qt, type: "product" });
    },
  );
  if (!it.length) {
    toast("Add items", "error");
    return;
  }
  var st = 0;
  it.forEach(function (i) {
    st += i.price * i.qty;
  });
  var discount = parseFloat(qs("#invoiceDiscount")?.value) || 0;
var stAfterDiscount = Math.max(0, st - discount);
var tx = stAfterDiscount * (STATE.settings.taxRate / 100);
var cr = parseFloat(qs("#cashReceived")?.value) || 0;
var gt = stAfterDiscount + tx;
  var invBizSelect = qs("#invoiceBusinessSelect");
  var businesses = getBusinesses();
  var biz;
  if (invBizSelect && invBizSelect.value) {
    biz = businesses.find(function (b) {
      return b.id === invBizSelect.value;
    });
  }
  if (!biz) {
    biz = getCurrentBusiness();
  }
  var prefix = biz.prefix;
  var counterKey = "invoiceCounter" + prefix;
  if (!STATE.counters[counterKey]) STATE.counters[counterKey] = 1;
  var invNumber =
    prefix + "-INV-" + String(STATE.counters[counterKey]).padStart(3, "0");
 var inv = {
    id: uid(),
    number: invNumber,
    date: fmtDate(),
    time: fmtTime(),
    token: (qs("#invoiceToken")?.value || "").trim(),
    vehicle: (qs("#invoiceVehicle")?.value || "").trim(),
    customer: cu,
    contactNumber: qs("#invoiceCustomer")?.dataset?.contact || "",
    items: it,
    subtotal: st,
    discount: discount,
    tax: tx,
    total: gt,
    cashReceived: cr,
    changeReturned: cr > 0 ? cr - gt : 0,
    status: cr >= gt && cr > 0 ? "PAID" : "UNPAID",
    paymentMethod: qs("#invoicePaymentMethod")?.value || "Cash",
    businessPrefix: prefix,
    businessId: biz.id,
    businessName: biz.name,
  };
  STATE.invoices.push(inv);
  STATE.counters[counterKey]++;
  saveInvoices();
  saveCounters();

  // Save current invoice ID for Print Receipt button
  qs("#invoiceToken").dataset.savedId = inv.id;

  var tn = inv.token;
  if (tn) {
    var tk = STATE.tokens.find(function (t) {
      return t.number.toLowerCase() === tn.toLowerCase();
    });
    if (tk && tk.status !== "completed") {
      tk.status = "completed";
      createReminderFromToken(tk);
      saveTokens();
    }
  }
  toast("Invoice " + inv.number + " saved", "success");
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
  var ct = qs("#invoiceCustomer")?.dataset?.contact || "";
  var ce = qs("#invCustomerContact");
  if (ce) ce.textContent = ct ? "📱 " + formatContactDisplay(ct) : "";
  setText("#invDate", fmtDate());
  var invBizSelect = qs("#invoiceBusinessSelect");
  var businesses = getBusinesses();
  var biz;
  if (invBizSelect && invBizSelect.value) {
    biz = businesses.find(function (b) {
      return b.id === invBizSelect.value;
    });
  }
  if (!biz) {
    biz = getCurrentBusiness();
  }
  var prefix = biz.prefix;
  var counterKey = "invoiceCounter" + prefix;
  if (!STATE.counters[counterKey]) STATE.counters[counterKey] = 1;
  setText(
    "#invNumber",
    prefix + "-INV-" + String(STATE.counters[counterKey]).padStart(3, "0"),
  );
  setText("#invBusinessName", biz.name);
  var it = [];
  qsa(".invoice-line-row", qs("#invoiceServicesContainer")).forEach(
    function (r) {
      var s = r.querySelector(".invoice-svc-select"),
        nm = s?.options[s.selectedIndex]?.text || "",
        pr = parseFloat(r.querySelector(".invoice-svc-price")?.value) || 0,
        qt = parseInt(r.querySelector(".invoice-svc-qty")?.value) || 1;
      if (nm && nm !== "Select...")
        it.push({ name: nm, price: pr, qty: qt, type: "service" });
    },
  );
  qsa(".invoice-line-row", qs("#invoiceProductsContainer")).forEach(
    function (r) {
      var s = r.querySelector(".invoice-prd-select"),
        nm = s?.options[s.selectedIndex]?.dataset?.fullname || "",
        pr = parseFloat(r.querySelector(".invoice-prd-price")?.value) || 0,
        qt = parseInt(r.querySelector(".invoice-prd-qty")?.value) || 1;
      if (nm) it.push({ name: nm, price: pr, qty: qt, type: "product" });
    },
  );
  var tb = qs("#invoiceItemsBody");
  if (!it.length) {
    if (tb) tb.innerHTML = '<tr><td colspan="5">No items</td></tr>';
    setText("#invSubtotal", fmtPrice(0));
    setText("#invTotal", fmtPrice(0));
    return;
  }
  var st = 0;
  if (tb)
    tb.innerHTML = it
      .map(function (item, i) {
        var am = item.price * item.qty;
        st += am;
        return (
          "<tr><td>" +
          (i + 1) +
          "</td><td>" +
          sanitize(item.name) +
          "</td><td>" +
          item.qty +
          "</td><td>" +
          fmtPrice(item.price) +
          '</td><td style="font-weight:600;">' +
          fmtPrice(am) +
          "</td></tr>"
        );
      })
      .join("");
 var discount = parseFloat(qs("#invoiceDiscount")?.value) || 0;
var stAfterDiscount = Math.max(0, st - discount);
var tx = stAfterDiscount * (STATE.settings.taxRate / 100);
setText("#invDiscount", fmtPrice(discount));
setText("#invTaxRate", STATE.settings.taxRate);
setText("#invTaxAmount", fmtPrice(tx));
setText("#invSubtotal", fmtPrice(st));
setText("#invTotal", fmtPrice(stAfterDiscount + tx));

// Update change returned
var cr = parseFloat(qs("#cashReceived")?.value) || 0;
var gt = stAfterDiscount + tx;
setText("#changeReturned", cr >= gt ? fmtPrice(cr - gt) : "Insufficient");
}
function renderSavedInvoices() {
  var tb = qs("#savedInvoiceTableBody");
  if (!tb) return;
  var countBadge = qs("#savedInvoiceCount");
  if (countBadge) countBadge.textContent = STATE.invoices.length;
  if (!STATE.invoices.length) {
    tb.innerHTML = '<tr><td colspan="8">No invoices</td></tr>';
    if (countBadge) countBadge.textContent = "0";
    return;
  }
  tb.innerHTML = STATE.invoices
    .map(function (inv) {
      return (
        '<tr><td style="font-weight:700;color:var(--primary);">' +
        sanitize(inv.number) +
        (inv.businessName
          ? ' <small style="color:var(--text-muted);">(' +
            sanitize(inv.businessPrefix || inv.businessName) +
            ")</small>"
          : "") +
        "</td><td>" +
        sanitize(inv.date) +
        "</td><td>" +
        sanitize(inv.customer) +
        (inv.contactNumber
          ? "<br><small>" +
            sanitize(formatContactDisplay(inv.contactNumber)) +
            "</small>"
          : "") +
        "</td><td>" +
        sanitize(inv.vehicle || "—") +
        "</td><td>" +
        sanitize(inv.token || "—") +
        '</td><td style="font-weight:600;">' +
        fmtPrice(inv.total) +
        '</td><td><span class="badge ' +
        (inv.status === "PAID" ? "badge--green" : "badge--red") +
        '">' +
        inv.status +
        '</span></td><td><div class="table-actions"><button class="btn btn-sm btn-outline" data-view-invoice="' +
        inv.id +
        '"><span class="material-icons">visibility</span></button><button class="btn btn-sm btn-primary" data-print-a4="' +
        inv.id +
        '"><span class="material-icons">print</span></button><button class="btn-icon btn btn-danger-ghost" data-delete-invoice="' +
        inv.id +
        '"><span class="material-icons">delete</span></button></div></td></tr>'
      );
    })
    .join("");
}
function viewInvoice(id) {
  var inv = STATE.invoices.find(function (i) {
    return i.id === id;
  });
  if (!inv) return;
  setValue("#invoiceToken", inv.token || "");
  setValue("#invoiceVehicle", inv.vehicle || "");
  setValue("#invoiceCustomer", inv.customer);
  if (inv.contactNumber)
    qs("#invoiceCustomer").dataset.contact = inv.contactNumber;
  setValue("#cashReceived", inv.cashReceived || "");
  qs("#invoiceServicesContainer").innerHTML = "";
  qs("#invoiceProductsContainer").innerHTML = "";
  inv.items.forEach(function (item) {
    if (item.type === "service") addInvoiceServiceRow(item.name, item.price);
    else addInvoiceProductRow(item.name, item.price, item.qty);
  });
  updateInvoicePreview();
  setText("#invNumber", inv.number);
  setText("#invDate", inv.date);
  setText("#invBusinessName", inv.businessName || STATE.settings.businessName);
}
function printSavedReceipt(id) {
  viewInvoice(id);
  setTimeout(function () {
    printThermalReceipt();
  }, 400);
}
function printThermalReceipt() {
  var invNumber = (qs("#invNumber")?.textContent || "").trim(),
    invDate = (qs("#invDate")?.textContent || "").trim(),
    invCustomer = (qs("#invCustomer")?.textContent || "").trim();
  var biz = getCurrentBusiness();
  var businessName =
      qs("#invBusinessName")?.textContent || biz.name || "Service Station",
    address = biz.address || STATE.settings.address || "Main Road, City",
    phone = biz.phone || STATE.settings.phone || "0300-0000000";
  var items = [];
  qsa(".invoice-line-row", qs("#invoiceServicesContainer")).forEach(
    function (r) {
      var s = r.querySelector(".invoice-svc-select"),
        nm = s?.options[s.selectedIndex]?.text || "",
        pr = parseFloat(r.querySelector(".invoice-svc-price")?.value) || 0,
        qt = parseInt(r.querySelector(".invoice-svc-qty")?.value) || 1;
      if (nm && nm !== "Select...")
        items.push({ name: nm, price: pr, qty: qt });
    },
  );
  qsa(".invoice-line-row", qs("#invoiceProductsContainer")).forEach(
    function (r) {
      var s = r.querySelector(".invoice-prd-select"),
        nm = s?.options[s.selectedIndex]?.dataset?.fullname || "",
        pr = parseFloat(r.querySelector(".invoice-prd-price")?.value) || 0,
        qt = parseInt(r.querySelector(".invoice-prd-qty")?.value) || 1;
      if (nm) items.push({ name: nm, price: pr, qty: qt });
    },
  );
  var grandTotal = items.reduce(function (t, i) {
    return t + i.price * i.qty;
  }, 0);
  var cashReceived = parseFloat(qs("#cashReceived")?.value) || 0,
    paymentStatus =
      cashReceived >= grandTotal && cashReceived > 0 ? "PAID" : "UNPAID";
  var printTime = new Date().toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  var fmtRs = function (n) {
    return "Rs. " + (Number(n) || 0).toLocaleString("en-PK");
  };
  var itemsHTML = items
    .map(function (i) {
      return (
        "<tr><td>" +
        sanitize(i.name) +
        "</td><td>x" +
        i.qty +
        '</td><td align="right">' +
        fmtRs(i.price * i.qty) +
        "</td></tr>"
      );
    })
    .join("");
  var h =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:80mm auto;margin:0}*{box-sizing:border-box}body{font-family:"Arial","Helvetica",sans-serif;font-size:9.5pt;padding:1.5mm 2mm;width:100%;margin:0}.hed{text-align:center;border-bottom:1px solid #000;padding-bottom:1.5mm;margin-bottom:1.5mm}.ttl{font-size:12pt;font-weight:900;text-transform:uppercase}.row{display:flex;justify-content:space-between;padding:0.5mm 0}table{width:100%;border-collapse:collapse;font-size:9pt;margin:1mm 0}td{padding:0.8mm 0}.tot{border-top:1px solid #000;border-bottom:1px solid #000;text-align:center;padding:1.5mm;font-weight:900;font-size:12pt;margin-top:1mm}.ftr{text-align:center;font-size:8pt;margin-top:2mm}</style></head><body><div class="hed"><div class="ttl">' +
    sanitize(businessName) +
    "</div><div>" +
    sanitize(address) +
    "</div><div>Tel: " +
    sanitize(phone) +
    '</div></div><div class="row"><span>Receipt:</span><b>' +
    sanitize(invNumber) +
    '</b></div><div class="row"><span>Date:</span><span>' +
    sanitize(invDate) +
    " " +
    sanitize(printTime) +
    '</span></div><div class="row"><span>Customer:</span><b>' +
    sanitize(invCustomer) +
    '</b></div><table width="100%">' +
    itemsHTML +
    '</table><div class="tot">Grand Total: ' +
    fmtRs(grandTotal) +
    '</div><div style="text-align:center;font-weight:bold">*** ' +
    paymentStatus +
    ' ***</div><div class="ftr">Thank You!<br>DESIGN ORBITS<br>03225267908</div></body></html>';
  if (window.electronAPI && window.electronAPI.printReceipt) {
    window.electronAPI
      .printReceipt(h, {
        silent: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      })
      .then(function (result) {
        if (!result || !result.success) {
          var reason = result ? result.reason : "unknown";
          toast(
            reason === "no-printer"
              ? "No printer"
              : reason === "timeout"
                ? "Timeout"
                : "Print fail: " + reason,
            "error",
          );
        }
      })
      .catch(function () {
        toast("Print error", "error");
      });
  } else {
    var w = window.open("", "_blank");
    w.document.write(h);
    w.document.close();
    setTimeout(function () {
      w.print();
    }, 500);
  }
}

// ==================== TOKEN PRINTING ====================
function printTokenReceipt(tokenId) {
  var t = STATE.tokens.find(function (t) {
    return t.id === tokenId;
  });
  if (!t) {
    toast("Token not found", "error");
    return;
  }
  var biz = getCurrentBusiness();
  var businessName = biz.name || "Wheel Works Service Station";
  var address = biz.address || "Main Road, City";
  var phone = biz.phone || "0300-0000000";
  var printTime = new Date().toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  var printDate = fmtDate();
  var customerCopy = generateThermalCustomerCopy(
    t,
    businessName,
    address,
    phone,
    printDate,
    printTime,
  );
  var cashierCopy = generateThermalCashierCopy(
    t,
    businessName,
    address,
    phone,
    printDate,
    printTime,
  );
  toast("Printing Customer Copy...", "info");
  _printSingleCopy(customerCopy, function (success) {
    if (success) {
      toast("Printing Cashier Copy...", "info");
      setTimeout(function () {
        _printSingleCopy(cashierCopy, function (success2) {
          if (success2) {
            toast("Both copies printed", "success");
          } else {
            toast("Cashier Copy failed", "error");
          }
        });
      }, 1000);
    } else {
      toast("Customer Copy failed", "error");
    }
  });
}

function _printSingleCopy(htmlContent, callback) {
  if (window.electronAPI && window.electronAPI.printReceipt) {
    window.electronAPI
      .printReceipt(htmlContent, {
        pageSize: { width: 80000, height: 297000 },
        silent: true,
      })
      .then(function (result) {
        if (callback) callback(true);
      })
      .catch(function () {
        if (callback) callback(true);
      });
  } else {
    var w = window.open("", "_blank");
    if (w) {
      w.document.write(htmlContent);
      w.document.close();
      setTimeout(function () {
        w.print();
        w.close();
        if (callback) callback(true);
      }, 800);
    } else {
      if (callback) callback(true);
    }
  }
}

function generateThermalCustomerCopy(token, businessName, address, phone, date, time) {
  var itemsHTML = '';
  var discount = token.discount || 0;
  var totalAmount = 0;

  if (token.service) {
    var services = token.service.split(", ");
    services.forEach(function(svc) {
      if (svc) {
        var svcPrice = getMatrixPrice(svc, token.vehicleType) || 0;
        itemsHTML += '<div class="svc-row"><span class="svc-dot">•</span><span>' + sanitize(svc) + '</span><span class="svc-price">' + fmtPrice(svcPrice) + '</span></div>';
        totalAmount += svcPrice;
      }
    });
  }
  if (token.products && token.products.length > 0) {
    token.products.forEach(function(p) {
      itemsHTML += '<div class="svc-row"><span class="svc-dot">•</span><span>' + sanitize(p.fullName) + ' x' + p.qty + '</span><span class="svc-price">' + fmtPrice(p.price * p.qty) + '</span></div>';
      totalAmount += p.price * p.qty;
    });
  }
  
  var grandTotal = Math.max(0, totalAmount - discount);

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Arial","Helvetica",sans-serif;width:74mm;padding:2mm;font-size:11pt;color:#000;background:#fff}.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:3mm}.biz{font-size:13pt;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;line-height:1.1}.addr{font-size:8pt;color:#333;margin-top:0.5mm}.tok-box{text-align:center;margin:3mm 0;padding:2.5mm;border:2px solid #000}.tok-lbl{font-size:6.5pt;text-transform:uppercase;letter-spacing:2px;color:#555}.tok-num{font-size:20pt;font-weight:900;letter-spacing:1.5px;margin:1mm 0;line-height:1}.info{margin:3mm 0}.info-row{display:flex;padding:1mm 0;border-bottom:1px dotted #ccc;font-size:9.5pt}.info-lbl{width:28%;font-weight:700;font-size:7.5pt;text-transform:uppercase;color:#555;padding-top:0.5mm}.info-val{flex:1;font-weight:600}.svc-title{font-size:7.5pt;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin:3mm 0 1mm 0;border-top:1px solid #000;padding-top:2mm}.svc-row{display:flex;align-items:flex-start;gap:1.5mm;padding:0.5mm 0;font-size:9pt}.svc-dot{font-weight:900;color:#000}.svc-price{margin-left:auto;font-weight:700}.discount-row{display:flex;justify-content:space-between;padding:1mm 0;font-size:10pt;font-weight:700}.total-row{display:flex;justify-content:space-between;padding:1.5mm 0;margin-top:1mm;border-top:2px solid #000;border-bottom:2px solid #000;font-size:11pt;font-weight:900}.ftr{text-align:center;margin-top:3mm;border-top:2px solid #000;padding-top:2mm}.thanks{font-size:12pt;font-weight:900;text-transform:uppercase}.ftr-note{font-size:7.5pt;color:#555;margin-top:0.5mm}.cut{text-align:center;margin:3mm 0 1.5mm 0;border-top:1px dashed #999;padding-top:1mm;font-size:6.5pt;color:#999;letter-spacing:2px}</style></head><body><div class="hdr"><div class="biz">' + sanitize(businessName) + '</div><div class="addr">' + sanitize(address) + '</div><div class="addr">Tel: ' + sanitize(phone) + '</div></div><div class="tok-box"><div class="tok-lbl">Token Number</div><div class="tok-num">' + sanitize(token.number) + '</div></div><div class="info"><div class="info-row"><span class="info-lbl">Customer</span><span class="info-val">' + sanitize(token.ownerName || "N/A") + '</span></div><div class="info-row"><span class="info-lbl">Vehicle</span><span class="info-val">' + sanitize(token.vehicleNo) + ' (' + sanitize(token.vehicleType) + ')</span></div><div class="info-row"><span class="info-lbl">Phone</span><span class="info-val">' + sanitize(formatContactDisplay(token.contactNumber || "N/A")) + '</span></div><div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' + sanitize(date) + '</span></div><div class="info-row"><span class="info-lbl">Time</span><span class="info-val">' + sanitize(time) + '</span></div></div><div class="svc-title">Services & Products</div>' + (itemsHTML || '<div class="svc-row"><span class="svc-dot">•</span><span>N/A</span></div>') + (discount > 0 ? '<div class="discount-row"><span>Discount</span><span>-' + fmtPrice(discount) + '</span></div>' : '') + '<div class="total-row"><span>TOTAL</span><span>' + fmtPrice(grandTotal) + '</span></div><div class="ftr"><div class="thanks">Thank You!</div><div class="ftr-note">Please keep this token for Transaction ID</div><div class="ftr-note">' + sanitize(phone) + '</div></div><div class="cut">- - - ✂ CUSTOMER COPY ✂ - - -</div></body></html>';
}
function generateThermalCashierCopy(token, businessName, address, phone, date, time) {
  var itemsHTML = '';
  var discount = token.discount || 0;
  var totalAmount = token.servicePrice || 0;

  if (token.service) {
    var services = token.service.split(", ");
    services.forEach(function(svc) {
      if (svc) {
        var svcPrice = getMatrixPrice(svc, token.vehicleType) || 0;
        itemsHTML += '<div class="svc-row"><span class="svc-dot">•</span><span>' + sanitize(svc) + '</span><span class="svc-price">' + fmtPrice(svcPrice) + '</span></div>';
        totalAmount += svcPrice;
      }
    });
  }
  if (token.products && token.products.length > 0) {
    token.products.forEach(function(p) {
      itemsHTML += '<div class="svc-row"><span class="svc-dot">•</span><span>' + sanitize(p.fullName) + ' x' + p.qty + '</span><span class="svc-price">' + fmtPrice(p.price * p.qty) + '</span></div>';
      totalAmount += p.price * p.qty;
    });
  }
  
  totalAmount = Math.max(0, totalAmount - discount);

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Arial","Helvetica",sans-serif;width:74mm;padding:2mm;font-size:11pt;color:#000;background:#fff}.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:3mm;background:#f5f5f5;padding:2mm}.biz{font-size:13pt;font-weight:900;text-transform:uppercase;letter-spacing:0.5px}.copy-badge{display:inline-block;background:#000;color:#fff;font-size:9pt;font-weight:900;padding:1mm 5mm;margin-top:1mm;letter-spacing:1px}.tok-num{font-size:16pt;font-weight:900;text-align:center;margin:3mm 0;padding:2mm;border:1px solid #000}.info{margin:3mm 0}.info-row{display:flex;padding:1mm 0;border-bottom:1px dotted #ccc;font-size:9.5pt}.info-lbl{width:28%;font-weight:700;font-size:7.5pt;text-transform:uppercase;color:#555;padding-top:0.5mm}.info-val{flex:1;font-weight:600}.svc-title{font-size:7.5pt;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin:3mm 0 1mm 0;border-top:1px solid #000;padding-top:2mm}.svc-row{display:flex;align-items:flex-start;gap:1.5mm;padding:0.5mm 0;font-size:9pt}.svc-dot{font-weight:900;color:#000}.svc-price{margin-left:auto;font-weight:700}.total-row{display:flex;justify-content:space-between;padding:1.5mm 0;margin-top:1mm;border-top:2px solid #000;border-bottom:2px solid #000;font-size:11pt;font-weight:900}.notes-box{border:1px solid #ccc;padding:2mm;min-height:12mm;font-size:8pt;color:#555;margin-top:3mm}.notes-title{font-size:7.5pt;font-weight:900;text-transform:uppercase;margin-bottom:1mm}.ftr{text-align:center;margin-top:2mm;border-top:1px solid #000;padding-top:1.5mm;font-size:6.5pt;color:#555}</style></head><body><div class="hdr"><div class="biz">' + sanitize(businessName) + '</div><div class="copy-badge">ATTENDANT\'S COPY</div></div><div class="tok-num">TOKEN: ' + sanitize(token.number) + '</div><div class="info"><div class="info-row"><span class="info-lbl">Customer</span><span class="info-val">' + sanitize(token.ownerName || "N/A") + '</span></div><div class="info-row"><span class="info-lbl">Vehicle</span><span class="info-val">' + sanitize(token.vehicleNo) + '</span></div><div class="info-row"><span class="info-lbl">Type</span><span class="info-val">' + sanitize(token.vehicleType) + '</span></div><div class="info-row"><span class="info-lbl">Phone</span><span class="info-val">' + sanitize(formatContactDisplay(token.contactNumber || "N/A")) + '</span></div><div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' + sanitize(date) + ' ' + sanitize(time) + '</span></div></div><div class="svc-title">Services & Products</div>' + (itemsHTML || '<div class="svc-row"><span class="svc-dot">•</span><span>No items</span></div>') + (discount > 0 ? '<div class="total-row"><span>Discount</span><span>' + fmtPrice(discount) + '</span></div>' : '') + '<div class="total-row"><span>TOTAL</span><span>' + fmtPrice(totalAmount) + '</span></div><div class="notes-box"><div class="notes-title">Notes / Remarks</div></div><div class="ftr">' + sanitize(businessName) + ' | ' + sanitize(phone) + ' | Attendant\'s Copy</div></body></html>';
}

function generateThermalCashierCopy(
  token,
  businessName,
  address,
  phone,
  date,
  time,
) {
  var itemsHTML = "";
  var totalAmount = token.servicePrice || 0;

  if (token.service) {
    var svcPrice =
      token.servicePrice ||
      getMatrixPrice(token.service, token.vehicleType) ||
      0;
    itemsHTML +=
      '<div class="svc-row"><span class="svc-dot">•</span><span>' +
      sanitize(token.service) +
      '</span><span class="svc-price">' +
      fmtPrice(svcPrice) +
      "</span></div>";
    totalAmount = Math.max(totalAmount, svcPrice);
  }
  if (token.products && token.products.length > 0) {
    token.products.forEach(function (p) {
      itemsHTML +=
        '<div class="svc-row"><span class="svc-dot">•</span><span>' +
        sanitize(p.fullName) +
        " x" +
        p.qty +
        '</span><span class="svc-price">' +
        fmtPrice(p.price * p.qty) +
        "</span></div>";
      totalAmount += p.price * p.qty;
    });
  }

  return (
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Arial","Helvetica",sans-serif;width:74mm;padding:2mm;font-size:11pt;color:#000;background:#fff}.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:3mm;background:#f5f5f5;padding:2mm}.biz{font-size:13pt;font-weight:900;text-transform:uppercase;letter-spacing:0.5px}.copy-badge{display:inline-block;background:#000;color:#fff;font-size:9pt;font-weight:900;padding:1mm 5mm;margin-top:1mm;letter-spacing:1px}.tok-num{font-size:16pt;font-weight:900;text-align:center;margin:3mm 0;padding:2mm;border:1px solid #000}.info{margin:3mm 0}.info-row{display:flex;padding:1mm 0;border-bottom:1px dotted #ccc;font-size:9.5pt}.info-lbl{width:28%;font-weight:700;font-size:7.5pt;text-transform:uppercase;color:#555;padding-top:0.5mm}.info-val{flex:1;font-weight:600}.svc-title{font-size:7.5pt;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin:3mm 0 1mm 0;border-top:1px solid #000;padding-top:2mm}.svc-row{display:flex;align-items:flex-start;gap:1.5mm;padding:0.5mm 0;font-size:9pt}.svc-dot{font-weight:900;color:#000}.svc-price{margin-left:auto;font-weight:700}.total-row{display:flex;justify-content:space-between;padding:1.5mm 0;margin-top:1mm;border-top:2px solid #000;border-bottom:2px solid #000;font-size:11pt;font-weight:900}.notes-box{border:1px solid #ccc;padding:2mm;min-height:12mm;font-size:8pt;color:#555;margin-top:3mm}.notes-title{font-size:7.5pt;font-weight:900;text-transform:uppercase;margin-bottom:1mm}.ftr{text-align:center;margin-top:2mm;border-top:1px solid #000;padding-top:1.5mm;font-size:6.5pt;color:#555}</style></head><body><div class="hdr"><div class="biz">' +
    sanitize(businessName) +
    '</div><div class="copy-badge">ATTENDANT\'S COPY</div></div><div class="tok-num">TOKEN: ' +
    sanitize(token.number) +
    '</div><div class="info"><div class="info-row"><span class="info-lbl">Customer</span><span class="info-val">' +
    sanitize(token.ownerName || "N/A") +
    '</span></div><div class="info-row"><span class="info-lbl">Vehicle</span><span class="info-val">' +
    sanitize(token.vehicleNo) +
    '</span></div><div class="info-row"><span class="info-lbl">Type</span><span class="info-val">' +
    sanitize(token.vehicleType) +
    '</span></div><div class="info-row"><span class="info-lbl">Phone</span><span class="info-val">' +
    sanitize(formatContactDisplay(token.contactNumber || "N/A")) +
    '</span></div><div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' +
    sanitize(date) +
    " " +
    sanitize(time) +
    '</span></div></div><div class="svc-title">Services & Products</div>' +
    (itemsHTML ||
      '<div class="svc-row"><span class="svc-dot">•</span><span>No items</span></div>') +
    '<div class="total-row"><span>TOTAL</span><span>' +
    fmtPrice(totalAmount) +
    '</span></div><div class="notes-box"><div class="notes-title">Notes / Remarks</div></div><div class="ftr">' +
    sanitize(businessName) +
    " | " +
    sanitize(phone) +
    " | Attendant's Copy</div></body></html>"
  );
}
// ==================== A4 INVOICE PRINTING ====================
function printA4Invoice(invoiceId) {
  var inv = STATE.invoices.find(function (i) {
    return i.id === invoiceId;
  });
  if (!inv) {
    toast("Invoice not found", "error");
    return;
  }
  var biz = getCurrentBusiness();
  var content = generateA4Invoice(inv, biz);

  if (window.electronAPI && window.electronAPI.printReceipt) {
    window.electronAPI
      .printReceipt(content, {
        pageSize: { width: 210000, height: 297000 },
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        landscape: false,
        printBackground: true,
      })
      .then(function (result) {
        if (!result || !result.success) {
          toast(
            "A4 print failed: " + (result ? result.reason : "unknown"),
            "error",
          );
        }
      })
      .catch(function () {
        toast("A4 print error", "error");
      });
  } else {
    var w = window.open("", "_blank");
    w.document.write(content);
    w.document.close();
    setTimeout(function () {
      w.print();
    }, 500);
  }
}

function generateA4Invoice(inv, biz) {
  var itemsRows = "";
  var subtotal = 0;
  var servicesTotal = 0;
  var productsTotal = 0;

  inv.items.forEach(function (item, i) {
    var amount = item.price * item.qty;
    subtotal += amount;
    if (item.type === "service") { servicesTotal += amount; }
    else { productsTotal += amount; }
    itemsRows +=
      '<tr><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + (i+1) + '</td><td style="border:1px solid #000;padding:1.5mm">' + sanitize(item.name) + '</td><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + item.qty + '</td><td style="text-align:right;border:1px solid #000;padding:1.5mm">' + fmtPrice(item.price) + '</td><td style="text-align:right;font-weight:700;border:1px solid #000;padding:1.5mm">' + fmtPrice(amount) + '</td></tr>';
  });

  var discount = inv.discount || 0;
  var discountedSubtotal = Math.max(0, subtotal - discount);
  var grandTotal = inv.total || discountedSubtotal;
  var cashReceived = inv.cashReceived || 0;
  var balanceReturned = Math.max(0, cashReceived - grandTotal);
  var paymentStatus = cashReceived >= grandTotal && cashReceived > 0 ? "PAID" : "UNPAID";

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#000;font-size:10pt;line-height:1.3;background:#fff}.page{max-width:190mm;margin:0 auto}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #000;padding-bottom:4mm;margin-bottom:4mm}.biz-name{font-size:16pt;font-weight:900;color:#000;text-transform:uppercase}.biz-addr{font-size:8pt;color:#000}.logo{width:16mm;height:16mm;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-size:18pt;font-weight:900;color:#000}.ttl-box{border:2px solid #000;display:inline-block;padding:2mm 6mm;margin:4mm 0}.ttl{font-size:12pt;font-weight:900;color:#000;letter-spacing:2px}.info-grid{display:flex;gap:4mm;margin-bottom:4mm}.info-box{flex:1;border:1px solid #000;padding:2mm}.info-box-title{font-size:7pt;font-weight:900;color:#000;border-bottom:1px solid #000;padding-bottom:1mm;margin-bottom:1.5mm;text-transform:uppercase}.info-row{display:flex;justify-content:space-between;padding:0.6mm 0;font-size:8pt;color:#000}.info-lbl{font-weight:700;color:#000}.info-val{font-weight:700;color:#000}.tbl{width:100%;border-collapse:collapse;margin:4mm 0;border:1px solid #000}.tbl th{border:1px solid #000;padding:2mm;font-size:8pt;text-transform:uppercase;color:#000;font-weight:900}.tbl td{border:1px solid #000;padding:1.5mm;font-size:9pt;color:#000}.sum-box{display:flex;justify-content:flex-end;margin-top:3mm}.sum-tbl{width:40%;border-collapse:collapse;border:1px solid #000}.sum-tbl td{padding:2mm;border:1px solid #000;color:#000;font-size:9pt}.sum-tbl .gt td{font-weight:900;font-size:12pt;color:#000;border:2px solid #000}.sig-section{display:flex;gap:5mm;margin-top:8mm}.sig-box{flex:1;text-align:center}.sig-line{border-top:1px solid #000;margin-top:10mm;padding-top:2mm;font-size:7pt;color:#000}.ftr{text-align:center;margin-top:6mm;border-top:1px solid #000;padding-top:2mm;font-size:7pt;color:#000}</style></head><body><div class="page"><div class="hdr"><div><div class="biz-name">' + sanitize(biz.name) + '</div><div class="biz-addr">' + sanitize(biz.address) + '</div><div class="biz-addr">Tel: ' + sanitize(biz.phone) + ' | ' + sanitize(biz.email) + '</div></div><div class="logo">' + sanitize(biz.prefix) + '</div></div><div class="ttl-box"><span class="ttl">INVOICE</span></div><div class="info-grid"><div class="info-box"><div class="info-box-title">Bill To</div><div class="info-row"><span class="info-lbl">Customer</span><span class="info-val">' + sanitize(inv.customer || "—") + '</span></div><div class="info-row"><span class="info-lbl">Phone</span><span class="info-val">' + sanitize(formatContactDisplay(inv.contactNumber || "N/A")) + '</span></div><div class="info-row"><span class="info-lbl">Vehicle</span><span class="info-val">' + sanitize(inv.vehicle || "—") + '</span></div><div class="info-row"><span class="info-lbl">Token</span><span class="info-val">' + sanitize(inv.token || "—") + '</span></div></div><div class="info-box"><div class="info-box-title">Payment Info</div><div class="info-row"><span class="info-lbl">Status</span><span class="info-val" style="font-weight:900">' + paymentStatus + '</span></div><div class="info-row"><span class="info-lbl">Method</span><span class="info-val">' + sanitize(inv.paymentMethod || "Cash") + '</span></div><div class="info-row"><span class="info-lbl">Business</span><span class="info-val">' + sanitize(biz.name) + '</span></div></div></div><table class="tbl"><thead><tr><th style="width:6%;text-align:center">#</th><th>Description</th><th style="width:10%;text-align:center">Qty</th><th style="width:18%;text-align:right">Rate</th><th style="width:20%;text-align:right">Amount</th></tr></thead><tbody>' + itemsRows + '</tbody></table><div class="sum-box"><table class="sum-tbl"><tr><td style="font-weight:700">Subtotal</td><td style="text-align:right;font-weight:700">' + fmtPrice(subtotal) + '</td></tr>' + (discount > 0 ? '<tr><td>Discount</td><td style="text-align:right">' + fmtPrice(discount) + '</td></tr>' : '') + (servicesTotal > 0 ? '<tr><td>Services</td><td style="text-align:right">' + fmtPrice(servicesTotal) + '</td></tr>' : '') + (productsTotal > 0 ? '<tr><td>Products</td><td style="text-align:right">' + fmtPrice(productsTotal) + '</td></tr>' : '') + '<tr><td>Cash Received</td><td style="text-align:right">' + fmtPrice(cashReceived) + '</td></tr><tr><td>Change</td><td style="text-align:right">' + fmtPrice(balanceReturned) + '</td></tr><tr class="gt"><td style="font-weight:900">GRAND TOTAL</td><td style="text-align:right;font-weight:900">' + fmtPrice(grandTotal) + '</td></tr></table></div><div class="sig-section"><div class="sig-box"><div class="sig-line"></div>Authorized Signature</div><div class="sig-box"><div class="sig-line"></div>Customer Signature</div></div><div class="ftr">' + sanitize(biz.name) + ' | ' + sanitize(biz.phone) + ' | Thank you for your business</div></div></body></html>';
}

function generateThermalInvoice(inv, biz) {
  var itemsRows = "";
  var subtotal = 0;
  inv.items.forEach(function (item, i) {
    var amount = item.price * item.qty;
    subtotal += amount;
    itemsRows +=
      '<tr><td style="padding:1.2mm 0;font-size:9pt;color:#000">' +
      sanitize(item.name) +
      '</td><td style="text-align:right;font-size:9pt;font-weight:900;color:#000">' +
      fmtPrice(amount) +
      "</td></tr>";
  });
  var discount = inv.discount || 0;
  var grandTotal = Math.max(0, subtotal - discount);
  var cashReceived = inv.cashReceived || 0;
  var balanceReturned = Math.max(0, cashReceived - grandTotal);

  return (
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    "*{margin:0;padding:0;box-sizing:border-box}" +
    'body{font-family:"Arial","Helvetica",sans-serif;width:74mm;padding:2mm;font-size:10pt;color:#000;background:#fff;line-height:1.3}' +
    ".hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:3mm}" +
    ".biz{font-size:14pt;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;color:#000}" +
    ".addr{font-size:8pt;color:#000;margin-top:0.5mm}" +
    ".inv-box{text-align:center;margin:3mm 0;padding:2mm;border:2px solid #000}" +
    ".inv-lbl{font-size:7pt;text-transform:uppercase;letter-spacing:2px;color:#000}" +
    ".inv-num{font-size:14pt;font-weight:900;letter-spacing:1px;color:#000}" +
    ".info{margin:3mm 0}" +
    ".info-row{display:flex;padding:0.8mm 0;border-bottom:1px dotted #ccc;font-size:9pt}" +
    ".info-lbl{width:28%;font-weight:700;font-size:7.5pt;text-transform:uppercase;color:#000;padding-top:0.5mm}" +
    ".info-val{flex:1;font-weight:700;color:#000}" +
    ".sec-title{font-size:8pt;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin:3mm 0 1mm 0;border-top:1px solid #000;padding-top:2mm;text-align:center;color:#000}" +
    ".tbl{width:100%;border-collapse:collapse;margin:1mm 0}" +
    ".tbl th{background:#000;color:#fff;padding:1.5mm;font-size:7.5pt;text-transform:uppercase}" +
    ".sum-box{margin-top:2mm;border-top:2px solid #000;padding-top:1.5mm}" +
    ".sum-row{display:flex;justify-content:space-between;font-size:9pt;padding:0.8mm 0;border-bottom:1px dotted #ccc;font-weight:700;color:#000}" +
    ".grand{display:flex;justify-content:space-between;font-size:13pt;font-weight:900;padding:2mm;border:2px solid #000;margin-top:2mm;color:#000}" +
    ".ftr{text-align:center;font-size:7.5pt;color:#000;margin-top:3mm;border-top:1px solid #000;padding-top:2mm}" +
    "</style></head><body>" +
    '<div class="hdr"><div class="biz">' +
    sanitize(biz.name) +
    '</div><div class="addr">' +
    sanitize(biz.address) +
    '</div><div class="addr">Tel: ' +
    sanitize(biz.phone) +
    "</div></div>" +
    '<div class="inv-box"><div class="inv-lbl">INVOICE</div><div class="inv-num">' +
    sanitize(inv.number) +
    "</div></div>" +
    '<div class="info">' +
    '<div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' +
    sanitize(inv.date) + " " + sanitize(inv.time) +
    "</span></div>" +
    '<div class="info-row"><span class="info-lbl">Customer</span><span class="info-val">' +
    sanitize(inv.customer) +
    "</span></div>" +
    '<div class="info-row"><span class="info-lbl">Vehicle</span><span class="info-val">' +
    sanitize(inv.vehicle || "—") +
    "</span></div>" +
    "</div>" +
    '<div class="sec-title">Items</div>' +
    '<table class="tbl"><thead><tr><th style="text-align:left">Description</th><th style="width:30%;text-align:right">Amount</th></tr></thead><tbody>' +
    itemsRows +
    "</tbody></table>" +
    '<div class="sum-box">' +
    '<div class="sum-row"><span>Subtotal</span><span>' + fmtPrice(subtotal) + "</span></div>" +
    (discount > 0 ? '<div class="sum-row"><span>Discount</span><span>' + fmtPrice(discount) + "</span></div>" : "") +
    '<div class="sum-row"><span>Cash</span><span>' + fmtPrice(cashReceived) + "</span></div>" +
    '<div class="sum-row"><span>Change</span><span>' + fmtPrice(balanceReturned) + "</span></div>" +
    '<div class="grand"><span>TOTAL</span><span>' + fmtPrice(grandTotal) + "</span></div>" +
    "</div>" +
    '<div class="ftr">Thank You!<br>' +
    sanitize(biz.name) + " | " + sanitize(biz.phone) +
    "</div>" +
    "</body></html>"
  );
}

/// ==================== PRODUCT SALE ====================
function initProductSales() {
  qs("#addSaleProductBtn")?.addEventListener("click", addSaleProductRow);
  qs("#saveProductSaleBtn")?.addEventListener("click", saveProductSale);
  qs("#printProductSaleReceiptBtn")?.addEventListener("click", function() {
    var lastSale = STATE.productSales[STATE.productSales.length - 1];
    if (lastSale) { printSaleReceipt(lastSale.id); }
  });
  var tb = qs("#productSalesHistory");
  if (tb) { renderProductSalesHistoryNow(); }
}

function addSaleProductRow() {
  var c = qs("#saleProductsContainer");
  if (!c) return;
  var opts = getAllVariantsFlat().filter(function(v) { return v.stock > 0; }).map(function(v) {
    return '<option value="' + v.id + '" data-price="' + v.sellingPrice + '" data-stock="' + v.stock + '">' + sanitize(v.fullName) + " | " + fmtPrice(v.sellingPrice) + "</option>";
  }).join("");
  var r = document.createElement("div");
  r.style.cssText = "display:grid;grid-template-columns:1fr 50px 80px 80px 28px;gap:5px;align-items:center;margin-bottom:6px;";
  r.innerHTML = '<select class="form-input sale-product-select" style="padding:5px 3px;font-size:0.7rem;"><option value="">Select</option>' + opts + '</select><input type="number" class="form-input sale-product-qty" value="1" min="1" style="padding:5px 2px;font-size:0.75rem;text-align:center;" /><input type="number" class="form-input sale-product-price" value="0" readonly style="padding:5px 2px;font-size:0.75rem;background:var(--surface-active);text-align:right;" /><span class="sale-product-subtotal" style="font-weight:700;font-size:0.8rem;text-align:right;color:#000">Rs. 0</span><button class="btn-icon btn btn-danger-ghost" onclick="this.closest(\'div\').remove();updateSaleTotal();"><span class="material-icons">close</span></button>';
  c.appendChild(r);
  var s = r.querySelector(".sale-product-select");
  s.addEventListener("change", function() {
    var o = this.options[this.selectedIndex];
    var pr = parseFloat(o?.dataset?.price) || 0;
    r.querySelector(".sale-product-price").value = pr;
    r.querySelector(".sale-product-qty").max = parseInt(o?.dataset?.stock) || 0;
    updateRowSubtotal(r); updateSaleTotal();
  });
  r.querySelector(".sale-product-qty").addEventListener("input", function() { updateRowSubtotal(r); updateSaleTotal(); });
}

function updateRowSubtotal(row) {
  var qty = parseInt(row.querySelector(".sale-product-qty")?.value) || 0;
  var price = parseFloat(row.querySelector(".sale-product-price")?.value) || 0;
  row.querySelector(".sale-product-subtotal").textContent = fmtPrice(qty * price);
}

function updateSaleTotal() {
  var t = 0;
  qsa("#saleProductsContainer > div").forEach(function(row) {
    t += parseFloat(row.querySelector(".sale-product-qty")?.value || 0) * parseFloat(row.querySelector(".sale-product-price")?.value || 0);
  });
  setText("#saleGrandTotal", fmtPrice(t));
}

function saveProductSale() {
  var cu = (qs("#saleCustomerName")?.value || "").trim(), vn = (qs("#saleVehicleNo")?.value || "").trim();
  var items = [];
  qsa("#saleProductsContainer .sale-product-select").forEach(function(s, i) {
    var vid = s.value; if (!vid) return;
    var f = findVariantById(vid); if (!f) return;
    var q = parseInt(qsa("#saleProductsContainer .sale-product-qty")[i]?.value) || 1;
    var p = parseFloat(qsa("#saleProductsContainer .sale-product-price")[i]?.value) || f.variant.sellingPrice;
    items.push({ variantId: vid, fullName: f.fullName, qty: q, price: p });
  });
  if (!items.length) { toast("Add products", "error"); return; }
  var t = 0; items.forEach(function(i) { t += i.qty * i.price; });
  items.forEach(function(i) { var f = findVariantById(i.variantId); if (f) f.variant.stock = Math.max(0, f.variant.stock - i.qty); });
  saveInventory();
  var saleRecord = { id: uid(), customer: cu || "Walk-in Customer", vehicleNo: vn || "N/A", items: items, total: t, date: fmtDate(), time: fmtTime() };
  STATE.productSales.push(saleRecord); saveProductSales();
  var biz = getCurrentBusiness(); var prefix = biz.prefix; var counterKey = "invoiceCounter" + prefix;
  if (!STATE.counters[counterKey]) STATE.counters[counterKey] = 1;
  var invNumber = prefix + "-INV-" + String(STATE.counters[counterKey]).padStart(3, "0");
  var invItems = items.map(function(i) { return { name: i.fullName, price: i.price, qty: i.qty, type: "product" }; });
  var inv = { id: uid(), number: invNumber, date: fmtDate(), time: fmtTime(), token: "", vehicle: vn, customer: cu || "Walk-in Customer", contactNumber: "", items: invItems, subtotal: t, tax: 0, total: t, cashReceived: t, changeReturned: 0, status: "PAID", businessPrefix: prefix, businessId: biz.id, businessName: biz.name };
  STATE.invoices.push(inv); STATE.counters[counterKey]++; saveInvoices(); saveCounters(); refreshDashboard();
  qs("#saleProductsContainer").innerHTML = ""; setValue("#saleCustomerName", ""); setValue("#saleVehicleNo", ""); setText("#saleGrandTotal", "Rs. 0"); addSaleProductRow();
  setTimeout(function() { renderProductSalesHistoryNow(); }, 100);
  toast("Sale completed - " + fmtPrice(t), "success");
}

function renderProductSalesHistoryNow() {
  var tb = qs("#productSalesHistory"); if (!tb) return;
  try { var saved = localStorage.getItem(KEYS.productSales); if (saved) { STATE.productSales = JSON.parse(saved); } } catch(e) {}
  var sales = STATE.productSales || [];
  if (!sales.length) { tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;">No recent sales</td></tr>'; return; }
  var sorted = sales.slice().reverse(); var html = "";
  for (var i = 0; i < sorted.length; i++) {
    var sale = sorted[i]; var itemsList = "";
    if (sale.items && sale.items.length > 0) { var names = []; for (var j = 0; j < sale.items.length; j++) { names.push(sanitize(sale.items[j].fullName) + " x" + sale.items[j].qty); } itemsList = names.join(", "); } else { itemsList = "N/A"; }
    html += '<tr><td>' + sanitize(sale.date) + '<br><small>' + sanitize(sale.time) + '</small></td><td>' + sanitize(sale.customer) + '</td><td>' + sanitize(sale.vehicleNo) + '</td><td style="font-size:0.75rem;max-width:150px">' + itemsList + '</td><td style="font-weight:600;color:var(--success)">' + fmtPrice(sale.total) + '</td><td><span class="badge badge--blue" style="font-size:0.6rem">' + sanitize(sale.invoiceNumber || "—") + '</span></td><td><div class="table-actions"><button class="btn btn-sm btn-primary" onclick="printSaleReceipt(\'' + sale.id + '\')" style="background:#000;font-size:0.6rem;padding:2px 6px">🧾</button><button class="btn btn-sm btn-outline" onclick="printSaleA4(\'' + sale.id + '\')" style="font-size:0.6rem;padding:2px 6px">📄</button></div></td></tr>';
  }
  tb.innerHTML = html;
}

function printSaleReceipt(saleId) {
  var sale = STATE.productSales.find(function(s) { return s.id === saleId; }); if (!sale) return;
  var biz = getCurrentBusiness();
  var itemsHTML = ''; sale.items.forEach(function(item) { itemsHTML += '<tr><td>' + sanitize(item.fullName) + ' x' + item.qty + '</td><td style="text-align:right;font-weight:700">' + fmtPrice(item.price * item.qty) + '</td></tr>'; });
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0}body{font-family:Arial,sans-serif;width:74mm;padding:2mm;font-size:9pt;color:#000}.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:2mm}.biz{font-size:13pt;font-weight:900}.ttl{text-align:center;font-size:12pt;font-weight:900;margin:2mm 0;border:2px solid #000;padding:2mm}.row{display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px dotted #ccc}.grand{text-align:center;font-size:13pt;font-weight:900;margin-top:2mm;border-top:2px solid #000;padding-top:2mm}</style></head><body><div class="hdr"><div class="biz">' + sanitize(biz.name) + '</div><div>' + sanitize(biz.address) + '</div></div><div class="ttl">SALE RECEIPT</div><div class="row"><span>Customer:</span><span><b>' + sanitize(sale.customer) + '</b></span></div><div class="row"><span>Date:</span><span>' + sanitize(sale.date) + '</span></div><table width="100%">' + itemsHTML + '</table><div class="grand">' + fmtPrice(sale.total) + '</div><div style="text-align:center;margin-top:2mm;font-size:8pt">Thank You!</div></body></html>';
  if (window.electronAPI && window.electronAPI.printReceipt) { window.electronAPI.printReceipt(h, { pageSize: { width: 80000, height: 297000 } }); }
  else { var w = window.open("", "_blank"); w.document.write(h); w.document.close(); setTimeout(function() { w.print(); }, 500); }
}

function printSaleA4(saleId) {
  var sale = STATE.productSales.find(function(s) { return s.id === saleId; }); if (!sale) return;
  var biz = getCurrentBusiness(); var itemsRows = ''; var subtotal = 0;
  sale.items.forEach(function(item, i) { var amt = item.price * item.qty; subtotal += amt; itemsRows += '<tr><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + (i+1) + '</td><td style="border:1px solid #000;padding:1.5mm">' + sanitize(item.fullName) + '</td><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + item.qty + '</td><td style="text-align:right;border:1px solid #000;padding:1.5mm">' + fmtPrice(item.price) + '</td><td style="text-align:right;font-weight:700;border:1px solid #000;padding:1.5mm">' + fmtPrice(amt) + '</td></tr>'; });
  var payMethod = sale.paymentMethod || "Cash";
  var payStatus = sale.paymentStatus || "PAID";
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#000;font-size:10pt;line-height:1.3;background:#fff}.page{max-width:190mm;margin:0 auto}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #000;padding-bottom:4mm;margin-bottom:4mm}.biz-name{font-size:16pt;font-weight:900;color:#000;text-transform:uppercase}.biz-addr{font-size:8pt;color:#000}.logo{width:16mm;height:16mm;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-size:18pt;font-weight:900;color:#000}.ttl-box{border:2px solid #000;display:inline-block;padding:2mm 6mm;margin:4mm 0}.ttl{font-size:12pt;font-weight:900;color:#000;letter-spacing:2px}.info-grid{display:flex;gap:4mm;margin-bottom:4mm}.info-box{flex:1;border:1px solid #000;padding:2mm}.info-box-title{font-size:7pt;font-weight:900;color:#000;border-bottom:1px solid #000;padding-bottom:1mm;margin-bottom:1.5mm;text-transform:uppercase}.info-row{display:flex;justify-content:space-between;padding:0.6mm 0;font-size:8pt;color:#000}.info-lbl{font-weight:700;color:#000}.info-val{font-weight:700;color:#000}.tbl{width:100%;border-collapse:collapse;margin:4mm 0;border:1px solid #000}.tbl th{border:1px solid #000;padding:2mm;font-size:8pt;text-transform:uppercase;color:#000;font-weight:900}.tbl td{border:1px solid #000;padding:1.5mm;font-size:9pt;color:#000}.sum-box{display:flex;justify-content:flex-end;margin-top:3mm}.sum-tbl{width:40%;border-collapse:collapse;border:1px solid #000}.sum-tbl td{padding:2mm;border:1px solid #000;color:#000;font-size:10pt}.sum-tbl .gt td{font-weight:900;font-size:12pt;color:#000;border:2px solid #000}.sig-section{display:flex;gap:5mm;margin-top:8mm}.sig-box{flex:1;text-align:center}.sig-line{border-top:1px solid #000;margin-top:10mm;padding-top:2mm;font-size:7pt;color:#000}.ftr{text-align:center;margin-top:6mm;border-top:1px solid #000;padding-top:2mm;font-size:7pt;color:#000}</style></head><body><div class="page"><div class="hdr"><div><div class="biz-name">' + sanitize(biz.name) + '</div><div class="biz-addr">' + sanitize(biz.address) + '</div><div class="biz-addr">Tel: ' + sanitize(biz.phone) + ' | ' + sanitize(biz.email) + '</div></div><div class="logo">' + sanitize(biz.prefix) + '</div></div><div class="ttl-box"><span class="ttl">SALE INVOICE</span></div><div class="info-grid"><div class="info-box"><div class="info-box-title">Customer Details</div><div class="info-row"><span class="info-lbl">Name</span><span class="info-val">' + sanitize(sale.customer) + '</span></div><div class="info-row"><span class="info-lbl">Vehicle</span><span class="info-val">' + sanitize(sale.vehicleNo || "N/A") + '</span></div><div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' + sanitize(sale.date) + '</span></div></div><div class="info-box"><div class="info-box-title">Payment Details</div><div class="info-row"><span class="info-lbl">Method</span><span class="info-val">' + sanitize(payMethod) + '</span></div><div class="info-row"><span class="info-lbl">Status</span><span class="info-val">' + sanitize(payStatus) + '</span></div><div class="info-row"><span class="info-lbl">Business</span><span class="info-val">' + sanitize(biz.name) + '</span></div></div></div><table class="tbl"><thead><tr><th style="width:6%;text-align:center">#</th><th>Description</th><th style="width:10%;text-align:center">Qty</th><th style="width:18%;text-align:right">Rate</th><th style="width:20%;text-align:right">Amount</th></tr></thead><tbody>' + itemsRows + '</tbody></table><div class="sum-box"><table class="sum-tbl"><tr><td style="font-weight:700">Subtotal</td><td style="text-align:right;font-weight:700">' + fmtPrice(subtotal) + '</td></tr><tr class="gt"><td style="font-weight:900">GRAND TOTAL</td><td style="text-align:right;font-weight:900">' + fmtPrice(sale.total) + '</td></tr></table></div><div class="sig-section"><div class="sig-box"><div class="sig-line"></div>Prepared By</div><div class="sig-box"><div class="sig-line"></div>Customer Signature</div></div><div class="ftr">' + sanitize(biz.name) + ' | ' + sanitize(biz.phone) + ' | Thank you for your business</div></div></body></html>';
  if (window.electronAPI && window.electronAPI.printReceipt) { window.electronAPI.printReceipt(h, { pageSize: { width: 210000, height: 297000 }, printBackground: true }); }
  else { var w = window.open("", "_blank"); w.document.write(h); w.document.close(); setTimeout(function() { w.print(); }, 500); }
}

function renderProductSalePage() {
  setText("#saleGrandTotal", "Rs. 0"); qs("#saleProductsContainer").innerHTML = ""; addSaleProductRow();
  renderProductSalesHistoryNow();
}
// ==================== VEHICLES ====================
function initVehicles() {
  qs("#newVehicleBtn")?.addEventListener("click", function () {
    openNewVehicleModal();
  });
  qs("#saveVehicleBtn")?.addEventListener("click", saveVehicle);
  qs("#vehicleSearch")?.addEventListener("input", renderVehicleTable);
  qs("#vehicleTypeFilter")?.addEventListener("change", renderVehicleTable);
  renderVehicleTable();
}
function openNewVehicleModal(d) {
  setValue("#vehicleEditId", d ? d.id : "");
  setValue("#vehicleNumber", d ? d.vehicleNo : "");
  var s = qs("#vehicleType");
  if (s) {
    s.innerHTML = '<option value="">Select</option>';
    STATE.pricingVehicles.forEach(function (v) {
      var o = document.createElement("option");
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
  var ei = qs("#vehicleEditId")?.value || "",
    vn = (qs("#vehicleNumber")?.value || "").trim().toUpperCase(),
    tp = qs("#vehicleType")?.value || "",
    ow = (qs("#vehicleOwner")?.value || "").trim(),
    ct = (qs("#vehicleContact")?.value || "").trim();
  if (!vn || !tp || !ow) return;
  if (ei) {
    var v = STATE.vehicles.find(function (v) {
      return v.id === ei;
    });
    if (v)
      Object.assign(v, { vehicleNo: vn, type: tp, owner: ow, contact: ct });
  } else {
    if (
      STATE.vehicles.find(function (v) {
        return v.vehicleNo === vn;
      })
    ) {
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
  var fl = STATE.vehicles.filter(function (v) {
    var sr = (qs("#vehicleSearch")?.value || "").toLowerCase(),
      tf = (qs("#vehicleTypeFilter")?.value || "").toLowerCase();
    return (
      (!sr ||
        v.vehicleNo.toLowerCase().includes(sr) ||
        v.owner.toLowerCase().includes(sr)) &&
      (!tf || v.type.toLowerCase() === tf)
    );
  });
  var tb = qs("#vehicleTableBody");
  if (!tb) return;
  qs("#vehicleCountBadge").textContent = fl.length + " vehicles";
  if (!fl.length) {
    tb.innerHTML = '<tr><td colspan="7">No vehicles</td></tr>';
    return;
  }
  tb.innerHTML = fl
    .map(function (v) {
      return (
        '<tr><td><span class="table-vehicle-no">' +
        sanitize(v.vehicleNo) +
        "</span></td><td>" +
        sanitize(v.owner) +
        '</td><td><span class="contact-display">' +
        sanitize(formatContactDisplay(v.contact || "N/A")) +
        '</span></td><td><span class="badge badge--blue">' +
        sanitize(v.type) +
        "</span></td><td>" +
        sanitize(v.lastService || "—") +
        "</td><td>" +
        (v.visits || 0) +
        '</td><td><div class="table-actions"><button class="btn-icon btn btn-ghost" data-vehicle-edit="' +
        v.id +
        '"><span class="material-icons">edit</span></button><button class="btn-icon btn btn-danger-ghost" data-vehicle-delete="' +
        v.id +
        '"><span class="material-icons">delete</span></button></div></td></tr>'
      );
    })
    .join("");
}

// ==================== INVENTORY ====================
function initInventory() {
  qs("#addProductBtn")?.addEventListener("click", function () {
    openProductModal();
  });
  qs("#saveProductBtn")?.addEventListener("click", saveProduct);
  qs("#addVariantBtn")?.addEventListener("click", function () {
    addVariantRow();
  });
  qs("#stockInBtn")?.addEventListener("click", function () {
    openStockModal(null, "in");
  });
  qs("#stockOutBtn")?.addEventListener("click", function () {
    openStockModal(null, "out");
  });
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
var vc = 0;
function addVariantRow(data) {
  var c = qs("#variantsContainer");
  if (!c) return;
  vc++;
  var brands = STATE.brands
    .map(function (b) {
      return (
        '<option value="' +
        b.name +
        '" ' +
        (data && data.brand === b.name ? "selected" : "") +
        ">" +
        sanitize(b.name) +
        "</option>"
      );
    })
    .join("");
  var card = document.createElement("div");
  card.className = "variant-card";
  card.innerHTML =
    '<div class="variant-card-header"><span>Variant #' +
    vc +
    '</span><button class="btn-icon btn btn-danger-ghost" onclick="this.closest(\'.variant-card\').remove()"><span class="material-icons">close</span></button></div><div class="variant-grid"><div class="variant-field"><label>Brand</label><select class="form-input variant-brand">' +
    brands +
    '</select></div><div class="variant-field"><label>Model</label><input type="text" class="form-input variant-model" value="' +
    sanitize((data && data.model) || "") +
    '" placeholder="e.g. HX3" /></div><div class="variant-field"><label>Grade</label><input type="text" class="form-input variant-grade" value="' +
    sanitize((data && data.grade) || "") +
    '" placeholder="e.g. 20W-50" /></div><div class="variant-field"><label>Size</label><input type="text" class="form-input variant-size" value="' +
    sanitize((data && data.size) || "") +
    '" placeholder="e.g. 3L" /></div><div class="variant-field"><label>Purchase Price</label><input type="number" class="form-input variant-purchase-price" value="' +
    ((data && data.purchasePrice) || "") +
    '" min="0" /></div><div class="variant-field"><label>Selling Price *</label><input type="number" class="form-input variant-selling-price" value="' +
    ((data && data.sellingPrice) || "") +
    '" min="0" /></div><div class="variant-field"><label>Stock *</label><input type="number" class="form-input variant-stock" value="' +
    ((data && data.stock) || "") +
    '" min="0" /></div><div class="variant-field"><label>Min Stock</label><input type="number" class="form-input variant-min-stock" value="' +
    ((data && data.minStock) || "5") +
    '" min="0" /></div><div class="variant-field"><label>SKU</label><input type="text" class="form-input variant-sku" value="' +
    sanitize((data && data.sku) || "") +
    '" placeholder="Auto" /></div></div>';
  c.appendChild(card);
}
function openProductModal(d) {
  setValue("#productEditId", d ? d.id : "");
  setValue("#productName", d ? d.productType : "");
  populateCategoryDropdowns();
  setValue("#productCategory", d ? d.category : "misc");
  qs("#variantsContainer").innerHTML = "";
  vc = 0;
  if (d && d.variants)
    d.variants.forEach(function (v) {
      addVariantRow(v);
    });
  else addVariantRow();
  openModal("productModal");
}
function saveProduct() {
  var ei = qs("#productEditId")?.value || "";
  var pt = (qs("#productName")?.value || "").trim();
  var cat = qs("#productCategory")?.value || "misc";
  if (!pt) return;
  var variants = [];
  var hasError = false;
  qsa("#variantsContainer .variant-card").forEach(function (card, idx) {
    var b = card.querySelector(".variant-brand")?.value || "General",
      m = card.querySelector(".variant-model")?.value?.trim() || "Standard",
      g = card.querySelector(".variant-grade")?.value?.trim() || "",
      s = card.querySelector(".variant-size")?.value?.trim() || "",
      pp = parseFloat(card.querySelector(".variant-purchase-price")?.value) || 0,
      sp = parseFloat(card.querySelector(".variant-selling-price")?.value) || 0,
      st = parseInt(card.querySelector(".variant-stock")?.value) || 0,
      ms = parseInt(card.querySelector(".variant-min-stock")?.value) || 5;
    var sku = card.querySelector(".variant-sku")?.value?.trim() || "";
    if (!sp) {
      toast("Variant #" + (idx + 1) + ": Enter price", "error");
      hasError = true;
      return;
    }
    if (!sku) sku = generateVariantSKU(b, m, g, s, idx);
    variants.push({
      id: uid(), brand: b, model: m, grade: g, size: s, sku: sku,
      purchasePrice: pp, sellingPrice: sp, stock: st, minStock: ms,
    });
  });
  if (hasError || !variants.length) return;
  
  if (ei) {
    var p = STATE.inventory.find(function (p) { return p.id === ei; });
    if (p) { p.productType = pt; p.category = cat; p.variants = variants; }
  } else {
    STATE.inventory.push({ id: uid(), productType: pt, category: cat, variants: variants });
  }
  saveInventory();
  closeModal("productModal");
  renderInventoryTable();
  updateInventoryKPI();
  refreshDashboard();
}
function openStockModal(vid, tp) {
  setValue("#stockQty", "");
  if (vid) {
    var f = findVariantById(vid);
    if (f) {
      setValue("#stockProductId", vid);
      setValue(
        "#stockProductName",
        f.fullName + " [SKU: " + f.variant.sku + "]",
      );
    }
  } else {
    setValue("#stockProductId", "");
    setValue("#stockProductName", "Select from table");
  }
  qsa('input[name="stockType"]').forEach(function (r) {
    r.checked = r.value === tp;
  });
  openModal("stockModal");
}
function saveStock() {
  var vid = qs("#stockProductId")?.value || "",
    qt = parseInt(qs("#stockQty")?.value) || 0,
    tp =
      document.querySelector('input[name="stockType"]:checked')?.value || "in";
  if (!vid || !qt) return;
  var f = findVariantById(vid);
  if (!f) return;
  if (tp === "out" && qt > f.variant.stock) {
    toast("Only " + f.variant.stock + " available", "error");
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
  var all = getAllVariantsFlat();
  setText("#invTotalProducts", all.length);
  setText(
    "#invLowStock",
    all.filter(function (v) {
      return v.stock < v.minStock;
    }).length,
  );
  setText(
    "#invValue",
    fmtPrice(
      all.reduce(function (s, v) {
        return s + v.stock * (v.sellingPrice || 0);
      }, 0),
    ),
  );
}
function renderInventoryTable() {
  var sr = (qs("#inventorySearch")?.value || "").toLowerCase(),
    cf = qs("#inventoryCategoryFilter")?.value || "",
    bf = qs("#inventoryBrandFilter")?.value || "";
  var all = getAllVariantsFlat().filter(function (v) {
    return (
      (!sr ||
        v.fullName.toLowerCase().includes(sr) ||
        v.sku.toLowerCase().includes(sr)) &&
      (!cf || v.category === cf) &&
      (!bf || v.brand === bf)
    );
  });
  var tb = qs("#inventoryTableBody");
  if (!tb) return;
  updateInventoryKPI();
  qs("#productCountBadge").textContent = all.length + " variants";
  if (!all.length) {
    tb.innerHTML = '<tr><td colspan="9">No variants</td></tr>';
    return;
  }
  tb.innerHTML = all
    .map(function (v) {
      var lo = v.stock < v.minStock;
      return (
        '<tr><td><div style="font-weight:500;">' +
        sanitize(v.productType) +
        '</div><div style="font-size:0.7rem;color:var(--text-muted);">' +
        sanitize(v.fullName) +
        '</div></td><td><span class="badge badge--blue" style="font-size:0.6rem;">' +
        sanitize(v.sku) +
        '</span></td><td><span class="badge badge--gray">' +
        sanitize(v.category || "Misc") +
        '</span></td><td><span style="font-weight:700;color:' +
        (lo ? "var(--danger)" : "var(--success)") +
        ';">' +
        v.stock +
        "</span></td><td>" +
        v.minStock +
        "</td><td>" +
        fmtPrice(v.purchasePrice) +
        '</td><td style="font-weight:600;">' +
        fmtPrice(v.sellingPrice) +
        "</td><td>" +
        (lo
          ? '<span class="badge badge--red">Low</span>'
          : '<span class="badge badge--green">OK</span>') +
        '</td><td><div class="table-actions"><button class="btn btn-sm btn-outline" data-stock-in="' +
        v.id +
        '">+</button><button class="btn btn-sm btn-ghost" data-stock-out="' +
        v.id +
        '">-</button><button class="btn btn-sm btn-ghost" onclick="editInventoryProduct(\'' +
        v.productId +
        '\')" title="Edit"><span class="material-icons">edit</span></button><button class="btn-icon btn btn-danger-ghost" data-variant-delete="' +
        v.id +
        '"><span class="material-icons">delete</span></button></div></td></tr>'
      );
    })
    .join("");
}

function editInventoryProduct(productId) {
  var p = STATE.inventory.find(function(p) { return p.id === productId; });
  if (p) {
    openProductModal(p);
  }
}
function openBrandsModal() {
  renderBrandList();
  openModal("brandsModal");
}
function renderBrandList() {
  var c = qs("#brandList");
  if (!c) return;
  c.innerHTML = STATE.brands
    .map(function (b) {
      return (
        '<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>' +
        sanitize(b.name) +
        "</span>" +
        (b.id === "general"
          ? '<span class="badge badge--gray">Default</span>'
          : '<button class="btn-icon btn btn-danger-ghost" data-brand-delete="' +
            b.id +
            '"><span class="material-icons">close</span></button>') +
        "</div>"
      );
    })
    .join("");
}
function addBrand() {
  var n = (qs("#newBrandName")?.value || "").trim();
  if (!n) return;
  STATE.brands.push({ id: uid(), name: n });
  saveBrands();
  populateBrandDropdowns();
  renderBrandList();
  setValue("#newBrandName", "");
}
function populateBrandDropdowns() {
  var el = qs("#inventoryBrandFilter");
  if (!el) return;
  el.innerHTML = '<option value="">All Brands</option>';
  STATE.brands.forEach(function (b) {
    var o = document.createElement("option");
    o.value = b.name;
    o.textContent = b.name;
    el.appendChild(o);
  });
}
function populateCategoryDropdowns() {
  ["#inventoryCategoryFilter", "#productCategory"].forEach(function (sel) {
    var el = qs(sel);
    if (!el) return;
    el.innerHTML =
      sel === "#inventoryCategoryFilter"
        ? '<option value="">All Categories</option>'
        : "";
    STATE.categories.forEach(function (c) {
      var o = document.createElement("option");
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
  var c = qs("#categoryList");
  if (!c) return;
  c.innerHTML = STATE.categories
    .map(function (cat) {
      return (
        '<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>' +
        sanitize(cat.name) +
        "</span>" +
        (["oil", "filter", "coolant", "misc"].indexOf(cat.id) >= 0
          ? '<span class="badge badge--gray">Default</span>'
          : '<button class="btn-icon btn btn-danger-ghost" data-cat-delete="' +
            cat.id +
            '"><span class="material-icons">close</span></button>') +
        "</div>"
      );
    })
    .join("");
}
function addCategory() {
  var n = (qs("#newCategoryName")?.value || "").trim();
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
  qs("#downloadCSV")?.addEventListener("click", function () {
    exportCSV("reports");
  });
  var td = new Date(),
    wa = new Date(td);
  wa.setDate(wa.getDate() - 30);
  setValue("#rptFromDate", toDateInputValue(wa));
  setValue("#rptToDate", toDateInputValue(td));
  renderReports();
}
function resetReportFilters() {
  var td = new Date(),
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
  
  var totalVendorPaid = STATE.vendorPayments.reduce(function(s, p) { return s + (p.amount || 0); }, 0);
  setText("#rptVendorPayments", fmtPrice(totalVendorPaid));

  var fromDate = qs("#rptFromDate")?.value ? new Date(qs("#rptFromDate").value) : null;
  var toDate = qs("#rptToDate")?.value ? new Date(qs("#rptToDate").value) : null;
  if (toDate) toDate.setHours(23, 59, 59);

  var rows = [];
  STATE.tokens.forEach(function (tk) {
    if (tk.status === "completed") {
      rows.push({ date: fmtDate(), dateObj: new Date(), type: "Revenue", cat: "Service", desc: "Token " + tk.number, amt: tk.servicePrice || 0, bal: "credit" });
      if (tk.products) tk.products.forEach(function (p) {
        rows.push({ date: fmtDate(), dateObj: new Date(), type: "Revenue", cat: "Product", desc: p.fullName || p.name, amt: p.price * p.qty, bal: "credit" });
      });
    }
  });
  STATE.productSales.forEach(function (s) {
    var d = parseDate(s.date) || new Date();
    rows.push({ date: s.date, dateObj: d, type: "Revenue", cat: "Sale", desc: s.customer || "Walk-in", amt: s.total, bal: "credit" });
  });
  STATE.expenses.forEach(function (e) {
    var d = parseDate(e.date) || new Date();
    rows.push({ date: e.date, dateObj: d, type: "Expense", cat: e.category, desc: e.title, amt: e.amount, bal: "debit" });
  });
  STATE.vendorPayments.forEach(function (vp) {
    var d = parseDate(vp.date) || new Date();
    var v = STATE.vendors.find(function(v) { return v.id === vp.vendorId; });
    rows.push({ date: vp.date, dateObj: d, type: "Expense", cat: "Vendor Payment", desc: v ? v.company : "Vendor", amt: vp.amount, bal: "debit" });
  });

  if (fromDate || toDate) {
    rows = rows.filter(function(r) {
      if (fromDate && r.dateObj < fromDate) return false;
      if (toDate && r.dateObj > toDate) return false;
      return true;
    });
  }

  rows.sort(function (a, b) { return b.dateObj - a.dateObj; });
  var tb = qs("#reportTableBody");
  if (tb) tb.innerHTML = rows.length ? rows.map(function (r) { return "<tr><td>" + sanitize(r.date) + "</td><td>" + r.type + "</td><td>" + sanitize(r.cat) + "</td><td>" + sanitize(r.desc) + '</td><td style="text-align:right;font-weight:700;">' + (r.bal === "credit" ? "+" : "-") + " " + fmtPrice(r.amt) + "</td></tr>"; }).join("") : '<tr><td colspan="5">No transactions</td></tr>';
}

// ==================== EXPENSES ====================
function initExpenses() {
  qs("#addExpenseBtn")?.addEventListener("click", showExpenseForm);
  qs("#saveExpenseBtn")?.addEventListener("click", saveExpense);
  qs("#cancelExpenseBtn")?.addEventListener("click", hideExpenseForm);
  qs("#expenseSearch")?.addEventListener("input", renderExpenses);
  var di = qs("#expenseDate");
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
  var tl = (qs("#expenseTitle")?.value || "").trim(),
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
  
  var fl = STATE.expenses.sort(function (a, b) {
    return (parseDate(b.date) || 0) - (parseDate(a.date) || 0);
  });
  var countBadge = qs("#expenseCountBadge");
  if (countBadge) countBadge.textContent = fl.length;
  var tb = qs("#expenseTableBody");
  if (tb)
    tb.innerHTML = fl.length
      ? fl
          .map(function (e) {
            return (
              "<tr><td>" +
              sanitize(e.date) +
              "</td><td>" +
              sanitize(e.title) +
              "</td><td>" +
              sanitize(e.category) +
              '</td><td style="font-weight:600;color:var(--danger);">' +
              fmtPrice(e.amount) +
              '</td><td><button class="btn-icon btn btn-danger-ghost" data-expense-del="' +
              e.id +
              '"><span class="material-icons">delete</span></button></td></tr>'
            );
          })
          .join("")
      : '<tr><td colspan="5">No expenses</td></tr>';
}

// ==================== SERVICES (PRICING MATRIX) ====================
function initServices() {
  var vBtn = document.getElementById("manageVehicleTypesBtn");
  var sBtn = document.getElementById("managePricingServicesBtn");
  if (vBtn)
    vBtn.addEventListener("click", function (e) {
      e.preventDefault();
      renderVehicleTypeList();
      openModal("vehicleTypesModal");
    });
  if (sBtn)
    sBtn.addEventListener("click", function (e) {
      e.preventDefault();
      renderPricingServiceList();
      openModal("pricingServicesModal");
    });
  var avBtn = document.getElementById("addVehicleTypeBtn");
  var asBtn = document.getElementById("addPricingServiceBtn");
  if (avBtn)
    avBtn.addEventListener("click", function (e) {
      e.preventDefault();
      addVehicleType();
    });
  if (asBtn)
    asBtn.addEventListener("click", function (e) {
      e.preventDefault();
      addPricingService();
    });
  var vtInput = document.getElementById("newVehicleTypeName");
  if (vtInput)
    vtInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addVehicleType();
      }
    });
  var psInput = document.getElementById("newPricingServiceName");
  if (psInput)
    psInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        addPricingService();
      }
    });
  renderVehicleTypeList();
  renderPricingServiceList();
  renderPricingMatrix();
}
function addVehicleType() {
  var input = document.getElementById("newVehicleTypeName");
  var name = input && input.value ? input.value.trim() : "";
  if (!name) {
    toast("Enter vehicle type name", "warning");
    return;
  }
  for (var i = 0; i < STATE.pricingVehicles.length; i++) {
    if (STATE.pricingVehicles[i].name.toLowerCase() === name.toLowerCase()) {
      toast("Already exists", "warning");
      return;
    }
  }
  STATE.pricingVehicles.push({ id: uid(), name: name });
  savePricingVehicles();
  renderVehicleTypeList();
  renderPricingMatrix();
  if (input) {
    input.value = "";
    input.focus();
  }
  toast(name + " added", "success");
}
function addPricingService() {
  var input = document.getElementById("newPricingServiceName");
  var name = input && input.value ? input.value.trim() : "";
  if (!name) {
    toast("Enter service name", "warning");
    return;
  }
  for (var i = 0; i < STATE.pricingServices.length; i++) {
    if (STATE.pricingServices[i].name.toLowerCase() === name.toLowerCase()) {
      toast("Already exists", "warning");
      return;
    }
  }
  STATE.pricingServices.push({ id: uid(), name: name });
  savePricingServices();
  renderPricingServiceList();
  renderPricingMatrix();
  if (input) {
    input.value = "";
    input.focus();
  }
  toast(name + " added", "success");
}
function renderVehicleTypeList() {
  var c = document.getElementById("vehicleTypeList");
  if (!c) return;
  if (STATE.pricingVehicles.length === 0) {
    c.innerHTML =
      '<p style="text-align:center;color:#94a3b8;padding:1rem;">No vehicle types added yet</p>';
    return;
  }
  var h = "";
  for (var i = 0; i < STATE.pricingVehicles.length; i++) {
    var v = STATE.pricingVehicles[i];
    h +=
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e2e8f0;"><span style="font-weight:500;">' +
      sanitize(v.name) +
      '</span><button class="btn-icon btn btn-danger-ghost" data-vtype-delete="' +
      v.id +
      '"><span class="material-icons">close</span></button></div>';
  }
  c.innerHTML = h;
}
function renderPricingServiceList() {
  var c = document.getElementById("pricingServiceList");
  if (!c) return;
  if (STATE.pricingServices.length === 0) {
    c.innerHTML =
      '<p style="text-align:center;color:#94a3b8;padding:1rem;">No services added yet</p>';
    return;
  }
  var h = "";
  for (var i = 0; i < STATE.pricingServices.length; i++) {
    var s = STATE.pricingServices[i];
    h +=
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #e2e8f0;"><span style="font-weight:500;">' +
      sanitize(s.name) +
      '</span><button class="btn-icon btn btn-danger-ghost" data-psvc-delete="' +
      s.id +
      '"><span class="material-icons">close</span></button></div>';
  }
  c.innerHTML = h;
}
function renderPricingMatrix() {
  var thead = document.getElementById("pricingMatrixHead");
  var tbody = document.getElementById("pricingMatrixBody");
  if (!thead || !tbody) return;
  var services = STATE.pricingServices;
  var vehicles = STATE.pricingVehicles;
  setText("#pricingServiceCount", services.length);
  setText("#pricingVehicleCount", vehicles.length);
  var count = 0;
  var keys = Object.keys(STATE.pricingMatrix);
  for (var i = 0; i < keys.length; i++) {
    if (STATE.pricingMatrix[keys[i]] > 0) count++;
  }
  setText("#pricingEntryCount", count);
  if (services.length === 0 || vehicles.length === 0) {
    thead.innerHTML = "<tr><th>Service / Vehicle</th></tr>";
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center;padding:3rem;">Add services and vehicle types to get started</td></tr>';
    return;
  }
  var hh = "<tr><th>Service / Vehicle</th>";
  for (var v = 0; v < vehicles.length; v++) {
    hh +=
      '<th style="text-align:center;">' + sanitize(vehicles[v].name) + "</th>";
  }
  hh += "</tr>";
  thead.innerHTML = hh;
  var bh = "";
  for (var s = 0; s < services.length; s++) {
    bh +=
      '<tr><td style="font-weight:600;">' +
      sanitize(services[s].name) +
      "</td>";
    for (var v = 0; v < vehicles.length; v++) {
      var key = services[s].name + "__" + vehicles[v].name;
      var price = STATE.pricingMatrix[key] || 0;
      bh +=
        '<td style="text-align:center;cursor:pointer;padding:10px;background:' +
        (price > 0 ? "#eff6ff" : "transparent") +
        ';border-radius:4px;transition:all 0.2s;" onclick="editPricingCell(\'' +
        key.replace(/'/g, "\\'") +
        "', " +
        price +
        ')" onmouseover="this.style.background=\'' +
        (price > 0 ? "#dbeafe" : "#f1f5f9") +
        "'\" onmouseout=\"this.style.background='" +
        (price > 0 ? "#eff6ff" : "transparent") +
        '\'" title="Click to edit price"><span style="font-weight:700;color:' +
        (price > 0 ? "#2563eb" : "#94a3b8") +
        ';">' +
        (price > 0 ? fmtPrice(price) : "—") +
        "</span></td>";
    }
    bh += "</tr>";
  }
  tbody.innerHTML = bh;
}
function editPricingCell(key, currentPrice) {
  var modal = document.createElement("div");
  modal.style.cssText =
    "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;";
  var parts = key.split("__");
  var serviceName = parts[0] || "";
  var vehicleName = parts[1] || "";
  modal.innerHTML =
    '<div style="background:white;border-radius:16px;padding:24px;width:380px;max-width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);"><h3 style="margin:0 0 8px 0;font-size:18px;color:#0f172a;">Edit Price</h3><p style="margin:0 0 16px 0;font-size:13px;color:#64748b;"><strong>' +
    sanitize(serviceName) +
    "</strong> for <strong>" +
    sanitize(vehicleName) +
    '</strong></p><label style="display:block;font-size:12px;font-weight:600;color:#475569;margin-bottom:6px;">Price (Rs.)</label><input type="number" id="pricingInput" value="' +
    currentPrice +
    '" min="0" style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:8px;font-size:16px;outline:none;box-sizing:border-box;" autofocus onkeydown="if(event.key===\'Enter\'){document.getElementById(\'pricingSaveBtn\').click();}"><div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;"><button id="pricingCancelBtn" style="padding:8px 16px;border:1px solid #e2e8f0;border-radius:8px;background:white;cursor:pointer;font-size:14px;color:#475569;">Cancel</button><button id="pricingDeleteBtn" style="padding:8px 16px;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;cursor:pointer;font-size:14px;color:#dc2626;' +
    (currentPrice === 0 ? "display:none;" : "") +
    '">Delete</button><button id="pricingSaveBtn" style="padding:8px 20px;border:none;border-radius:8px;background:#2563eb;cursor:pointer;font-size:14px;color:white;font-weight:600;">Save</button></div></div>';
  document.body.appendChild(modal);
  var input = document.getElementById("pricingInput");
  setTimeout(function () {
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closePricingModal();
    }
  });
  var escHandler = function (e) {
    if (e.key === "Escape") {
      closePricingModal();
    }
  };
  document.addEventListener("keydown", escHandler);
  function closePricingModal() {
    document.removeEventListener("keydown", escHandler);
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }
  document
    .getElementById("pricingCancelBtn")
    .addEventListener("click", function () {
      closePricingModal();
    });
  document
    .getElementById("pricingDeleteBtn")
    .addEventListener("click", function () {
      delete STATE.pricingMatrix[key];
      savePricingMatrix();
      renderPricingMatrix();
      closePricingModal();
      toast("Price removed", "success");
    });
  document
    .getElementById("pricingSaveBtn")
    .addEventListener("click", function () {
      var newPrice = parseInt(input.value.replace(/[^0-9]/g, ""));
      if (isNaN(newPrice) || newPrice < 0) {
        toast("Please enter a valid price", "warning");
        input.focus();
        return;
      }
      if (newPrice === 0) {
        delete STATE.pricingMatrix[key];
      } else {
        STATE.pricingMatrix[key] = newPrice;
      }
      savePricingMatrix();
      renderPricingMatrix();
      closePricingModal();
      toast("Price updated: " + fmtPrice(newPrice || 0), "success");
    });
}

// ==================== IMPORT/EXPORT ====================
function initImportExport() {
  qs("#exportJSONBtn")?.addEventListener("click", function () {
    exportJSON();
  });
  qs("#exportCSVBtn")?.addEventListener("click", function () {
    exportCSV();
  });
  qs("#exportPDFBtn")?.addEventListener("click", function () {
    exportPDF();
  });
  qs("#importDataBtn2")?.addEventListener("click", function () {
    importFile();
  });
  qs("#quickBackupBtn")?.addEventListener("click", function () {
    quickBackup();
  });
  qs("#quickRestoreBtn")?.addEventListener("click", function () {
    quickRestore();
  });
  qs("#confirmImportBtn")?.addEventListener("click", function () {
    confirmImport();
  });
}
function getModuleData(mod) {
  if (mod === "all")
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
      version: "6.2",
    };
  if (mod === "inventory") return STATE.inventory;
  if (mod === "tokens") return STATE.tokens;
  if (mod === "vehicles") return STATE.vehicles;
  if (mod === "invoices") return STATE.invoices;
  if (mod === "expenses") return STATE.expenses;
  if (mod === "reminders") return STATE.reminders;
  if (mod === "productSales") return STATE.productSales;
  return {};
}
function exportJSON() {
  var m = qs("#exportModule")?.value || "all";
  var d = getModuleData(m);
  var b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = m + "_" + fmtDate() + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Exported JSON", "success");
}
function exportCSV(mo) {
  var m = mo || qs("#exportModule")?.value || "all";
  var csv = "";
  var esc = function (v) {
    return '"' + String(v || "").replace(/"/g, '""') + '"';
  };
  if (m === "all" || m === "inventory") {
    csv +=
      "Product Type,Brand,Model,Grade,Size,SKU,Purchase Price,Selling Price,Stock,Min Stock\n";
    getAllVariantsFlat().forEach(function (v) {
      csv +=
        esc(v.productType) +
        "," +
        esc(v.brand) +
        "," +
        esc(v.model) +
        "," +
        esc(v.grade) +
        "," +
        esc(v.size) +
        "," +
        esc(v.sku) +
        "," +
        v.purchasePrice +
        "," +
        v.sellingPrice +
        "," +
        v.stock +
        "," +
        v.minStock +
        "\n";
    });
  }
  if (m === "all" || m === "tokens") {
    if (csv) csv += "\n";
    csv +=
      "Token,Vehicle No,Type,Customer,Contact,Service,Status,Time,Business\n";
    STATE.tokens.forEach(function (t) {
      csv +=
        esc(t.number) +
        "," +
        esc(t.vehicleNo) +
        "," +
        esc(t.vehicleType) +
        "," +
        esc(t.ownerName) +
        "," +
        esc(t.contactNumber) +
        "," +
        esc(t.service) +
        "," +
        t.status +
        "," +
        t.time +
        "," +
        esc(t.businessName || "") +
        "\n";
    });
  }
  var b = new Blob([csv], { type: "text/csv" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = m + "_" + fmtDate() + ".csv";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Exported CSV", "success");
}
function exportPDF() {
  var m = qs("#exportModule")?.value || "all";
  var h =
    '<html><head><meta charset="UTF-8"><style>body{font-family:Arial;padding:20px;font-size:11px}h1{font-size:16px;text-align:center}h2{font-size:13px}table{width:100%;border-collapse:collapse;margin:8px 0;font-size:10px}th{background:#2563eb;color:#fff;padding:5px}td{padding:4px;border-bottom:1px solid #ddd}</style></head><body><h1>' +
    sanitize(STATE.settings.businessName) +
    "</h1><h2>" +
    m.toUpperCase() +
    " Report - " +
    fmtDate() +
    "</h2>";
  if (m === "all" || m === "inventory") {
    h +=
      "<h2>Inventory</h2><table><tr><th>Product</th><th>Brand</th><th>Model</th><th>SKU</th><th>Stock</th><th>Price</th></tr>";
    getAllVariantsFlat().forEach(function (v) {
      h +=
        "<tr><td>" +
        sanitize(v.productType) +
        "</td><td>" +
        sanitize(v.brand) +
        "</td><td>" +
        sanitize(v.model) +
        "</td><td>" +
        sanitize(v.sku) +
        "</td><td>" +
        v.stock +
        "</td><td>" +
        fmtPrice(v.sellingPrice) +
        "</td></tr>";
    });
    h += "</table>";
  }
  if (m === "all" || m === "tokens") {
    h +=
      "<h2>Tokens</h2><table><tr><th>Token</th><th>Vehicle</th><th>Customer</th><th>Contact</th><th>Service</th><th>Status</th></tr>";
    STATE.tokens.forEach(function (t) {
      h +=
        "<tr><td>" +
        sanitize(t.number) +
        "</td><td>" +
        sanitize(t.vehicleNo) +
        "</td><td>" +
        sanitize(t.ownerName || "") +
        "</td><td>" +
        sanitize(formatContactDisplay(t.contactNumber || "")) +
        "</td><td>" +
        sanitize(t.service) +
        "</td><td>" +
        t.status +
        "</td></tr>";
    });
    h += "</table>";
  }
  h += "</body></html>";
  var pw = window.open("", "_blank");
  if (pw) {
    pw.document.write(h);
    pw.document.close();
    setTimeout(function () {
      pw.print();
    }, 500);
  }
}
function quickBackup() {
  var d = getModuleData("all");
  var b = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = "full_backup_" + fmtDate() + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
  toast("Backup downloaded!", "success");
}
function quickRestore() {
  var inp = document.createElement("input");
  inp.type = "file";
  inp.accept = ".json";
  inp.addEventListener("change", function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function (ev) {
      try {
        var d = JSON.parse(ev.target.result);
        confirm(
          "Restore all data?",
          function () {
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
            setTimeout(function () {
              location.reload();
            }, 1000);
          },
          "Restore",
        );
      } catch (e) {
        toast("Invalid file", "error");
      }
    };
    r.readAsText(f);
  });
  inp.click();
}
function importFile() {
  var m = qs("#importModule")?.value || "inventory";
  var fmt = qs("#importFormat")?.value || "json";
  var inp = document.createElement("input");
  inp.type = "file";
  inp.accept = fmt === "json" ? ".json" : ".csv";
  inp.addEventListener("change", function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function (ev) {
      try {
        var d;
        if (fmt === "json") {
          d = JSON.parse(ev.target.result);
          if (m === "all") {
            previewImport(m, d);
            return;
          }
          if (!Array.isArray(d)) d = d[m] || d.inventory || [];
        } else {
          var lines = ev.target.result.split("\n").filter(function (l) {
            return l.trim();
          });
          if (lines.length < 2) return;
          var headers = lines[0].split(",").map(function (h) {
            return h.trim().replace(/"/g, "");
          });
          d = [];
          for (var i = 1; i < lines.length; i++) {
            var vals = lines[i].split(",").map(function (v) {
              return v.trim().replace(/"/g, "");
            });
            var obj = {};
            headers.forEach(function (h, idx) {
              obj[h] = vals[idx] || "";
            });
            d.push(obj);
          }
        }
        previewImport(m, d);
      } catch (e) {
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
  var el = qs("#importPreviewContent");
  if (el && d.length > 0) {
    var keys = Object.keys(d[0]).slice(0, 8);
    var h = '<table class="import-preview-table"><thead><tr>';
    keys.forEach(function (k) {
      h += "<th>" + sanitize(k) + "</th>";
    });
    h += "</tr></thead><tbody>";
    d.slice(0, 10).forEach(function (row) {
      h += "<tr>";
      keys.forEach(function (k) {
        h += "<td>" + sanitize(String(row[k] || "")) + "</td>";
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
  var m = STATE.pendingImport.module,
    d = STATE.pendingImport.data;
  if (m === "all") {
    confirm(
      "This will replace ALL data. Continue?",
      function () {
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
        if (d.productSales) {
          STATE.productSales = d.productSales;
          saveProductSales();
        }
        if (d.pricingMatrix) {
          STATE.pricingMatrix = d.pricingMatrix;
          savePricingMatrix();
        }
        if (d.brands) {
          STATE.brands = d.brands;
          saveBrands();
        }
        if (d.categories) {
          STATE.categories = d.categories;
          saveCategories();
        }
        if (d.pricingVehicles) {
          STATE.pricingVehicles = d.pricingVehicles;
          savePricingVehicles();
        }
        if (d.pricingServices) {
          STATE.pricingServices = d.pricingServices;
          savePricingServices();
        }
        if (d.settings) {
          STATE.settings = d.settings;
          saveSettings();
          updateAllBrandNames();
        }
        if (d.counters) {
          STATE.counters = d.counters;
          saveCounters();
        }
        if (d.businesses) {
          saveBusinesses(d.businesses);
        }
        STATE.pendingImport = null;
        closeModal("importPreviewModal");
        toast("All data imported!", "success");
        setTimeout(function () {
          location.reload();
        }, 1000);
      },
      "Import All",
    );
    return;
  }
  if (m === "inventory") {
    d.forEach(function (item) {
      var pn = item["Product Type"] || item.productType || "Product";
      var b = item["Brand"] || item.brand || "General";
      var md = item["Model"] || item.model || "Standard";
      var g = item["Grade"] || item.grade || "";
      var s = item["Size"] || item.size || "";
      var sku =
        item["SKU"] ||
        item.sku ||
        generateVariantSKU(b, md, g, s, STATE.inventory.length);
      var sp = parseFloat(item["Selling Price"] || item.sellingPrice || 0);
      var pp = parseFloat(item["Purchase Price"] || item.purchasePrice || 0);
      var st = parseInt(item["Stock"] || item.stock || 0);
      var ms = parseInt(item["Min Stock"] || item.minStock || 5);
      var ep = STATE.inventory.find(function (p) {
        return p.productType === pn;
      });
      if (ep)
        ep.variants.push({
          id: uid(),
          brand: b,
          model: md,
          grade: g,
          size: s,
          sku: sku,
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
              sku: sku,
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
    d.forEach(function (item) {
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
        businessPrefix: item["Business Prefix"] || getCurrentBusinessPrefix(),
        businessId: "",
        businessName: item["Business Name"] || "",
      });
    });
    saveTokens();
  }
  if (m === "vehicles") {
    d.forEach(function (item) {
      STATE.vehicles.push({
        id: uid(),
        vehicleNo: item["Vehicle No"] || item.vehicleNo || "",
        owner: item["Owner"] || item.owner || "",
        contact: item["Contact"] || item.contact || "",
        type: item["Type"] || item.type || "Car",
        notes: "",
        visits: parseInt(item["Visits"] || item.visits || 0),
        lastService: item["Last Service"] || item.lastService || "—",
      });
    });
    saveVehicles();
  }
  if (m === "invoices") {
    d.forEach(function (item) {
      STATE.invoices.push({
        id: uid(),
        number: item["Invoice #"] || item.number || "INV-001",
        date: item["Date"] || item.date || fmtDate(),
        time: item["Time"] || item.time || fmtTime(),
        token: item["Token"] || item.token || "",
        vehicle: item["Vehicle"] || item.vehicle || "",
        customer: item["Customer"] || item.customer || "",
        contactNumber: item["Contact"] || item.contactNumber || "",
        items: item.items || [],
        subtotal: parseFloat(item["Subtotal"] || item.subtotal || 0),
        tax: parseFloat(item["Tax"] || item.tax || 0),
        total: parseFloat(item["Total"] || item.total || 0),
        cashReceived: parseFloat(
          item["Cash Received"] || item.cashReceived || 0,
        ),
        changeReturned: parseFloat(item["Change"] || item.changeReturned || 0),
        status: item["Status"] || item.status || "UNPAID",
        businessPrefix: item["Business Prefix"] || item.businessPrefix || "",
        businessId: item["Business Id"] || item.businessId || "",
        businessName: item["Business Name"] || item.businessName || "",
      });
    });
    saveInvoices();
  }
  if (m === "expenses") {
    d.forEach(function (item) {
      STATE.expenses.push({
        id: uid(),
        title: item["Title"] || item.title || "",
        category: item["Category"] || item.category || "other",
        amount: parseFloat(item["Amount"] || item.amount || 0),
        date: item["Date"] || item.date || fmtDate(),
        time: item["Time"] || item.time || fmtTime(),
      });
    });
    saveExpenses();
  }
  if (m === "reminders") {
    d.forEach(function (item) {
      STATE.reminders.push({
        id: uid(),
        tokenId: item["Token ID"] || item.tokenId || "",
        customerName: item["Customer"] || item.customerName || "",
        phone: item["Phone"] || item.phone || "",
        vehicleNo: item["Vehicle"] || item.vehicleNo || "",
        vehicleType: item["Vehicle Type"] || item.vehicleType || "",
        service: item["Service"] || item.service || "",
        serviceDate: item["Service Date"] || item.serviceDate || "",
        dueDate: item["Due Date"] || item.dueDate || "",
        reminderDays: parseInt(item["Days"] || item.reminderDays || 30),
        status: item["Status"] || item.status || "upcoming",
      });
    });
    saveReminders();
  }
  if (m === "productSales") {
    d.forEach(function (item) {
      STATE.productSales.push({
        id: uid(),
        customer: item["Customer"] || item.customer || "",
        vehicleNo: item["Vehicle"] || item.vehicleNo || "",
        items: item.items || [],
        total: parseFloat(item["Total"] || item.total || 0),
        date: item["Date"] || item.date || fmtDate(),
        time: item["Time"] || item.time || fmtTime(),
      });
    });
    saveProductSales();
  }
  if (m === "pricingMatrix") {
    if (Array.isArray(d)) {
      d.forEach(function (item) {
        if (item.key && item.price) STATE.pricingMatrix[item.key] = item.price;
      });
    } else {
      Object.assign(STATE.pricingMatrix, d);
    }
    savePricingMatrix();
  }
  if (m === "brands") {
    d.forEach(function (item) {
      STATE.brands.push({
        id: uid(),
        name: item["Name"] || item.name || "Brand",
      });
    });
    saveBrands();
  }
  if (m === "categories") {
    d.forEach(function (item) {
      STATE.categories.push({
        id: item.id || uid(),
        name: item["Name"] || item.name || "Category",
      });
    });
    saveCategories();
  }
  if (m === "services") {
    if (d.pricingVehicles) {
      STATE.pricingVehicles = d.pricingVehicles;
      savePricingVehicles();
    }
    if (d.pricingServices) {
      STATE.pricingServices = d.pricingServices;
      savePricingServices();
    }
    if (d.pricingMatrix) {
      Object.assign(STATE.pricingMatrix, d.pricingMatrix);
      savePricingMatrix();
    }
  }
  if (m === "settings") {
    if (d.businessName) STATE.settings.businessName = d.businessName;
    if (d.address) STATE.settings.address = d.address;
    if (d.phone) STATE.settings.phone = d.phone;
    if (d.email) STATE.settings.email = d.email;
    if (d.invoicePrefix) STATE.settings.invoicePrefix = d.invoicePrefix;
    if (d.taxRate !== undefined) STATE.settings.taxRate = d.taxRate;
    saveSettings();
    updateAllBrandNames();
  }
  STATE.pendingImport = null;
  closeModal("importPreviewModal");
  toast(d.length + " records imported!", "success");
  renderInventoryTable();
  renderTokenTable();
  renderSavedInvoices();
  renderVehicleTable();
  renderExpenses();
  renderReminderTable();
  renderPricingMatrix();
  refreshDashboard();
}

// ==================== SETTINGS ====================
function initSettings() {
  qs("#saveBusinessSettings")?.addEventListener("click", function () {
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
  qs("#saveInvoiceSettings")?.addEventListener("click", function () {
    STATE.settings.invoicePrefix =
      qs("#settingInvPrefix")?.value?.trim() || "INV-";
    STATE.settings.taxRate = parseFloat(qs("#settingTaxRate")?.value) || 0;
    saveSettings();
  });
  qs("#changePasswordBtn")?.addEventListener("click", function () {
    var cp = qs("#currentPassword")?.value || "",
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
  qs("#resetCountersBtn")?.addEventListener("click", function () {
    confirm(
      "Reset?",
      function () {
        STATE.counters = { invoiceCounterWW: 1, invoiceCounterMB: 1 };
        saveCounters();
      },
      "Reset",
    );
  });
  qs("#clearDataBtn")?.addEventListener("click", function () {
    confirm(
      "DELETE ALL?",
      function () {
        Object.values(KEYS).forEach(function (k) {
          localStorage.removeItem(k);
        });
        sessionStorage.removeItem("servicepro_logged_in");
        sessionStorage.removeItem("servicepro_last_activity");
        setTimeout(function () {
          location.reload();
        }, 1500);
      },
      "Clear All",
    );
  });
}
function loadSettingsForm() {
  var s = STATE.settings;
  setValue("#settingBusinessName", s.businessName);
  setValue("#settingAddress", s.address);
  setValue("#settingPhone", s.phone);
  setValue("#settingEmail", s.email);
  setValue("#settingInvPrefix", s.invoicePrefix);
  setValue("#settingTaxRate", s.taxRate);
}

// ==================== FORCE UPDATE BUSINESS NAMES ====================
(function () {
  var biz = JSON.parse(localStorage.getItem("servicepro_businesses"));
  if (biz) {
    var updated = false;
    for (var i = 0; i < biz.length; i++) {
      if (
        biz[i].id === "wheelworks" &&
        biz[i].name.indexOf("Metabuilt") === -1
      ) {
        biz[i].name = "Wheel Works. Service station";
        updated = true;
      }
      if (
        biz[i].id === "metabuilt" &&
        biz[i].name.indexOf("Solutions") === -1
      ) {
        biz[i].name = "Metabuilt Solutions: workshop";
        updated = true;
      }
    }
    if (updated) {
      localStorage.setItem("servicepro_businesses", JSON.stringify(biz));
    }
  }
})();



function openVendorModal() {
  setValue("#vendorEditId", "");
  setValue("#vendorCompany", "");
  setValue("#vendorContactPerson", "");
  setValue("#vendorPhone", "");
  setValue("#vendorEmail", "");
  setValue("#vendorAddress", "");
  setValue("#vendorCategory", "");
  setValue("#vendorStatus", "Active");
  openModal("vendorModal");
}

function saveVendor() {
  var company = (qs("#vendorCompany")?.value || "").trim();
  var contact = (qs("#vendorContactPerson")?.value || "").trim();
  var phone = (qs("#vendorPhone")?.value || "").trim();
  if (!company || !contact || !phone) { toast("Fill required fields", "error"); return; }
  var vendor = {
    id: uid(),
    company: company,
    contactPerson: contact,
    phone: phone,
    email: (qs("#vendorEmail")?.value || "").trim(),
    address: (qs("#vendorAddress")?.value || "").trim(),
    category: qs("#vendorCategory")?.value || "General Supplier",
    status: qs("#vendorStatus")?.value || "Active",
    dateAdded: fmtDate(),
    totalPurchases: 0
  };
  STATE.vendors.push(vendor);
  saveVendors();
  closeModal("vendorModal");
  renderVendorTable();
  renderVendorKPIs();
  toast("Vendor added", "success");
}
// ==================== VENDORS ====================
function initVendors() {
  qs("#addVendorBtn")?.addEventListener("click", function() { openVendorModal(); });
  qs("#saveVendorBtn")?.addEventListener("click", saveVendor);
  qs("#vendorPaymentsBtn")?.addEventListener("click", openPaymentModal);
  qs("#savePaymentBtn")?.addEventListener("click", savePayment);
  qs("#vendorSearch")?.addEventListener("input", renderVendorTable);
  qs("#vendorCategoryFilter")?.addEventListener("change", renderVendorTable);
  if (qs("#paymentDate")) qs("#paymentDate").value = toDateInputValue(new Date());
  
  // Print payment receipt handler
  document.addEventListener("click", function(e) {
    var pr = e.target.closest("[data-print-vpayment]");
    if (pr) {
      var pid = pr.dataset.printVpayment;
      var pay = STATE.vendorPayments.find(function(p) { return p.id === pid; });
      if (pay) printVendorPaymentReceipt(pay);
    }
  });
}

function openVendorCategoryModal() {
  var existing = qs("#vendorCategoryModal");
  if (existing) existing.remove();
  var cats = ["Oil Supplier", "Parts Supplier", "Accessories", "Car Wash Chemicals", "Tires", "General Supplier"];
  var h = '<div class="modal-overlay" id="vendorCategoryModal"><div class="modal modal--sm"><div class="modal-header"><h2 class="modal-title"><span class="material-icons">category</span> Vendor Categories</h2><button class="modal-close" onclick="document.getElementById(\'vendorCategoryModal\').remove()"><span class="material-icons">close</span></button></div><div class="modal-body"><div style="display:flex;gap:0.5rem;margin-bottom:1rem"><input type="text" class="form-input" id="newVendorCategory" placeholder="New category" style="flex:1" /><button class="btn btn-primary btn-sm" id="addVendorCategoryBtn">Add</button></div><div id="vendorCategoryList">';
  cats.forEach(function(c) {
    h += '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #e2e8f0"><span>' + c + '</span></div>';
  });
  h += '</div></div></div></div>';
  document.body.insertAdjacentHTML("beforeend", h);
  
  qs("#addVendorCategoryBtn")?.addEventListener("click", function() {
    var n = (qs("#newVendorCategory")?.value || "").trim();
    if (n) {
      var sel = qs("#vendorCategoryFilter");
      if (sel) sel.innerHTML += '<option value="' + n + '">' + n + '</option>';
      var sel2 = qs("#vendorCategory");
      if (sel2) sel2.innerHTML += '<option value="' + n + '">' + n + '</option>';
      toast("Category added", "success");
      document.getElementById("vendorCategoryModal").remove();
    }
  });
}
function printVendorPaymentReceipt(pay) {
  var v = STATE.vendors.find(function(v) { return v.id === pay.vendorId; });
  var biz = getCurrentBusiness();
  
  // Get purchases for this vendor
  var purchasesHTML = '';
  if (v && v.purchases && v.purchases.length > 0) {
    purchasesHTML += '<div class="sec-title">Purchases</div>';
    v.purchases.forEach(function(p) {
      purchasesHTML += '<div class="info-row"><span class="info-lbl">' + sanitize(p.description) + ' x' + p.qty + '</span><span class="info-val">' + fmtPrice(p.amount) + '</span></div>';
    });
  }
  
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
  '*{margin:0;padding:0;box-sizing:border-box}' +
  'body{font-family:"Arial","Helvetica",sans-serif;width:74mm;padding:2mm;font-size:10pt;color:#000;background:#fff;line-height:1.3}' +
  '.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:3mm}' +
  '.biz{font-size:14pt;font-weight:900;text-transform:uppercase;letter-spacing:0.5px}' +
  '.addr{font-size:8pt;color:#000;margin-top:0.5mm}' +
  '.rec-box{text-align:center;margin:3mm 0;padding:2mm;border:2px solid #000}' +
  '.rec-lbl{font-size:7pt;text-transform:uppercase;letter-spacing:2px;color:#000}' +
  '.rec-title{font-size:12pt;font-weight:900}' +
  '.info{margin:3mm 0}' +
  '.info-row{display:flex;padding:0.8mm 0;border-bottom:1px dotted #ccc;font-size:9pt}' +
  '.info-lbl{width:40%;font-weight:700;font-size:7.5pt;text-transform:uppercase;color:#000}' +
  '.info-val{flex:1;font-weight:700;color:#000;text-align:right}' +
  '.sec-title{font-size:8pt;font-weight:900;text-transform:uppercase;text-align:center;margin:3mm 0 1mm 0;border-top:1px solid #000;padding-top:2mm}' +
  '.amount-box{text-align:center;margin:3mm 0;padding:2mm;border:2px solid #000}' +
  '.amount-lbl{font-size:7pt;text-transform:uppercase}' +
  '.amount-val{font-size:16pt;font-weight:900}' +
  '.ftr{text-align:center;font-size:7.5pt;color:#000;margin-top:3mm;border-top:1px solid #000;padding-top:2mm}' +
  '</style></head><body>' +
  '<div class="hdr"><div class="biz">' + sanitize(biz.name) + '</div><div class="addr">' + sanitize(biz.address) + '</div><div class="addr">Tel: ' + sanitize(biz.phone) + '</div></div>' +
  '<div class="rec-box"><div class="rec-lbl">PAYMENT RECEIPT</div><div class="rec-title">' + sanitize(v ? v.company : "N/A") + '</div></div>' +
  '<div class="info">' +
    '<div class="info-row"><span class="info-lbl">Contact</span><span class="info-val">' + sanitize(v ? v.contactPerson : "—") + ' | ' + sanitize(v ? v.phone : "—") + '</span></div>' +
    '<div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' + sanitize(pay.date) + '</span></div>' +
    '<div class="info-row"><span class="info-lbl">Method</span><span class="info-val">' + sanitize(pay.method) + '</span></div>' +
    '<div class="info-row"><span class="info-lbl">Transaction ID</span><span class="info-val">' + sanitize(pay.notes || "—") + '</span></div>' +
  '</div>' +
  purchasesHTML +
  '<div class="amount-box"><div class="amount-lbl">AMOUNT PAID</div><div class="amount-val">' + fmtPrice(pay.amount) + '</div></div>' +
  '<div class="ftr">Thank You!<br>' + sanitize(biz.name) + ' | ' + sanitize(biz.phone) + '</div>' +
  '</body></html>';
  
  if (window.electronAPI && window.electronAPI.printReceipt) {
    window.electronAPI.printReceipt(html, { pageSize: { width: 80000, height: 297000 } });
  } else {
    var w = window.open("", "_blank"); w.document.write(html); w.document.close();
    setTimeout(function() { w.print(); }, 500);
  }
}
function printVendorPaymentA4(pay) {
  var v = STATE.vendors.find(function(v) { return v.id === pay.vendorId; });
  var biz = getCurrentBusiness();
  
  var purchasesRows = '';
  if (v && v.purchases && v.purchases.length > 0) {
    v.purchases.forEach(function(p, i) {
      purchasesRows += '<tr><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + (i+1) + '</td><td style="border:1px solid #000;padding:1.5mm">' + sanitize(p.description) + '</td><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + p.qty + '</td><td style="text-align:right;border:1px solid #000;padding:1.5mm">' + fmtPrice(p.amount) + '</td></tr>';
    });
  }
  
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#000;font-size:10pt;line-height:1.3;background:#fff}.page{max-width:190mm;margin:0 auto}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #000;padding-bottom:4mm;margin-bottom:4mm}.biz-name{font-size:16pt;font-weight:900;color:#000;text-transform:uppercase}.biz-addr{font-size:8pt;color:#000}.logo{width:16mm;height:16mm;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-size:18pt;font-weight:900;color:#000}.ttl-box{border:2px solid #000;display:inline-block;padding:2mm 6mm;margin:4mm 0}.ttl{font-size:12pt;font-weight:900;color:#000;letter-spacing:2px}.info-grid{display:flex;gap:4mm;margin-bottom:4mm}.info-box{flex:1;border:1px solid #000;padding:2mm}.info-box-title{font-size:7pt;font-weight:900;color:#000;border-bottom:1px solid #000;padding-bottom:1mm;margin-bottom:1.5mm;text-transform:uppercase}.info-row{display:flex;justify-content:space-between;padding:0.6mm 0;font-size:8pt;color:#000}.info-lbl{font-weight:700;color:#000}.info-val{font-weight:700;color:#000}.tbl{width:100%;border-collapse:collapse;margin:4mm 0;border:1px solid #000}.tbl th{border:1px solid #000;padding:2mm;font-size:8pt;text-transform:uppercase;color:#000;font-weight:900}.tbl td{border:1px solid #000;padding:1.5mm;font-size:9pt;color:#000}.amount-section{margin:5mm 0;padding:3mm;border:2px solid #000;text-align:center}.amount-lbl{font-size:9pt;font-weight:700;color:#000}.amount-val{font-size:20pt;font-weight:900;color:#000}.sig-section{display:flex;gap:5mm;margin-top:8mm}.sig-box{flex:1;text-align:center}.sig-line{border-top:1px solid #000;margin-top:10mm;padding-top:2mm;font-size:7pt;color:#000}.ftr{text-align:center;margin-top:6mm;border-top:1px solid #000;padding-top:2mm;font-size:7pt;color:#000}</style></head><body><div class="page"><div class="hdr"><div><div class="biz-name">' + sanitize(biz.name) + '</div><div class="biz-addr">' + sanitize(biz.address) + '</div><div class="biz-addr">Tel: ' + sanitize(biz.phone) + ' | ' + sanitize(biz.email) + '</div></div><div class="logo">' + sanitize(biz.prefix) + '</div></div><div class="ttl-box"><span class="ttl">INVOICE</span></div><div class="info-grid"><div class="info-box"><div class="info-box-title">Vendor Details</div><div class="info-row"><span class="info-lbl">Company</span><span class="info-val">' + sanitize(v ? v.company : "N/A") + '</span></div><div class="info-row"><span class="info-lbl">Contact</span><span class="info-val">' + sanitize(v ? v.contactPerson : "—") + '</span></div><div class="info-row"><span class="info-lbl">Phone</span><span class="info-val">' + sanitize(v ? v.phone : "—") + '</span></div><div class="info-row"><span class="info-lbl">Category</span><span class="info-val">' + sanitize(v ? v.category : "—") + '</span></div></div><div class="info-box"><div class="info-box-title">Payment Details</div><div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' + sanitize(pay.date) + '</span></div><div class="info-row"><span class="info-lbl">Method</span><span class="info-val">' + sanitize(pay.method) + '</span></div><div class="info-row"><span class="info-lbl">Transaction ID</span><span class="info-val">' + sanitize(pay.notes || "—") + '</span></div><div class="info-row"><span class="info-lbl">Business</span><span class="info-val">' + sanitize(biz.name) + '</span></div></div></div>';
  
  if (v && v.purchases && v.purchases.length > 0) {
    html += '<div style="font-size:10pt;font-weight:700;color:#000;margin-bottom:2mm">Purchase Details</div><table class="tbl"><thead><tr><th style="width:6%;text-align:center">#</th><th>Description</th><th style="width:12%;text-align:center">Qty</th><th style="width:22%;text-align:right">Amount</th></tr></thead><tbody>' + purchasesRows + '</tbody></table>';
  }
  
  html += '<div class="amount-section"><div class="amount-lbl">AMOUNT PAID</div><div class="amount-val">' + fmtPrice(pay.amount) + '</div></div><div class="sig-section"><div class="sig-box"><div class="sig-line"></div>Authorized Signature</div><div class="sig-box"><div class="sig-line"></div>Vendor Signature</div></div><div class="ftr">' + sanitize(biz.name) + ' | ' + sanitize(biz.phone) + ' | Thank you for your business</div></div></body></html>';
  
  if (window.electronAPI && window.electronAPI.printReceipt) {
    window.electronAPI.printReceipt(html, { pageSize: { width: 210000, height: 297000 }, printBackground: true });
  } else {
    var w = window.open("", "_blank"); w.document.write(html); w.document.close();
    setTimeout(function() { w.print(); }, 500);
  }
}
function openVendorModal(d) {
  setValue("#vendorEditId", d ? d.id : "");
  setValue("#vendorCompany", d ? d.company : "");
  setValue("#vendorContactPerson", d ? d.contactPerson : "");
  setValue("#vendorPhone", d ? d.phone : "");
  setValue("#vendorEmail", d ? d.email : "");
  setValue("#vendorAddress", d ? d.address : "");
  setValue("#vendorCategory", d ? d.category : "");
  setValue("#vendorStatus", d ? d.status : "Active");
  openModal("vendorModal");
}

function saveVendor() {
  var company = (qs("#vendorCompany")?.value || "").trim();
  var contact = (qs("#vendorContactPerson")?.value || "").trim();
  var phone = (qs("#vendorPhone")?.value || "").trim();
  if (!company || !contact || !phone) { toast("Fill required fields", "error"); return; }
  var vendor = {
    id: uid(),
    company: company,
    contactPerson: contact,
    phone: phone,
    email: (qs("#vendorEmail")?.value || "").trim(),
    address: (qs("#vendorAddress")?.value || "").trim(),
    category: qs("#vendorCategory")?.value || "General Supplier",
    status: qs("#vendorStatus")?.value || "Active",
    dateAdded: fmtDate(),
    totalPurchases: 0
  };
  STATE.vendors.push(vendor);
  saveVendors();
  closeModal("vendorModal");
  renderVendorTable();
  renderVendorKPIs();
  toast("Vendor added", "success");
}

function openPaymentModal(vendorId) {
  var sel = qs("#paymentVendor");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Vendor</option>';
  STATE.vendors.forEach(function(v) {
    var sel2 = v.id === vendorId ? " selected" : "";
    sel.innerHTML += '<option value="' + v.id + '"' + sel2 + '>' + sanitize(v.company) + '</option>';
  });
  setValue("#paymentAmount", "");
  setValue("#paymentNotes", "");
  if (qs("#paymentDate")) qs("#paymentDate").value = toDateInputValue(new Date());
  openModal("vendorPaymentModal");
}

function savePayment() {
  var vid = qs("#paymentVendor")?.value;
  var amt = parseFloat(qs("#paymentAmount")?.value) || 0;
  if (!vid || !amt) { toast("Select vendor and enter amount", "error"); return; }
  STATE.vendorPayments.push({
    id: uid(),
    vendorId: vid,
    amount: amt,
    date: qs("#paymentDate")?.value ? fmtDate(new Date(qs("#paymentDate").value)) : fmtDate(),
    method: qs("#paymentMethod")?.value || "Cash",
    notes: (qs("#paymentNotes")?.value || "").trim()
  });
  saveVendorPayments();
  closeModal("vendorPaymentModal");
  renderVendorTable();
  renderVendorKPIs();
  toast("Payment saved", "success");
}

function viewVendor(vid) {
  var v = STATE.vendors.find(function(v) { return v.id === vid; });
  if (!v) return;
  var paid = STATE.vendorPayments.filter(function(p) { return p.vendorId === vid; }).reduce(function(s, p) { return s + p.amount; }, 0);
  var balance = (v.totalPurchases || 0) - paid;
  var paymentHistory = STATE.vendorPayments.filter(function(p) { return p.vendorId === vid; }).map(function(p) {
    return '<tr><td>' + sanitize(p.date) + '</td><td>' + fmtPrice(p.amount) + '</td><td>' + sanitize(p.method) + '</td><td>' + sanitize(p.notes || "—") + '</td><td><div class="table-actions"><button class="btn btn-sm btn-primary" onclick="printVendorPaymentReceiptById(\'' + p.id + '\')" style="background:#000;font-size:0.6rem;padding:2px 6px" title="80mm Receipt">Receipt</button><button class="btn btn-sm btn-outline" onclick="printVendorPaymentA4ById(\'' + p.id + '\')" style="font-size:0.6rem;padding:2px 6px" title="A4 Invoice">A4</button></div></td></tr>';
  }).join("") || '<tr><td colspan="5" style="text-align:center;padding:1rem;">No payments yet</td></tr>';
  
  var modalHTML = '<div class="modal-overlay" id="vendorViewModal"><div class="modal"><div class="modal-header"><h2 class="modal-title"><span class="material-icons">business</span> ' + sanitize(v.company) + '</h2><button class="modal-close" onclick="document.getElementById(\'vendorViewModal\').remove()"><span class="material-icons">close</span></button></div><div class="modal-body"><div class="kpi-grid kpi-grid--3"><div class="kpi-card"><div class="kpi-body"><span class="kpi-label">Total Purchases</span><span class="kpi-value">' + fmtPrice(v.totalPurchases || 0) + '</span></div></div><div class="kpi-card"><div class="kpi-body"><span class="kpi-label">Total Paid</span><span class="kpi-value">' + fmtPrice(paid) + '</span></div></div><div class="kpi-card"><div class="kpi-body"><span class="kpi-label">Balance</span><span class="kpi-value" style="color:' + (balance > 0 ? 'var(--danger)' : 'var(--success)') + '">' + fmtPrice(balance) + '</span></div></div></div><div class="invoice-section-label">Payment History</div><table class="data-table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Notes</th><th>Print</th></tr></thead><tbody>' + paymentHistory + '</tbody></table><button class="btn btn-primary" style="margin-top:1rem" onclick="openPaymentModal(\'' + v.id + '\');document.getElementById(\'vendorViewModal\').remove()">Add Payment</button></div></div></div>';
  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function printVendorPaymentReceiptById(pid) {
  var pay = STATE.vendorPayments.find(function(p) { return p.id === pid; });
  if (pay) printVendorPaymentReceipt(pay);
}

function printVendorPaymentA4ById(pid) {
  var pay = STATE.vendorPayments.find(function(p) { return p.id === pid; });
  if (pay) printVendorPaymentA4(pay);
}

function printVendorPaymentReceiptById(pid) {
  var pay = STATE.vendorPayments.find(function(p) { return p.id === pid; });
  if (pay) printVendorPaymentReceipt(pay);
}
function printVendorPaymentA4ById(pid) {
  var pay = STATE.vendorPayments.find(function(p) { return p.id === pid; });
  if (pay) printVendorPaymentA4(pay);
}

function renderVendorKPIs() {
  var vendors = STATE.vendors;
  var payments = STATE.vendorPayments;
  var totalPaid = payments.reduce(function(s, p) { return s + (p.amount || 0); }, 0);
  var totalPurchases = vendors.reduce(function(s, v) { return s + (v.totalPurchases || 0); }, 0);
  var pending = Math.max(0, totalPurchases - totalPaid);
  setText("#kpiTotalVendors", vendors.length);
  setText("#kpiVendorPaid", fmtPrice(totalPaid));
  setText("#kpiVendorPending", fmtPrice(pending));
  setText("#kpiVendorMonth", fmtPrice(0));
}


function openPaymentModal() {
  var sel = qs("#paymentVendor");
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Vendor</option>';
  STATE.vendors.forEach(function(v) {
    sel.innerHTML += '<option value="' + v.id + '">' + sanitize(v.company) + '</option>';
  });
  setValue("#paymentAmount", "");
  setValue("#paymentNotes", "");
  if (qs("#paymentDate")) qs("#paymentDate").value = toDateInputValue(new Date());
  openModal("vendorPaymentModal");
}

function savePayment() {
  var vid = qs("#paymentVendor")?.value;
  var amt = parseFloat(qs("#paymentAmount")?.value) || 0;
  if (!vid || !amt) { toast("Select vendor and enter amount", "error"); return; }
  STATE.vendorPayments.push({
    id: uid(),
    vendorId: vid,
    amount: amt,
    date: qs("#paymentDate")?.value ? fmtDate(new Date(qs("#paymentDate").value)) : fmtDate(),
    method: qs("#paymentMethod")?.value || "Cash",
    notes: (qs("#paymentNotes")?.value || "").trim()
  });
  saveVendorPayments();
  closeModal("vendorPaymentModal");
  renderVendorTable();
  renderVendorKPIs();
  toast("Payment saved", "success");
}

function renderVendorKPIs() {
  var vendors = STATE.vendors;
  var payments = STATE.vendorPayments;
  var totalPaid = payments.reduce(function(s, p) { return s + (p.amount || 0); }, 0);
  var totalPurchases = vendors.reduce(function(s, v) { return s + (v.totalPurchases || 0); }, 0);
  var pending = totalPurchases - totalPaid;
  setText("#kpiTotalVendors", vendors.length);
  setText("#kpiVendorPaid", fmtPrice(totalPaid));
  setText("#kpiVendorPending", fmtPrice(pending));
  setText("#kpiVendorMonth", fmtPrice(0));
}

function renderVendorTable() {
  var sr = (qs("#vendorSearch")?.value || "").toLowerCase();
  var cf = qs("#vendorCategoryFilter")?.value || "";
  var fl = STATE.vendors.filter(function(v) {
    return (!sr || v.company.toLowerCase().includes(sr) || v.contactPerson.toLowerCase().includes(sr) || v.phone.includes(sr)) && (!cf || v.category === cf);
  });
  var tb = qs("#vendorTableBody");
  if (!tb) return;
  var badge = qs("#vendorCountBadge");
  if (badge) badge.textContent = fl.length;
  if (!fl.length) {
    tb.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:2rem;">No vendors added yet</td></tr>';
    return;
  }
  tb.innerHTML = fl.map(function(v) {
    var paid = STATE.vendorPayments.filter(function(p) { return p.vendorId === v.id; }).reduce(function(s, p) { return s + p.amount; }, 0);
    var balance = (v.totalPurchases || 0) - paid;
    return '<tr><td style="font-weight:600">' + sanitize(v.company) + '</td><td>' + sanitize(v.contactPerson) + '</td><td>' + sanitize(v.phone) + '</td><td><span class="badge badge--blue">' + sanitize(v.category) + '</span></td><td>' + fmtPrice(v.totalPurchases || 0) + '</td><td>' + fmtPrice(paid) + '</td><td style="color:' + (balance > 0 ? 'var(--danger)' : 'var(--success)') + ';font-weight:700">' + fmtPrice(balance) + '</td><td><span class="badge ' + (v.status === 'Active' ? 'badge--green' : 'badge--red') + '">' + v.status + '</span></td><td><div class="table-actions"><button class="btn btn-sm btn-outline" onclick="viewVendor(\'' + v.id + '\')">View</button><button class="btn btn-sm btn-ghost" onclick="openPurchaseModal(\'' + v.id + '\')">+Purchase</button></div></td></tr>';
  }).join("");
}

function addVendorPurchaseRow(data) {
  var c = qs("#vendorPurchasesContainer");
  if (!c) return;
  var r = document.createElement("div");
  r.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
  r.innerHTML = '<input type="text" class="form-input" placeholder="Description" value="' + sanitize((data && data.description) || "") + '" style="flex:1;font-size:0.75rem;padding:4px 6px" /><input type="number" class="form-input" placeholder="Qty" value="' + ((data && data.qty) || 1) + '" min="1" style="width:50px;font-size:0.75rem;padding:4px" /><input type="number" class="form-input" placeholder="Amount" value="' + ((data && data.amount) || "") + '" min="0" style="width:80px;font-size:0.75rem;padding:4px" /><button class="btn-icon btn btn-danger-ghost" onclick="this.closest(\'div\').remove()"><span class="material-icons">close</span></button>';
  c.appendChild(r);
}

function openVendorModal(d) {
  setValue("#vendorEditId", d ? d.id : "");
  setValue("#vendorCompany", d ? d.company : "");
  setValue("#vendorContactPerson", d ? d.contactPerson : "");
  setValue("#vendorPhone", d ? d.phone : "");
  setValue("#vendorEmail", d ? d.email : "");
  setValue("#vendorAddress", d ? d.address : "");
  setValue("#vendorCategory", d ? d.category : "");
  setValue("#vendorStatus", d ? d.status : "Active");
  qs("#vendorPurchasesContainer").innerHTML = "";
  if (d && d.purchases) {
    d.purchases.forEach(function(p) { addVendorPurchaseRow(p); });
  }
  openModal("vendorModal");
}

function saveVendor() {
  var company = (qs("#vendorCompany")?.value || "").trim();
  var contact = (qs("#vendorContactPerson")?.value || "").trim();
  var phone = (qs("#vendorPhone")?.value || "").trim();
  if (!company || !contact || !phone) { toast("Fill required fields", "error"); return; }
  
  var purchases = [];
  var totalPurchases = 0;
  qsa("#vendorPurchasesContainer > div").forEach(function(row) {
    var inputs = row.querySelectorAll("input");
    var desc = (inputs[0]?.value || "").trim();
    var qty = parseInt(inputs[1]?.value) || 1;
    var amt = parseFloat(inputs[2]?.value) || 0;
    if (desc && amt > 0) {
      purchases.push({ description: desc, qty: qty, amount: amt, date: fmtDate() });
      totalPurchases += amt;
    }
  });
  
  var vendor = {
    id: uid(),
    company: company,
    contactPerson: contact,
    phone: phone,
    email: (qs("#vendorEmail")?.value || "").trim(),
    address: (qs("#vendorAddress")?.value || "").trim(),
    category: qs("#vendorCategory")?.value || "General Supplier",
    status: qs("#vendorStatus")?.value || "Active",
    dateAdded: fmtDate(),
    purchases: purchases,
    totalPurchases: totalPurchases
  };
  STATE.vendors.push(vendor);
  saveVendors();
  closeModal("vendorModal");
  renderVendorTable();
  renderVendorKPIs();
  toast("Vendor added with " + purchases.length + " purchases", "success");
}
function openPurchaseModal(vendorId) {
  var existing = qs("#purchaseModal");
  if (existing) existing.remove();
  
  var sel = '<option value="">Select Vendor</option>';
  STATE.vendors.forEach(function(v) {
    var sel2 = v.id === vendorId ? " selected" : "";
    sel += '<option value="' + v.id + '"' + sel2 + '>' + sanitize(v.company) + '</option>';
  });
  
 var h = '<div class="modal-overlay" id="purchaseModal"><div class="modal"><div class="modal-header"><h2 class="modal-title"><span class="material-icons">shopping_cart</span> Add Purchase</h2><button class="modal-close" onclick="document.getElementById(\'purchaseModal\').remove()"><span class="material-icons">close</span></button></div><div class="modal-body"><div class="form-group"><label class="form-label">Vendor <span class="required">*</span></label><select class="form-input" id="purchaseVendor">' + sel + '</select></div><div class="form-group"><label class="form-label">Description <span class="required">*</span></label><input type="text" class="form-input" id="purchaseDesc" placeholder="e.g. Engine Oil 20W-50" /></div><div class="form-row"><div class="form-group"><label class="form-label">Qty</label><input type="number" class="form-input" id="purchaseQty" value="1" min="1" /></div><div class="form-group"><label class="form-label">Amount <span class="required">*</span></label><input type="number" class="form-input" id="purchaseAmount" min="0" /></div></div><div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="purchaseDate" /></div></div><div class="modal-footer"><button class="btn btn-ghost" onclick="document.getElementById(\'purchaseModal\').remove()">Cancel</button><button class="btn btn-primary" onclick="saveVendorPurchase()">Save Purchase</button></div></div></div>';
  
  document.body.insertAdjacentHTML("beforeend", h);
  if (qs("#purchaseDate")) qs("#purchaseDate").value = toDateInputValue(new Date());
  
  qs("#savePurchaseBtn")?.addEventListener("click", function() {
    var vid = qs("#purchaseVendor")?.value;
    var desc = (qs("#purchaseDesc")?.value || "").trim();
    var qty = parseInt(qs("#purchaseQty")?.value) || 1;
    var amt = parseFloat(qs("#purchaseAmount")?.value) || 0;
    if (!vid || !desc || !amt) { toast("Fill required fields", "error"); return; }
    
    var purchase = { id: uid(), vendorId: vid, description: desc, qty: qty, amount: amt, date: qs("#purchaseDate")?.value ? fmtDate(new Date(qs("#purchaseDate").value)) : fmtDate() };
    STATE.purchaseOrders.push(purchase);
    savePurchaseOrders();
    
    var vendor = STATE.vendors.find(function(v) { return v.id === vid; });
    if (vendor) {
      vendor.totalPurchases = (vendor.totalPurchases || 0) + amt;
      if (!vendor.purchases) vendor.purchases = [];
      vendor.purchases.push(purchase);
      saveVendors();
    }
    
    document.getElementById("purchaseModal").remove();
    renderVendorTable();
    renderVendorKPIs();
    toast("Purchase added: " + fmtPrice(amt), "success");
  });
}
function saveVendorPurchase() {
  var vid = qs("#purchaseVendor")?.value;
  var desc = (qs("#purchaseDesc")?.value || "").trim();
  var qty = parseInt(qs("#purchaseQty")?.value) || 1;
  var amt = parseFloat(qs("#purchaseAmount")?.value) || 0;
  if (!vid || !desc || !amt) { toast("Fill required fields", "error"); return; }
  
  var purchase = { id: uid(), vendorId: vid, description: desc, qty: qty, amount: amt, date: qs("#purchaseDate")?.value ? fmtDate(new Date(qs("#purchaseDate").value)) : fmtDate() };
  STATE.purchaseOrders.push(purchase);
  savePurchaseOrders();
  
  var vendor = STATE.vendors.find(function(v) { return v.id === vid; });
  if (vendor) {
    vendor.totalPurchases = (vendor.totalPurchases || 0) + amt;
    if (!vendor.purchases) vendor.purchases = [];
    vendor.purchases.push(purchase);
    saveVendors();
  }
  
  var modal = document.getElementById("purchaseModal");
  if (modal) modal.remove();
  renderVendorTable();
  renderVendorKPIs();
  toast("Purchase added: " + fmtPrice(amt), "success");
}
// ============================================================
// TOKEN TOTAL — HARDENED OVERRIDE (paste at end of app.js)
// Replaces all prior versions of these functions and adds
// bulletproof event wiring + a MutationObserver safety net.
// ============================================================

function updateTokenTotal() {
  var t = 0;
  qsa("#tokenServicesList > div").forEach(function (row) {
    var sel = row.querySelector(".token-service-select");
    var priceInput = row.querySelector(".token-service-price");
    if (sel && sel.value && priceInput) {
      t += parseFloat(priceInput.value) || 0;
    }
  });
  qsa("#tokenProductsList > div").forEach(function (row) {
    var sel = row.querySelector(".token-product-select");
    var qtyInput = row.querySelector(".token-product-qty");
    var priceInput = row.querySelector(".token-product-price");
    if (sel && sel.value && qtyInput && priceInput) {
      t += (parseInt(qtyInput.value) || 0) * (parseFloat(priceInput.value) || 0);
    }
  });
  var discount = parseFloat(qs("#tokenDiscount")?.value) || 0;
  var grand = Math.max(0, t - discount);
  setText("#tokenGrandTotal", fmtPrice(grand));
  return grand;
}

function updateCustomTokenTotal() {
  var t = 0;
  qsa("#customTokenServicesList > div").forEach(function (row) {
    t += parseFloat(row.querySelector(".custom-svc-price")?.value) || 0;
  });
  qsa("#customTokenProductsList > div").forEach(function (row) {
    t +=
      (parseInt(row.querySelector(".custom-prd-qty")?.value) || 0) *
      (parseFloat(row.querySelector(".custom-prd-price")?.value) || 0);
  });
  var discount = parseFloat(qs("#tokenDiscount")?.value) || 0;
  var grand = Math.max(0, t - discount);
  setText("#tokenGrandTotal", fmtPrice(grand));
  return grand;
}

// Master recompute — figures out which section is active and updates accordingly
function recomputeTokenTotal() {
  var customSection = document.getElementById("customTokenServicesSection");
  var isCustom = customSection && customSection.style.display !== "none";
  if (isCustom) {
    updateCustomTokenTotal();
  } else {
    updateTokenTotal();
  }
}

function addTokenServiceRow(svcName, svcPrice) {
  var c = qs("#tokenServicesList");
  if (!c) return;
  var opts = STATE.pricingServices
    .map(function (s) {
      var sel = s.name === svcName ? " selected" : "";
      return '<option value="' + s.name + '"' + sel + ">" + sanitize(s.name) + "</option>";
    })
    .join("");
  var r = document.createElement("div");
  r.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
  r.innerHTML =
    '<select class="form-input token-service-select" style="flex:1;padding:6px 4px;font-size:0.72rem;"><option value="">Select service</option>' +
    opts +
    '</select><input type="number" class="form-input token-service-price" value="' +
    (svcPrice || 0) +
    '" readonly style="width:80px;padding:6px 2px;font-size:0.78rem;background:var(--surface-active);text-align:right;" /><button type="button" class="btn-icon btn btn-danger-ghost"><span class="material-icons">close</span></button>';
  c.appendChild(r);

  var vt = qs("#tokenVehicleType")?.value || "";
  if (svcName && vt) {
    r.querySelector(".token-service-price").value = getMatrixPrice(svcName, vt) || 0;
  }

  r.querySelector(".token-service-select").addEventListener("change", function () {
    var sv = this.value;
    var vt2 = qs("#tokenVehicleType")?.value || "";
    r.querySelector(".token-service-price").value = sv && vt2 ? getMatrixPrice(sv, vt2) : 0;
    recomputeTokenTotal();
  });
  r.querySelector("button").addEventListener("click", function () {
    r.remove();
    recomputeTokenTotal();
  });

  recomputeTokenTotal();
}

function addTokenProduct() {
  var c = qs("#tokenProductsList");
  if (!c) return;
  var opts = getAllVariantsFlat()
    .filter(function (v) { return v.stock > 0; })
    .map(function (v) {
      return (
        '<option value="' + v.id + '" data-price="' + v.sellingPrice + '" data-stock="' + v.stock + '">' +
        sanitize(v.fullName) + " | Stock: " + v.stock + " | " + fmtPrice(v.sellingPrice) + "</option>"
      );
    })
    .join("");
  var r = document.createElement("div");
  r.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
  r.innerHTML =
    '<select class="form-input token-product-select" style="flex:1;padding:6px 4px;font-size:0.72rem;"><option value="">Select variant</option>' +
    opts +
    '</select><input type="number" class="form-input token-product-qty" value="1" min="1" style="width:50px;padding:6px 2px;font-size:0.78rem;text-align:center;" /><input type="number" class="form-input token-product-price" value="0" readonly style="width:70px;padding:6px 2px;font-size:0.78rem;background:var(--surface-active);text-align:right;" /><button type="button" class="btn-icon btn btn-danger-ghost"><span class="material-icons">close</span></button>';
  c.appendChild(r);

  var s = r.querySelector(".token-product-select");
  s.addEventListener("change", function () {
    var o = this.options[this.selectedIndex];
    r.querySelector(".token-product-price").value = parseFloat(o?.dataset?.price) || 0;
    r.querySelector(".token-product-qty").max = parseInt(o?.dataset?.stock) || 0;
    recomputeTokenTotal();
  });
  r.querySelector(".token-product-qty").addEventListener("input", recomputeTokenTotal);
  r.querySelector("button").addEventListener("click", function () {
    r.remove();
    recomputeTokenTotal();
  });

  recomputeTokenTotal();
}

function addCustomServiceRow() {
  var c = qs("#customTokenServicesList");
  if (!c) return;
  var opts = STATE.pricingServices
    .map(function (s) { return '<option value="' + s.name + '">' + sanitize(s.name) + "</option>"; })
    .join("");
  var r = document.createElement("div");
  r.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
  r.innerHTML =
    '<select class="form-input custom-svc-select" style="flex:1;padding:6px 4px;font-size:0.72rem;"><option value="">Select</option>' +
    opts +
    '<option value="__custom__">Custom Service</option></select><input type="text" class="form-input custom-svc-name" placeholder="Service name" style="display:none;width:100px;padding:6px 4px;font-size:0.72rem" /><input type="number" class="form-input custom-svc-price" placeholder="Price" style="width:80px;padding:6px 2px;font-size:0.78rem;text-align:right;" /><button type="button" class="btn-icon btn btn-danger-ghost"><span class="material-icons">close</span></button>';
  c.appendChild(r);

  r.querySelector(".custom-svc-select").addEventListener("change", function () {
    if (this.value === "__custom__") {
      this.style.display = "none";
      r.querySelector(".custom-svc-name").style.display = "";
      r.querySelector(".custom-svc-name").focus();
    }
    recomputeTokenTotal();
  });
  r.querySelector(".custom-svc-price").addEventListener("input", recomputeTokenTotal);
  r.querySelector("button").addEventListener("click", function () {
    r.remove();
    recomputeTokenTotal();
  });
}

function addCustomProductRow() {
  var c = qs("#customTokenProductsList");
  if (!c) return;
  var opts = getAllVariantsFlat()
    .filter(function (v) { return v.stock > 0; })
    .map(function (v) {
      return '<option value="' + v.fullName + '" data-price="' + v.sellingPrice + '">' + sanitize(v.fullName) + "</option>";
    })
    .join("");
  var r = document.createElement("div");
  r.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
  r.innerHTML =
    '<select class="form-input custom-prd-select" style="flex:1;padding:6px 4px;font-size:0.72rem;"><option value="">Select</option>' +
    opts +
    '<option value="__custom__">Custom Product</option></select><input type="text" class="form-input custom-prd-name" placeholder="Product name" style="display:none;width:100px;padding:6px 4px;font-size:0.72rem" /><input type="number" class="form-input custom-prd-qty" value="1" min="1" style="width:50px;padding:6px 2px;font-size:0.78rem;text-align:center;" /><input type="number" class="form-input custom-prd-price" placeholder="Price" style="width:80px;padding:6px 2px;font-size:0.78rem;text-align:right;" /><button type="button" class="btn-icon btn btn-danger-ghost"><span class="material-icons">close</span></button>';
  c.appendChild(r);

  r.querySelector(".custom-prd-select").addEventListener("change", function () {
    if (this.value === "__custom__") {
      this.style.display = "none";
      r.querySelector(".custom-prd-name").style.display = "";
      r.querySelector(".custom-prd-name").focus();
    }
    var o = this.options[this.selectedIndex];
    var pr = parseFloat(o?.dataset?.price) || 0;
    if (pr) r.querySelector(".custom-prd-price").value = pr;
    recomputeTokenTotal();
  });
  r.querySelector(".custom-prd-qty").addEventListener("input", recomputeTokenTotal);
  r.querySelector(".custom-prd-price").addEventListener("input", recomputeTokenTotal);
  r.querySelector("button").addEventListener("click", function () {
    r.remove();
    recomputeTokenTotal();
  });
}

// Vehicle type change re-syncs all existing service row prices
qs("#tokenVehicleType")?.addEventListener("change", function () {
  var vt = this.value;
  qsa("#tokenServicesList .token-service-select").forEach(function (s) {
    var sv = s.value;
    var pr = sv && vt ? getMatrixPrice(sv, vt) : 0;
    var priceInput = s.parentElement.querySelector(".token-service-price");
    if (priceInput) priceInput.value = pr;
  });
  recomputeTokenTotal();
});

// Discount field — delegated so it works no matter when the modal was opened
document.addEventListener("input", function (e) {
  if (e.target && e.target.id === "tokenDiscount") {
    recomputeTokenTotal();
  }
});

// Safety net: watch the lists themselves for any DOM change and recompute.
// This catches any edge case the above listeners might somehow miss.
(function () {
  var ids = ["tokenServicesList", "tokenProductsList", "customTokenServicesList", "customTokenProductsList"];
  ids.forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    var obs = new MutationObserver(function () {
      recomputeTokenTotal();
    });
    obs.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["value"] });
  });
})();

// Diagnostic helper — run debugTokenTotal() in console to see exactly
// what values are being read, if anything still looks wrong.
function debugTokenTotal() {
  console.log("--- Service rows ---");
  qsa("#tokenServicesList > div").forEach(function (row) {
    console.log({
      service: row.querySelector(".token-service-select")?.value,
      price: row.querySelector(".token-service-price")?.value,
    });
  });
  console.log("--- Product rows ---");
  qsa("#tokenProductsList > div").forEach(function (row) {
    console.log({
      variant: row.querySelector(".token-product-select")?.value,
      qty: row.querySelector(".token-product-qty")?.value,
      price: row.querySelector(".token-product-price")?.value,
    });
  });
  console.log("Discount:", qs("#tokenDiscount")?.value);
  console.log("Computed grand total:", recomputeTokenTotal());
}
// ==================== BOOT ====================
document.addEventListener("DOMContentLoaded", function () {
  setLoginBrandName();
  if (!checkLoginSession()) {
    initLogin();
  }
});
