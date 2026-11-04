"use strict";

// ============================================================
// STARTUP SAFETY: force-hide any modal overlay the instant the
// script loads, before anything else runs. This guarantees the
// app never starts in a blocked state.
// ============================================================
(function forceHideAllModalsOnLoad() {
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".modal-overlay").forEach(function (m) {
      m.classList.add("hidden");
    });
    document.body.style.overflow = "";
  });
})();

// ============================================================
// FIX (ADDED ONLY — no existing function touched):
// Prices in Token / Custom Token / Products (and any other
// number input) were "slightly" changing because browsers auto
// increment/decrement a focused <input type="number"> when the
// mouse wheel / trackpad scrolls over it. If a user typed a price
// and then scrolled the modal, the focused price field's value
// would silently tick up/down by 1 (or more, on fast scroll),
// producing an incorrect saved price. This guard blurs any
// focused number input the instant a wheel/scroll event happens
// anywhere on the page, so scrolling can never alter a typed
// value. It is purely additive and does not modify any existing
// function, price calculation, or module.
// ============================================================
document.addEventListener(
  "wheel",
  function (e) {
    var ae = document.activeElement;
    if (ae && ae.tagName === "INPUT" && ae.type === "number") {
      ae.blur();
    }
  },
  { passive: true },
);

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

  // Check against existing token numbers instead of relying on array length,
  // so a deleted token or a race between tabs can't produce a duplicate number.
  var existingNumbers = [];
  for (var i = 0; i < STATE.tokens.length; i++) {
    if (
      STATE.tokens[i].number &&
      STATE.tokens[i].number.startsWith(prefix + "-" + ds)
    ) {
      existingNumbers.push(STATE.tokens[i].number);
    }
  }

  var counter = 1;
  var newNumber;
  do {
    newNumber = prefix + "-" + ds + "-" + String(counter).padStart(3, "0");
    counter++;
  } while (existingNumbers.indexOf(newNumber) !== -1);

  return newNumber;
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
  lowStockFilterActive: false,
  appInitialized: false, // NEW: guards initApp() one-time setup (see initApp)
  editingInvoiceId: null, // NEW: tracks which saved invoice is being edited (null = creating a new invoice)
  editingSaleId: null, // NEW: tracks which saved product sale is being edited (null = creating a new sale)
  selectedTokenIds: [], // NEW: bulk-select state for Token Management (not persisted)
  selectedVariantIds: [], // NEW: bulk-select state for Inventory (not persisted)
  selectedVehicleIds: [], // NEW: bulk-select state for Vehicles (not persisted)
  selectedExpenseIds: [], // NEW: bulk-select state for Expenses (not persisted)
  selectedReminderIds: [], // NEW: bulk-select state for Reminders (not persisted)
  selectedInvoiceIds: [], // NEW: bulk-select state for Saved Invoices (not persisted)
  selectedReportIds: [], // NEW: bulk-select state for Reports/Transactions (not persisted)
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
// FIX (bug review): several amount/price/qty inputs are type="text" (not
// type="number"), so nothing stops a user from typing a comma-formatted
// number like "5,000" (very common in Pakistan). Plain parseFloat/parseInt
// silently STOP at the comma (parseInt("5,000") === 5), and plain Number()
// returns NaN for the same input, which then falls back to 0 — both cases
// previously saved a completely wrong number with zero warning to the
// user. These helpers strip commas/whitespace before parsing, so "5,000"
// correctly becomes 5000. They are pure, read-only parsing helpers — they
// do not alter any stored data format, save/load logic, or localStorage
// handling in any way.
function parseNum(raw, fallback) {
  fallback = fallback === undefined ? 0 : fallback;
  if (raw === null || raw === undefined) return fallback;
  var cleaned = String(raw).replace(/[,\s]/g, "").trim();
  if (cleaned === "") return fallback;
  var n = parseFloat(cleaned);
  return isNaN(n) ? fallback : n;
}
function parseIntNum(raw, fallback) {
  fallback = fallback === undefined ? 0 : fallback;
  if (raw === null || raw === undefined) return fallback;
  var cleaned = String(raw).replace(/[,\s]/g, "").trim();
  if (cleaned === "") return fallback;
  var n = parseInt(cleaned, 10);
  return isNaN(n) ? fallback : n;
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

// ============================================================
// MODAL SYSTEM — FIXED
// openModal() now ALWAYS closes every other overlay first, so
// modals can never stack on top of each other and silently
// block clicks across the whole app. This was the root cause
// of buttons appearing "dead" everywhere.
// ============================================================
function openModal(id) {
  // Close every other modal overlay before opening the requested one
  document.querySelectorAll(".modal-overlay").forEach(function (m) {
    if (m.id !== id) m.classList.add("hidden");
  });
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
  }
  // Only restore scrolling if NO modal is open anymore
  var stillOpen = document.querySelectorAll(".modal-overlay:not(.hidden)").length;
  if (stillOpen === 0) {
    document.body.style.overflow = "";
  }
}
function closeAllModals() {
  document.querySelectorAll(".modal-overlay").forEach(function (m) {
    m.classList.add("hidden");
  });
  document.body.style.overflow = "";
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
    // Manual escape hatch: Ctrl+Shift+X force-closes every modal,
    // in case something unexpected leaves one stuck open.
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "x") {
      closeAllModals();
      toast("All modals force-closed", "info");
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
// FIXED: openWhatsApp was only a comment placeholder before — calling it
// (from the Reminders "WhatsApp" button) silently did nothing because the
// function didn't exist. It now opens WhatsApp (web or app, whichever the
// device has) with a ready-made reminder message pre-filled for the
// customer's number.
function openWhatsApp(phone, customerName, vehicleNo, service, serviceDate) {
  var num = getWhatsAppNumber(phone);
  if (!num) {
    toast("Invalid or missing phone number", "warning");
    return;
  }
  var biz = getCurrentBusiness();
  var msg =
    "Hello " + (customerName || "Customer") + ",\n\n" +
    "This is a reminder from " + (biz ? biz.name : "our service station") + " " +
    "regarding your vehicle " + (vehicleNo || "") + ".\n" +
    "Service: " + (service || "N/A") + "\n" +
    "Last Service Date: " + (serviceDate || "N/A") + "\n\n" +
    "It's time for your next service. Please visit us at your convenience.\n\n" +
    "Thank you!";
  var url = "https://wa.me/" + num + "?text=" + encodeURIComponent(msg);
  window.open(url, "_blank");
}
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
    ex.updatedAt = Date.now();
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
      createdAt: Date.now(),
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
  qs("#reminderBulkDeleteBtn")?.addEventListener("click", bulkDeleteSelectedReminders);
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

  // ✅ Newest first: sort by serviceDate descending, then by dueDate
  // descending, then by createdAt/updatedAt descending (real insertion/
  // update time) so a just-added or just-updated reminder always lands on
  // top instead of the bottom when several reminders share the same dates.
  fl.sort(function (a, b) {
    var dateA = parseDate(a.serviceDate) || new Date(0);
    var dateB = parseDate(b.serviceDate) || new Date(0);
    if (dateB - dateA !== 0) return dateB - dateA;
    // same serviceDate → sort by dueDate descending
    var dueA = parseDate(a.dueDate) || new Date(0);
    var dueB = parseDate(b.dueDate) || new Date(0);
    if (dueB - dueA !== 0) return dueB - dueA;
    var ordA = a.updatedAt || a.createdAt || 0;
    var ordB = b.updatedAt || b.createdAt || 0;
    return ordB - ordA;
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
      '<tr><td colspan="10" style="text-align:center;padding:3rem;">No reminders</td></tr>';
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
        '<tr><td><input type="checkbox" class="row-select-checkbox" data-reminder-select="' +
        r.id +
        '"' +
        (STATE.selectedReminderIds.indexOf(r.id) !== -1 ? " checked" : "") +
        '></td><td>' +
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
  closeAllModals();
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
  closeAllModals();
  updateLastActivity();
  setText("#currentDate", fmtDate());
  updateAllBrandNames();

  // ============================================================
  // FIX (duplicate business name box + duplicate tokens):
  // initApp() runs every time someone logs in — including repeat
  // logins after a manual logout or a session timeout, without a
  // full page reload. Everything below this guard attaches
  // addEventListener() calls and builds one-time UI (like the
  // business switcher box in the topbar). Previously these ran on
  // EVERY login, so after logging in 3 times, #saveTokenBtn had 3
  // click listeners stacked on it (1 click => 3 tokens saved), and
  // initBusinessSwitcher() had inserted its box into the topbar 3
  // times (3 duplicate business names shown). Wrapping this whole
  // block in "if (!STATE.appInitialized)" makes it run exactly once
  // per page load, no matter how many times login/logout happens.
  // Nothing inside was removed or altered — only guarded.
  // ============================================================
  if (!STATE.appInitialized) {
    STATE.appInitialized = true;

    updateSessionTime();
    setInterval(updateSessionTime, 60000);
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
        if (l.dataset.module) {
          // FIX (Issues 2 & 3): clicking straight into "Billing & Invoice"
          // from the sidebar must always start a BRAND NEW invoice. Before
          // this fix, if an invoice had been opened for editing (Saved
          // Invoices → Edit) and the user left the page without saving or
          // cancelling, STATE.editingInvoiceId stayed set. The next invoice
          // you tried to create (even for a brand-new token) silently
          // stayed in "update mode" — showing "Update Invoice" instead of
          // "Save Invoice" — and saving it overwrote that old, unrelated
          // invoice instead of creating a new one.
          if (l.dataset.module === "billing" && STATE.editingInvoiceId) {
            exitInvoiceEditMode();
            setValue("#invoiceToken", "");
            setValue("#invoiceVehicle", "");
            setValue("#invoiceCustomer", "");
            setValue("#cashReceived", "");
            setValue("#invoiceDiscount", "0");
            setText("#changeReturned", "Rs. 0");
            var svcC = qs("#invoiceServicesContainer");
            var prdC = qs("#invoiceProductsContainer");
            if (svcC) svcC.innerHTML = "";
            if (prdC) prdC.innerHTML = "";
            addInvoiceServiceRow("", 0);
            addInvoiceProductRow("", 0, 1);
          }
          navigateTo(l.dataset.module);
        }
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
      var ei2 = e.target.closest("[data-edit-invoice]");
      if (ei2) { editInvoice(ei2.dataset.editInvoice); return; }
      var pi = e.target.closest("[data-print-receipt]");
      if (pi) { printSavedReceipt(pi.dataset.printReceipt); return; }
      var pa4 = e.target.closest("[data-print-a4]");
      if (pa4) { printA4Invoice(pa4.dataset.printA4); return; }
      var di = e.target.closest("[data-delete-invoice]");
      if (di) { confirm("Delete invoice?", function () { if (STATE.editingInvoiceId === di.dataset.deleteInvoice) exitInvoiceEditMode(); STATE.invoices = STATE.invoices.filter(function (i) { return i.id !== di.dataset.deleteInvoice; }); saveInvoices(); renderSavedInvoices(); }); return; }
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
    // NEW — bulk select/delete checkboxes for Token Management & Inventory
    document.addEventListener("change", function (e) {
      var tcb = e.target.closest("[data-token-select]");
      if (tcb) {
        var tid = tcb.dataset.tokenSelect;
        if (tcb.checked) {
          if (STATE.selectedTokenIds.indexOf(tid) === -1) STATE.selectedTokenIds.push(tid);
        } else {
          STATE.selectedTokenIds = STATE.selectedTokenIds.filter(function (id) { return id !== tid; });
        }
        updateTokenBulkDeleteUI();
        return;
      }
      var vcb = e.target.closest("[data-variant-select]");
      if (vcb) {
        var vid = vcb.dataset.variantSelect;
        if (vcb.checked) {
          if (STATE.selectedVariantIds.indexOf(vid) === -1) STATE.selectedVariantIds.push(vid);
        } else {
          STATE.selectedVariantIds = STATE.selectedVariantIds.filter(function (id) { return id !== vid; });
        }
        updateInventoryBulkDeleteUI();
        return;
      }
      if (e.target && e.target.id === "tokenSelectAll") {
        var checkedAll = e.target.checked;
        qsa(".row-select-checkbox[data-token-select]").forEach(function (cb) {
          cb.checked = checkedAll;
          var id1 = cb.dataset.tokenSelect;
          if (checkedAll) {
            if (STATE.selectedTokenIds.indexOf(id1) === -1) STATE.selectedTokenIds.push(id1);
          } else {
            STATE.selectedTokenIds = STATE.selectedTokenIds.filter(function (id) { return id !== id1; });
          }
        });
        updateTokenBulkDeleteUI();
        return;
      }
      if (e.target && e.target.id === "inventorySelectAll") {
        var checkedAll2 = e.target.checked;
        qsa(".row-select-checkbox[data-variant-select]").forEach(function (cb) {
          cb.checked = checkedAll2;
          var id2 = cb.dataset.variantSelect;
          if (checkedAll2) {
            if (STATE.selectedVariantIds.indexOf(id2) === -1) STATE.selectedVariantIds.push(id2);
          } else {
            STATE.selectedVariantIds = STATE.selectedVariantIds.filter(function (id) { return id !== id2; });
          }
        });
        updateInventoryBulkDeleteUI();
        return;
      }
      // NEW (ADDED ONLY) — bulk-select checkboxes for Vehicles, Expenses,
      // Reminders, and Saved Invoices. Same pattern as Token/Inventory above.
      var vehcb = e.target.closest("[data-vehicle-select]");
      if (vehcb) {
        var vhid = vehcb.dataset.vehicleSelect;
        if (vehcb.checked) {
          if (STATE.selectedVehicleIds.indexOf(vhid) === -1) STATE.selectedVehicleIds.push(vhid);
        } else {
          STATE.selectedVehicleIds = STATE.selectedVehicleIds.filter(function (id) { return id !== vhid; });
        }
        updateVehicleBulkDeleteUI();
        return;
      }
      var excb = e.target.closest("[data-expense-select]");
      if (excb) {
        var exid = excb.dataset.expenseSelect;
        if (excb.checked) {
          if (STATE.selectedExpenseIds.indexOf(exid) === -1) STATE.selectedExpenseIds.push(exid);
        } else {
          STATE.selectedExpenseIds = STATE.selectedExpenseIds.filter(function (id) { return id !== exid; });
        }
        updateExpenseBulkDeleteUI();
        return;
      }
      var remcb = e.target.closest("[data-reminder-select]");
      if (remcb) {
        var rmid = remcb.dataset.reminderSelect;
        if (remcb.checked) {
          if (STATE.selectedReminderIds.indexOf(rmid) === -1) STATE.selectedReminderIds.push(rmid);
        } else {
          STATE.selectedReminderIds = STATE.selectedReminderIds.filter(function (id) { return id !== rmid; });
        }
        updateReminderBulkDeleteUI();
        return;
      }
      var invcb = e.target.closest("[data-invoice-select]");
      if (invcb) {
        var ivid = invcb.dataset.invoiceSelect;
        if (invcb.checked) {
          if (STATE.selectedInvoiceIds.indexOf(ivid) === -1) STATE.selectedInvoiceIds.push(ivid);
        } else {
          STATE.selectedInvoiceIds = STATE.selectedInvoiceIds.filter(function (id) { return id !== ivid; });
        }
        updateInvoiceBulkDeleteUI();
        return;
      }
      if (e.target && e.target.id === "vehicleSelectAll") {
        var ca1 = e.target.checked;
        qsa(".row-select-checkbox[data-vehicle-select]").forEach(function (cb) {
          cb.checked = ca1;
          var idv = cb.dataset.vehicleSelect;
          if (ca1) { if (STATE.selectedVehicleIds.indexOf(idv) === -1) STATE.selectedVehicleIds.push(idv); }
          else { STATE.selectedVehicleIds = STATE.selectedVehicleIds.filter(function (id) { return id !== idv; }); }
        });
        updateVehicleBulkDeleteUI();
        return;
      }
      if (e.target && e.target.id === "expenseSelectAll") {
        var ca2 = e.target.checked;
        qsa(".row-select-checkbox[data-expense-select]").forEach(function (cb) {
          cb.checked = ca2;
          var ide = cb.dataset.expenseSelect;
          if (ca2) { if (STATE.selectedExpenseIds.indexOf(ide) === -1) STATE.selectedExpenseIds.push(ide); }
          else { STATE.selectedExpenseIds = STATE.selectedExpenseIds.filter(function (id) { return id !== ide; }); }
        });
        updateExpenseBulkDeleteUI();
        return;
      }
      if (e.target && e.target.id === "reminderSelectAll") {
        var ca3 = e.target.checked;
        qsa(".row-select-checkbox[data-reminder-select]").forEach(function (cb) {
          cb.checked = ca3;
          var idr = cb.dataset.reminderSelect;
          if (ca3) { if (STATE.selectedReminderIds.indexOf(idr) === -1) STATE.selectedReminderIds.push(idr); }
          else { STATE.selectedReminderIds = STATE.selectedReminderIds.filter(function (id) { return id !== idr; }); }
        });
        updateReminderBulkDeleteUI();
        return;
      }
      if (e.target && e.target.id === "savedInvoiceSelectAll") {
        var ca4 = e.target.checked;
        qsa(".row-select-checkbox[data-invoice-select]").forEach(function (cb) {
          cb.checked = ca4;
          var idi = cb.dataset.invoiceSelect;
          if (ca4) { if (STATE.selectedInvoiceIds.indexOf(idi) === -1) STATE.selectedInvoiceIds.push(idi); }
          else { STATE.selectedInvoiceIds = STATE.selectedInvoiceIds.filter(function (id) { return id !== idi; }); }
        });
        updateInvoiceBulkDeleteUI();
        return;
      }
      var repcb = e.target.closest("[data-report-select]");
      if (repcb) {
        var rpkey = repcb.dataset.reportSelect;
        if (repcb.checked) {
          if (STATE.selectedReportIds.indexOf(rpkey) === -1) STATE.selectedReportIds.push(rpkey);
        } else {
          STATE.selectedReportIds = STATE.selectedReportIds.filter(function (id) { return id !== rpkey; });
        }
        updateReportBulkDeleteUI();
        return;
      }
      if (e.target && e.target.id === "reportSelectAll") {
        var ca5 = e.target.checked;
        qsa(".row-select-checkbox[data-report-select]").forEach(function (cb) {
          cb.checked = ca5;
          var idr2 = cb.dataset.reportSelect;
          if (ca5) { if (STATE.selectedReportIds.indexOf(idr2) === -1) STATE.selectedReportIds.push(idr2); }
          else { STATE.selectedReportIds = STATE.selectedReportIds.filter(function (id) { return id !== idr2; }); }
        });
        updateReportBulkDeleteUI();
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
    initVendors();
    initAutoBackupSystem(); // NEW (added only): starts the 30-min auto backup engine
  }

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
  closeAllModals();
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
      // FIX (Issues 2 & 3): same stale-edit-mode guard as the sidebar link —
      // ensure a fresh "New Invoice" always starts blank, not mid-update of
      // a previously (and never finished) edited invoice.
      if (STATE.editingInvoiceId) {
        exitInvoiceEditMode();
        setValue("#invoiceToken", "");
        setValue("#invoiceVehicle", "");
        setValue("#invoiceCustomer", "");
        setValue("#cashReceived", "");
        setValue("#invoiceDiscount", "0");
        setText("#changeReturned", "Rs. 0");
        var svcC = qs("#invoiceServicesContainer");
        var prdC = qs("#invoiceProductsContainer");
        if (svcC) svcC.innerHTML = "";
        if (prdC) prdC.innerHTML = "";
        addInvoiceServiceRow("", 0);
        addInvoiceProductRow("", 0, 1);
      }
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
      if (tk.discount) t -= tk.discount;
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
// ============================================================
// NEW (ADDED ONLY) — Product cost (purchase price) helpers for Net Profit.
// Net Profit ab sirf product ka PROFIT count karta hai (sale - cost),
// pura sale amount nahi. Cost wohi lookup use karta hai jo Monthly
// Summary ke "Product Profit" me already use hota hai: pehle variant ID,
// phir same naam wali entry. Custom (inventory se bahar) product ki cost
// maloom nahi hoti, isliye uski cost 0 maani jati hai (koi change nahi).
// ============================================================
function getProductUnitCost(variantId, name) {
  var pp = 0;
  var f = variantId ? findVariantById(variantId) : null;
  if (f) pp = f.variant.purchasePrice || 0;
  if (pp <= 0 && name) {
    var withCost = getAllVariantsFlat().find(function (v) {
      return v.fullName === name && (v.purchasePrice || 0) > 0;
    });
    if (withCost) pp = withCost.purchasePrice;
  }
  return pp;
}
function getTotalProductCost() {
  var cost = 0;
  STATE.tokens.forEach(function (tk) {
    if (tk.status !== "completed") return;
    (tk.products || []).forEach(function (p) {
      cost += getProductUnitCost(p.variantId, p.fullName) * (p.qty || 0);
    });
  });
  STATE.productSales.forEach(function (s) {
    (s.items || []).forEach(function (i) {
      cost += getProductUnitCost(i.variantId, i.fullName) * (i.qty || 0);
    });
  });
  return cost;
}
function getNetProfit() {
  return getTotalRevenue() - getTotalProductCost() - getAllExpensesTotal();
}
function getMatrixPrice(sn, vt) {
  var key = sn + "__" + vt;
  return STATE.pricingMatrix[key] || 0;
}
// FIX (bug review): "#invoiceVehicle" on the Billing screen holds the
// VEHICLE NUMBER (e.g. "ABC-1234"), not the vehicle TYPE that
// getMatrixPrice() needs (e.g. "Car"). This mismatch made the pricing
// lookup for manually-added invoice services always fail (price showed
// Rs. 0). This is a pure READ-ONLY lookup against STATE.vehicles — it
// does not create, edit, or delete any stored data.
function getVehicleTypeFromNumber(vehicleNo) {
  if (!vehicleNo) return "";
  var v = STATE.vehicles.find(function (v) {
    return (
      (v.vehicleNo || "").toUpperCase() ===
      String(vehicleNo).trim().toUpperCase()
    );
  });
  return v ? v.type || "" : "";
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
  setText("#kpiNetProfit", fmtPrice(getNetProfit()));
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
  renderMonthlySummary();
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
  qs("#tokenBulkDeleteBtn")?.addEventListener("click", bulkDeleteSelectedTokens);
  qs("#newTokenBtn")?.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    openNewTokenModal();
  });
  qs("#newTokenBtn2")?.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    openNewTokenModal();
  });
  qs("#customTokenBtn")?.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    openCustomTokenModal();
  });
  qs("#saveTokenBtn")?.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    // FIX (duplicate token bug): belt-and-braces protection alongside the
    // saveToken.running / saveCustomToken.running guards already inside
    // those functions — briefly disabling the button itself makes it
    // impossible for a fast double-click (or a stray duplicate click
    // event) to fire two saves from a single user action.
    if (saveToken.running || saveCustomToken.running) return;
    var btn = this;
    if (btn.disabled) return;
    btn.disabled = true;
    var customSection = document.getElementById("customTokenServicesSection");
    if (customSection && customSection.style.display !== "none") {
      saveCustomToken();
    } else {
      saveToken();
    }
    setTimeout(function () { btn.disabled = false; }, 500);
  });
  qs("#tokenSearch")?.addEventListener("input", renderTokenTable);
  qs("#tokenStatusFilter")?.addEventListener("change", renderTokenTable);

  var phoneField = qs("#tokenContactNumber");
  if (phoneField) {
    phoneField.addEventListener("input", function() {
      var query = this.value.trim();
      var container = qs("#customerSuggestions");
      if (!container) return;
      if (query.length < 3) { container.style.display = "none"; return; }
      var queryClean = query.replace(/[\s\-\+]/g, "");
      var matches = STATE.vehicles.filter(function(v) {
        if (!v.contact) return false;
        var contactClean = v.contact.replace(/[\s\-\+]/g, "");
        return contactClean.includes(queryClean);
      });
      if (!matches.length) { container.style.display = "none"; return; }
      container.style.display = "block";
      container.innerHTML = matches.map(function(v) {
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;cursor:pointer;border-bottom:1px solid var(--border)" onclick="selectCustomer(\'' + v.vehicleNo + '\')" onmouseover="this.style.background=\'var(--surface-active)\'" onmouseout="this.style.background=\'var(--surface)\'">' +
          '<span class="material-icons" style="color:var(--primary);font-size:22px">person</span>' +
          '<div style="flex:1"><div style="font-weight:600;font-size:0.8rem">' + sanitize(v.owner) + '</div>' +
          '<div style="display:flex;gap:8px;font-size:0.68rem;color:var(--text-muted);margin-top:2px"><span style="display:flex;align-items:center;gap:2px"><span class="material-icons" style="font-size:14px">call</span>' + sanitize(formatContactDisplay(v.contact)) + '</span><span style="display:flex;align-items:center;gap:2px"><span class="material-icons" style="font-size:14px">directions_car</span>' + sanitize(v.vehicleNo) + ' (' + sanitize(v.type) + ')</span></div></div>' +
          '</div>';
      }).join("");
    });
  }

  renderTokenTable();
}

function selectCustomer(vehicleNo) {
  var v = STATE.vehicles.find(function(v) { return v.vehicleNo === vehicleNo; });
  if (!v) return;
  setValue("#tokenVehicleNo", v.vehicleNo);
  setValue("#tokenVehicleType", v.type);
  setValue("#tokenOwnerName", v.owner);
  setValue("#tokenContactNumber", v.contact);
  var container = qs("#customerSuggestions");
  if (container) container.style.display = "none";
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
  qs("#customTokenServicesList").innerHTML = "";
  qs("#customTokenProductsList").innerHTML = "";

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
  }, 100);
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
  qs("#tokenServicesList").innerHTML = "";
  qs("#tokenProductsList").innerHTML = "";

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

function saveToken() {
  if (saveToken.running) return;
  saveToken.running = true;
  
  updateTokenTotal();
  var editId = qs("#tokenModal")?.dataset?.editId || "";
  var vn = (qs("#tokenVehicleNo")?.value || "").trim().toUpperCase();
  var vt = qs("#tokenVehicleType")?.value || "";
  var on = (qs("#tokenOwnerName")?.value || "").trim();
  var cn = (qs("#tokenContactNumber")?.value || "").trim();
  var bizSelect = qs("#tokenBusinessSelect"); 
  var businesses = getBusinesses(); 
  var biz;
  if (bizSelect && bizSelect.value) { 
    biz = businesses.find(function(b) { return b.id === bizSelect.value; }); 
  }
  if (!biz) { biz = getCurrentBusiness(); }
  var prefix = biz.prefix;

  // FIX (make Vehicle Number / Customer Name / Contact Number optional):
  // Vehicle Type and at least one Service are still required (the token's
  // core purpose — pricing/receipts — depends on them). Vehicle Number,
  // Customer Name, and Contact Number are no longer mandatory: if the
  // user fills them in they're used and validated normally, but leaving
  // them blank no longer blocks saving the token.
  var hasServices = qsa("#tokenServicesList .token-service-select").some(function(s) { return s.value; });
  if (!vt || !hasServices) { 
    toast("Please select vehicle type and at least one service", "error"); 
    saveToken.running = false; 
    return; 
  }

  // Contact number: only validate format if the user actually typed
  // something. An empty contact number is now allowed.
  var cv;
  if (!cn) {
    cv = { valid: true, formatted: "", message: "" };
  } else {
    cv = validateContactNumber(cn);
    if (!cv.valid) {
      toast(cv.message, "error");
      qs("#tokenContactNumber")?.focus();
      saveToken.running = false;
      return;
    }
  }

  var selectedServices = []; 
  var totalServicePrice = 0;
  qsa("#tokenServicesList .token-service-select").forEach(function(s, idx) {
    var sv = s.value;
    if (sv) {
      var priceInput = s.parentElement.querySelector(".token-service-price");
      var rawPrice = priceInput ? (priceInput.valueAsNumber || parseFloat(priceInput.value)) : NaN;
      var pr = isNaN(rawPrice) ? 0 : rawPrice;
      selectedServices.push(sv); 
      totalServicePrice += pr;
      console.log("[Save Token Svc " + idx + "]", sv, "price:", pr);
    }
  });
  var fs = selectedServices.join(", ");
  var sp = totalServicePrice;

  var discount = parseNum(qs("#tokenDiscount")?.value, 0);

  // FIX (bug review): when this save is an EDIT of an existing token,
  // that token may already hold reserved stock for these same variants
  // (deducted when it was first saved). We add that reserved qty back
  // before checking availability here — same pattern already used in
  // saveCustomToken() — otherwise editing a token without even
  // increasing its quantity could wrongly report "insufficient stock"
  // against its own already-reserved units. This ONLY affects the
  // validation check below; the actual restore-then-deduct stock logic
  // further down (for editId) is completely unchanged.
  var existingTokenForStockCheck = editId
    ? STATE.tokens.find(function (t) { return t.id === editId; })
    : null;

  var newProducts = []; 
  var hasError = false;
  qsa("#tokenProductsList .token-product-select").forEach(function(s, i) {
    var vid = s.value; 
    if (!vid) return;
    var f = findVariantById(vid); 
    if (!f) return;
    var q = parseInt(qsa("#tokenProductsList .token-product-qty")[i]?.value) || 1;
    var availableStock = f.variant.stock;
    if (existingTokenForStockCheck && existingTokenForStockCheck.products) {
      existingTokenForStockCheck.products.forEach(function (op) {
        if (op.variantId === vid) availableStock += op.qty;
      });
    }
    if (q > availableStock) { 
      toast("Only " + availableStock + " units available for " + f.fullName, "error"); 
      hasError = true; 
      return; 
    }
    var priceInput = qsa("#tokenProductsList .token-product-price")[i];
    var rawPrice = priceInput ? (priceInput.valueAsNumber || parseFloat(priceInput.value)) : NaN;
    var p = isNaN(rawPrice) ? f.variant.sellingPrice : rawPrice;
    newProducts.push({ variantId: f.variant.id, fullName: f.fullName, qty: q, price: p });
  });
  if (hasError) { saveToken.running = false; return; }

  if (editId) {
    var t = STATE.tokens.find(function(t) { return t.id === editId; }); if (!t) { saveToken.running = false; return; }
    if (t.products) t.products.forEach(function(p) { var f = findVariantById(p.variantId); if (f) f.variant.stock += p.qty; });
    newProducts.forEach(function(p) { var f = findVariantById(p.variantId); if (f) f.variant.stock = Math.max(0, f.variant.stock - p.qty); });
    t.vehicleNo = vn; t.vehicleType = vt; t.ownerName = on; t.contactNumber = cv.formatted;
    t.service = fs; t.servicePrice = sp; t.products = newProducts; t.discount = discount;
    t.editedAt = fmtDate() + " " + fmtTime(); t.businessPrefix = prefix; t.businessId = biz.id; t.businessName = biz.name;
    saveTokens(); saveInventory(); renderTokenTable(); closeModal("tokenModal"); refreshDashboard();
    toast("Token updated successfully", "success");
  } else {
    newProducts.forEach(function(p) { var f = findVariantById(p.variantId); if (f) f.variant.stock = Math.max(0, f.variant.stock - p.qty); });
    // FIX: only create/update a Vehicle Record when a vehicle number was
    // actually entered — vehicle number is now optional on the token, so
    // skipping this avoids piling up blank "vehicle" rows in Vehicle
    // Records when it's left empty.
    if (vn) {
      var ex = STATE.vehicles.find(function(v) { return v.vehicleNo === vn; });
      if (!ex) { STATE.vehicles.push({ id: uid(), vehicleNo: vn, owner: on, contact: cv.formatted, type: vt, notes: "", visits: 1, lastService: fmtDate() }); saveVehicles(); }
      else { ex.visits = (ex.visits || 0) + 1; ex.lastService = fmtDate(); if (cv.formatted) ex.contact = cv.formatted; saveVehicles(); }
    }

    // Final duplicate-safety check: if another tab/session generated a token
    // with the same number in the meantime, keep regenerating until unique.
    var proposedNumber = qs("#autoTokenNumber")?.textContent || generateTokenNumber();
    var maxRetries = 10;
    var retries = 0;
    while (retries < maxRetries) {
      var exists = STATE.tokens.some(function(tk) { return tk.number === proposedNumber; });
      if (!exists) break;
      proposedNumber = generateTokenNumber();
      retries++;
    }
    setText("#autoTokenNumber", proposedNumber);

    var newToken = { id: uid(), number: proposedNumber, vehicleNo: vn, vehicleType: vt, ownerName: on, contactNumber: cv.formatted, service: fs, servicePrice: sp, discount: discount, products: newProducts, date: fmtDate(), time: fmtTime(), createdAt: Date.now(), status: "waiting", businessPrefix: prefix, businessId: biz.id, businessName: biz.name };
    STATE.tokens.push(newToken); saveTokens(); saveInventory(); saveCounters();
    closeModal("tokenModal"); renderTokenTable(); refreshDashboard();
    toast("Token " + newToken.number + " generated successfully", "success");
  }
  saveToken.running = false;
}

function saveCustomToken() {
  // ✅ FIX (double-submit): a fast double-click on Save was able to create
  // two duplicate Custom Tokens before the first click even finished. This
  // guard mirrors the same pattern already used in saveToken().
  if (saveCustomToken.running) return;
  saveCustomToken.running = true;

  // FIX (Issue 4 root cause): this function used to ALWAYS create a brand
  // new token — even when opened via "Edit" on an existing custom token —
  // so every edit was silently discarded (the old token stayed exactly as
  // it was) and printing/viewing that token kept showing the un-edited
  // data. editId (same pattern as saveToken()) now lets us update the
  // existing token in place instead.
  var editId = qs("#tokenModal")?.dataset?.editId || "";
  var existingTokenForEdit = editId
    ? STATE.tokens.find(function (tk) { return tk.id === editId; })
    : null;

  var vn = (qs("#tokenVehicleNo")?.value || "").trim().toUpperCase();
  var vt = qs("#tokenVehicleType")?.value || "";
  var on = (qs("#tokenOwnerName")?.value || "").trim();
  var cn = (qs("#tokenContactNumber")?.value || "").trim();
  var bizSelect = qs("#tokenBusinessSelect"); 
  var businesses = getBusinesses(); 
  var biz;
  if (bizSelect && bizSelect.value) { 
    biz = businesses.find(function(b) { return b.id === bizSelect.value; }); 
  }
  if (!biz) { biz = getCurrentBusiness(); }
  var prefix = biz.prefix;
  
  // FIX (make Vehicle Number / Customer Name / Contact Number optional):
  // same relaxation as saveToken() — Vehicle Type is still required, but
  // Vehicle Number, Customer Name, and Contact Number no longer block
  // saving a Custom Token when left blank.
  if (!vt) { toast("Please select vehicle type", "error"); saveCustomToken.running = false; return; }
  var cv;
  if (!cn) {
    cv = { valid: true, formatted: "", message: "" };
  } else {
    cv = validateContactNumber(cn);
    if (!cv.valid) { toast(cv.message, "error"); qs("#tokenContactNumber")?.focus(); saveCustomToken.running = false; return; }
  }

  var customServices = [];
  qsa("#customTokenServicesList > div").forEach(function(row, idx) {
    var sel = row.querySelector(".custom-svc-select");
    var name = row.querySelector(".custom-svc-name");
    var priceInput = row.querySelector(".custom-svc-price");
    
    // ✅ FIX: Use valueAsNumber first, then parseFloat
    var rawPrice = priceInput ? (priceInput.valueAsNumber || parseFloat(priceInput.value)) : NaN;
    var price = isNaN(rawPrice) ? 0 : rawPrice;
    
    var svcName = "";
    if (sel && (sel.style.display === "none" || sel.value === "__custom__")) {
      svcName = name ? (name.value || "").trim() : "";
    } else if (sel) {
      svcName = sel.value;
    }
    
    // ✅ FIX: Allow price >= 0 (not just > 0). Only require name.
    if (svcName) {
      customServices.push({ name: svcName, price: price });
      console.log("[Save Custom Svc " + idx + "]", svcName, "price:", price);
    }
  });

  // ✅ FIX (Inventory Stock): each row now also captures its real inventory
  // variantId (via data-vid, added in addCustomProductRow) when the product
  // was picked from the dropdown — a freely typed "Custom Product" (not in
  // inventory) still gets no variantId, exactly as before. This variantId
  // is what lets us validate + deduct stock below, and lets the existing
  // token-delete handler (data-token-delete, which already reads
  // p.variantId) restore stock correctly when this token is removed.
  var customProducts = [];
  var hasCustomStockError = false;
  qsa("#customTokenProductsList > div").forEach(function(row, idx) {
    var sel = row.querySelector(".custom-prd-select");
    var name = row.querySelector(".custom-prd-name");
    var qtyInput = row.querySelector(".custom-prd-qty");
    var priceInput = row.querySelector(".custom-prd-price");
    
    var qty = qtyInput ? (parseInt(qtyInput.value) || 1) : 1;
    var rawPrice = priceInput ? (priceInput.valueAsNumber || parseFloat(priceInput.value)) : NaN;
    var price = isNaN(rawPrice) ? 0 : rawPrice;
    
    var prdName = "";
    var vid = "";
    if (sel && (sel.style.display === "none" || sel.value === "__custom__")) {
      prdName = name ? (name.value || "").trim() : "";
    } else if (sel) {
      prdName = sel.value;
      var opt = sel.options[sel.selectedIndex];
      vid = opt ? (opt.dataset.vid || "") : "";
    }
    
    // ✅ FIX: Allow price >= 0. Only require name.
    if (prdName) {
      if (vid) {
        var f = findVariantById(vid);
        // FIX: when editing, this token may already hold some of this
        // variant's stock (deducted when it was first saved) — add that
        // back before checking availability, otherwise editing a token
        // without even changing its quantity could wrongly report
        // "insufficient stock" against its own reserved units.
        var availableStock = f ? f.variant.stock : 0;
        if (existingTokenForEdit && existingTokenForEdit.products) {
          existingTokenForEdit.products.forEach(function (op) {
            if (op.variantId === vid) availableStock += op.qty;
          });
        }
        if (f && qty > availableStock) {
          toast("Only " + availableStock + " units available for " + f.fullName, "error");
          hasCustomStockError = true;
          return;
        }
      }
      var prdRecord = { fullName: prdName, qty: qty, price: price };
      if (vid) prdRecord.variantId = vid;
      customProducts.push(prdRecord);
      console.log("[Save Custom Prd " + idx + "]", prdName, "qty:", qty, "price:", price, "variantId:", vid);
    }
  });

  if (hasCustomStockError) { saveCustomToken.running = false; return; }

  if (customServices.length === 0 && customProducts.length === 0) {
    toast("Please add at least one service or product", "error");
    saveCustomToken.running = false;
    return;
  }

  var serviceNames = customServices.map(function(s) { return s.name; }).join(", ");
  var totalServicePrice = customServices.reduce(function(t, s) { return t + s.price; }, 0);
  var discount = parseNum(qs("#tokenDiscount")?.value, 0);

  // FIX (Issues 1, 2 & 4): UPDATE the existing token in place instead of
  // always creating a new one. Stock is first restored for the token's
  // OLD products, then deducted again for the NEW list, so inventory
  // stays accurate — same pattern already used when editing a normal
  // (non-custom) token.
  if (editId) {
    var tkEdit = STATE.tokens.find(function (tk) { return tk.id === editId; });
    if (!tkEdit) {
      toast("Token not found — it may have been deleted", "error");
      saveCustomToken.running = false;
      return;
    }
    if (tkEdit.products) {
      tkEdit.products.forEach(function (p) {
        if (p.variantId) {
          var fOld = findVariantById(p.variantId);
          if (fOld) fOld.variant.stock += p.qty;
        }
      });
    }
    customProducts.forEach(function (p) {
      if (p.variantId) {
        var fNew = findVariantById(p.variantId);
        if (fNew) fNew.variant.stock = Math.max(0, fNew.variant.stock - p.qty);
      }
    });

    tkEdit.vehicleNo = vn;
    tkEdit.vehicleType = vt;
    tkEdit.ownerName = on;
    tkEdit.contactNumber = cv.formatted;
    tkEdit.service = serviceNames;
    tkEdit.servicePrice = totalServicePrice;
    tkEdit.serviceBreakdown = customServices;
    tkEdit.discount = discount;
    tkEdit.products = customProducts;
    tkEdit.editedAt = fmtDate() + " " + fmtTime();
    tkEdit.businessPrefix = prefix;
    tkEdit.businessId = biz.id;
    tkEdit.businessName = biz.name;
    tkEdit.isCustom = true;

    saveTokens();
    saveInventory();
    closeModal("tokenModal");
    renderTokenTable();
    refreshDashboard();
    toast("Custom Token " + tkEdit.number + " updated successfully", "success");
    saveCustomToken.running = false;
    return;
  }

  // FIX: only create/update a Vehicle Record when a vehicle number was
  // actually entered — vehicle number is now optional on Custom Tokens
  // too, so skip this when it's left blank (avoids blank vehicle rows).
  if (vn) {
    var ex = STATE.vehicles.find(function(v) { return v.vehicleNo === vn; });
    if (!ex) { 
      STATE.vehicles.push({ id: uid(), vehicleNo: vn, owner: on, contact: cv.formatted, type: vt, notes: "", visits: 1, lastService: fmtDate() }); 
      saveVehicles(); 
    } else { 
      ex.visits = (ex.visits || 0) + 1; 
      ex.lastService = fmtDate(); 
      if (cv.formatted) ex.contact = cv.formatted; 
      saveVehicles(); 
    }
  }

  var tokenNumber = (qs("#autoTokenNumber")?.textContent || "").trim();
  if (!tokenNumber) tokenNumber = generateTokenNumber();
  // ✅ FIX: retry loop (same safety pattern as saveToken()) instead of a
  // single re-check, in case of a rare same-millisecond collision.
  var custMaxRetries = 10;
  var custRetries = 0;
  while (custRetries < custMaxRetries && STATE.tokens.some(function(tk){ return tk.number === tokenNumber; })) {
    tokenNumber = generateTokenNumber();
    custRetries++;
  }

  // ✅ FIX (Inventory Stock): deduct stock for every custom product that is
  // actually linked to a real inventory variant — same behavior saveToken()
  // already applies for normal Token products. Free-typed custom products
  // (no variantId) are left untouched, exactly as before.
  customProducts.forEach(function(p) {
    if (p.variantId) {
      var f2 = findVariantById(p.variantId);
      if (f2) f2.variant.stock = Math.max(0, f2.variant.stock - p.qty);
    }
  });

  var newToken = {
    id: uid(),
    number: tokenNumber,
    vehicleNo: vn, vehicleType: vt, ownerName: on, contactNumber: cv.formatted,
    service: serviceNames, servicePrice: totalServicePrice,
    serviceBreakdown: customServices,
    discount: discount, products: customProducts,
    date: fmtDate(), time: fmtTime(), createdAt: Date.now(), status: "waiting",
    businessPrefix: prefix, businessId: biz.id, businessName: biz.name,
    isCustom: true
  };
  STATE.tokens.push(newToken); 
  saveTokens(); 
  saveInventory(); // ✅ persists the stock deduction above
  saveCounters();
  closeModal("tokenModal"); 
  renderTokenTable(); 
  refreshDashboard();
  toast("Custom Token " + newToken.number + " generated", "success");
  saveCustomToken.running = false;
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
            '<tr><td><input type="checkbox" class="row-select-checkbox" data-token-select="' +
            t.id +
            '"' +
            (STATE.selectedTokenIds.indexOf(t.id) !== -1 ? " checked" : "") +
            '></td><td><span class="table-token-no">' +
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
// NEW — Bulk select/delete for Token Management. Mirrors the exact same
// stock-restore logic already used by the single data-token-delete
// handler, just applied to every selected token in one confirm step.
function updateTokenBulkDeleteUI() {
  var btn = qs("#tokenBulkDeleteBtn");
  var cnt = qs("#tokenBulkDeleteCount");
  if (cnt) cnt.textContent = STATE.selectedTokenIds.length;
  if (btn) btn.classList.toggle("hidden", STATE.selectedTokenIds.length === 0);
  var selectAll = qs("#tokenSelectAll");
  if (selectAll) {
    var boxes = qsa(".row-select-checkbox[data-token-select]");
    selectAll.checked = boxes.length > 0 && boxes.every(function (b) { return b.checked; });
  }
}
function bulkDeleteSelectedTokens() {
  if (!STATE.selectedTokenIds.length) return;
  var ids = STATE.selectedTokenIds.slice();
  confirm(
    "Delete " + ids.length + " selected token(s)? This cannot be undone.",
    function () {
      ids.forEach(function (tid) {
        var t = STATE.tokens.find(function (tk) {
          return tk.id === tid;
        });
        if (t && t.products) {
          t.products.forEach(function (p) {
            if (p.variantId) {
              var f = findVariantById(p.variantId);
              if (f) f.variant.stock += p.qty;
            }
          });
        }
      });
      STATE.tokens = STATE.tokens.filter(function (t) {
        return ids.indexOf(t.id) === -1;
      });
      saveTokens();
      saveInventory();
      STATE.selectedTokenIds = [];
      renderTokenTable();
      updateTokenBulkDeleteUI();
      refreshDashboard();
      toast(ids.length + " token(s) deleted", "success");
    },
    "Delete " + ids.length,
  );
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
// FIX (root cause of "invoice shows Rs. 0" bug): the old auto-fill code
// recomputed each known service's price from the CURRENT pricing matrix.
// If the matrix entry for that exact service+vehicle-type combo was ever
// missing/changed/cleared after the token was created, that lookup
// silently returned 0 — even though the token itself has the REAL price
// that was actually charged (t.servicePrice). This helper always trusts
// the token's own stored total as the source of truth: it still uses the
// matrix to split that total across multiple services proportionally,
// but if the matrix can't explain the total at all, it falls back to
// splitting the token's real total evenly instead of showing 0. Used by
// invoice auto-fill AND the Edit Token modal so both stay consistent.
function computeServiceRowsForToken(t) {
  if (!t) return [];
  if (t.serviceBreakdown && t.serviceBreakdown.length) {
    return t.serviceBreakdown.map(function (sb) {
      var isKnown = STATE.pricingServices.some(function (s) {
        return s.name === sb.name;
      });
      return { name: sb.name, price: sb.price || 0, isCustom: !isKnown };
    });
  }
  if (!t.service) return [];
  var names = t.service.split(", ").filter(function (s) {
    return s;
  });
  if (!names.length) return [];
  var rows = names.map(function (svc) {
    var isKnown = STATE.pricingServices.some(function (s) {
      return s.name === svc;
    });
    var mp = isKnown ? getMatrixPrice(svc, t.vehicleType) || 0 : 0;
    return { name: svc, price: mp, isCustom: !isKnown };
  });
  var matrixSum = rows.reduce(function (s, r) {
    return s + r.price;
  }, 0);
  var actualTotal = t.servicePrice || 0;
  if (matrixSum !== actualTotal) {
    if (matrixSum > 0) {
      var running = 0;
      rows.forEach(function (r, idx) {
        if (idx === rows.length - 1) {
          r.price = Math.max(0, actualTotal - running);
        } else {
          r.price = Math.round((r.price / matrixSum) * actualTotal);
          running += r.price;
        }
      });
    } else {
      var share = rows.length ? actualTotal / rows.length : 0;
      rows.forEach(function (r) {
        r.price = share;
      });
    }
  }
  return rows;
}

function openInvoiceForToken(id) {
  var t = STATE.tokens.find(function (t) {
    return t.id === id;
  });
  if (!t) return;

  // FIX (root cause of "same invoice always opens" bug): matching by
  // token NUMBER TEXT only is unreliable — if two invoices ever end up
  // with the same/blank token text (old data, edits, imports, etc.),
  // .find() always returns the FIRST one, so clicking Invoice on any
  // token kept opening that same first invoice. Now we match by the
  // token's UNIQUE ID first (100% exact), and only fall back to the old
  // text-match for older invoices saved before this fix (which don't
  // have tokenId yet) — so nothing breaks for existing data.
  var existingInv = STATE.invoices.find(function (i) {
    return i.tokenId && i.tokenId === t.id;
  });
  if (!existingInv) {
    existingInv = STATE.invoices.find(function (i) {
      return i.token && t.number && i.token.toLowerCase() === t.number.toLowerCase();
    });
  }
  if (existingInv) {
    toast("An invoice already exists for this token — opening it for edit", "info");
    editInvoice(existingInv.id);
    return;
  }

  // FIX (Issues 2 & 3): this token has NO existing invoice, so we are about
  // to build a brand-new one. If a previous, unrelated invoice was left
  // open in "edit" mode (STATE.editingInvoiceId still set from before),
  // clear that out first — otherwise saving this new token's invoice would
  // silently overwrite that other invoice instead of creating a new record.
  if (STATE.editingInvoiceId) exitInvoiceEditMode();

  navigateTo("billing");
  setTimeout(function () {
    setValue("#invoiceToken", t.number);
    autoFillFromTokenObject(t);  
    updateInvoicePreview();
  }, 150);
}
function autoFillFromTokenObject(t) {
  if (!t) return;
  setValue("#invoiceVehicle", t.vehicleNo);
  setValue("#invoiceCustomer", t.ownerName || "");
  qs("#invoiceCustomer").dataset.contact = t.contactNumber || "";
  qs("#invoiceServicesContainer").innerHTML = "";
  qs("#invoiceProductsContainer").innerHTML = "";

  computeServiceRowsForToken(t).forEach(function (r) {
    if (r.isCustom) addCustomInvoiceServiceRow(r.name, r.price);
    else addInvoiceServiceRow(r.name, r.price);
  });

  if (t.products)
    t.products.forEach(function (p) {
      if (!p.variantId) addCustomInvoiceProductRow(p.fullName, p.price, p.qty);
      else addInvoiceProductRow(p.fullName, p.price, p.qty);
    });

  if (t.discount) setValue("#invoiceDiscount", t.discount);
  else setValue("#invoiceDiscount", "0");

  updateInvoicePreview();
  setValue("#cashReceived", "");
  setText("#changeReturned", "Rs. 0");
}
function openEditTokenModal(tid) {
  var t = STATE.tokens.find(function (t) {
    return t.id === tid;
  });
  if (!t) return;
  populateVehicleTypes();
  setText("#autoTokenNumber", t.number);
  setValue("#tokenVehicleNo", t.vehicleNo);
  setValue("#tokenVehicleType", t.vehicleType);
  setValue("#tokenOwnerName", t.ownerName || "");
  setValue("#tokenContactNumber", t.contactNumber || "");
  setValue("#tokenDiscount", t.discount || 0);

  // FIX: keep editing under the SAME business the token was created
  // under, instead of silently defaulting to whichever business happens
  // to be selected right now (which could re-assign the token/invoice to
  // the wrong business on save, and print the wrong business details).
  var bizSelectEdit = qs("#tokenBusinessSelect");
  if (bizSelectEdit && t.businessId) bizSelectEdit.value = t.businessId;

  qs("#tokenServicesList").innerHTML = "";
  qs("#tokenProductsList").innerHTML = "";
  qs("#customTokenServicesList").innerHTML = "";
  qs("#customTokenProductsList").innerHTML = "";

  // FIX (Issues 1 & 2): a "Custom Token" (created via the Custom Token
  // modal, or any token whose services/products don't match the normal
  // Services list / Inventory) was ALWAYS being reopened in the normal
  // "Generate Token" layout. Custom names have no matching <option> in
  // the normal dropdowns, so every custom service/product row rendered
  // blank ("Select service"/"Select variant") — the name + price looked
  // completely empty — and the custom "Add Service"/"Add Product" fields
  // (used to type a fresh custom name/price) were hidden the whole time.
  // Now we detect a custom token (explicit isCustom flag, OR any
  // service/product that doesn't exist in the current Services list /
  // Inventory) and reopen it in the Custom Token layout instead, fully
  // populated and still editable/addable exactly like a brand-new custom
  // token.
  var hasUnknownService =
    !!t.service &&
    t.service.split(", ").some(function (svc) {
      return (
        svc &&
        !STATE.pricingServices.some(function (s) {
          return s.name === svc;
        })
      );
    });
  var hasCustomProduct =
    !!t.products &&
    t.products.some(function (p) {
      return !p.variantId;
    });
  var isCustom = !!t.isCustom || hasUnknownService || hasCustomProduct;

  if (isCustom) {
    document.getElementById("tokenServicesSection").style.display = "none";
    document.getElementById("tokenProductsSection").style.display = "none";
    document.getElementById("customTokenServicesSection").style.display = "";
    document.getElementById("customTokenProductsSection").style.display = "";

    computeServiceRowsForToken(t).forEach(function (r) {
      addCustomServiceRow(r.name, r.price);
    });

    if (t.products && t.products.length) {
      t.products.forEach(function (p) {
        addCustomProductRow(p.fullName, p.price, p.qty, p.variantId || "");
      });
    }
  } else {
    document.getElementById("tokenServicesSection").style.display = "";
    document.getElementById("tokenProductsSection").style.display = "";
    document.getElementById("customTokenServicesSection").style.display = "none";
    document.getElementById("customTokenProductsSection").style.display = "none";

    // FIX: reopen with the token's OWN saved service prices (not a fresh
    // matrix lookup), so name + price + total stay exactly as saved.
    computeServiceRowsForToken(t).forEach(function (r) {
      addTokenServiceRow(r.name, r.price, true);
    });

    if (t.products) {
      t.products.forEach(function (p) {
        addTokenProduct();
        var lastRow = qs("#tokenProductsList > div:last-child");
        if (lastRow) {
          // FIX: the product picker is a search box + hidden <select> that
          // starts with only an empty option, so `sel.value = variantId`
          // silently failed — the name vanished and the product was
          // dropped from the total. Now the option and the visible name
          // are filled in explicitly.
          var sel = lastRow.querySelector(".token-product-select");
          if (sel) {
            sel.innerHTML = "";
            var opt = document.createElement("option");
            opt.value = p.variantId || "";
            opt.textContent = p.fullName || "";
            opt.selected = true;
            sel.appendChild(opt);
            sel.value = p.variantId || "";
          }
          var searchInput = lastRow.querySelector(".tp-search");
          if (searchInput) searchInput.value = p.fullName || "";
          var priceInput = lastRow.querySelector(".token-product-price");
          if (priceInput) priceInput.value = p.price;
          var qtyInput = lastRow.querySelector(".token-product-qty");
          if (qtyInput) qtyInput.value = p.qty;
        }
      });
    }
  }

  qs("#tokenModal").dataset.editId = tid;
  qs("#tokenModalTitle").innerHTML =
    '<span class="material-icons">edit</span> Edit Token';
  openModal("tokenModal");
  setTimeout(recomputeTokenTotal, 100);
}

// ==================== BILLING ====================
function initBilling() {
  console.log("initBilling running...");
  var invBizSelect = qs("#invoiceBusinessSelect");
  if (invBizSelect) {
    var businesses = getBusinesses();
    var currentBiz = getCurrentBusiness();
    invBizSelect.innerHTML = '<option value="">Select Business</option>';
    for (var i = 0; i < businesses.length; i++) {
      var sel = businesses[i].id === currentBiz.id ? " selected" : "";
      invBizSelect.innerHTML +=
        '<option value="' + businesses[i].id + '" data-prefix="' + businesses[i].prefix + '" data-name="' + sanitize(businesses[i].name) + '"' + sel + ">" + businesses[i].name + " (" + businesses[i].prefix + ")</option>";
    }
    invBizSelect.onchange = function () { updateInvoicePreview(); };
  }

  qs("#invoiceBulkDeleteBtn")?.addEventListener("click", bulkDeleteSelectedInvoices);
  qs("#addInvoiceService")?.addEventListener("click", function () { addInvoiceServiceRow("", 0); });
  qs("#addInvoiceProduct")?.addEventListener("click", function () { addInvoiceProductRow("", 0, 1); });
  // NEW (Issue 3): lets the user add a fully custom (freely typed) service
  // or product line directly on an invoice — not just when it comes
  // auto-filled from a Custom Token.
  qs("#addCustomInvoiceService")?.addEventListener("click", function () { addCustomInvoiceServiceRow("", 0); });
  qs("#addCustomInvoiceProduct")?.addEventListener("click", function () { addCustomInvoiceProductRow("", 0, 1); });

  qs("#saveInvoiceBtn")?.addEventListener("click", function(e){
    console.log("Save button clicked");
    saveInvoice();
  });
  qs("#printReceiptBtn")?.addEventListener("click", function(e){
    console.log("Print button clicked");
    var invNumber = (qs("#invNumber")?.textContent || "").trim();
    var invCustomer = (qs("#invCustomer")?.textContent || "").trim();
    var invDate = (qs("#invDate")?.textContent || "").trim();
    var invVehicle = (qs("#invVehicle")?.textContent || "").trim();
    var invToken = (qs("#invToken")?.textContent || "").trim();

    if (!invCustomer || invCustomer === "—") { toast("Please add customer and items first", "warning"); return; }

    var items = [];
    qsa(".invoice-line-row", qs("#invoiceServicesContainer")).forEach(function (r) {
      var s = r.querySelector(".invoice-svc-select");
      var nm = s?.options[s.selectedIndex]?.text || "";
      var pr = parseFloat(r.querySelector(".invoice-svc-price")?.value) || 0;
      var qt = parseInt(r.querySelector(".invoice-svc-qty")?.value) || 1;
      if (nm && nm !== "Select...") items.push({ name: nm, price: pr, qty: qt });
    });
    qsa(".invoice-line-row", qs("#invoiceProductsContainer")).forEach(function (r) {
      var s = r.querySelector(".invoice-prd-select");
      var nm = s?.options[s.selectedIndex]?.dataset?.fullname || "";
      var pr = parseFloat(r.querySelector(".invoice-prd-price")?.value) || 0;
      var qt = parseInt(r.querySelector(".invoice-prd-qty")?.value) || 1;
      if (nm) items.push({ name: nm, price: pr, qty: qt });
    });

    if (!items.length) { toast("Add items first", "warning"); return; }

    var subtotal = 0;
    items.forEach(function (i) { subtotal += i.price * i.qty; });
    var total = subtotal;
    var cash = parseFloat(qs("#cashReceived")?.value) || 0;
    var discount = parseFloat(qs("#invoiceDiscount")?.value) || 0;
    var totalAfterDiscount = Math.max(0, total - discount);
    var tempInv = {
      number: invNumber || "—",
      date: invDate || fmtDate(),
      time: fmtTime(),
      customer: invCustomer,
      contactNumber: qs("#invoiceCustomer")?.dataset?.contact || "",
      vehicle: invVehicle !== "—" ? invVehicle : qs("#invoiceVehicle")?.value || "",
      token: invToken !== "—" ? invToken : "",
      items: items,
      discount: discount,
      total: totalAfterDiscount,
      cashReceived: cash,
      changeReturned: Math.max(0, cash - totalAfterDiscount),
      status: cash >= totalAfterDiscount && cash > 0 ? "PAID" : "UNPAID",
    };

    // FIX (bonus): use whichever business is actually selected on this
    // invoice form, not always the currently active business.
    var invBizSelectForPrint = qs("#invoiceBusinessSelect");
    var businessesForPrint2 = getBusinesses();
    var biz;
    if (invBizSelectForPrint && invBizSelectForPrint.value) {
      biz = businessesForPrint2.find(function (b) {
        return b.id === invBizSelectForPrint.value;
      });
    }
    if (!biz) biz = getCurrentBusiness();
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
      setTimeout(function () { w.print(); }, 500);
    }
  });

  qs("#invoiceToken")?.addEventListener("input", function () {
    autoFillFromToken(this.value.trim());
    updateInvoicePreview();
  });
  qs("#invoiceVehicle")?.addEventListener("input", updateInvoicePreview);
  qs("#invoiceCustomer")?.addEventListener("input", updateInvoicePreview);
  qs("#invoiceDiscount")?.addEventListener("input", updateInvoicePreview);
  qs("#cashReceived")?.addEventListener("input", function () {
    var cash = parseFloat(this.value) || 0;
    var total = parseFloat((qs("#invTotal")?.textContent || "0").replace(/[^0-9]/g, "")) || 0;
    setText("#changeReturned", cash >= total ? fmtPrice(cash - total) : "Insufficient");
  });

  qs("#savedInvoiceSearch")?.addEventListener("input", renderSavedInvoices);
  qs("#savedInvoiceStatusFilter")?.addEventListener("change", renderSavedInvoices);
  qs("#savedInvoiceDateFrom")?.addEventListener("change", renderSavedInvoices);
  qs("#savedInvoiceDateTo")?.addEventListener("change", renderSavedInvoices);
  qs("#clearInvoiceDateFilter")?.addEventListener("click", function() {
    setValue("#savedInvoiceDateFrom", "");
    setValue("#savedInvoiceDateTo", "");
    renderSavedInvoices();
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

  computeServiceRowsForToken(t).forEach(function (r) {
    if (r.isCustom) addCustomInvoiceServiceRow(r.name, r.price);
    else addInvoiceServiceRow(r.name, r.price);
  });

  if (t.products)
    t.products.forEach(function (p) {
      if (!p.variantId) addCustomInvoiceProductRow(p.fullName, p.price, p.qty);
      else addInvoiceProductRow(p.fullName, p.price, p.qty);
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
        (getMatrixPrice(
          s.name,
          getVehicleTypeFromNumber(qs("#invoiceVehicle")?.value || ""),
        ) || 0) +
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
function addCustomInvoiceServiceRow(nm, pr) {
  nm = nm || "";
  pr = pr || 0;
  var r = document.createElement("div");
  r.className = "invoice-line-row";
  r.style.background = "#fef9c3";
  // FIX (Issue 3): the visible name field was "readonly" — fine when this
  // row is auto-filled from a token, but it meant there was NO way to
  // manually add a fresh custom service line item straight on an invoice
  // and type its name. It's now a normal editable text input; typing into
  // it updates the hidden <select>'s single option (which is what every
  // other invoice function — preview, save, print — actually reads the
  // name from), so nothing else needs to change.
  r.innerHTML =
    '<div class="form-group"><select class="form-input invoice-svc-select" style="display:none"><option value="' +
    sanitize(nm) +
    '" selected>' +
    sanitize(nm) +
    '</option></select><input type="text" class="form-input invoice-svc-name-input" placeholder="Custom service name" value="' +
    sanitize(nm) +
    '" style="background:var(--surface-active);"></div><div class="form-group"><input type="number" class="form-input invoice-svc-price" value="' +
    pr +
    '"></div><div class="form-group"><input type="number" class="form-input invoice-svc-qty" value="1" min="1"></div><button class="btn-icon btn btn-danger-ghost" onclick="this.closest(\'.invoice-line-row\').remove();updateInvoicePreview();"><span class="material-icons">close</span></button>';
  qs("#invoiceServicesContainer")?.appendChild(r);
  var nameInput = r.querySelector(".invoice-svc-name-input");
  var hiddenSelect = r.querySelector(".invoice-svc-select");
  nameInput?.addEventListener("input", function () {
    if (hiddenSelect && hiddenSelect.options[0]) {
      hiddenSelect.options[0].value = this.value;
      hiddenSelect.options[0].text = this.value;
    }
    updateInvoicePreview();
  });
  r.querySelector(".invoice-svc-price")?.addEventListener(
    "input",
    updateInvoicePreview,
  );
  r.querySelector(".invoice-svc-qty")?.addEventListener(
    "input",
    updateInvoicePreview,
  );
}
function addCustomInvoiceProductRow(nm, pr, qt) {
  nm = nm || "";
  pr = pr || 0;
  qt = qt || 1;
  var r = document.createElement("div");
  r.className = "invoice-line-row";
  r.style.background = "#fef9c3";
  // FIX (Issue 3): same as addCustomInvoiceServiceRow — name field is now
  // editable instead of readonly, so a custom product line can be typed
  // directly on the invoice. Typing syncs into the hidden <select>'s
  // data-fullname (which updateInvoicePreview/saveInvoice/printing all
  // read the product name from).
  r.innerHTML =
    '<div class="form-group"><select class="form-input invoice-prd-select" style="display:none"><option value="' +
    pr +
    '" data-fullname="' +
    sanitize(nm) +
    '" selected>' +
    sanitize(nm) +
    '</option></select><input type="text" class="form-input invoice-prd-name-input" placeholder="Custom product name" value="' +
    sanitize(nm) +
    '" style="background:var(--surface-active);"></div><div class="form-group"><input type="number" class="form-input invoice-prd-price" value="' +
    pr +
    '"></div><div class="form-group"><input type="number" class="form-input invoice-prd-qty" value="' +
    qt +
    '" min="1"></div><button class="btn-icon btn btn-danger-ghost" onclick="this.closest(\'.invoice-line-row\').remove();updateInvoicePreview();"><span class="material-icons">close</span></button>';
  qs("#invoiceProductsContainer")?.appendChild(r);
  var nameInput = r.querySelector(".invoice-prd-name-input");
  var hiddenSelect = r.querySelector(".invoice-prd-select");
  nameInput?.addEventListener("input", function () {
    if (hiddenSelect && hiddenSelect.options[0]) {
      hiddenSelect.options[0].dataset.fullname = this.value;
    }
    updateInvoicePreview();
  });
  r.querySelector(".invoice-prd-price")?.addEventListener(
    "input",
    updateInvoicePreview,
  );
  r.querySelector(".invoice-prd-qty")?.addEventListener(
    "input",
    updateInvoicePreview,
  );
}
// ============================================================
// NEW — TOKEN ↔ INVOICE PRICE SYNC (root-cause fix)
// ------------------------------------------------------------
// getTotalRevenue() (and therefore the Dashboard "Total Revenue" KPI and
// the Reports page) never reads from STATE.invoices at all — it only
// reads each token's own tk.servicePrice / tk.products / tk.discount.
// Invoices are normally just a printable copy generated FROM a token, so
// this worked fine — until an invoice is EDITED (e.g. custom
// service/product fields added, or their prices changed) directly on the
// Billing screen. That edit only updated the invoice record; the token
// behind it kept its old prices, so the Invoice Preview correctly showed
// the new total (e.g. Rs. 12,000) while Dashboard/Reports revenue kept
// adding up the token's old, un-synced total (e.g. Rs. 6,000).
//
// This function is called every time an invoice linked to a token is
// created or updated, and rewrites that token's service/product/price
// fields to exactly match the invoice's current line items — so revenue
// figures always match what the invoice (and customer) actually shows.
// ============================================================
function syncTokenFromInvoiceItems(tokenNumber, items, discount) {
  if (!tokenNumber) return;
  var tk = STATE.tokens.find(function (t) {
    return t.number && t.number.toLowerCase() === tokenNumber.toLowerCase();
  });
  if (!tk) return;

  var serviceItems = (items || []).filter(function (i) {
    return i.type === "service";
  });
  var productItems = (items || []).filter(function (i) {
    return i.type !== "service";
  });

  // Restore stock for whatever this token previously had linked to real
  // inventory variants, before writing the new product list (mirrors the
  // same restore-then-deduct pattern already used when editing a token
  // directly).
  if (tk.products) {
    tk.products.forEach(function (p) {
      if (p.variantId) {
        var fOld = findVariantById(p.variantId);
        if (fOld) fOld.variant.stock += p.qty;
      }
    });
  }

  var allVariants = getAllVariantsFlat();
  var newProducts = productItems.map(function (i) {
    var matched = allVariants.find(function (v) {
      return v.fullName === i.name;
    });
    var rec = { fullName: i.name, qty: i.qty || 1, price: i.price || 0 };
    if (matched) rec.variantId = matched.id;
    return rec;
  });
  newProducts.forEach(function (p) {
    if (p.variantId) {
      var fNew = findVariantById(p.variantId);
      if (fNew) fNew.variant.stock = Math.max(0, fNew.variant.stock - p.qty);
    }
  });

  var serviceNames = serviceItems
    .map(function (i) {
      return i.name;
    })
    .join(", ");
  var serviceBreakdown = serviceItems.map(function (i) {
    return { name: i.name, price: (i.price || 0) * (i.qty || 1) };
  });
  var serviceTotal = serviceBreakdown.reduce(function (s, sb) {
    return s + sb.price;
  }, 0);

  tk.service = serviceNames;
  tk.servicePrice = serviceTotal;
  tk.serviceBreakdown = serviceBreakdown;
  tk.products = newProducts;
  tk.discount = discount || 0;
  tk.editedAt = fmtDate() + " " + fmtTime();

  saveTokens();
  saveInventory();
}

function saveInvoice() {
  try {
    var cu = (qs("#invoiceCustomer")?.value || "").trim();
    if (!cu) { toast("Enter customer", "error"); return; }

    var it = [];
    qsa(".invoice-line-row", qs("#invoiceServicesContainer")).forEach(function (r) {
      var s = r.querySelector(".invoice-svc-select"),
          nm = s?.options[s.selectedIndex]?.text || "",
          pr = parseFloat(r.querySelector(".invoice-svc-price")?.value) || 0,
          qt = parseInt(r.querySelector(".invoice-svc-qty")?.value) || 1;
      if (nm && nm !== "Select...") it.push({ name: nm, price: pr, qty: qt, type: "service" });
    });
    qsa(".invoice-line-row", qs("#invoiceProductsContainer")).forEach(function (r) {
      var s = r.querySelector(".invoice-prd-select"),
          nm = s?.options[s.selectedIndex]?.dataset?.fullname || "",
          pr = parseFloat(r.querySelector(".invoice-prd-price")?.value) || 0,
          qt = parseInt(r.querySelector(".invoice-prd-qty")?.value) || 1;
      if (nm) it.push({ name: nm, price: pr, qty: qt, type: "product" });
    });

    if (!it.length) { toast("Add items", "error"); return; }

    var st = 0;
    it.forEach(function (i) { st += i.price * i.qty; });
    var discount = parseFloat(qs("#invoiceDiscount")?.value) || 0;
    var stAfterDiscount = Math.max(0, st - discount);
    var tx = stAfterDiscount * (STATE.settings.taxRate / 100);
    var cr = parseFloat(qs("#cashReceived")?.value) || 0;
    var gt = stAfterDiscount + tx;

    var invBizSelect = qs("#invoiceBusinessSelect");
    var businesses = getBusinesses();
    var biz;
    if (invBizSelect && invBizSelect.value) {
      biz = businesses.find(function (b) { return b.id === invBizSelect.value; });
    }
    if (!biz) { biz = getCurrentBusiness(); }

    var tokenNum = (qs("#invoiceToken")?.value || "").trim();

    // ============================================================
    // NEW — EDIT MODE: editInvoice() sets STATE.editingInvoiceId before
    // navigating here. When set, UPDATE the existing invoice in place
    // instead of creating a new one (no new invoice number is generated,
    // no counter is bumped), and mark it as "edited" so Saved Invoices can
    // show that badge.
    // ============================================================
    if (STATE.editingInvoiceId) {
      var existingInv = STATE.invoices.find(function (i) { return i.id === STATE.editingInvoiceId; });
      if (!existingInv) {
        toast("Invoice not found — it may have been deleted", "error");
        exitInvoiceEditMode();
        return;
      }
      // If the token was changed to one already used by a DIFFERENT saved
      // invoice, block it — same duplicate-token rule as new invoices.
      if (tokenNum) {
        var conflictInv = STATE.invoices.find(function (i) {
          return i.id !== existingInv.id && i.token && i.token.toLowerCase() === tokenNum.toLowerCase();
        });
        if (conflictInv) {
          toast("Token " + tokenNum + " is already used by invoice " + conflictInv.number, "error");
          return;
        }
      }
      existingInv.token = tokenNum;
      // NEW: keep tokenId in sync whenever the token field is changed on
      // an existing invoice, so the reliable ID-based link never goes stale.
      existingInv.tokenId = tokenNum
        ? (function () {
            var mt = STATE.tokens.find(function (tt) { return tt.number && tt.number.toLowerCase() === tokenNum.toLowerCase(); });
            return mt ? mt.id : "";
          })()
        : "";
      existingInv.vehicle = (qs("#invoiceVehicle")?.value || "").trim();
      existingInv.customer = cu;
      existingInv.contactNumber = qs("#invoiceCustomer")?.dataset?.contact || "";
      existingInv.items = it;
      existingInv.subtotal = st;
      existingInv.discount = discount;
      existingInv.tax = tx;
      existingInv.total = gt;
      existingInv.cashReceived = cr;
      existingInv.changeReturned = cr > 0 ? cr - gt : 0;
      existingInv.status = cr >= gt && cr > 0 ? "PAID" : "UNPAID";
      existingInv.paymentMethod = qs("#invoicePaymentMethod")?.value || "Cash";
      if (invBizSelect && invBizSelect.value && biz) {
        existingInv.businessPrefix = biz.prefix;
        existingInv.businessId = biz.id;
        existingInv.businessName = biz.name;
      }
      existingInv.edited = true;
      existingInv.editedAt = fmtDate() + " " + fmtTime();
      saveInvoices();
      // FIX (revenue mismatch): keep the linked token's own price data in
      // sync with this invoice's final items — this is what
      // Dashboard/Reports revenue actually reads from.
      if (tokenNum) syncTokenFromInvoiceItems(tokenNum, it, discount);
      exitInvoiceEditMode();
      toast("Invoice " + existingInv.number + " updated — this invoice has been edited", "success");

      setValue("#invoiceToken", "");
      setValue("#invoiceVehicle", "");
      setValue("#invoiceCustomer", "");
      setValue("#cashReceived", "");
      setValue("#invoiceDiscount", "0");
      setText("#changeReturned", "Rs. 0");
      qs("#invoiceServicesContainer").innerHTML = "";
      qs("#invoiceProductsContainer").innerHTML = "";
      addInvoiceServiceRow("", 0);
      addInvoiceProductRow("", 0, 1);
      updateInvoicePreview();
      renderSavedInvoices();
      refreshDashboard();
      return;
    }

    // ============================================================
    // NEW — DUPLICATE LOCK: a token can only ever have ONE invoice. Once
    // an invoice has been saved for a token, trying to save another
    // invoice against the same token number is blocked — the user must
    // use Edit (in Saved Invoices) on the existing one instead.
    // ============================================================
    if (tokenNum) {
      var dupInv = STATE.invoices.find(function (i) {
        return i.token && i.token.toLowerCase() === tokenNum.toLowerCase();
      });
      if (dupInv) {
        toast("Invoice " + dupInv.number + " already exists for token " + tokenNum + ". Open Saved Invoices and use Edit instead.", "warning");
        return;
      }
    }

    var prefix = biz.prefix;
    var counterKey = "invoiceCounter" + prefix;
    if (!STATE.counters[counterKey]) STATE.counters[counterKey] = 1;
    var invNumber = prefix + "-INV-" + String(STATE.counters[counterKey]).padStart(3, "0");

    // NEW: resolve the exact token record now, so we can save its UNIQUE
    // ID on the invoice (tokenId) instead of relying only on the token
    // number text — this is what fixes the "always opens same invoice" bug.
    var linkedTokenForNewInv = tokenNum
      ? STATE.tokens.find(function (tt) { return tt.number && tt.number.toLowerCase() === tokenNum.toLowerCase(); })
      : null;

    var inv = {
      id: uid(),
      number: invNumber,
      date: fmtDate(),
      time: fmtTime(),
      createdAt: Date.now(),
      token: tokenNum,
      tokenId: linkedTokenForNewInv ? linkedTokenForNewInv.id : "", // NEW: exact, reliable link to the token
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

    // Update linked token if any — and lock it so it can't be re-invoiced
    var tn = inv.token;
    if (tn) {
      var tk = linkedTokenForNewInv;
      if (tk && tk.status !== "completed") {
        tk.status = "completed";
        createReminderFromToken(tk);
        saveTokens();
      }
      // FIX (revenue mismatch): even on first save, sync the token's own
      // price data to match this invoice's actual items — covers the
      // case where custom fields/prices were added on the invoice itself
      // before ever saving it.
      syncTokenFromInvoiceItems(tn, it, discount);
    }

    toast("Invoice " + inv.number + " saved", "success");

    // Reset form
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

  } catch (e) {
    console.error("Save invoice error:", e);
    toast("Error saving invoice. See console.", "error");
  }
}

// ============================================================
// NEW — Invoice edit mode helpers.
// editInvoice() loads a saved invoice back into the Create Invoice form,
// switches it into "update" mode (STATE.editingInvoiceId), and shows a
// Cancel button. saveInvoice() checks STATE.editingInvoiceId and updates
// the existing record in place instead of creating a new invoice.
// ============================================================
function editInvoice(id) {
  var inv = STATE.invoices.find(function (i) { return i.id === id; });
  if (!inv) { toast("Invoice not found", "error"); return; }

  STATE.editingInvoiceId = id;

  navigateTo("billing");

  setTimeout(function () {
    var invBizSelect = qs("#invoiceBusinessSelect");
    if (invBizSelect && inv.businessId) invBizSelect.value = inv.businessId;
    setValue("#invoiceToken", inv.token || "");
    setValue("#invoiceVehicle", inv.vehicle || "");
    setValue("#invoiceCustomer", inv.customer);
    if (qs("#invoiceCustomer")) qs("#invoiceCustomer").dataset.contact = inv.contactNumber || "";
    setValue("#cashReceived", inv.cashReceived || "");
    setValue("#invoiceDiscount", inv.discount || 0);
    var pmSel = qs("#invoicePaymentMethod");
    if (pmSel) pmSel.value = inv.paymentMethod || "Cash";

    qs("#invoiceServicesContainer").innerHTML = "";
    qs("#invoiceProductsContainer").innerHTML = "";
    // FIX (Issue 1): a custom-token service/product (typed manually, not
    // picked from the Services list / Inventory) has no matching <option>
    // in the normal dropdown row, so addInvoiceServiceRow/addInvoiceProductRow
    // would render it as an empty "Select..." row — which then gets silently
    // dropped from both the preview totals and the saved invoice on Update
    // (name + price appeared to "disappear"). Now we detect whether the item
    // is a KNOWN service/product first, and only then use the dropdown row;
    // otherwise we use the custom (free-text) row, exactly like token
    // auto-fill already does.
    (inv.items || []).forEach(function (item) {
      if (item.type === "service") {
        var isKnownService = STATE.pricingServices.some(function (s) { return s.name === item.name; });
        if (isKnownService) addInvoiceServiceRow(item.name, item.price);
        else addCustomInvoiceServiceRow(item.name, item.price);
      } else {
        var isKnownProduct = getAllVariantsFlat().some(function (v) { return v.fullName === item.name; });
        if (isKnownProduct) addInvoiceProductRow(item.name, item.price, item.qty);
        else addCustomInvoiceProductRow(item.name, item.price, item.qty);
      }
    });
    updateInvoicePreview();
    setText("#invNumber", inv.number);
    setText("#invDate", inv.date);
    setText("#invBusinessName", inv.businessName || STATE.settings.businessName);

    var saveBtn = qs("#saveInvoiceBtn");
    if (saveBtn) saveBtn.innerHTML = '<span class="material-icons">save</span> Update Invoice';
    showCancelEditInvoiceButton();

    toast("Editing invoice " + inv.number + " — make your changes and click Update Invoice", "info");
  }, 150);
}

function showCancelEditInvoiceButton() {
  var actions = qs(".billing-actions");
  if (!actions || qs("#cancelEditInvoiceBtn")) return;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-ghost";
  btn.id = "cancelEditInvoiceBtn";
  btn.innerHTML = '<span class="material-icons">close</span> Cancel Edit';
  btn.addEventListener("click", function () {
    exitInvoiceEditMode();
    setValue("#invoiceToken", "");
    setValue("#invoiceVehicle", "");
    setValue("#invoiceCustomer", "");
    setValue("#cashReceived", "");
    setValue("#invoiceDiscount", "0");
    setText("#changeReturned", "Rs. 0");
    qs("#invoiceServicesContainer").innerHTML = "";
    qs("#invoiceProductsContainer").innerHTML = "";
    addInvoiceServiceRow("", 0);
    addInvoiceProductRow("", 0, 1);
    updateInvoicePreview();
    toast("Edit cancelled", "info");
  });
  actions.appendChild(btn);
}

function exitInvoiceEditMode() {
  STATE.editingInvoiceId = null;
  var saveBtn = qs("#saveInvoiceBtn");
  if (saveBtn) saveBtn.innerHTML = '<span class="material-icons">save</span> Save Invoice';
  var cancelBtn = qs("#cancelEditInvoiceBtn");
  if (cancelBtn) cancelBtn.remove();
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

  var cr = parseFloat(qs("#cashReceived")?.value) || 0;
  var gt = stAfterDiscount + tx;
  setText("#changeReturned", cr >= gt ? fmtPrice(cr - gt) : "Insufficient");
}
function renderSavedInvoices() {
  var tb = qs("#savedInvoiceTableBody");
  if (!tb) return;
  
  var sr = (qs("#savedInvoiceSearch")?.value || "").toLowerCase();
  var sf = qs("#savedInvoiceStatusFilter")?.value || "";
  var dfFrom = qs("#savedInvoiceDateFrom")?.value || "";
  var dfTo = qs("#savedInvoiceDateTo")?.value || "";
  
  // Step 1: Filter
  var filtered = STATE.invoices.filter(function(inv) {
    // NEW: Product Sale invoices are created automatically in the
    // background when a sale is completed, purely for record-keeping —
    // they should never appear in Billing & Invoice's Saved Invoices list,
    // which is only for token-based invoices.
    if (inv.isProductSale) return false;
    var dateMatch = true;
    if (dfFrom || dfTo) {
      var invDate = parseDate(inv.date);
      if (!invDate) return false;
      invDate.setHours(0,0,0,0);
      if (dfFrom) {
        var fromDate = new Date(dfFrom);
        fromDate.setHours(0,0,0,0);
        if (invDate < fromDate) dateMatch = false;
      }
      if (dfTo) {
        var toDate = new Date(dfTo);
        toDate.setHours(23,59,59);
        if (invDate > toDate) dateMatch = false;
      }
    }
    return (!sr || inv.number.toLowerCase().includes(sr) || inv.customer.toLowerCase().includes(sr) || (inv.vehicle||"").toLowerCase().includes(sr) || (inv.token||"").toLowerCase().includes(sr)) &&
           (!sf || inv.status === sf) &&
           dateMatch;
  });
  
  // Step 2: STABLE sort – newest first
  // We assign each item its original index (position in STATE.invoices) as a tiebreaker.
  // This guarantees that if dates are identical (or invalid), the newest insertion wins.
  var indexed = filtered.map(function(inv, idx) {
    return { inv: inv, originalIndex: STATE.invoices.indexOf(inv) };
  });
  
  indexed.sort(function(a, b) {
    var dateA = parseDate(a.inv.date) || new Date(0);
    var dateB = parseDate(b.inv.date) || new Date(0);
    // Primary: date descending
    if (dateB - dateA !== 0) return dateB - dateA;
    // FIXED: the old "time" comparison compared 12-hour "hh:mm AM/PM"
    // strings with localeCompare — e.g. "10:15 AM" sorts BEFORE
    // "09:15 AM" as plain text (because "1" < "9"), so on the same day
    // an older invoice could wrongly land above a newer one. Real
    // creation order (createdAt, a millisecond timestamp saved on every
    // invoice) is used instead — this always reflects true recency.
    var createdA = a.inv.createdAt || 0;
    var createdB = b.inv.createdAt || 0;
    if (createdB - createdA !== 0) return createdB - createdA;
    // Tertiary: original index descending (higher index = newer insertion)
    return b.originalIndex - a.originalIndex;
  });
  
  // Extract sorted invoices
  var sorted = indexed.map(function(item) { return item.inv; });
  
  var countBadge = qs("#savedInvoiceCount");
  if (countBadge) countBadge.textContent = sorted.length;
  
  if (!sorted.length) {
    tb.innerHTML = '<tr><td colspan="9">No invoices found</td></tr>';
    return;
  }
  tb.innerHTML = sorted
    .map(function (inv) {
      return (
        '<tr><td><input type="checkbox" class="row-select-checkbox" data-invoice-select="' +
        inv.id +
        '"' +
        (STATE.selectedInvoiceIds.indexOf(inv.id) !== -1 ? " checked" : "") +
        '></td><td style="font-weight:700;color:var(--primary);">' +
        sanitize(inv.number) +
        (inv.businessName
          ? ' <small style="color:var(--text-muted);">(' +
            sanitize(inv.businessPrefix || inv.businessName) +
            ")</small>"
          : "") +
        (inv.edited
          ? ' <span class="badge badge--orange" style="font-size:0.6rem" title="Edited on ' +
            sanitize(inv.editedAt || "") +
            '">Edited</span>'
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
        '</span></td><td><div class="table-actions"><button class="btn btn-sm btn-outline" data-edit-invoice="' +
        inv.id +
        '" title="Edit Invoice"><span class="material-icons">edit</span></button><button class="btn btn-sm btn-primary" data-print-a4="' +
        inv.id +
        '" title="Print"><span class="material-icons">print</span></button><button class="btn-icon btn btn-danger-ghost" data-delete-invoice="' +
        inv.id +
        '" title="Delete"><span class="material-icons">delete</span></button></div></td></tr>'
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
  // FIX (same as editInvoice): custom (free-text) items need the custom row,
  // otherwise they render as an empty "Select..." row and get excluded.
  inv.items.forEach(function (item) {
    if (item.type === "service") {
      var isKnownService = STATE.pricingServices.some(function (s) { return s.name === item.name; });
      if (isKnownService) addInvoiceServiceRow(item.name, item.price);
      else addCustomInvoiceServiceRow(item.name, item.price);
    } else {
      var isKnownProduct = getAllVariantsFlat().some(function (v) { return v.fullName === item.name; });
      if (isKnownProduct) addInvoiceProductRow(item.name, item.price, item.qty);
      else addCustomInvoiceProductRow(item.name, item.price, item.qty);
    }
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
  // FIX (bonus): match the address/phone to the business actually shown
  // in the preview (could differ from the currently active business),
  // instead of always pulling address/phone from getCurrentBusiness().
  var previewBizName = qs("#invBusinessName")?.textContent || "";
  var businessesForThermal = getBusinesses();
  var biz =
    businessesForThermal.find(function (b) {
      return b.name === previewBizName;
    }) || getCurrentBusiness();
  var businessName = previewBizName || biz.name || "Service Station",
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
    ' ***</div><div class="ftr">Thank You!<br>Developed by Design Orbits | 0322-5267908</div></body></html>';
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
  // FIX (bonus): print using the business the token was actually created
  // under, not whichever business happens to be active right now — e.g.
  // a Metabuilt token printed while Wheel Works is the active business
  // was wrongly showing Wheel Works' name/address/phone on the receipt.
  var businessesForPrint = getBusinesses();
  var biz =
    (t.businessId &&
      businessesForPrint.find(function (b) {
        return b.id === t.businessId;
      })) ||
    getCurrentBusiness();
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

  // Services – first check for custom breakdown
  if (token.serviceBreakdown && token.serviceBreakdown.length) {
    token.serviceBreakdown.forEach(function(sb) {
      itemsHTML += '<div class="svc-row"><span class="svc-dot">•</span><span>' + sanitize(sb.name) + '</span><span class="svc-price">' + fmtPrice(sb.price) + '</span></div>';
      totalAmount += sb.price;
    });
  } else if (token.service) {
    var services = token.service.split(", ");
    services.forEach(function(svc) {
      if (svc) {
        var svcPrice = getMatrixPrice(svc, token.vehicleType) || 0;
        itemsHTML += '<div class="svc-row"><span class="svc-dot">•</span><span>' + sanitize(svc) + '</span><span class="svc-price">' + fmtPrice(svcPrice) + '</span></div>';
        totalAmount += svcPrice;
      }
    });
  }

  // Products
  if (token.products && token.products.length > 0) {
    token.products.forEach(function(p) {
      itemsHTML += '<div class="svc-row"><span class="svc-dot">•</span><span>' + sanitize(p.fullName) + ' x' + p.qty + '</span><span class="svc-price">' + fmtPrice(p.price * p.qty) + '</span></div>';
      totalAmount += p.price * p.qty;
    });
  }

  var grandTotal = Math.max(0, totalAmount - discount);

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Arial","Helvetica",sans-serif;width:74mm;padding:2mm;font-size:11pt;color:#000;background:#fff}.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:3mm}.biz{font-size:13pt;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;line-height:1.1}.addr{font-size:8pt;color:#333;margin-top:0.5mm}.tok-box{text-align:center;margin:3mm 0;padding:2.5mm;border:2px solid #000}.tok-lbl{font-size:6.5pt;text-transform:uppercase;letter-spacing:2px;color:#555}.tok-num{font-size:20pt;font-weight:900;letter-spacing:1.5px;margin:1mm 0;line-height:1}.info{margin:3mm 0}.info-row{display:flex;padding:1mm 0;border-bottom:1px dotted #ccc;font-size:9.5pt}.info-lbl{width:28%;font-weight:700;font-size:7.5pt;text-transform:uppercase;color:#555;padding-top:0.5mm}.info-val{flex:1;font-weight:600}.svc-title{font-size:7.5pt;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin:3mm 0 1mm 0;border-top:1px solid #000;padding-top:2mm}.svc-row{display:flex;align-items:flex-start;gap:1.5mm;padding:0.5mm 0;font-size:9pt}.svc-dot{font-weight:900;color:#000}.svc-price{margin-left:auto;font-weight:700}.discount-row{display:flex;justify-content:space-between;padding:1mm 0;font-size:10pt;font-weight:700}.total-row{display:flex;justify-content:space-between;padding:1.5mm 0;margin-top:1mm;border-top:2px solid #000;border-bottom:2px solid #000;font-size:11pt;font-weight:900}.ftr{text-align:center;margin-top:3mm;border-top:2px solid #000;padding-top:2mm}.thanks{font-size:12pt;font-weight:900;text-transform:uppercase}.ftr-note{font-size:7.5pt;color:#555;margin-top:0.5mm}.cut{text-align:center;margin:3mm 0 1.5mm 0;border-top:1px dashed #999;padding-top:1mm;font-size:6.5pt;color:#999;letter-spacing:2px}</style></head><body><div class="hdr"><div class="biz">' + sanitize(businessName) + '</div><div class="addr">' + sanitize(address) + '</div><div class="addr">Tel: ' + sanitize(phone) + '</div></div><div class="tok-box"><div class="tok-lbl">Token Number</div><div class="tok-num">' + sanitize(token.number) + '</div></div><div class="info"><div class="info-row"><span class="info-lbl">Customer</span><span class="info-val">' + sanitize(token.ownerName || "N/A") + '</span></div><div class="info-row"><span class="info-lbl">Vehicle</span><span class="info-val">' + sanitize(token.vehicleNo) + ' (' + sanitize(token.vehicleType) + ')</span></div><div class="info-row"><span class="info-lbl">Phone</span><span class="info-val">' + sanitize(formatContactDisplay(token.contactNumber || "N/A")) + '</span></div><div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' + sanitize(date) + '</span></div><div class="info-row"><span class="info-lbl">Time</span><span class="info-val">' + sanitize(time) + '</span></div></div><div class="svc-title">Services & Products</div>' + (itemsHTML || '<div class="svc-row"><span class="svc-dot">•</span><span>N/A</span></div>') + (discount > 0 ? '<div class="discount-row"><span>Discount</span><span>-' + fmtPrice(discount) + '</span></div>' : '') + '<div class="total-row"><span>TOTAL</span><span>' + fmtPrice(grandTotal) + '</span></div><div class="ftr"><div class="thanks">Thank You!</div><div class="ftr-note">Please keep this token for Transaction ID</div><div class="ftr-note">' + sanitize(phone) + '</div><div class="ftr-note">Developed by Design Orbits | 0322-5267908</div></div><div class="cut">- - - ✂ CUSTOMER COPY ✂ - - -</div></body></html>';
}
function generateThermalCashierCopy(token, businessName, address, phone, date, time) {
  var itemsHTML = '';
  var discount = token.discount || 0;
  var totalAmount = 0;

  // Services – custom breakdown first
  if (token.serviceBreakdown && token.serviceBreakdown.length) {
    token.serviceBreakdown.forEach(function(sb) {
      itemsHTML += '<div class="svc-row"><span class="svc-dot">•</span><span>' + sanitize(sb.name) + '</span><span class="svc-price">' + fmtPrice(sb.price) + '</span></div>';
      totalAmount += sb.price;
    });
  } else if (token.service) {
    var services = token.service.split(", ");
    services.forEach(function(svc) {
      if (svc) {
        var svcPrice = getMatrixPrice(svc, token.vehicleType) || 0;
        itemsHTML += '<div class="svc-row"><span class="svc-dot">•</span><span>' + sanitize(svc) + '</span><span class="svc-price">' + fmtPrice(svcPrice) + '</span></div>';
        totalAmount += svcPrice;
      }
    });
  }

  // Products
  if (token.products && token.products.length > 0) {
    token.products.forEach(function(p) {
      itemsHTML += '<div class="svc-row"><span class="svc-dot">•</span><span>' + sanitize(p.fullName) + ' x' + p.qty + '</span><span class="svc-price">' + fmtPrice(p.price * p.qty) + '</span></div>';
      totalAmount += p.price * p.qty;
    });
  }

  totalAmount = Math.max(0, totalAmount - discount);

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Arial","Helvetica",sans-serif;width:74mm;padding:2mm;font-size:11pt;color:#000;background:#fff}.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:3mm;background:#f5f5f5;padding:2mm}.biz{font-size:13pt;font-weight:900;text-transform:uppercase;letter-spacing:0.5px}.copy-badge{display:inline-block;background:#000;color:#fff;font-size:9pt;font-weight:900;padding:1mm 5mm;margin-top:1mm;letter-spacing:1px}.tok-num{font-size:16pt;font-weight:900;text-align:center;margin:3mm 0;padding:2mm;border:1px solid #000}.info{margin:3mm 0}.info-row{display:flex;padding:1mm 0;border-bottom:1px dotted #ccc;font-size:9.5pt}.info-lbl{width:28%;font-weight:700;font-size:7.5pt;text-transform:uppercase;color:#555;padding-top:0.5mm}.info-val{flex:1;font-weight:600}.svc-title{font-size:7.5pt;font-weight:900;text-transform:uppercase;letter-spacing:1px;margin:3mm 0 1mm 0;border-top:1px solid #000;padding-top:2mm}.svc-row{display:flex;align-items:flex-start;gap:1.5mm;padding:0.5mm 0;font-size:9pt}.svc-dot{font-weight:900;color:#000}.svc-price{margin-left:auto;font-weight:700}.total-row{display:flex;justify-content:space-between;padding:1.5mm 0;margin-top:1mm;border-top:2px solid #000;border-bottom:2px solid #000;font-size:11pt;font-weight:900}.notes-box{border:1px solid #ccc;padding:2mm;min-height:12mm;font-size:8pt;color:#555;margin-top:3mm}.notes-title{font-size:7.5pt;font-weight:900;text-transform:uppercase;margin-bottom:1mm}.ftr{text-align:center;margin-top:2mm;border-top:1px solid #000;padding-top:1.5mm;font-size:6.5pt;color:#555}</style></head><body><div class="hdr"><div class="biz">' + sanitize(businessName) + '</div><div class="copy-badge">ATTENDANT\'S COPY</div></div><div class="tok-num">TOKEN: ' + sanitize(token.number) + '</div><div class="info"><div class="info-row"><span class="info-lbl">Customer</span><span class="info-val">' + sanitize(token.ownerName || "N/A") + '</span></div><div class="info-row"><span class="info-lbl">Vehicle</span><span class="info-val">' + sanitize(token.vehicleNo) + '</span></div><div class="info-row"><span class="info-lbl">Type</span><span class="info-val">' + sanitize(token.vehicleType) + '</span></div><div class="info-row"><span class="info-lbl">Phone</span><span class="info-val">' + sanitize(formatContactDisplay(token.contactNumber || "N/A")) + '</span></div><div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' + sanitize(date) + ' ' + sanitize(time) + '</span></div></div><div class="svc-title">Services & Products</div>' + (itemsHTML || '<div class="svc-row"><span class="svc-dot">•</span><span>No items</span></div>') + (discount > 0 ? '<div class="total-row"><span>Discount</span><span>' + fmtPrice(discount) + '</span></div>' : '') + '<div class="total-row"><span>TOTAL</span><span>' + fmtPrice(totalAmount) + '</span></div><div class="notes-box"><div class="notes-title">Notes / Remarks</div></div><div class="ftr">' + sanitize(businessName) + ' | ' + sanitize(phone) + ' | Attendant\'s Copy<br>Developed by Design Orbits | 0322-5267908</div></body></html>';
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
  // FIX (bonus): same as printTokenReceipt — print with the business the
  // invoice was actually saved under.
  var businessesForA4 = getBusinesses();
  var biz =
    (inv.businessId &&
      businessesForA4.find(function (b) {
        return b.id === inv.businessId;
      })) ||
    getCurrentBusiness();
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
    "<br>Developed by Design Orbits | 0322-5267908" +
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
  var discEl = document.getElementById("saleDiscount");
  if (discEl) {
    discEl.addEventListener("input", updateSaleTotal);
  }
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

// ⭐ Only ONE updateSaleTotal – discount included
function updateSaleTotal() {
  var t = 0;
  qsa("#saleProductsContainer > div").forEach(function(row) {
    t += parseFloat(row.querySelector(".sale-product-qty")?.value || 0) * parseFloat(row.querySelector(".sale-product-price")?.value || 0);
  });
  var discInput = document.getElementById("saleDiscount");
  var discount = parseNum(discInput?.value, 0);
  var grand = Math.max(0, t - discount);
  setText("#saleGrandTotal", fmtPrice(grand));
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
    // Show discount (if any) in recent sales history
    html += '<tr><td>' + sanitize(sale.date) + '<br><small>' + sanitize(sale.time) + '</small></td><td>' + sanitize(sale.customer) + '</td><td>' + sanitize(sale.vehicleNo) + '</td><td style="font-size:0.75rem;max-width:150px">' + itemsList + '</td><td style="font-weight:600;color:var(--success)">' + fmtPrice(sale.total) + (sale.discount ? '<br><small style="color:#b45309;">Discount: -' + fmtPrice(sale.discount) + '</small>' : '') + '</td><td><span class="badge badge--blue" style="font-size:0.6rem">' + sanitize(sale.invoiceNumber || "—") + '</span></td><td><div class="table-actions"><button class="btn btn-sm btn-primary" onclick="printSaleReceipt(\'' + sale.id + '\')" style="background:#000;font-size:0.6rem;padding:2px 6px">🧾</button><button class="btn btn-sm btn-outline" onclick="printSaleA4(\'' + sale.id + '\')" style="font-size:0.6rem;padding:2px 6px">📄</button></div></td></tr>';
  }
  tb.innerHTML = html;
}

// ⭐ Print functions also show discount
function printSaleReceipt(saleId) {
  var sale = STATE.productSales.find(function(s) { return s.id === saleId; }); if (!sale) return;
  var biz = getCurrentBusiness();
  var itemsHTML = ''; sale.items.forEach(function(item) { itemsHTML += '<tr><td>' + sanitize(item.fullName) + ' x' + item.qty + '</td><td style="text-align:right;font-weight:700">' + fmtPrice(item.price * item.qty) + '</td></tr>'; });
  var subtotal = sale.items.reduce(function(sum, item) { return sum + item.price * item.qty; }, 0);
  var discount = sale.discount || 0;
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0}body{font-family:Arial,sans-serif;width:74mm;padding:2mm;font-size:9pt;color:#000}.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:2mm}.biz{font-size:13pt;font-weight:900}.ttl{text-align:center;font-size:12pt;font-weight:900;margin:2mm 0;border:2px solid #000;padding:2mm}.row{display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px dotted #ccc}.discount-row{color:#b45309;font-weight:700}.grand{text-align:center;font-size:13pt;font-weight:900;margin-top:2mm;border-top:2px solid #000;padding-top:2mm}.ftr{text-align:center;margin-top:2mm;font-size:8pt}.dev-ftr{text-align:center;margin-top:1.5mm;font-size:7pt;color:#333;border-top:1px dashed #999;padding-top:1.5mm}</style></head><body><div class="hdr"><div class="biz">' + sanitize(biz.name) + '</div><div>' + sanitize(biz.address) + '</div></div><div class="ttl">SALE RECEIPT</div><div class="row"><span>Customer:</span><span><b>' + sanitize(sale.customer) + '</b></span></div><div class="row"><span>Date:</span><span>' + sanitize(sale.date) + '</span></div><table width="100%">' + itemsHTML + '</table>' +
  (discount > 0 ? '<div class="row discount-row"><span>Discount</span><span>-' + fmtPrice(discount) + '</span></div>' : '') +
  '<div class="grand">' + fmtPrice(sale.total) + '</div><div class="ftr">Thank You!</div><div class="dev-ftr">Developed by Design Orbits | 0322-5267908</div></body></html>';
  if (window.electronAPI && window.electronAPI.printReceipt) { window.electronAPI.printReceipt(h, { pageSize: { width: 80000, height: 297000 } }); }
  else { var w = window.open("", "_blank"); w.document.write(h); w.document.close(); setTimeout(function() { w.print(); }, 500); }
}

function printSaleA4(saleId) {
  var sale = STATE.productSales.find(function(s) { return s.id === saleId; }); if (!sale) return;
  var biz = getCurrentBusiness(); var itemsRows = ''; var subtotal = 0;
  sale.items.forEach(function(item, i) { var amt = item.price * item.qty; subtotal += amt; itemsRows += '<tr><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + (i+1) + '</td><td style="border:1px solid #000;padding:1.5mm">' + sanitize(item.fullName) + '</td><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + item.qty + '</td><td style="text-align:right;border:1px solid #000;padding:1.5mm">' + fmtPrice(item.price) + '</td><td style="text-align:right;font-weight:700;border:1px solid #000;padding:1.5mm">' + fmtPrice(amt) + '</td></tr>'; });
  var payMethod = sale.paymentMethod || "Cash";
  var payStatus = sale.paymentStatus || "PAID";
  var discount = sale.discount || 0;
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#000;font-size:10pt;line-height:1.3;background:#fff}.page{max-width:190mm;margin:0 auto}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #000;padding-bottom:4mm;margin-bottom:4mm}.biz-name{font-size:16pt;font-weight:900;color:#000;text-transform:uppercase}.biz-addr{font-size:8pt;color:#000}.logo{width:16mm;height:16mm;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-size:18pt;font-weight:900;color:#000}.ttl-box{border:2px solid #000;display:inline-block;padding:2mm 6mm;margin:4mm 0}.ttl{font-size:12pt;font-weight:900;color:#000;letter-spacing:2px}.info-grid{display:flex;gap:4mm;margin-bottom:4mm}.info-box{flex:1;border:1px solid #000;padding:2mm}.info-box-title{font-size:7pt;font-weight:900;color:#000;border-bottom:1px solid #000;padding-bottom:1mm;margin-bottom:1.5mm;text-transform:uppercase}.info-row{display:flex;justify-content:space-between;padding:0.6mm 0;font-size:8pt;color:#000}.info-lbl{font-weight:700;color:#000}.info-val{font-weight:700;color:#000}.tbl{width:100%;border-collapse:collapse;margin:4mm 0;border:1px solid #000}.tbl th{border:1px solid #000;padding:2mm;font-size:8pt;text-transform:uppercase;color:#000;font-weight:900}.tbl td{border:1px solid #000;padding:1.5mm;font-size:9pt;color:#000}.sum-box{display:flex;justify-content:flex-end;margin-top:3mm}.sum-tbl{width:40%;border-collapse:collapse;border:1px solid #000}.sum-tbl td{padding:2mm;border:1px solid #000;color:#000;font-size:10pt}.sum-tbl .gt td{font-weight:900;font-size:12pt;color:#000;border:2px solid #000}.sig-section{display:flex;gap:5mm;margin-top:8mm}.sig-box{flex:1;text-align:center}.sig-line{border-top:1px solid #000;margin-top:10mm;padding-top:2mm;font-size:7pt;color:#000}.ftr{text-align:center;margin-top:6mm;border-top:1px solid #000;padding-top:2mm;font-size:7pt;color:#000}</style></head><body><div class="page"><div class="hdr"><div><div class="biz-name">' + sanitize(biz.name) + '</div><div class="biz-addr">' + sanitize(biz.address) + '</div><div class="biz-addr">Tel: ' + sanitize(biz.phone) + ' | ' + sanitize(biz.email) + '</div></div><div class="logo">' + sanitize(biz.prefix) + '</div></div><div class="ttl-box"><span class="ttl">SALE INVOICE</span></div><div class="info-grid"><div class="info-box"><div class="info-box-title">Customer Details</div><div class="info-row"><span class="info-lbl">Name</span><span class="info-val">' + sanitize(sale.customer) + '</span></div><div class="info-row"><span class="info-lbl">Vehicle</span><span class="info-val">' + sanitize(sale.vehicleNo || "N/A") + '</span></div><div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' + sanitize(sale.date) + '</span></div></div><div class="info-box"><div class="info-box-title">Payment Details</div><div class="info-row"><span class="info-lbl">Method</span><span class="info-val">' + sanitize(payMethod) + '</span></div><div class="info-row"><span class="info-lbl">Status</span><span class="info-val">' + sanitize(payStatus) + '</span></div><div class="info-row"><span class="info-lbl">Business</span><span class="info-val">' + sanitize(biz.name) + '</span></div></div></div><table class="tbl"><thead><tr><th style="width:6%;text-align:center">#</th><th>Description</th><th style="width:10%;text-align:center">Qty</th><th style="width:18%;text-align:right">Rate</th><th style="width:20%;text-align:right">Amount</th></tr></thead><tbody>' + itemsRows + '</tbody></table><div class="sum-box"><table class="sum-tbl"><tr><td style="font-weight:700">Subtotal</td><td style="text-align:right;font-weight:700">' + fmtPrice(subtotal) + '</td></tr>' +
  (discount > 0 ? '<tr><td>Discount</td><td style="text-align:right">-' + fmtPrice(discount) + '</td></tr>' : '') +
  '<tr class="gt"><td style="font-weight:900">GRAND TOTAL</td><td style="text-align:right;font-weight:900">' + fmtPrice(sale.total) + '</td></tr></table></div><div class="sig-section"><div class="sig-box"><div class="sig-line"></div>Prepared By</div><div class="sig-box"><div class="sig-line"></div>Customer Signature</div></div><div class="ftr">' + sanitize(biz.name) + ' | ' + sanitize(biz.phone) + ' | Thank you for your business</div></div></body></html>';
  if (window.electronAPI && window.electronAPI.printReceipt) { window.electronAPI.printReceipt(h, { pageSize: { width: 210000, height: 297000 }, printBackground: true }); }
  else { var w = window.open("", "_blank"); w.document.write(h); w.document.close(); setTimeout(function() { w.print(); }, 500); }
}

function renderProductSalePage() {
  setText("#saleGrandTotal", "Rs. 0");
  setValue("#saleDiscount", "0");
  qs("#saleProductsContainer").innerHTML = "";
  addSaleProductRow();
  renderProductSalesHistoryNow();
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





function renderProductSalesHistoryNow() {
  var tb = qs("#productSalesHistory"); if (!tb) return;
  try { var saved = localStorage.getItem(KEYS.productSales); if (saved) { STATE.productSales = JSON.parse(saved); } } catch(e) {}
  var sales = STATE.productSales || [];
  if (!sales.length) { tb.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;">No recent sales</td></tr>'; return; }
  var sorted = sales.slice().reverse(); var html = "";
  for (var i = 0; i < sorted.length; i++) {
    var sale = sorted[i]; var itemsList = "";
    if (sale.items && sale.items.length > 0) { var names = []; for (var j = 0; j < sale.items.length; j++) { names.push(sanitize(sale.items[j].fullName) + " x" + sale.items[j].qty); } itemsList = names.join(", "); } else { itemsList = "N/A"; }
    // Show discount (if any) in recent sales history
    html += '<tr><td>' + sanitize(sale.date) + '<br><small>' + sanitize(sale.time) + '</small></td><td>' + sanitize(sale.customer) + '</td><td>' + sanitize(sale.vehicleNo) + '</td><td style="font-size:0.75rem;max-width:150px">' + itemsList + '</td><td style="font-weight:600;color:var(--success)">' + fmtPrice(sale.total) + (sale.discount ? '<br><small style="color:#b45309;">Discount: -' + fmtPrice(sale.discount) + '</small>' : '') + '</td><td><span class="badge badge--blue" style="font-size:0.6rem">' + sanitize(sale.invoiceNumber || "—") + '</span></td><td><div class="table-actions"><button class="btn btn-sm btn-primary" onclick="printSaleReceipt(\'' + sale.id + '\')" style="background:#000;font-size:0.6rem;padding:2px 6px">🧾</button><button class="btn btn-sm btn-outline" onclick="printSaleA4(\'' + sale.id + '\')" style="font-size:0.6rem;padding:2px 6px">📄</button></div></td></tr>';
  }
  tb.innerHTML = html;
}

// ✅ Update print functions to show discount
function printSaleReceipt(saleId) {
  var sale = STATE.productSales.find(function(s) { return s.id === saleId; }); if (!sale) return;
  var biz = getCurrentBusiness();
  var itemsHTML = ''; sale.items.forEach(function(item) { itemsHTML += '<tr><td>' + sanitize(item.fullName) + ' x' + item.qty + '</td><td style="text-align:right;font-weight:700">' + fmtPrice(item.price * item.qty) + '</td></tr>'; });
  var subtotal = sale.items.reduce(function(sum, item) { return sum + item.price * item.qty; }, 0);
  var discount = sale.discount || 0;
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0}body{font-family:Arial,sans-serif;width:74mm;padding:2mm;font-size:9pt;color:#000}.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:2mm}.biz{font-size:13pt;font-weight:900}.ttl{text-align:center;font-size:12pt;font-weight:900;margin:2mm 0;border:2px solid #000;padding:2mm}.row{display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px dotted #ccc}.discount-row{color:#b45309;font-weight:700}.grand{text-align:center;font-size:13pt;font-weight:900;margin-top:2mm;border-top:2px solid #000;padding-top:2mm}.ftr{text-align:center;margin-top:2mm;font-size:8pt}.dev-ftr{text-align:center;margin-top:1.5mm;font-size:7pt;color:#333;border-top:1px dashed #999;padding-top:1.5mm}</style></head><body><div class="hdr"><div class="biz">' + sanitize(biz.name) + '</div><div>' + sanitize(biz.address) + '</div></div><div class="ttl">SALE RECEIPT</div><div class="row"><span>Customer:</span><span><b>' + sanitize(sale.customer) + '</b></span></div><div class="row"><span>Date:</span><span>' + sanitize(sale.date) + '</span></div><table width="100%">' + itemsHTML + '</table>' +
  (discount > 0 ? '<div class="row discount-row"><span>Discount</span><span>-' + fmtPrice(discount) + '</span></div>' : '') +
  '<div class="grand">' + fmtPrice(sale.total) + '</div><div class="ftr">Thank You!</div><div class="dev-ftr">Developed by Design Orbits | 0322-5267908</div></body></html>';
  if (window.electronAPI && window.electronAPI.printReceipt) { window.electronAPI.printReceipt(h, { pageSize: { width: 80000, height: 297000 } }); }
  else { var w = window.open("", "_blank"); w.document.write(h); w.document.close(); setTimeout(function() { w.print(); }, 500); }
}

function printSaleA4(saleId) {
  var sale = STATE.productSales.find(function(s) { return s.id === saleId; }); if (!sale) return;
  var biz = getCurrentBusiness(); var itemsRows = ''; var subtotal = 0;
  sale.items.forEach(function(item, i) { var amt = item.price * item.qty; subtotal += amt; itemsRows += '<tr><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + (i+1) + '</td><td style="border:1px solid #000;padding:1.5mm">' + sanitize(item.fullName) + '</td><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + item.qty + '</td><td style="text-align:right;border:1px solid #000;padding:1.5mm">' + fmtPrice(item.price) + '</td><td style="text-align:right;font-weight:700;border:1px solid #000;padding:1.5mm">' + fmtPrice(amt) + '</td></tr>'; });
  var payMethod = sale.paymentMethod || "Cash";
  var payStatus = sale.paymentStatus || "PAID";
  var discount = sale.discount || 0;
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#000;font-size:10pt;line-height:1.3;background:#fff}.page{max-width:190mm;margin:0 auto}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #000;padding-bottom:4mm;margin-bottom:4mm}.biz-name{font-size:16pt;font-weight:900;color:#000;text-transform:uppercase}.biz-addr{font-size:8pt;color:#000}.logo{width:16mm;height:16mm;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-size:18pt;font-weight:900;color:#000}.ttl-box{border:2px solid #000;display:inline-block;padding:2mm 6mm;margin:4mm 0}.ttl{font-size:12pt;font-weight:900;color:#000;letter-spacing:2px}.info-grid{display:flex;gap:4mm;margin-bottom:4mm}.info-box{flex:1;border:1px solid #000;padding:2mm}.info-box-title{font-size:7pt;font-weight:900;color:#000;border-bottom:1px solid #000;padding-bottom:1mm;margin-bottom:1.5mm;text-transform:uppercase}.info-row{display:flex;justify-content:space-between;padding:0.6mm 0;font-size:8pt;color:#000}.info-lbl{font-weight:700;color:#000}.info-val{font-weight:700;color:#000}.tbl{width:100%;border-collapse:collapse;margin:4mm 0;border:1px solid #000}.tbl th{border:1px solid #000;padding:2mm;font-size:8pt;text-transform:uppercase;color:#000;font-weight:900}.tbl td{border:1px solid #000;padding:1.5mm;font-size:9pt;color:#000}.sum-box{display:flex;justify-content:flex-end;margin-top:3mm}.sum-tbl{width:40%;border-collapse:collapse;border:1px solid #000}.sum-tbl td{padding:2mm;border:1px solid #000;color:#000;font-size:10pt}.sum-tbl .gt td{font-weight:900;font-size:12pt;color:#000;border:2px solid #000}.sig-section{display:flex;gap:5mm;margin-top:8mm}.sig-box{flex:1;text-align:center}.sig-line{border-top:1px solid #000;margin-top:10mm;padding-top:2mm;font-size:7pt;color:#000}.ftr{text-align:center;margin-top:6mm;border-top:1px solid #000;padding-top:2mm;font-size:7pt;color:#000}</style></head><body><div class="page"><div class="hdr"><div><div class="biz-name">' + sanitize(biz.name) + '</div><div class="biz-addr">' + sanitize(biz.address) + '</div><div class="biz-addr">Tel: ' + sanitize(biz.phone) + ' | ' + sanitize(biz.email) + '</div></div><div class="logo">' + sanitize(biz.prefix) + '</div></div><div class="ttl-box"><span class="ttl">SALE INVOICE</span></div><div class="info-grid"><div class="info-box"><div class="info-box-title">Customer Details</div><div class="info-row"><span class="info-lbl">Name</span><span class="info-val">' + sanitize(sale.customer) + '</span></div><div class="info-row"><span class="info-lbl">Vehicle</span><span class="info-val">' + sanitize(sale.vehicleNo || "N/A") + '</span></div><div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' + sanitize(sale.date) + '</span></div></div><div class="info-box"><div class="info-box-title">Payment Details</div><div class="info-row"><span class="info-lbl">Method</span><span class="info-val">' + sanitize(payMethod) + '</span></div><div class="info-row"><span class="info-lbl">Status</span><span class="info-val">' + sanitize(payStatus) + '</span></div><div class="info-row"><span class="info-lbl">Business</span><span class="info-val">' + sanitize(biz.name) + '</span></div></div></div><table class="tbl"><thead><tr><th style="width:6%;text-align:center">#</th><th>Description</th><th style="width:10%;text-align:center">Qty</th><th style="width:18%;text-align:right">Rate</th><th style="width:20%;text-align:right">Amount</th></tr></thead><tbody>' + itemsRows + '</tbody></table><div class="sum-box"><table class="sum-tbl"><tr><td style="font-weight:700">Subtotal</td><td style="text-align:right;font-weight:700">' + fmtPrice(subtotal) + '</td></tr>' +
  (discount > 0 ? '<tr><td>Discount</td><td style="text-align:right">-' + fmtPrice(discount) + '</td></tr>' : '') +
  '<tr class="gt"><td style="font-weight:900">GRAND TOTAL</td><td style="text-align:right;font-weight:900">' + fmtPrice(sale.total) + '</td></tr></table></div><div class="sig-section"><div class="sig-box"><div class="sig-line"></div>Prepared By</div><div class="sig-box"><div class="sig-line"></div>Customer Signature</div></div><div class="ftr">' + sanitize(biz.name) + ' | ' + sanitize(biz.phone) + ' | Thank you for your business</div></div></body></html>';
  if (window.electronAPI && window.electronAPI.printReceipt) { window.electronAPI.printReceipt(h, { pageSize: { width: 210000, height: 297000 }, printBackground: true }); }
  else { var w = window.open("", "_blank"); w.document.write(h); w.document.close(); setTimeout(function() { w.print(); }, 500); }
}

function renderProductSalePage() {
  setText("#saleGrandTotal", "Rs. 0");
  setValue("#saleDiscount", "0");
  qs("#saleProductsContainer").innerHTML = "";
  addSaleProductRow();
  renderProductSalesHistoryNow();
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
  var discInput = document.getElementById("saleDiscount");
  var discount = parseNum(discInput?.value, 0);
  var grand = Math.max(0, t - discount);
  setText("#saleGrandTotal", fmtPrice(grand));
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
    // Show discount (if any) in recent sales history
    html += '<tr><td>' + sanitize(sale.date) + '<br><small>' + sanitize(sale.time) + '</small></td><td>' + sanitize(sale.customer) + '</td><td>' + sanitize(sale.vehicleNo) + '</td><td style="font-size:0.75rem;max-width:150px">' + itemsList + '</td><td style="font-weight:600;color:var(--success)">' + fmtPrice(sale.total) + (sale.discount ? '<br><small style="color:#b45309;">Discount: -' + fmtPrice(sale.discount) + '</small>' : '') + '</td><td><span class="badge badge--blue" style="font-size:0.6rem">' + sanitize(sale.invoiceNumber || "—") + '</span></td><td><div class="table-actions"><button class="btn btn-sm btn-primary" onclick="printSaleReceipt(\'' + sale.id + '\')" style="background:#000;font-size:0.6rem;padding:2px 6px">🧾</button><button class="btn btn-sm btn-outline" onclick="printSaleA4(\'' + sale.id + '\')" style="font-size:0.6rem;padding:2px 6px">📄</button></div></td></tr>';
  }
  tb.innerHTML = html;
}

function renderProductSalePage() {
  setText("#saleGrandTotal", "Rs. 0");
  setValue("#saleDiscount", "0");
  qs("#saleProductsContainer").innerHTML = "";
  addSaleProductRow();
  renderProductSalesHistoryNow();
}

function addSaleProductRow(prefill) {
  var c = qs("#saleProductsContainer");
  if (!c) return;
  // NEW: optional "prefill" ({variantId, qty, price}) lets Edit Sale load
  // a previously saved row back into the form. Calling addSaleProductRow()
  // with no argument (every existing call site) behaves exactly as before.
  var opts = getAllVariantsFlat().filter(function(v) { return v.stock > 0 || (prefill && prefill.variantId === v.id); }).map(function(v) {
    var sel = prefill && prefill.variantId === v.id ? " selected" : "";
    return '<option value="' + v.id + '" data-price="' + v.sellingPrice + '" data-stock="' + v.stock + '"' + sel + '>' + sanitize(v.fullName) + " | " + fmtPrice(v.sellingPrice) + "</option>";
  }).join("");
  var r = document.createElement("div");
  r.style.cssText = "display:grid;grid-template-columns:1fr 50px 80px 80px 28px;gap:5px;align-items:center;margin-bottom:6px;";
  r.innerHTML = '<select class="form-input sale-product-select" style="padding:5px 3px;font-size:0.7rem;"><option value="">Select</option>' + opts + '</select><input type="number" class="form-input sale-product-qty" value="' + ((prefill && prefill.qty) || 1) + '" min="1" style="padding:5px 2px;font-size:0.75rem;text-align:center;" /><input type="number" class="form-input sale-product-price" value="' + ((prefill && prefill.price) || 0) + '" readonly style="padding:5px 2px;font-size:0.75rem;background:var(--surface-active);text-align:right;" /><span class="sale-product-subtotal" style="font-weight:700;font-size:0.8rem;text-align:right;color:#000">Rs. 0</span><button class="btn-icon btn btn-danger-ghost" onclick="this.closest(\'div\').remove();updateSaleTotal();"><span class="material-icons">close</span></button>';
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
  updateRowSubtotal(r);
}

function updateRowSubtotal(row) {
  var qty = parseInt(row.querySelector(".sale-product-qty")?.value) || 0;
  var price = parseFloat(row.querySelector(".sale-product-price")?.value) || 0;
  row.querySelector(".sale-product-subtotal").textContent = fmtPrice(qty * price);
}



function saveProductSale() {
  var cu = (qs("#saleCustomerName")?.value || "").trim(),
      vn = (qs("#saleVehicleNo")?.value || "").trim();

  var items = [];
  qsa("#saleProductsContainer .sale-product-select").forEach(function(s, i) {
    var vid = s.value; if (!vid) return;
    var f = findVariantById(vid); if (!f) return;
    var q = parseInt(qsa("#saleProductsContainer .sale-product-qty")[i]?.value) || 1;
    var p = parseFloat(qsa("#saleProductsContainer .sale-product-price")[i]?.value) || f.variant.sellingPrice;
    items.push({ variantId: vid, fullName: f.fullName, qty: q, price: p });
  });

  if (!items.length) { toast("Add products", "error"); return; }

  var subtotal = 0;
  items.forEach(function(i) { subtotal += i.qty * i.price; });

  // ⭐ Discount
  var discInput = document.getElementById("saleDiscount");
  var discount = parseNum(discInput?.value, 0);
  var grandTotal = Math.max(0, subtotal - discount);

  // FIXED: Payment Method / Payment Status dropdowns were never read
  // anywhere — selecting "Unpaid"/"Partial" or any method had zero effect.
  var paymentMethod = qs("#salePaymentMethod")?.value || "Cash";
  var paymentStatus = qs("#salePaymentStatus")?.value || "PAID";

  // ============================================================
  // NEW — EDIT MODE: editProductSale() sets STATE.editingSaleId before
  // navigating here. When set, UPDATE the existing sale record in place
  // instead of creating a new one. Stock is first reverted for the sale's
  // OLD items, then deducted again for the NEW items, so inventory always
  // stays accurate after an edit (same pattern already used for editing
  // a Token).
  // ============================================================
  if (STATE.editingSaleId) {
    var existingSale = STATE.productSales.find(function (s) { return s.id === STATE.editingSaleId; });
    if (!existingSale) {
      toast("Sale not found — it may have been deleted", "error");
      exitProductSaleEditMode();
      return;
    }
    (existingSale.items || []).forEach(function (i) {
      var f = findVariantById(i.variantId);
      if (f) f.variant.stock += i.qty;
    });
    items.forEach(function (i) {
      var f = findVariantById(i.variantId);
      if (f) f.variant.stock = Math.max(0, f.variant.stock - i.qty);
    });
    saveInventory();

    existingSale.customer = cu || "Walk-in Customer";
    existingSale.vehicleNo = vn || "N/A";
    existingSale.items = items;
    existingSale.discount = discount;
    existingSale.total = grandTotal;
    existingSale.paymentMethod = paymentMethod;
    existingSale.paymentStatus = paymentStatus;
    existingSale.edited = true;
    existingSale.editedAt = fmtDate() + " " + fmtTime();
    saveProductSales();
    refreshDashboard();

    exitProductSaleEditMode();
    qs("#saleProductsContainer").innerHTML = "";
    setValue("#saleCustomerName", "");
    setValue("#saleVehicleNo", "");
    setValue("#saleDiscount", "0");
    setValue("#salePaymentMethod", "Cash");
    setValue("#salePaymentStatus", "PAID");
    setText("#saleGrandTotal", "Rs. 0");
    addSaleProductRow();
    setTimeout(function() { renderProductSalesHistoryNow(); }, 100);
    toast("Sale updated - " + fmtPrice(grandTotal), "success");
    return;
  }

  // Stock update
  items.forEach(function(i) {
    var f = findVariantById(i.variantId);
    if (f) f.variant.stock = Math.max(0, f.variant.stock - i.qty);
  });
  saveInventory();

  // Sale record with discount
  var saleRecord = {
    id: uid(),
    customer: cu || "Walk-in Customer",
    vehicleNo: vn || "N/A",
    items: items,
    discount: discount,
    total: grandTotal,
    paymentMethod: paymentMethod,
    paymentStatus: paymentStatus,
    date: fmtDate(),
    time: fmtTime(),
    createdAt: Date.now()
  };
  STATE.productSales.push(saleRecord);
  saveProductSales();

  // Invoice record with discount
  var biz = getCurrentBusiness();
  var prefix = biz.prefix;
  var counterKey = "invoiceCounter" + prefix;
  if (!STATE.counters[counterKey]) STATE.counters[counterKey] = 1;
  var invNumber = prefix + "-INV-" + String(STATE.counters[counterKey]).padStart(3, "0");
  var invItems = items.map(function(i) {
    return { name: i.fullName, price: i.price, qty: i.qty, type: "product" };
  });
  // FIXED: invoice status/cashReceived now follow the actual Payment
  // Status selected (Paid/Unpaid/Partial) instead of always being PAID.
  var invStatus = paymentStatus === "PAID" ? "PAID" : "UNPAID";
  var invCashReceived = paymentStatus === "PAID" ? grandTotal : 0;
  var inv = {
    id: uid(),
    number: invNumber,
    date: fmtDate(),
    time: fmtTime(),
    token: "",
    vehicle: vn,
    customer: cu || "Walk-in Customer",
    contactNumber: "",
    items: invItems,
    subtotal: subtotal,
    discount: discount,
    tax: 0,
    total: grandTotal,
    cashReceived: invCashReceived,
    changeReturned: 0,
    status: invStatus,
    paymentMethod: paymentMethod,
    businessPrefix: prefix,
    businessId: biz.id,
    businessName: biz.name,
    isProductSale: true // NEW: marks this invoice as coming from Product Sale, not a token — used to hide it from Billing & Invoice's Saved Invoices list
  };
  STATE.invoices.push(inv);
  STATE.counters[counterKey]++;
  saveInvoices();
  saveCounters();
  refreshDashboard();

  // Reset form
  qs("#saleProductsContainer").innerHTML = "";
  setValue("#saleCustomerName", "");
  setValue("#saleVehicleNo", "");
  setValue("#saleDiscount", "0");
  setValue("#salePaymentMethod", "Cash");
  setValue("#salePaymentStatus", "PAID");
  setText("#saleGrandTotal", "Rs. 0");
  addSaleProductRow();
  setTimeout(function() { renderProductSalesHistoryNow(); }, 100);
  toast("Sale completed - " + fmtPrice(grandTotal), "success");
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
    // Show discount (if any) + payment status/method in recent sales history
    var payBadgeClass = sale.paymentStatus === "PAID" ? "badge--green" : sale.paymentStatus === "PARTIAL" ? "badge--orange" : "badge--red";
    var payBadgeLabel = sale.paymentStatus === "PAID" ? "Paid" : sale.paymentStatus === "PARTIAL" ? "Partial" : "Unpaid";
    html += '<tr><td>' + sanitize(sale.date) + '<br><small>' + sanitize(sale.time) + '</small></td><td>' + sanitize(sale.customer) + '</td><td>' + sanitize(sale.vehicleNo) + '</td><td style="font-size:0.75rem;max-width:150px">' + itemsList + '</td><td style="font-weight:600;color:var(--success)">' + fmtPrice(sale.total) + (sale.discount ? '<br><small style="color:#b45309;">Discount: -' + fmtPrice(sale.discount) + '</small>' : '') + '<br><span class="badge ' + payBadgeClass + '" style="font-size:0.55rem">' + payBadgeLabel + ' · ' + sanitize(sale.paymentMethod || "Cash") + '</span></td><td><span class="badge badge--blue" style="font-size:0.6rem">' + sanitize(sale.invoiceNumber || "—") + '</span>' + (sale.edited ? ' <span class="badge badge--orange" style="font-size:0.55rem" title="Edited on ' + sanitize(sale.editedAt || "") + '">Edited</span>' : '') + '</td><td><div class="table-actions">' +
      // NEW: Edit button — opens this sale back into the form above for editing
      '<button class="btn btn-sm btn-outline" onclick="editProductSale(\'' + sale.id + '\')" title="Edit Sale"><span class="material-icons" style="font-size:16px;">edit</span></button>' +
      '<button class="btn btn-sm btn-primary" onclick="printSaleReceipt(\'' + sale.id + '\')" style="background:#000;font-size:0.6rem;padding:2px 6px">🧾</button><button class="btn btn-sm btn-outline" onclick="printSaleA4(\'' + sale.id + '\')" style="font-size:0.6rem;padding:2px 6px">📄</button></div></td></tr>';
  }
  tb.innerHTML = html;
}

// ============================================================
// NEW — Product Sale edit mode.
// editProductSale() loads a saved sale back into the Product Sale form,
// switches into "update" mode (STATE.editingSaleId), and shows a Cancel
// button. saveProductSale() checks STATE.editingSaleId and updates the
// existing record in place instead of creating a new sale.
// ============================================================
function editProductSale(id) {
  var sale = STATE.productSales.find(function (s) { return s.id === id; });
  if (!sale) { toast("Sale not found", "error"); return; }

  STATE.editingSaleId = id;
  navigateTo("productsale");

  setTimeout(function () {
    setValue("#saleCustomerName", sale.customer === "Walk-in Customer" ? "" : sale.customer);
    setValue("#saleVehicleNo", sale.vehicleNo === "N/A" ? "" : sale.vehicleNo);
    setValue("#saleDiscount", sale.discount || 0);
    setValue("#salePaymentMethod", sale.paymentMethod || "Cash");
    setValue("#salePaymentStatus", sale.paymentStatus || "PAID");

    qs("#saleProductsContainer").innerHTML = "";
    (sale.items || []).forEach(function (item) {
      addSaleProductRow({ variantId: item.variantId, qty: item.qty, price: item.price });
    });
    if (!(sale.items || []).length) addSaleProductRow();
    updateSaleTotal();

    var saveBtn = qs("#saveProductSaleBtn");
    if (saveBtn) saveBtn.innerHTML = '<span class="material-icons">save</span> Update Sale';
    showCancelEditSaleButton();

    toast("Editing sale — make your changes and click Update Sale", "info");
  }, 150);
}

function showCancelEditSaleButton() {
  var actions = qs("#saveProductSaleBtn")?.closest(".billing-actions");
  if (!actions || qs("#cancelEditSaleBtn")) return;
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-ghost";
  btn.id = "cancelEditSaleBtn";
  btn.innerHTML = '<span class="material-icons">close</span> Cancel Edit';
  btn.addEventListener("click", function () {
    exitProductSaleEditMode();
    renderProductSalePage();
    toast("Edit cancelled", "info");
  });
  actions.appendChild(btn);
}

function exitProductSaleEditMode() {
  STATE.editingSaleId = null;
  var saveBtn = qs("#saveProductSaleBtn");
  if (saveBtn) saveBtn.innerHTML = '<span class="material-icons">save</span> Complete Sale';
  var cancelBtn = qs("#cancelEditSaleBtn");
  if (cancelBtn) cancelBtn.remove();
}

function printSaleReceipt(saleId) {
  var sale = STATE.productSales.find(function(s) { return s.id === saleId; }); if (!sale) return;
  var biz = getCurrentBusiness();
  var itemsHTML = ''; sale.items.forEach(function(item) { itemsHTML += '<tr><td>' + sanitize(item.fullName) + ' x' + item.qty + '</td><td style="text-align:right;font-weight:700">' + fmtPrice(item.price * item.qty) + '</td></tr>'; });
  var subtotal = sale.items.reduce(function(sum, item) { return sum + item.price * item.qty; }, 0);
  var discount = sale.discount || 0;
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0}body{font-family:Arial,sans-serif;width:74mm;padding:2mm;font-size:9pt;color:#000}.hdr{text-align:center;border-bottom:2px solid #000;padding-bottom:2mm;margin-bottom:2mm}.biz{font-size:13pt;font-weight:900}.ttl{text-align:center;font-size:12pt;font-weight:900;margin:2mm 0;border:2px solid #000;padding:2mm}.row{display:flex;justify-content:space-between;padding:1mm 0;border-bottom:1px dotted #ccc}.discount-row{color:#b45309;font-weight:700}.grand{text-align:center;font-size:13pt;font-weight:900;margin-top:2mm;border-top:2px solid #000;padding-top:2mm}.ftr{text-align:center;margin-top:2mm;font-size:8pt}.dev-ftr{text-align:center;margin-top:1.5mm;font-size:7pt;color:#333;border-top:1px dashed #999;padding-top:1.5mm}</style></head><body><div class="hdr"><div class="biz">' + sanitize(biz.name) + '</div><div>' + sanitize(biz.address) + '</div></div><div class="ttl">SALE RECEIPT</div><div class="row"><span>Customer:</span><span><b>' + sanitize(sale.customer) + '</b></span></div><div class="row"><span>Date:</span><span>' + sanitize(sale.date) + '</span></div><table width="100%">' + itemsHTML + '</table>' +
  (discount > 0 ? '<div class="row discount-row"><span>Discount</span><span>-' + fmtPrice(discount) + '</span></div>' : '') +
  '<div class="grand">' + fmtPrice(sale.total) + '</div><div class="ftr">Thank You!</div><div class="dev-ftr">Developed by Design Orbits | 0322-5267908</div></body></html>';
  if (window.electronAPI && window.electronAPI.printReceipt) { window.electronAPI.printReceipt(h, { pageSize: { width: 80000, height: 297000 } }); }
  else { var w = window.open("", "_blank"); w.document.write(h); w.document.close(); setTimeout(function() { w.print(); }, 500); }
}

function printSaleA4(saleId) {
  var sale = STATE.productSales.find(function(s) { return s.id === saleId; }); if (!sale) return;
  var biz = getCurrentBusiness(); var itemsRows = ''; var subtotal = 0;
  sale.items.forEach(function(item, i) { var amt = item.price * item.qty; subtotal += amt; itemsRows += '<tr><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + (i+1) + '</td><td style="border:1px solid #000;padding:1.5mm">' + sanitize(item.fullName) + '</td><td style="text-align:center;border:1px solid #000;padding:1.5mm">' + item.qty + '</td><td style="text-align:right;border:1px solid #000;padding:1.5mm">' + fmtPrice(item.price) + '</td><td style="text-align:right;font-weight:700;border:1px solid #000;padding:1.5mm">' + fmtPrice(amt) + '</td></tr>'; });
  var payMethod = sale.paymentMethod || "Cash";
  var payStatus = sale.paymentStatus || "PAID";
  var discount = sale.discount || 0;
  var h = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:A4;margin:10mm}*{margin:0;padding:0;box-sizing:border-box}body{font-family:"Segoe UI",Arial,sans-serif;color:#000;font-size:10pt;line-height:1.3;background:#fff}.page{max-width:190mm;margin:0 auto}.hdr{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #000;padding-bottom:4mm;margin-bottom:4mm}.biz-name{font-size:16pt;font-weight:900;color:#000;text-transform:uppercase}.biz-addr{font-size:8pt;color:#000}.logo{width:16mm;height:16mm;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-size:18pt;font-weight:900;color:#000}.ttl-box{border:2px solid #000;display:inline-block;padding:2mm 6mm;margin:4mm 0}.ttl{font-size:12pt;font-weight:900;color:#000;letter-spacing:2px}.info-grid{display:flex;gap:4mm;margin-bottom:4mm}.info-box{flex:1;border:1px solid #000;padding:2mm}.info-box-title{font-size:7pt;font-weight:900;color:#000;border-bottom:1px solid #000;padding-bottom:1mm;margin-bottom:1.5mm;text-transform:uppercase}.info-row{display:flex;justify-content:space-between;padding:0.6mm 0;font-size:8pt;color:#000}.info-lbl{font-weight:700;color:#000}.info-val{font-weight:700;color:#000}.tbl{width:100%;border-collapse:collapse;margin:4mm 0;border:1px solid #000}.tbl th{border:1px solid #000;padding:2mm;font-size:8pt;text-transform:uppercase;color:#000;font-weight:900}.tbl td{border:1px solid #000;padding:1.5mm;font-size:9pt;color:#000}.sum-box{display:flex;justify-content:flex-end;margin-top:3mm}.sum-tbl{width:40%;border-collapse:collapse;border:1px solid #000}.sum-tbl td{padding:2mm;border:1px solid #000;color:#000;font-size:10pt}.sum-tbl .gt td{font-weight:900;font-size:12pt;color:#000;border:2px solid #000}.sig-section{display:flex;gap:5mm;margin-top:8mm}.sig-box{flex:1;text-align:center}.sig-line{border-top:1px solid #000;margin-top:10mm;padding-top:2mm;font-size:7pt;color:#000}.ftr{text-align:center;margin-top:6mm;border-top:1px solid #000;padding-top:2mm;font-size:7pt;color:#000}</style></head><body><div class="page"><div class="hdr"><div><div class="biz-name">' + sanitize(biz.name) + '</div><div class="biz-addr">' + sanitize(biz.address) + '</div><div class="biz-addr">Tel: ' + sanitize(biz.phone) + ' | ' + sanitize(biz.email) + '</div></div><div class="logo">' + sanitize(biz.prefix) + '</div></div><div class="ttl-box"><span class="ttl">SALE INVOICE</span></div><div class="info-grid"><div class="info-box"><div class="info-box-title">Customer Details</div><div class="info-row"><span class="info-lbl">Name</span><span class="info-val">' + sanitize(sale.customer) + '</span></div><div class="info-row"><span class="info-lbl">Vehicle</span><span class="info-val">' + sanitize(sale.vehicleNo || "N/A") + '</span></div><div class="info-row"><span class="info-lbl">Date</span><span class="info-val">' + sanitize(sale.date) + '</span></div></div><div class="info-box"><div class="info-box-title">Payment Details</div><div class="info-row"><span class="info-lbl">Method</span><span class="info-val">' + sanitize(payMethod) + '</span></div><div class="info-row"><span class="info-lbl">Status</span><span class="info-val">' + sanitize(payStatus) + '</span></div><div class="info-row"><span class="info-lbl">Business</span><span class="info-val">' + sanitize(biz.name) + '</span></div></div></div><table class="tbl"><thead><tr><th style="width:6%;text-align:center">#</th><th>Description</th><th style="width:10%;text-align:center">Qty</th><th style="width:18%;text-align:right">Rate</th><th style="width:20%;text-align:right">Amount</th></tr></thead><tbody>' + itemsRows + '</tbody></table><div class="sum-box"><table class="sum-tbl"><tr><td style="font-weight:700">Subtotal</td><td style="text-align:right;font-weight:700">' + fmtPrice(subtotal) + '</td></tr>' +
  (discount > 0 ? '<tr><td>Discount</td><td style="text-align:right">-' + fmtPrice(discount) + '</td></tr>' : '') +
  '<tr class="gt"><td style="font-weight:900">GRAND TOTAL</td><td style="text-align:right;font-weight:900">' + fmtPrice(sale.total) + '</td></tr></table></div><div class="sig-section"><div class="sig-box"><div class="sig-line"></div>Prepared By</div><div class="sig-box"><div class="sig-line"></div>Customer Signature</div></div><div class="ftr">' + sanitize(biz.name) + ' | ' + sanitize(biz.phone) + ' | Thank you for your business</div></div></body></html>';
  if (window.electronAPI && window.electronAPI.printReceipt) { window.electronAPI.printReceipt(h, { pageSize: { width: 210000, height: 297000 }, printBackground: true }); }
  else { var w = window.open("", "_blank"); w.document.write(h); w.document.close(); setTimeout(function() { w.print(); }, 500); }
}

function renderProductSalePage() {
  setText("#saleGrandTotal", "Rs. 0");
  setValue("#saleDiscount", "0");
  setValue("#salePaymentMethod", "Cash");
  setValue("#salePaymentStatus", "PAID");
  qs("#saleProductsContainer").innerHTML = "";
  addSaleProductRow();
  renderProductSalesHistoryNow();
}
// ==================== VEHICLES ====================
function initVehicles() {
  qs("#vehicleSearch")?.addEventListener("input", renderVehicleTable);
  qs("#vehicleBulkDeleteBtn")?.addEventListener("click", bulkDeleteSelectedVehicles);
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
  var sr = (qs("#vehicleSearch")?.value || "").trim().toLowerCase();
  var fl = STATE.vehicles.filter(function (v) {
    return (
      !sr ||
      (v.vehicleNo || "").toLowerCase().includes(sr) ||
      (v.owner || "").toLowerCase().includes(sr) ||
      (v.contact || "").toLowerCase().includes(sr) ||
      (v.type || "").toLowerCase().includes(sr)
    );
  });

  // ✅ Sort by lastService date descending (most recent first)
  fl.sort(function (a, b) {
    var dateA = parseDate(a.lastService);
    var dateB = parseDate(b.lastService);
    // If both have valid dates, sort descending
    if (dateA && dateB) return dateB - dateA;
    // If only one has a date, that one comes first
    if (dateA && !dateB) return -1;
    if (!dateA && dateB) return 1;
    // Both no dates → keep original order (by insertion, newest first)
    return 0;
  });

  var tb = qs("#vehicleTableBody");
  if (!tb) return;
  var badge = qs("#vehicleCountBadge");
  if (badge) badge.textContent = fl.length + " vehicles";
  if (!fl.length) {
    tb.innerHTML =
      '<tr><td colspan="6" style="text-align:center;padding:2rem;">No vehicles found</td></tr>';
    return;
  }
  tb.innerHTML = fl
    .map(function (v) {
      return (
        '<tr><td><input type="checkbox" class="row-select-checkbox" data-vehicle-select="' +
        v.id +
        '"' +
        (STATE.selectedVehicleIds.indexOf(v.id) !== -1 ? " checked" : "") +
        '></td><td><span class="table-vehicle-no">' +
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
        "</td></tr>"
      );
    })
    .join("");
}

// ==================== INVENTORY ====================
function initInventory() {
  qs("#inventoryBulkDeleteBtn")?.addEventListener("click", bulkDeleteSelectedVariants);
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
  qs("#inventoryCategoryFilter")?.addEventListener("change", renderInventoryTable);
  qs("#inventoryBrandFilter")?.addEventListener("change", renderInventoryTable);
  qs("#manageBrandsBtn")?.addEventListener("click", openBrandsModal);
  qs("#addBrandBtn")?.addEventListener("click", addBrand);
  qs("#manageCategoriesBtn")?.addEventListener("click", openCategoryModal);
  qs("#addCategoryBtn")?.addEventListener("click", addCategory);

  // ✅ Low Stock toggle button
  qs("#lowStockFilterBtn")?.addEventListener("click", function() {
    STATE.lowStockFilterActive = !STATE.lowStockFilterActive;
    this.classList.toggle("active", STATE.lowStockFilterActive);
    if (STATE.lowStockFilterActive) {
      this.style.background = "var(--danger)";
      this.style.color = "#fff";
      this.style.borderColor = "var(--danger)";
    } else {
      this.style.background = "";
      this.style.color = "";
      this.style.borderColor = "";
    }
    renderInventoryTable();
  });

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
    '" placeholder="e.g. 3L" /></div><div class="variant-field"><label>Purchase Price</label><input type="text" class="form-input variant-purchase-price" value="' +
    ((data && data.purchasePrice) || "") +
    '" /></div><div class="variant-field"><label>Selling Price *</label><input type="text" class="form-input variant-selling-price" value="' +
    ((data && data.sellingPrice) || "") +
    '" /></div><div class="variant-field"><label>Stock *</label><input type="text" class="form-input variant-stock" value="' +
    ((data && data.stock) || "") +
    '" /></div><div class="variant-field"><label>Min Stock</label><input type="text" class="form-input variant-min-stock" value="' +
    ((data && data.minStock) || "5") +
    '" /></div><div class="variant-field"><label>SKU</label><input type="text" class="form-input variant-sku" value="' +
    sanitize((data && data.sku) || "") +
    '" placeholder="Auto" /></div></div>';
  c.appendChild(card);
}
function openProductModal(d) {
  setValue("#productEditId", d ? d.id : "");
  setValue("#productName", d ? d.productType : "");
  populateCategoryDropdowns();
  var catObj = STATE.categories.find(function(c) { return c.name === (d ? d.category : "misc"); });
  setValue("#productCategory", catObj ? catObj.id : "misc");
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
  // FIX (inventory duplication bug): saveProduct() had no protection
  // against being invoked twice in quick succession (e.g. a fast
  // double-click, or a double-fired click event) — unlike saveToken()/
  // saveCustomToken() which already guard against this. That gap let the
  // exact same product get pushed into STATE.inventory more than once
  // from a single "Save" action. Same safe running-guard pattern as the
  // token save functions is applied here — no other logic changed.
  if (saveProduct.running) return;
  saveProduct.running = true;

  var ei = qs("#productEditId")?.value || "";
  var pt = (qs("#productName")?.value || "").trim();
  var catId = qs("#productCategory")?.value || "misc";
  var catObj = STATE.categories.find(function(c) { return c.id === catId; });
  var cat = catObj ? catObj.name : "Miscellaneous";
  if (!pt) { saveProduct.running = false; return; }
  var variants = [];
  var hasError = false;
  qsa("#variantsContainer .variant-card").forEach(function (card, idx) {
    var b = card.querySelector(".variant-brand")?.value || "General",
      m = card.querySelector(".variant-model")?.value?.trim() || "Standard",
      g = card.querySelector(".variant-grade")?.value?.trim() || "",
      s = card.querySelector(".variant-size")?.value?.trim() || "",
      pp = parseNum(card.querySelector(".variant-purchase-price")?.value, 0),
      sp = parseNum(card.querySelector(".variant-selling-price")?.value, 0),
      st = parseIntNum(card.querySelector(".variant-stock")?.value, 0),
      ms = parseIntNum(card.querySelector(".variant-min-stock")?.value, 5);
    var sku = card.querySelector(".variant-sku")?.value?.trim() || "";
    if (!sp) { toast("Variant #" + (idx + 1) + ": Enter price", "error"); hasError = true; return; }
    if (!sku) sku = generateVariantSKU(b, m, g, s, idx);
    variants.push({ id: uid(), brand: b, model: m, grade: g, size: s, sku: sku, purchasePrice: pp, sellingPrice: sp, stock: st, minStock: ms });
  });
  if (hasError || !variants.length) { saveProduct.running = false; return; }
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
  saveProduct.running = false;
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
    qt = parseNum(qs("#stockQty")?.value, 0),
    tp = document.querySelector('input[name="stockType"]:checked')?.value || "in";
  if (!vid) {
    toast("Select a product first", "error");
    return;
  }
  if (!qt || qt <= 0) {
    toast("Enter a valid quantity", "error");
    return;
  }
  var f = findVariantById(vid);
  if (!f) return;
  if (tp === "out" && qt > f.variant.stock) {
    toast("Only " + f.variant.stock + " available", "error");
    return;
  }
  f.variant.stock = tp === "in" ? Number(f.variant.stock) + qt : Number(f.variant.stock) - qt;
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
  var sr = (qs("#inventorySearch")?.value || "").toLowerCase().trim(),
    cf = qs("#inventoryCategoryFilter")?.value || "",
    bf = qs("#inventoryBrandFilter")?.value || "";

  // ✅ Alphabetical search: typing "a" shows products whose name/type/brand
  // starts with "a" first (prefix match). Plain substring match is still
  // used as a fallback so mid-word searches keep working, but the
  // starts-with matches are ranked first via the alphabetical sort below.
  var all = getAllVariantsFlat().filter(function (v) {
    var fn = (v.fullName || "").toLowerCase();
    var pt = (v.productType || "").toLowerCase();
    var sku = (v.sku || "").toLowerCase();
    var matchesSearch =
      !sr ||
      fn.startsWith(sr) ||
      pt.startsWith(sr) ||
      fn.includes(sr) ||
      pt.includes(sr) ||
      sku.includes(sr);
    return (
      matchesSearch &&
      (!cf || v.category === cf) &&
      (!bf || v.brand === bf)
    );
  });

  // ✅ Sort alphabetically by product name (A → Z). When a search term is
  // typed, entries that START WITH that term are shown first, so typing
  // "a" brings all "a..." products to the top in alphabetical order.
  all.sort(function (a, b) {
    var an = (a.fullName || "").toLowerCase();
    var bn = (b.fullName || "").toLowerCase();
    if (sr) {
      var aStarts = an.startsWith(sr) ? 0 : 1;
      var bStarts = bn.startsWith(sr) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
    }
    return an.localeCompare(bn);
  });

  // ✅ Low Stock Filter – sirf kam stock wale dikhao jab button active ho
  if (STATE.lowStockFilterActive) {
    all = all.filter(function(v) {
      return v.stock < v.minStock;
    });
  }

  var tb = qs("#inventoryTableBody");
  if (!tb) return;

  updateInventoryKPI();
  qs("#productCountBadge").textContent = all.length + " variants";

  if (!all.length) {
    tb.innerHTML = '<tr><td colspan="10">No variants</td></tr>';
    return;
  }

  tb.innerHTML = all
    .map(function (v) {
      var lo = v.stock < v.minStock;
      return (
        '<tr><td><input type="checkbox" class="row-select-checkbox" data-variant-select="' +
        v.id +
        '"' +
        (STATE.selectedVariantIds.indexOf(v.id) !== -1 ? " checked" : "") +
        '></td><td><div style="font-weight:500;">' +
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

// NEW — Bulk select/delete for Inventory. Mirrors the exact same removal
// logic already used by the single data-variant-delete handler (removes
// the variant, and drops the parent product if it has no variants left),
// just applied to every selected row in one confirm step.
function updateInventoryBulkDeleteUI() {
  var btn = qs("#inventoryBulkDeleteBtn");
  var cnt = qs("#inventoryBulkDeleteCount");
  if (cnt) cnt.textContent = STATE.selectedVariantIds.length;
  if (btn) btn.classList.toggle("hidden", STATE.selectedVariantIds.length === 0);
  var selectAll = qs("#inventorySelectAll");
  if (selectAll) {
    var boxes = qsa(".row-select-checkbox[data-variant-select]");
    selectAll.checked = boxes.length > 0 && boxes.every(function (b) { return b.checked; });
  }
}
function bulkDeleteSelectedVariants() {
  if (!STATE.selectedVariantIds.length) return;
  var ids = STATE.selectedVariantIds.slice();
  confirm(
    "Delete " + ids.length + " selected item(s)? This cannot be undone.",
    function () {
      STATE.inventory.forEach(function (p) {
        p.variants = (p.variants || []).filter(function (v) {
          return ids.indexOf(v.id) === -1;
        });
      });
      STATE.inventory = STATE.inventory.filter(function (p) {
        return (p.variants || []).length > 0;
      });
      saveInventory();
      STATE.selectedVariantIds = [];
      renderInventoryTable();
      updateInventoryBulkDeleteUI();
      updateInventoryKPI();
      refreshDashboard();
      toast(ids.length + " item(s) deleted", "success");
    },
    "Delete " + ids.length,
  );
}
// ============================================================
// NEW (ADDED ONLY) — Bulk select/delete for Vehicle Records,
// Expenses, Reminders, and Saved Invoices. Same pattern already
// used above for Token Management and Inventory. Nothing else in
// this file was changed — these are purely additive functions.
// ============================================================

// NEW — Bulk select/delete for Vehicle Records
function updateVehicleBulkDeleteUI() {
  var btn = qs("#vehicleBulkDeleteBtn");
  var cnt = qs("#vehicleBulkDeleteCount");
  if (cnt) cnt.textContent = STATE.selectedVehicleIds.length;
  if (btn) btn.classList.toggle("hidden", STATE.selectedVehicleIds.length === 0);
  var selectAll = qs("#vehicleSelectAll");
  if (selectAll) {
    var boxes = qsa(".row-select-checkbox[data-vehicle-select]");
    selectAll.checked = boxes.length > 0 && boxes.every(function (b) { return b.checked; });
  }
}
function bulkDeleteSelectedVehicles() {
  if (!STATE.selectedVehicleIds.length) return;
  var ids = STATE.selectedVehicleIds.slice();
  confirm(
    "Delete " + ids.length + " selected vehicle(s)? This cannot be undone.",
    function () {
      STATE.vehicles = STATE.vehicles.filter(function (v) { return ids.indexOf(v.id) === -1; });
      saveVehicles();
      STATE.selectedVehicleIds = [];
      renderVehicleTable();
      updateVehicleBulkDeleteUI();
      toast(ids.length + " vehicle(s) deleted", "success");
    },
    "Delete " + ids.length,
  );
}

// NEW — Bulk select/delete for Expenses
function updateExpenseBulkDeleteUI() {
  var btn = qs("#expenseBulkDeleteBtn");
  var cnt = qs("#expenseBulkDeleteCount");
  if (cnt) cnt.textContent = STATE.selectedExpenseIds.length;
  if (btn) btn.classList.toggle("hidden", STATE.selectedExpenseIds.length === 0);
  var selectAll = qs("#expenseSelectAll");
  if (selectAll) {
    var boxes = qsa(".row-select-checkbox[data-expense-select]");
    selectAll.checked = boxes.length > 0 && boxes.every(function (b) { return b.checked; });
  }
}
function bulkDeleteSelectedExpenses() {
  if (!STATE.selectedExpenseIds.length) return;
  var ids = STATE.selectedExpenseIds.slice();
  confirm(
    "Delete " + ids.length + " selected expense(s)? This cannot be undone.",
    function () {
      STATE.expenses = STATE.expenses.filter(function (e) { return ids.indexOf(e.id) === -1; });
      saveExpenses();
      STATE.selectedExpenseIds = [];
      renderExpenses();
      updateExpenseBulkDeleteUI();
      refreshDashboard();
      toast(ids.length + " expense(s) deleted", "success");
    },
    "Delete " + ids.length,
  );
}

// NEW — Bulk select/delete for Reminders
function updateReminderBulkDeleteUI() {
  var btn = qs("#reminderBulkDeleteBtn");
  var cnt = qs("#reminderBulkDeleteCount");
  if (cnt) cnt.textContent = STATE.selectedReminderIds.length;
  if (btn) btn.classList.toggle("hidden", STATE.selectedReminderIds.length === 0);
  var selectAll = qs("#reminderSelectAll");
  if (selectAll) {
    var boxes = qsa(".row-select-checkbox[data-reminder-select]");
    selectAll.checked = boxes.length > 0 && boxes.every(function (b) { return b.checked; });
  }
}
function bulkDeleteSelectedReminders() {
  if (!STATE.selectedReminderIds.length) return;
  var ids = STATE.selectedReminderIds.slice();
  confirm(
    "Delete " + ids.length + " selected reminder(s)? This cannot be undone.",
    function () {
      STATE.reminders = STATE.reminders.filter(function (r) { return ids.indexOf(r.id) === -1; });
      saveReminders();
      STATE.selectedReminderIds = [];
      renderReminderTable();
      updateReminderBulkDeleteUI();
      refreshDashboard();
      toast(ids.length + " reminder(s) deleted", "success");
    },
    "Delete " + ids.length,
  );
}

// NEW — Bulk select/delete for Saved Invoices
function updateInvoiceBulkDeleteUI() {
  var btn = qs("#invoiceBulkDeleteBtn");
  var cnt = qs("#invoiceBulkDeleteCount");
  if (cnt) cnt.textContent = STATE.selectedInvoiceIds.length;
  if (btn) btn.classList.toggle("hidden", STATE.selectedInvoiceIds.length === 0);
  var selectAll = qs("#savedInvoiceSelectAll");
  if (selectAll) {
    var boxes = qsa(".row-select-checkbox[data-invoice-select]");
    selectAll.checked = boxes.length > 0 && boxes.every(function (b) { return b.checked; });
  }
}
function bulkDeleteSelectedInvoices() {
  if (!STATE.selectedInvoiceIds.length) return;
  var ids = STATE.selectedInvoiceIds.slice();
  confirm(
    "Delete " + ids.length + " selected invoice(s)? This cannot be undone.",
    function () {
      if (STATE.editingInvoiceId && ids.indexOf(STATE.editingInvoiceId) !== -1) exitInvoiceEditMode();
      STATE.invoices = STATE.invoices.filter(function (i) { return ids.indexOf(i.id) === -1; });
      saveInvoices();
      STATE.selectedInvoiceIds = [];
      renderSavedInvoices();
      updateInvoiceBulkDeleteUI();
      toast(ids.length + " invoice(s) deleted", "success");
    },
    "Delete " + ids.length,
  );
}

// NEW — Bulk select/delete for Reports/Transactions. Each row can come
// from one of four different sources (a completed token, a product sale,
// an expense, or a vendor payment). Deleting a row here deletes the real
// underlying record it was generated from, restoring inventory stock for
// tokens/sales exactly like the existing single-item delete handlers do.
function updateReportBulkDeleteUI() {
  var btn = qs("#reportBulkDeleteBtn");
  var cnt = qs("#reportBulkDeleteCount");
  if (cnt) cnt.textContent = STATE.selectedReportIds.length;
  if (btn) btn.classList.toggle("hidden", STATE.selectedReportIds.length === 0);
  var selectAll = qs("#reportSelectAll");
  if (selectAll) {
    var boxes = qsa(".row-select-checkbox[data-report-select]");
    selectAll.checked = boxes.length > 0 && boxes.every(function (b) { return b.checked; });
  }
}
function bulkDeleteSelectedReportRows() {
  if (!STATE.selectedReportIds.length) return;
  var keys = STATE.selectedReportIds.slice();
  confirm(
    "Delete " + keys.length + " selected transaction(s)? This removes the underlying record (token/sale/expense/vendor payment) and cannot be undone.",
    function () {
      var tokenIds = [], saleIds = [], expenseIds = [], vendorPaymentIds = [];
      keys.forEach(function (key) {
        var parts = key.split("|");
        var src = parts[0], id = parts.slice(1).join("|");
        if (src === "token") tokenIds.push(id);
        else if (src === "sale") saleIds.push(id);
        else if (src === "expense") expenseIds.push(id);
        else if (src === "vendorPayment") vendorPaymentIds.push(id);
      });

      // Restore stock for tokens (same pattern as data-token-delete)
      if (tokenIds.length) {
        STATE.tokens.forEach(function (t) {
          if (tokenIds.indexOf(t.id) !== -1 && t.products) {
            t.products.forEach(function (p) {
              if (p.variantId) {
                var f = findVariantById(p.variantId);
                if (f) f.variant.stock += p.qty;
              }
            });
          }
        });
        STATE.tokens = STATE.tokens.filter(function (t) { return tokenIds.indexOf(t.id) === -1; });
        saveTokens();
      }

      // Restore stock for product sales (their items reference real variants too)
      if (saleIds.length) {
        STATE.productSales.forEach(function (s) {
          if (saleIds.indexOf(s.id) !== -1 && s.items) {
            s.items.forEach(function (i) {
              if (i.variantId) {
                var f = findVariantById(i.variantId);
                if (f) f.variant.stock += i.qty;
              }
            });
          }
        });
        STATE.productSales = STATE.productSales.filter(function (s) { return saleIds.indexOf(s.id) === -1; });
        saveProductSales();
      }

      if (tokenIds.length || saleIds.length) saveInventory();

      if (expenseIds.length) {
        STATE.expenses = STATE.expenses.filter(function (e) { return expenseIds.indexOf(e.id) === -1; });
        saveExpenses();
      }

      if (vendorPaymentIds.length) {
        STATE.vendorPayments = STATE.vendorPayments.filter(function (p) { return vendorPaymentIds.indexOf(p.id) === -1; });
        saveVendorPayments();
      }

      STATE.selectedReportIds = [];
      renderReports();
      // Keep all other views that show the same underlying data in sync
      if (tokenIds.length) renderTokenTable();
      if (saleIds.length) renderProductSalesHistoryNow();
      if (expenseIds.length) renderExpenses();
      if (vendorPaymentIds.length) { renderVendorTable(); renderVendorKPIs(); }
      renderInventoryTable();
      updateInventoryKPI();
      refreshDashboard();
      toast(keys.length + " transaction(s) deleted", "success");
    },
    "Delete " + keys.length,
  );
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
   qs("#downloadCSV")?.addEventListener("click", exportReportCSV);
  qs("#downloadPDF")?.addEventListener("click", exportReportPDF);
  qs("#reportBulkDeleteBtn")?.addEventListener("click", bulkDeleteSelectedReportRows);
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
  setText("#rptProfit", fmtPrice(getNetProfit()));

  var totalVendorPaid = STATE.vendorPayments.reduce(function(s, p) { return s + (p.amount || 0); }, 0);
  setText("#rptVendorPayments", fmtPrice(totalVendorPaid));

  var fromDate = qs("#rptFromDate")?.value ? new Date(qs("#rptFromDate").value) : null;
  var toDate = qs("#rptToDate")?.value ? new Date(qs("#rptToDate").value) : null;
    if (fromDate) fromDate.setHours(0, 0, 0, 0);
  if (toDate) toDate.setHours(23, 59, 59);

  var rows = [];
  STATE.tokens.forEach(function (tk) {
    if (tk.status === "completed") {
      // FIXED: tokens now carry their own real "date" (set at creation) and a
      // "createdAt" timestamp. Previously this always used `new Date()` (the
      // moment the report was rendered), so every token looked like it
      // happened "right now" and newest tokens got pushed to the bottom of
      // the list after the (stable) sort. Older tokens saved before this fix
      // won't have a date/createdAt yet, so we still fall back sensibly.
      var tDate = parseDate(tk.date) || new Date();
      var tOrder = tk.createdAt || 0;
      // FIXED: previously each token was split into a separate "Service"
      // row (full service price) PLUS one extra "Product" row per product
      // — and the token's discount was never subtracted anywhere here.
      // Now every completed token shows as a SINGLE row for its real,
      // final total (services + products − discount), matching what the
      // customer actually paid and matching getTotalRevenue()'s math.
      var tkProductsTotal = 0;
      if (tk.products)
        tk.products.forEach(function (p) {
          tkProductsTotal += (p.price || 0) * (p.qty || 0);
        });
      var tkGrossTotal = (tk.servicePrice || 0) + tkProductsTotal;
      var tkNetTotal = Math.max(0, tkGrossTotal - (tk.discount || 0));
      rows.push({
        date: tk.date || fmtDate(),
        dateObj: tDate,
        order: tOrder,
        type: "Revenue",
        cat: "Token",
        desc:
          "Token " +
          tk.number +
          (tk.discount > 0 ? " (Discount: -" + fmtPrice(tk.discount) + ")" : ""),
        amt: tkNetTotal,
        bal: "credit",
        source: "token", // NEW: lets bulk delete know which STATE array/id this row maps to
        id: tk.id, // NEW
      });
    }
  });
  STATE.productSales.forEach(function (s) {
    var d = parseDate(s.date) || new Date();
    rows.push({ date: s.date, dateObj: d, order: s.createdAt || 0, type: "Revenue", cat: "Sale", desc: s.customer || "Walk-in", amt: s.total, bal: "credit", source: "sale", id: s.id });
  });
  STATE.expenses.forEach(function (e) {
    var d = parseDate(e.date) || new Date();
    rows.push({ date: e.date, dateObj: d, order: e.createdAt || 0, type: "Expense", cat: e.category, desc: e.title, amt: e.amount, bal: "debit", source: "expense", id: e.id });
  });
  STATE.vendorPayments.forEach(function (vp) {
    var d = parseDate(vp.date) || new Date();
    var v = STATE.vendors.find(function(v) { return v.id === vp.vendorId; });
    rows.push({ date: vp.date, dateObj: d, order: vp.createdAt || 0, type: "Expense", cat: "Vendor Payment", desc: v ? v.company : "Vendor", amt: vp.amount, bal: "debit", source: "vendorPayment", id: vp.id });
  });

  if (fromDate || toDate) {
    rows = rows.filter(function(r) {
      if (fromDate && r.dateObj < fromDate) return false;
      if (toDate && r.dateObj > toDate) return false;
      return true;
    });
  }

  var rptType = qs("#rptType")?.value || "all";
  if (rptType === "revenue") {
    rows = rows.filter(function(r) { return r.type === "Revenue"; });
  } else if (rptType === "expenses") {
    rows = rows.filter(function(r) { return r.type === "Expense"; });
  }

  // FIXED: sort by real calendar date first (newest date on top); when two
  // rows fall on the SAME date, break the tie using "order" (createdAt),
  // so whichever one was actually added most recently shows above the
  // older one — new entries always land on top instead of the bottom.
  rows.sort(function (a, b) {
    var dateDiff = b.dateObj - a.dateObj;
    if (dateDiff !== 0) return dateDiff;
    return (b.order || 0) - (a.order || 0);
  });
  var tb = qs("#reportTableBody");
  if (tb)
    tb.innerHTML = rows.length
      ? rows
          .map(function (r) {
            // NEW: composite key "source|id" identifies exactly which
            // underlying record (token/sale/expense/vendorPayment) this
            // row came from, so bulk delete can remove the right one.
            var rowKey = (r.source || "") + "|" + (r.id || "");
            return (
              '<tr><td><input type="checkbox" class="row-select-checkbox" data-report-select="' +
              sanitize(rowKey) +
              '"' +
              (STATE.selectedReportIds.indexOf(rowKey) !== -1 ? " checked" : "") +
              '></td><td>' +
              sanitize(r.date) +
              "</td><td>" +
              r.type +
              "</td><td>" +
              sanitize(r.cat) +
              "</td><td>" +
              sanitize(r.desc) +
              '</td><td style="text-align:right;font-weight:700;">' +
              (r.bal === "credit" ? "+" : "-") +
              " " +
              fmtPrice(r.amt) +
              "</td></tr>"
            );
          })
          .join("")
      : '<tr><td colspan="6">No transactions</td></tr>';
  updateReportBulkDeleteUI();
}
// ============================================================
// NEW (ADDED ONLY) — Reports CSV / PDF export (follows the Reports
// filters: From date, To date, Type). Nothing existing was modified.
// Includes: summary, filtered transactions, tokens, product sales,
// invoices, vendor payments, items used/sold, current inventory.
// ============================================================
function parseInputDateLocal(s, endOfDay) {
  if (!s) return null;
  var p = String(s).split("-");
  if (p.length !== 3) return null;
  var d = new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  if (endOfDay) d.setHours(23, 59, 59, 999);
  else d.setHours(0, 0, 0, 0);
  return d;
}

function buildReportExportData() {
  var fromStr = qs("#rptFromDate")?.value || "";
  var toStr = qs("#rptToDate")?.value || "";
  var from = parseInputDateLocal(fromStr, false);
  var to = parseInputDateLocal(toStr, true);
  var type = qs("#rptType")?.value || "all";

  function inRange(d) {
    d = d || new Date();
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }
  function tokenNet(t) {
    var pt = 0;
    (t.products || []).forEach(function (p) {
      pt += (p.price || 0) * (p.qty || 0);
    });
    return Math.max(0, (t.servicePrice || 0) + pt - (t.discount || 0));
  }
  function productsText(list) {
    return (list || [])
      .map(function (p) {
        return (p.fullName || "") + " x" + (p.qty || 0);
      })
      .join(" | ");
  }
  function vendorName(id) {
    var v = STATE.vendors.find(function (v) {
      return v.id === id;
    });
    return v ? v.company : "Vendor";
  }
  function byDateDesc(a, b) {
    var dd = b.dateObj - a.dateObj;
    if (dd !== 0) return dd;
    return (b.order || 0) - (a.order || 0);
  }

  // ---- Transaction rows (same sources/logic as renderReports) ----
  var rows = [];
  STATE.tokens.forEach(function (tk) {
    if (tk.status === "completed") {
      rows.push({
        date: tk.date || fmtDate(),
        dateObj: parseDate(tk.date) || new Date(),
        order: tk.createdAt || 0,
        type: "Revenue",
        cat: "Token",
        desc: "Token " + tk.number + (tk.discount > 0 ? " (Discount: -" + fmtPrice(tk.discount) + ")" : ""),
        amt: tokenNet(tk),
        bal: "credit",
      });
    }
  });
  STATE.productSales.forEach(function (s) {
    rows.push({ date: s.date, dateObj: parseDate(s.date) || new Date(), order: s.createdAt || 0, type: "Revenue", cat: "Sale", desc: s.customer || "Walk-in", amt: s.total || 0, bal: "credit" });
  });
  STATE.expenses.forEach(function (e) {
    rows.push({ date: e.date, dateObj: parseDate(e.date) || new Date(), order: e.createdAt || 0, type: "Expense", cat: e.category, desc: e.title, amt: e.amount || 0, bal: "debit" });
  });
  STATE.vendorPayments.forEach(function (vp) {
    rows.push({ date: vp.date, dateObj: parseDate(vp.date) || new Date(), order: vp.createdAt || 0, type: "Expense", cat: "Vendor Payment", desc: vendorName(vp.vendorId), amt: vp.amount || 0, bal: "debit" });
  });

  var dateRows = rows.filter(function (r) { return inRange(r.dateObj); }).sort(byDateDesc);

  // ---- Summary (always for the selected date range) ----
  var revenue = 0, expAll = 0, labour = 0, vendorPaid = 0;
  dateRows.forEach(function (r) {
    if (r.type === "Revenue") revenue += r.amt;
    else {
      expAll += r.amt;
      if (r.cat === "labour") labour += r.amt;
      if (r.cat === "Vendor Payment") vendorPaid += r.amt;
    }
  });
  var otherExp = expAll - labour - vendorPaid;

  var txRows = dateRows.filter(function (r) {
    if (type === "revenue") return r.type === "Revenue";
    if (type === "expenses") return r.type === "Expense";
    return true;
  });

  // ---- Tokens in range ----
  var tokensInRange = STATE.tokens
    .map(function (t) { return { t: t, dateObj: parseDate(t.date) || new Date(), order: t.createdAt || 0 }; })
    .filter(function (x) { return inRange(x.dateObj); })
    .sort(byDateDesc);

  // ---- Product sales in range ----
  var salesInRange = STATE.productSales
    .map(function (s) { return { s: s, dateObj: parseDate(s.date) || new Date(), order: s.createdAt || 0 }; })
    .filter(function (x) { return inRange(x.dateObj); })
    .sort(byDateDesc);

  // ---- Invoices in range (product-sale invoices excluded, same as Saved Invoices) ----
  var invoicesInRange = STATE.invoices
    .filter(function (i) { return !i.isProductSale; })
    .map(function (i) { return { i: i, dateObj: parseDate(i.date) || new Date(), order: i.createdAt || 0 }; })
    .filter(function (x) { return inRange(x.dateObj); })
    .sort(byDateDesc);

  // ---- Vendor payments in range ----
  var vpInRange = STATE.vendorPayments
    .map(function (p) { return { p: p, dateObj: parseDate(p.date) || new Date(), order: p.createdAt || 0 }; })
    .filter(function (x) { return inRange(x.dateObj); })
    .sort(byDateDesc);

  // ---- Items used / sold in range (from tokens + product sales) ----
  var usage = {};
  function addUsage(name, qty, amt) {
    if (!name) return;
    if (!usage[name]) usage[name] = { qty: 0, amt: 0 };
    usage[name].qty += qty || 0;
    usage[name].amt += amt || 0;
  }
  tokensInRange.forEach(function (x) {
    (x.t.products || []).forEach(function (p) { addUsage(p.fullName, p.qty, (p.price || 0) * (p.qty || 0)); });
  });
  salesInRange.forEach(function (x) {
    (x.s.items || []).forEach(function (p) { addUsage(p.fullName, p.qty, (p.price || 0) * (p.qty || 0)); });
  });
  var usageRows = Object.keys(usage).sort().map(function (k) { return [k, usage[k].qty, usage[k].amt]; });

  // Product cost (purchase price) of items sold in this date range — Net Profit me se minus hota hai
  var productCostRange = 0;
  tokensInRange.forEach(function (x) {
    if (x.t.status !== "completed") return;
    (x.t.products || []).forEach(function (p) {
      productCostRange += getProductUnitCost(p.variantId, p.fullName) * (p.qty || 0);
    });
  });
  salesInRange.forEach(function (x) {
    (x.s.items || []).forEach(function (p) {
      productCostRange += getProductUnitCost(p.variantId, p.fullName) * (p.qty || 0);
    });
  });

  // ---- Current inventory snapshot ----
  var invRows = getAllVariantsFlat()
    .sort(function (a, b) { return (a.fullName || "").localeCompare(b.fullName || ""); })
    .map(function (v) {
      return [v.fullName, v.sku, v.category || "", v.stock, v.minStock, v.purchasePrice || 0, v.sellingPrice || 0, (v.stock || 0) * (v.sellingPrice || 0), v.stock < v.minStock ? "LOW" : "OK"];
    });

  var typeLabel = type === "revenue" ? "Revenue only" : type === "expenses" ? "Expenses only" : "All";
  var sections = [
    {
      title: "SUMMARY (selected date range)",
      headers: ["Item", "Amount"],
      moneyCols: [1],
      rows: [
        ["Total Revenue", revenue],
        ["Other Expenses", otherExp],
        ["Labour Cost", labour],
        ["Vendor Payments", vendorPaid],
        ["Total Expenses (all)", expAll],
        ["Product Cost (items sold)", productCostRange],
        ["Net Profit", revenue - productCostRange - expAll],
      ],
    },
    {
      title: "TRANSACTIONS (Type: " + typeLabel + ")",
      headers: ["Date", "Type", "Category", "Description", "Amount"],
      moneyCols: [4],
      rows: txRows.map(function (r) {
        return [r.date, r.type, r.cat, r.desc, r.bal === "credit" ? r.amt : -r.amt];
      }),
    },
    {
      title: "TOKENS (all statuses)",
      headers: ["Token", "Date", "Time", "Vehicle", "Type", "Customer", "Contact", "Services", "Products", "Discount", "Total", "Status", "Business"],
      moneyCols: [9, 10],
      rows: tokensInRange.map(function (x) {
        var t = x.t;
        return [t.number, t.date || "", t.time || "", t.vehicleNo || "", t.vehicleType || "", t.ownerName || "", t.contactNumber || "", t.service || "", productsText(t.products), t.discount || 0, tokenNet(t), t.status, t.businessName || t.businessPrefix || ""];
      }),
    },
    {
      title: "PRODUCT SALES",
      headers: ["Date", "Time", "Customer", "Vehicle", "Items", "Discount", "Total", "Payment"],
      moneyCols: [5, 6],
      rows: salesInRange.map(function (x) {
        var s = x.s;
        return [s.date, s.time || "", s.customer || "", s.vehicleNo || "", productsText(s.items), s.discount || 0, s.total || 0, (s.paymentStatus || "PAID") + " / " + (s.paymentMethod || "Cash")];
      }),
    },
    {
      title: "INVOICES",
      headers: ["Invoice #", "Date", "Customer", "Vehicle", "Token", "Total", "Status", "Payment Method"],
      moneyCols: [5],
      rows: invoicesInRange.map(function (x) {
        var i = x.i;
        return [i.number, i.date, i.customer || "", i.vehicle || "", i.token || "", i.total || 0, i.status, i.paymentMethod || "Cash"];
      }),
    },
    {
      title: "VENDOR PAYMENTS",
      headers: ["Date", "Vendor", "Amount", "Method", "Notes"],
      moneyCols: [2],
      rows: vpInRange.map(function (x) {
        return [x.p.date, vendorName(x.p.vendorId), x.p.amount || 0, x.p.method || "", x.p.notes || ""];
      }),
    },
    {
      title: "ITEMS USED / SOLD (selected date range)",
      headers: ["Item", "Qty", "Amount"],
      moneyCols: [2],
      rows: usageRows,
    },
    {
      title: "CURRENT INVENTORY (snapshot as of today)",
      headers: ["Product / Variant", "SKU", "Category", "Stock", "Min", "Cost", "Price", "Stock Value", "Status"],
      moneyCols: [5, 6, 7],
      rows: invRows,
    },
  ];

  return {
    meta: {
      business: getCurrentBusiness().name,
      from: fromStr,
      to: toStr,
      period: (fromStr || "Start") + " to " + (toStr || "Today"),
      typeLabel: typeLabel,
      generated: fmtDate() + " " + fmtTime(),
    },
    sections: sections,
  };
}

function reportRangeIsValid() {
  var f = qs("#rptFromDate")?.value || "";
  var t = qs("#rptToDate")?.value || "";
  if (f && t && f > t) {
    toast("'From' date 'To' date se bari nahi ho sakti", "warning");
    return false;
  }
  return true;
}

function exportReportCSV() {
  if (!reportRangeIsValid()) return;
  var data = buildReportExportData();
  var esc = function (v) {
    return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  };
  var csv = "\uFEFF";
  csv += esc("BUSINESS") + "," + esc(data.meta.business) + "\n";
  csv += esc("PERIOD") + "," + esc(data.meta.period) + "\n";
  csv += esc("TYPE FILTER") + "," + esc(data.meta.typeLabel) + "\n";
  csv += esc("GENERATED") + "," + esc(data.meta.generated) + "\n";
  data.sections.forEach(function (sec) {
    csv += "\n" + esc(sec.title) + "\n";
    csv += sec.headers.map(esc).join(",") + "\n";
    if (!sec.rows.length) {
      csv += esc("No records") + "\n";
    } else {
      sec.rows.forEach(function (r) {
        csv += r.map(esc).join(",") + "\n";
      });
    }
  });
  var b = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  var a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = "report_" + (data.meta.from || "start") + "_to_" + (data.meta.to || "today") + ".csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  toast("Report CSV exported", "success");
}

function exportReportPDF() {
  if (!reportRangeIsValid()) return;
  var data = buildReportExportData();
  // ---- COMPACT PDF: sirf zaroori cheezein (tokens/invoices/full inventory list nahi) ----
  // Filter ka asar: Type = Revenue/Expenses ke hisab se sections khud chhup/dikhte hain,
  // aur Date range sab par lagti hai (buildReportExportData se).
  var rptTypeSel = qs("#rptType")?.value || "all";
  var showRevenueParts = rptTypeSel !== "expenses";
  var showExpenseParts = rptTypeSel !== "revenue";
  var S = data.sections;
  var summaryRows = S[0].rows;
  var txRowsPdf = S[1].rows;
  var tokenRowsPdf = S[2].rows;
  var salesRowsPdf = S[3].rows;
  var invRowsPdf = S[4].rows;
  var usageRowsPdf = S[6].rows;
  var stockRowsPdf = S[7].rows;

  function sv(name) {
    var r = summaryRows.find(function (x) { return x[0] === name; });
    return r ? r[1] : 0;
  }
  var pdfRevenue = sv("Total Revenue");
  var pdfOther = sv("Other Expenses");
  var pdfLabour = sv("Labour Cost");
  var pdfVendor = sv("Vendor Payments");
  var pdfExpAll = sv("Total Expenses (all)");
  var pdfNet = sv("Net Profit");
  var pdfProdCost = sv("Product Cost (items sold)");

  function card(label, val, color) {
    return '<div class="card"><div class="cl">' + sanitize(label) + '</div><div class="cv" style="color:' + (color || "#000") + '">' + sanitize(fmtPrice(val)) + "</div></div>";
  }
  function tbl(headers, rows, moneyCols, totalRow) {
    var th = headers.map(function (h, i) {
      return "<th" + (moneyCols.indexOf(i) !== -1 ? ' style="text-align:right"' : "") + ">" + sanitize(h) + "</th>";
    }).join("");
    var trs = rows.length
      ? rows.map(function (r) {
          return "<tr>" + r.map(function (c, i) {
            var m = moneyCols.indexOf(i) !== -1;
            return "<td" + (m ? ' style="text-align:right;white-space:nowrap"' : "") + ">" + sanitize(m ? fmtPrice(c) : c) + "</td>";
          }).join("") + "</tr>";
        }).join("")
      : '<tr><td colspan="' + headers.length + '" style="text-align:center;color:#666">No records</td></tr>';
    var tf = "";
    if (totalRow) {
      tf = "<tr class=\"tot\">" + totalRow.map(function (c, i) {
        var m = moneyCols.indexOf(i) !== -1;
        return "<td" + (m ? ' style="text-align:right;white-space:nowrap"' : "") + ">" + sanitize(m ? fmtPrice(c) : c) + "</td>";
      }).join("") + "</tr>";
    }
    return "<table><thead><tr>" + th + "</tr></thead><tbody>" + trs + tf + "</tbody></table>";
  }

  var body = "";

  // 1) Summary cards
  body += "<h2>Summary</h2><div class=\"cards\">";
  if (showRevenueParts) body += card("Total Revenue", pdfRevenue, "#15803d");
  if (showExpenseParts) {
    body += card("Other Expenses", pdfOther, "#b91c1c");
    body += card("Labour Cost", pdfLabour, "#b45309");
    body += card("Vendor Payments", pdfVendor, "#b45309");
    body += card("Total Expenses", pdfExpAll, "#b91c1c");
    body += card("Product Cost (items sold)", pdfProdCost, "#b45309");
  }
  if (showRevenueParts && showExpenseParts) body += card("Net Profit", pdfNet, pdfNet >= 0 ? "#15803d" : "#b91c1c");
  body += "</div>";

  // 2) Activity (sirf ginti)
  var tokDone = tokenRowsPdf.filter(function (r) { return r[11] === "completed"; }).length;
  var tokOpen = tokenRowsPdf.length - tokDone;
  if (showRevenueParts) {
    body += "<h2>Activity</h2>" + tbl(
      ["Item", "Count"],
      [
        ["Tokens completed", tokDone],
        ["Tokens pending / in progress", tokOpen],
        ["Product sales", salesRowsPdf.length],
        ["Invoices", invRowsPdf.length],
      ],
      []
    );
  }

  // 3) Category-wise breakdown (transactions se)
  var revCat = {}, expCat = {};
  txRowsPdf.forEach(function (r) {
    var t = r[1], cat = r[2] || "Other", amt = Math.abs(r[4] || 0);
    var m = t === "Revenue" ? revCat : expCat;
    m[cat] = (m[cat] || 0) + amt;
  });
  function catRows(m) {
    return Object.keys(m).sort(function (a, b) { return m[b] - m[a]; }).map(function (k) { return [k, m[k]]; });
  }
  if (showRevenueParts) {
    var rc = catRows(revCat);
    body += "<h2>Revenue by Source</h2>" + tbl(["Source", "Amount"], rc, [1],
      rc.length ? ["Total", rc.reduce(function (s, r) { return s + r[1]; }, 0)] : null);
  }
  if (showExpenseParts) {
    var ec = catRows(expCat);
    body += "<h2>Expenses by Category</h2>" + tbl(["Category", "Amount"], ec, [1],
      ec.length ? ["Total", ec.reduce(function (s, r) { return s + r[1]; }, 0)] : null);
  }

  // 4) Transactions (Type filter ke mutabiq)
  body += "<h2>Transactions</h2>" + tbl(["Date", "Type", "Category", "Description", "Amount"], txRowsPdf, [4]);

  // 5) Items sold / used (sirf jab revenue wali cheezein dikh rahi hon)
  if (showRevenueParts && usageRowsPdf.length) {
    body += "<h2>Items Sold / Used</h2>" + tbl(["Item", "Qty", "Amount"], usageRowsPdf, [2],
      ["Total", usageRowsPdf.reduce(function (s, r) { return s + (r[1] || 0); }, 0), usageRowsPdf.reduce(function (s, r) { return s + (r[2] || 0); }, 0)]);
  }

  // 6) Sirf low stock items (poori inventory nahi)
  var lowStock = stockRowsPdf.filter(function (r) { return r[8] === "LOW"; })
    .map(function (r) { return [r[0], r[3], r[4]]; });
  if (lowStock.length) {
    body += "<h2>Low Stock Alert</h2>" + tbl(["Product / Variant", "Stock", "Min"], lowStock, []);
  }

  var html =
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Report</title><style>' +
    "@page{size:A4;margin:10mm}*{box-sizing:border-box}" +
    "body{font-family:Arial,sans-serif;font-size:9pt;color:#000;margin:0}" +
    "h1{font-size:15pt;text-align:center;margin:0 0 2mm}" +
    ".meta{text-align:center;font-size:9pt;margin-bottom:4mm;color:#333}" +
    "h2{font-size:10.5pt;margin:6mm 0 1.5mm;border-bottom:2px solid #000;padding-bottom:1mm;page-break-after:avoid}" +
    "table{width:100%;border-collapse:collapse;font-size:8pt}" +
    "th{background:#eee;border:1px solid #000;padding:1.2mm;text-align:left}" +
    "td{border:1px solid #999;padding:1.1mm;vertical-align:top;word-break:break-word}" +
    "tr{page-break-inside:avoid}thead{display:table-header-group}" +
    ".cards{display:flex;flex-wrap:wrap;gap:3mm}.card{flex:1 1 30%;border:1px solid #000;padding:2mm 3mm}.cl{font-size:7.5pt;text-transform:uppercase;color:#444}.cv{font-size:12pt;font-weight:700}tr.tot td{font-weight:700;background:#f3f3f3}" +
    "</style></head><body>" +
    "<h1>" + sanitize(data.meta.business) + " — Report</h1>" +
    '<div class="meta">Period: ' + sanitize(data.meta.period) + " | Type: " + sanitize(data.meta.typeLabel) + " | Generated: " + sanitize(data.meta.generated) + "</div>" +
    body +
    "</body></html>";

  function browserFallback() {
    var w = window.open("", "_blank");
    if (!w) {
      toast("Popup blocked", "error");
      return;
    }
    w.document.write(html);
    w.document.close();
    setTimeout(function () { w.print(); }, 500);
  }

  if (window.electronAPI && window.electronAPI.printReceipt) {
    toast("Print window me 'Save as PDF' / 'Microsoft Print to PDF' select karein", "info");
    window.electronAPI
      .printReceipt(html, { pageSize: { width: 210000, height: 297000 }, printBackground: true })
      .then(function (res) {
        if (res && !res.success && res.reason === "no-printer") browserFallback();
        else if (res && !res.success && res.reason !== "cancelled" && res.reason !== "Print job canceled") {
          toast("PDF/print failed: " + res.reason, "error");
        }
      })
      .catch(function () {
        toast("PDF export error", "error");
      });
  } else {
    browserFallback();
  }
}

// ==================== EXPENSES ====================
function initExpenses() {
  qs("#addExpenseBtn")?.addEventListener("click", showExpenseForm);
  qs("#saveExpenseBtn")?.addEventListener("click", saveExpense);
  qs("#cancelExpenseBtn")?.addEventListener("click", hideExpenseForm);
  qs("#expenseSearch")?.addEventListener("input", renderExpenses);
  var expFilterSel = getExpenseFilterSelect();
  if (expFilterSel) expFilterSel.addEventListener("change", renderExpenses);
  qs("#expenseBulkDeleteBtn")?.addEventListener("click", bulkDeleteSelectedExpenses);
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
    am = parseNum(qs("#expenseAmount")?.value, 0);
  if (!tl) {
    toast("Enter expense title", "error");
    return;
  }
  if (!ct) {
    toast("Select a category", "error");
    return;
  }
  if (!am || am <= 0) {
    toast("Enter a valid amount", "error");
    return;
  }
  STATE.expenses.push({
    id: uid(),
    title: tl,
    category: ct,
    amount: am,
    date: fmtDate(),
    time: fmtTime(),
    createdAt: Date.now(),
  });
  saveExpenses();
  hideExpenseForm();
  renderExpenses();
  refreshDashboard();
}
// Finds the "All" category dropdown next to the expense search box
// (works even if its id is not known).
function getExpenseFilterSelect() {
  var ids = ["#expenseCategoryFilter", "#expenseFilter", "#expenseFilterCategory", "#expenseTypeFilter", "#expenseStatusFilter"];
  for (var i = 0; i < ids.length; i++) {
    var el = qs(ids[i]);
    if (el) return el;
  }
  var s = qs("#expenseSearch");
  var p = s ? s.parentElement : null;
  for (var d = 0; p && d < 4; d++, p = p.parentElement) {
    var sel = p.querySelector("select");
    if (sel && !sel.closest("table") && !sel.closest(".modal-overlay") && sel.id !== "expenseCategory") return sel;
  }
  return null;
}
function renderExpenses() {
  setText("#totalRevenueAmt", fmtPrice(getTotalRevenue()));
  setText("#totalExpenseAmt", fmtPrice(getTotalExpenses()));
  setText("#labourCostAmt", fmtPrice(getLabourCost()));
  setText("#netProfitAmt", fmtPrice(getNetProfit()));

  // ✅ Newest first: sort by date descending, then by createdAt (real
  // insertion time) descending. Falls back to the old time-string compare
  // only for legacy records saved before createdAt existed.
  var fl = STATE.expenses.sort(function (a, b) {
    var dateA = parseDate(a.date) || new Date(0);
    var dateB = parseDate(b.date) || new Date(0);
    if (dateB - dateA !== 0) return dateB - dateA;
    if (a.createdAt || b.createdAt) return (b.createdAt || 0) - (a.createdAt || 0);
    return (b.time || "").localeCompare(a.time || "");
  });

  // FIX: search box / category dropdown were wired to this function but it
  // never actually filtered anything. Filtering now happens on a copy, so
  // STATE.expenses itself (and totals above) are untouched.
  var expSearch = (qs("#expenseSearch")?.value || "").trim().toLowerCase();
  var expFilterEl = getExpenseFilterSelect();
  var expCat = expFilterEl ? (expFilterEl.value || "").trim().toLowerCase() : "";
  var expCatText = expFilterEl && expFilterEl.selectedIndex >= 0
    ? (expFilterEl.options[expFilterEl.selectedIndex].text || "").trim().toLowerCase()
    : "";
  if (expCatText === "all" || expCatText.indexOf("all ") === 0) expCat = "";
  fl = fl.filter(function (e) {
    var cat = (e.category || "").toLowerCase();
    if (expCat && cat !== expCat && cat !== expCatText) return false;
    if (!expSearch) return true;
    return (
      (e.title || "").toLowerCase().indexOf(expSearch) !== -1 ||
      cat.indexOf(expSearch) !== -1 ||
      String(e.amount == null ? "" : e.amount).indexOf(expSearch) !== -1 ||
      (e.date || "").toLowerCase().indexOf(expSearch) !== -1
    );
  });

  var countBadge = qs("#expenseCountBadge");
  if (countBadge) countBadge.textContent = fl.length;
  var tb = qs("#expenseTableBody");
  if (tb)
    tb.innerHTML = fl.length
      ? fl
          .map(function (e) {
            return (
              '<tr><td><input type="checkbox" class="row-select-checkbox" data-expense-select="' +
              e.id +
              '"' +
              (STATE.selectedExpenseIds.indexOf(e.id) !== -1 ? " checked" : "") +
              '></td><td>' +
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
      : '<tr><td colspan="6">No expenses</td></tr>';
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
    // FIXED: "All Data" export was silently dropping vendors, vendor
    // payments, purchase orders, vehicle types, pricing services,
    // counters and businesses. That's why a full restore never brought
    // those back. Every piece of app data is now included here.
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
      pricingVehicles: STATE.pricingVehicles,
      pricingServices: STATE.pricingServices,
      counters: STATE.counters,
      businesses: getBusinesses(),
      vendors: STATE.vendors,
      vendorPayments: STATE.vendorPayments,
      purchaseOrders: STATE.purchaseOrders,
      version: "6.4",
    };
  if (mod === "inventory") return STATE.inventory;
  if (mod === "tokens") return STATE.tokens;
  if (mod === "vehicles") return STATE.vehicles;
  if (mod === "invoices") return STATE.invoices;
  if (mod === "expenses") return STATE.expenses;
  if (mod === "reminders") return STATE.reminders;
  if (mod === "productSales") return STATE.productSales;
  if (mod === "pricingMatrix") return STATE.pricingMatrix; // FIX: was missing, single-module export returned {}
  if (mod === "vendors") return STATE.vendors;
  if (mod === "vendorPayments") return STATE.vendorPayments;
  if (mod === "purchaseOrders") return STATE.purchaseOrders;
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
// ============================================================
// FIXED (strengthened) — exportCSV now covers EVERY module, not
// just inventory + tokens. Also uses a proper esc() that never
// prints "undefined"/"null" as text. Nothing about the calling
// convention changed — exportCSV(mo) still works exactly the
// same way from every existing button.
// ============================================================
function exportCSV(mo) {
  var m = mo || qs("#exportModule")?.value || "all";
  var csv = "";
  var esc = function (v) {
    return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  };

  if (m === "all" || m === "inventory") {
    csv +=
      "Product Type,Brand,Model,Grade,Size,SKU,Purchase Price,Selling Price,Stock,Min Stock\n";
    getAllVariantsFlat().forEach(function (v) {
      csv +=
        esc(v.productType) + "," + esc(v.brand) + "," + esc(v.model) + "," +
        esc(v.grade) + "," + esc(v.size) + "," + esc(v.sku) + "," +
        v.purchasePrice + "," + v.sellingPrice + "," + v.stock + "," + v.minStock + "\n";
    });
  }
  if (m === "all" || m === "tokens") {
    if (csv) csv += "\n";
    // FIXED: Service Price / Discount / Products JSON / Service Breakdown JSON
    // columns added — these were completely missing before, so re-importing
    // a tokens CSV always lost every price (servicePrice ended up 0 and the
    // products list ended up empty, which is why revenue looked wrong after
    // import even though the saved invoice still had the right price).
    csv +=
      "Token,Vehicle No,Type,Customer,Contact,Service,Service Price,Discount,Status,Time,Business Prefix,Business Name,Products JSON,Service Breakdown JSON\n";
    STATE.tokens.forEach(function (t) {
      csv +=
        esc(t.number) + "," + esc(t.vehicleNo) + "," + esc(t.vehicleType) + "," +
        esc(t.ownerName) + "," + esc(t.contactNumber) + "," + esc(t.service) + "," +
        (t.servicePrice || 0) + "," + (t.discount || 0) + "," +
        esc(t.status) + "," + esc(t.time) + "," + esc(t.businessPrefix || "") + "," +
        esc(t.businessName || "") + "," + esc(JSON.stringify(t.products || [])) + "," +
        esc(JSON.stringify(t.serviceBreakdown || [])) + "\n";
    });
  }
  if (m === "all" || m === "vehicles") {
    if (csv) csv += "\n";
    csv += "Vehicle No,Owner,Contact,Type,Visits,Last Service\n";
    STATE.vehicles.forEach(function (v) {
      csv +=
        esc(v.vehicleNo) + "," + esc(v.owner) + "," + esc(v.contact) + "," +
        esc(v.type) + "," + (v.visits || 0) + "," + esc(v.lastService || "") + "\n";
    });
  }
  if (m === "all" || m === "expenses") {
    if (csv) csv += "\n";
    csv += "Title,Category,Amount,Date,Time\n";
    STATE.expenses.forEach(function (e) {
      csv +=
        esc(e.title) + "," + esc(e.category) + "," + (e.amount || 0) + "," +
        esc(e.date) + "," + esc(e.time) + "\n";
    });
  }
  if (m === "all" || m === "reminders") {
    if (csv) csv += "\n";
    csv +=
      "Token ID,Customer,Phone,Vehicle,Vehicle Type,Service,Service Date,Due Date,Days,Status\n";
    STATE.reminders.forEach(function (r) {
      csv +=
        esc(r.tokenId) + "," + esc(r.customerName) + "," + esc(r.phone) + "," +
        esc(r.vehicleNo) + "," + esc(r.vehicleType) + "," + esc(r.service) + "," +
        esc(r.serviceDate) + "," + esc(r.dueDate) + "," + (r.reminderDays || 30) + "," +
        esc(r.status) + "\n";
    });
  }
  if (m === "all" || m === "invoices") {
    if (csv) csv += "\n";
    // FIXED: added "Items JSON" so the exact line items (with price/qty)
    // come back on import instead of being lost (the old "Items Summary"
    // was text-only and could never be parsed back into real data).
    csv +=
      "Invoice #,Date,Time,Token,Vehicle,Customer,Contact,Items Summary,Items JSON,Subtotal,Discount,Tax,Total,Cash Received,Change,Status,Business Prefix,Business Name\n";
    STATE.invoices.forEach(function (inv) {
      var itemsSummary = (inv.items || [])
        .map(function (it) { return it.name + " x" + it.qty; })
        .join(" | ");
      csv +=
        esc(inv.number) + "," + esc(inv.date) + "," + esc(inv.time) + "," +
        esc(inv.token || "") + "," + esc(inv.vehicle || "") + "," + esc(inv.customer) + "," +
        esc(inv.contactNumber || "") + "," + esc(itemsSummary) + "," +
        esc(JSON.stringify(inv.items || [])) + "," +
        (inv.subtotal || 0) + "," + (inv.discount || 0) + "," + (inv.tax || 0) + "," +
        (inv.total || 0) + "," + (inv.cashReceived || 0) + "," + (inv.changeReturned || 0) + "," +
        esc(inv.status) + "," + esc(inv.businessPrefix || "") + "," + esc(inv.businessName || "") + "\n";
    });
  }
  if (m === "all" || m === "productSales") {
    if (csv) csv += "\n";
    // FIXED: added "Items JSON" so product-sale line items (with price/qty)
    // survive a CSV round-trip instead of coming back empty.
    csv += "Date,Time,Customer,Vehicle,Items Summary,Items JSON,Discount,Total\n";
    STATE.productSales.forEach(function (s) {
      var itemsSummary = (s.items || [])
        .map(function (it) { return it.fullName + " x" + it.qty; })
        .join(" | ");
      csv +=
        esc(s.date) + "," + esc(s.time) + "," + esc(s.customer) + "," +
        esc(s.vehicleNo || "") + "," + esc(itemsSummary) + "," +
        esc(JSON.stringify(s.items || [])) + "," + (s.discount || 0) + "," +
        (s.total || 0) + "\n";
    });
  }
  if (m === "all" || m === "pricingMatrix") {
    if (csv) csv += "\n";
    csv += "key,price\n";
    Object.keys(STATE.pricingMatrix).forEach(function (k) {
      csv += esc(k) + "," + STATE.pricingMatrix[k] + "\n";
    });
  }
  // NEW: vendors / vendor payments / purchase orders were entirely missing
  // from CSV export before — this is a big reason vendor totals and net
  // profit looked wrong after any restore.
  if (m === "all" || m === "vendors") {
    if (csv) csv += "\n";
    csv +=
      "Company,Contact Person,Phone,Email,Address,Category,Status,Date Added,Total Purchases,Purchases JSON\n";
    STATE.vendors.forEach(function (v) {
      csv +=
        esc(v.company) + "," + esc(v.contactPerson) + "," + esc(v.phone) + "," +
        esc(v.email || "") + "," + esc(v.address || "") + "," + esc(v.category) + "," +
        esc(v.status) + "," + esc(v.dateAdded || "") + "," + (v.totalPurchases || 0) + "," +
        esc(JSON.stringify(v.purchases || [])) + "\n";
    });
  }
  if (m === "all" || m === "vendorPayments") {
    if (csv) csv += "\n";
    csv += "Vendor Id,Amount,Date,Method,Notes\n";
    STATE.vendorPayments.forEach(function (p) {
      csv +=
        esc(p.vendorId) + "," + (p.amount || 0) + "," + esc(p.date) + "," +
        esc(p.method) + "," + esc(p.notes || "") + "\n";
    });
  }
  if (m === "all" || m === "purchaseOrders") {
    if (csv) csv += "\n";
    csv += "Vendor Id,Description,Qty,Amount,Date\n";
    STATE.purchaseOrders.forEach(function (po) {
      csv +=
        esc(po.vendorId) + "," + esc(po.description) + "," + (po.qty || 1) + "," +
        (po.amount || 0) + "," + esc(po.date) + "\n";
    });
  }

  if (!csv) {
    toast("No data to export for this module", "warning");
    return;
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
            // FIXED: this used to restore only 6 of the ~17 data
            // collections — productSales, pricingMatrix, brands,
            // categories, pricingVehicles, pricingServices, counters,
            // businesses, vendors, vendorPayments and purchaseOrders were
            // silently skipped, which is why a Quick Restore never brought
            // back vendor totals, revenue, or net profit correctly.
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
            if (d.counters) {
              STATE.counters = d.counters;
              saveCounters();
            }
            if (d.businesses) {
              saveBusinesses(d.businesses);
            }
            if (d.vendors) {
              STATE.vendors = d.vendors;
              saveVendors();
            }
            if (d.vendorPayments) {
              STATE.vendorPayments = d.vendorPayments;
              saveVendorPayments();
            }
            if (d.purchaseOrders) {
              STATE.purchaseOrders = d.purchaseOrders;
              savePurchaseOrders();
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
// ============================================================
// NEW (ADDED ONLY) — quote-aware CSV line parser. The previous
// parser did a plain line.split(","), which breaks any field
// that itself contains a comma (e.g. an address like
// "Main Road, City", or a token's Service list like
// "Full Body Wash, Wax"). This parser respects quoted fields
// and escaped quotes ("") so CSV import round-trips correctly
// with the values exportCSV() produces.
// ============================================================
function parseCSVLine(line) {
  var result = [],
    cur = "",
    inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  result.push(cur);
  return result;
}

function importFile() {
  var m = qs("#importModule")?.value || "inventory";
  var fmt = qs("#importFormat")?.value || "json";
  // FIXED: "All Data" and "Services" are bundled objects (multiple
  // collections inside one object), not flat row lists — CSV cannot
  // represent that. Previously this just returned early with a toast,
  // which meant clicking "Select File & Import" appeared to do nothing
  // (file explorer never opened) whenever CSV was picked while the
  // module was still on its default "All Data". Now we auto-correct the
  // Format dropdown to JSON and continue, so the file picker always opens.
  if ((m === "all" || m === "services") && fmt !== "json") {
    fmt = "json";
    var fmtSelectEl = qs("#importFormat");
    if (fmtSelectEl) fmtSelectEl.value = "json";
    toast(
      "'" + (m === "all" ? "All Data" : "Services") + "' import needs a JSON file — File Format switched to JSON.",
      "info",
    );
  }
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
          if (m === "all" || m === "services") {
            // FIXED: previously only "all" took this path — "services" was
            // being flattened by the generic `d[m] || d.inventory || []`
            // logic below, which always resolved to an empty array because
            // a services export has no top-level "services" or "inventory"
            // key. That's why importing Services always restored nothing.
            previewImport(m, d);
            return;
          }
          if (!Array.isArray(d)) d = d[m] || d.inventory || [];
        } else {
          // FIXED: quote-aware CSV parsing (handles commas inside fields,
          // e.g. addresses or multi-service lists) instead of a naive split(",")
          var rawLines = ev.target.result.split(/\r?\n/).filter(function (l) {
            return l.trim();
          });
          if (rawLines.length < 2) {
            toast("CSV file has no data rows", "warning");
            return;
          }
          var headers = parseCSVLine(rawLines[0]).map(function (h) {
            return h.trim();
          });
          d = [];
          for (var i = 1; i < rawLines.length; i++) {
            var vals = parseCSVLine(rawLines[i]);
            var obj = {};
            headers.forEach(function (h, idx) {
              obj[h] = (vals[idx] || "").trim();
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
  var el = qs("#importPreviewContent");

  // "all" and "services" are bundled objects holding several collections
  // (tokens, invoices, vendors, pricingServices, ...), not a flat list of
  // rows — keep them exactly as-is instead of wrapping in an array.
  if (m === "all" || m === "services") {
    STATE.pendingImport = { module: m, data: d };
    var totalRecords = 0;
    Object.keys(d || {}).forEach(function (k) {
      if (Array.isArray(d[k])) totalRecords += d[k].length;
    });
    setText("#importAddCount", totalRecords);
    setText("#importUpdateCount", 0);
    setText("#importSkipCount", 0);
    if (el) {
      var h2 =
        '<table class="import-preview-table"><thead><tr><th>Data</th><th>Details</th></tr></thead><tbody>';
      Object.keys(d || {}).forEach(function (k) {
        if (k === "version") return;
        var val = d[k];
        var detail;
        if (Array.isArray(val)) detail = val.length + " records";
        else if (val && typeof val === "object")
          detail = Object.keys(val).length + " entries";
        else if (val !== undefined && val !== null && val !== "")
          detail = "Included";
        else detail = "—";
        h2 += "<tr><td>" + sanitize(k) + "</td><td>" + detail + "</td></tr>";
      });
      h2 += "</tbody></table>";
      el.innerHTML = h2;
    }
    qs("#importPreview").style.display = "block";
    openModal("importPreviewModal");
    return;
  }

  if (!Array.isArray(d)) d = [d];
  setText("#importAddCount", d.length);
  setText("#importUpdateCount", 0);
  setText("#importSkipCount", 0);
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
  } else if (el) {
    el.innerHTML = "<p>No records found in this file.</p>";
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
        // NEW: vendors / vendor payments / purchase orders were previously
        // not restored at all by "All Data" import, so vendor totals, net
        // profit, etc always stayed wrong after a restore.
        if (d.vendors) {
          STATE.vendors = d.vendors;
          saveVendors();
        }
        if (d.vendorPayments) {
          STATE.vendorPayments = d.vendorPayments;
          saveVendorPayments();
        }
        if (d.purchaseOrders) {
          STATE.purchaseOrders = d.purchaseOrders;
          savePurchaseOrders();
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
    // NEW GUARD (bug fix — "200+ empty tokens on import"): a CSV/JSON file
    // that was opened and re-saved in Excel commonly gets dozens/hundreds
    // of trailing blank rows appended (just commas, no real data). The
    // import loop below used to push EVERY row into STATE.tokens with no
    // check at all, so each of those blank rows became a real token with
    // only an auto-generated Token Number and nothing else — exactly the
    // "200+ empty tokens" symptom. This guard skips a row ONLY if it has
    // no vehicle number, no customer name, AND no service — i.e. it is
    // genuinely empty junk. Any row with at least one of those three
    // fields filled in still imports exactly as before; no valid token
    // (old or new) is affected, and no other logic changes.
    var skippedBlankTokenRows = 0;
    d.forEach(function (item) {
      var _vehicleNo = (item["Vehicle No"] || item.vehicleNo || "").toString().trim();
      var _ownerName = (item["Customer"] || item.ownerName || "").toString().trim();
      var _service = (item["Service"] || item.service || "").toString().trim();
      var _tokenNum = (item["Token"] || item.number || "").toString().trim();
      if (!_vehicleNo && !_ownerName && !_service && !_tokenNum) {
        skippedBlankTokenRows++;
        return;
      }
      // FIXED: previously servicePrice was hardcoded to 0, products to [],
      // and status was forced to "waiting" on every import — so even a
      // token that was "completed" with a real price stopped counting
      // toward revenue/net profit after import. Now we read the real
      // values back from JSON (item.servicePrice/products/...) or, for a
      // CSV export, from the "Service Price"/"Discount"/"Products JSON"/
      // "Service Breakdown JSON" columns.
      var products = [];
      if (Array.isArray(item.products)) {
        products = item.products;
      } else if (item["Products JSON"]) {
        try {
          products = JSON.parse(item["Products JSON"]) || [];
        } catch (e) {
          products = [];
        }
      }
      var serviceBreakdown = [];
      if (Array.isArray(item.serviceBreakdown)) {
        serviceBreakdown = item.serviceBreakdown;
      } else if (item["Service Breakdown JSON"]) {
        try {
          serviceBreakdown = JSON.parse(item["Service Breakdown JSON"]) || [];
        } catch (e) {
          serviceBreakdown = [];
        }
      }
      var servicePrice = parseFloat(
        item.servicePrice !== undefined ? item.servicePrice : item["Service Price"],
      );
      if (isNaN(servicePrice)) servicePrice = 0;
      var discount = parseFloat(
        item.discount !== undefined ? item.discount : item["Discount"],
      );
      if (isNaN(discount)) discount = 0;

      STATE.tokens.push({
        id: uid(),
        number: item["Token"] || item.number || generateTokenNumber(),
        vehicleNo: item["Vehicle No"] || item.vehicleNo || "",
        vehicleType: item["Type"] || item.vehicleType || "",
        ownerName: item["Customer"] || item.ownerName || "",
        contactNumber: item["Contact"] || item.contactNumber || "",
        service: item["Service"] || item.service || "",
        servicePrice: servicePrice,
        discount: discount,
        serviceBreakdown: serviceBreakdown,
        products: products,
        time: item["Time"] || item.time || fmtTime(),
        status: item["Status"] || item.status || "waiting",
        businessPrefix: item["Business Prefix"] || item.businessPrefix || getCurrentBusinessPrefix(),
        businessId: item.businessId || "",
        businessName: item["Business Name"] || item.businessName || "",
        isCustom: item.isCustom || false,
      });
    });
    saveTokens();
    if (skippedBlankTokenRows > 0) {
      toast(skippedBlankTokenRows + " blank/junk row(s) skipped during import", "info");
    }
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
      // FIXED: item.items was always undefined for a CSV row (CSV only had
      // a text "Items Summary"), so every CSV-imported invoice ended up
      // with an empty line-item list. Now falls back to the new "Items
      // JSON" column.
      var invItems = [];
      if (Array.isArray(item.items)) {
        invItems = item.items;
      } else if (item["Items JSON"]) {
        try {
          invItems = JSON.parse(item["Items JSON"]) || [];
        } catch (e) {
          invItems = [];
        }
      }
      STATE.invoices.push({
        id: uid(),
        number: item["Invoice #"] || item.number || "INV-001",
        date: item["Date"] || item.date || fmtDate(),
        time: item["Time"] || item.time || fmtTime(),
        token: item["Token"] || item.token || "",
        vehicle: item["Vehicle"] || item.vehicle || "",
        customer: item["Customer"] || item.customer || "",
        contactNumber: item["Contact"] || item.contactNumber || "",
        items: invItems,
        subtotal: parseFloat(item["Subtotal"] || item.subtotal || 0),
        discount: parseFloat(item["Discount"] || item.discount || 0),
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
      var saleItems = [];
      if (Array.isArray(item.items)) {
        saleItems = item.items;
      } else if (item["Items JSON"]) {
        try {
          saleItems = JSON.parse(item["Items JSON"]) || [];
        } catch (e) {
          saleItems = [];
        }
      }
      STATE.productSales.push({
        id: uid(),
        customer: item["Customer"] || item.customer || "",
        vehicleNo: item["Vehicle"] || item.vehicleNo || "",
        items: saleItems,
        discount: parseFloat(item["Discount"] || item.discount || 0),
        total: parseFloat(item["Total"] || item.total || 0),
        date: item["Date"] || item.date || fmtDate(),
        time: item["Time"] || item.time || fmtTime(),
      });
    });
    saveProductSales();
  }
  if (m === "vendors") {
    // NEW: vendors were not importable at all before.
    d.forEach(function (item) {
      var purchases = [];
      if (Array.isArray(item.purchases)) {
        purchases = item.purchases;
      } else if (item["Purchases JSON"]) {
        try {
          purchases = JSON.parse(item["Purchases JSON"]) || [];
        } catch (e) {
          purchases = [];
        }
      }
      STATE.vendors.push({
        id: item.id || uid(),
        company: item["Company"] || item.company || "",
        contactPerson: item["Contact Person"] || item.contactPerson || "",
        phone: item["Phone"] || item.phone || "",
        email: item["Email"] || item.email || "",
        address: item["Address"] || item.address || "",
        category: item["Category"] || item.category || "General Supplier",
        status: item["Status"] || item.status || "Active",
        dateAdded: item["Date Added"] || item.dateAdded || fmtDate(),
        purchases: purchases,
        totalPurchases: parseFloat(item["Total Purchases"] || item.totalPurchases || 0),
      });
    });
    saveVendors();
  }
  if (m === "vendorPayments") {
    // NEW: vendor payments were not importable at all before. These feed
    // directly into the Vendor Payments / Net Profit dashboard totals.
    d.forEach(function (item) {
      STATE.vendorPayments.push({
        id: item.id || uid(),
        vendorId: item["Vendor Id"] || item.vendorId || "",
        amount: parseFloat(item["Amount"] || item.amount || 0),
        date: item["Date"] || item.date || fmtDate(),
        method: item["Method"] || item.method || "Cash",
        notes: item["Notes"] || item.notes || "",
      });
    });
    saveVendorPayments();
  }
  if (m === "purchaseOrders") {
    // NEW: purchase orders were not importable at all before.
    d.forEach(function (item) {
      STATE.purchaseOrders.push({
        id: item.id || uid(),
        vendorId: item["Vendor Id"] || item.vendorId || "",
        description: item["Description"] || item.description || "",
        qty: parseInt(item["Qty"] || item.qty || 1),
        amount: parseFloat(item["Amount"] || item.amount || 0),
        date: item["Date"] || item.date || fmtDate(),
      });
    });
    savePurchaseOrders();
  }
  if (m === "pricingMatrix") {
    if (Array.isArray(d)) {
      d.forEach(function (item) {
        // FIXED: CSV/JSON values arrive as strings — must parseFloat before
        // storing, otherwise price comparisons (price > 0) elsewhere break.
        var pr = parseFloat(item.price);
        if (item.key && !isNaN(pr) && pr > 0) STATE.pricingMatrix[item.key] = pr;
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
  toast((Array.isArray(d) ? d.length : "Services") + (Array.isArray(d) ? " records imported!" : " data imported!"), "success");
  renderInventoryTable();
  renderTokenTable();
  renderSavedInvoices();
  renderVehicleTable();
  renderExpenses();
  renderReminderTable();
  renderPricingMatrix();
  renderVendorTable();
  renderVendorKPIs();
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
        // Safety net: always save a full snapshot BEFORE wiping anything,
        // and WAIT for it to finish saving, so this is always recoverable
        // from Import/Export → Emergency Restore, no matter what.
        runAutoBackupNow(true, "pre-clear-safety").then(function () {
          Object.values(KEYS).forEach(function (k) {
            localStorage.removeItem(k);
          });
          sessionStorage.removeItem("servicepro_logged_in");
          sessionStorage.removeItem("servicepro_last_activity");
          toast(
            "Safety backup saved. You can undo this from Import/Export → Emergency Restore.",
            "info",
          );
          setTimeout(function () {
            location.reload();
          }, 1800);
        });
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

// ==================== VENDORS ====================
function initVendors() {
  qs("#addVendorBtn")?.addEventListener("click", function() { openVendorModal(); });
  qs("#saveVendorBtn")?.addEventListener("click", saveVendor);
  qs("#vendorPaymentsBtn")?.addEventListener("click", function() { openPaymentModal(); });
  qs("#savePaymentBtn")?.addEventListener("click", savePayment);
  qs("#vendorSearch")?.addEventListener("input", renderVendorTable);
  qs("#vendorCategoryFilter")?.addEventListener("change", renderVendorTable);
  if (qs("#paymentDate")) qs("#paymentDate").value = toDateInputValue(new Date());

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
  openModal("vendorCategoryModal");

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
  '<div class="ftr">Thank You!<br>' + sanitize(biz.name) + ' | ' + sanitize(biz.phone) + '<br>Developed by Design Orbits | 0322-5267908</div>' +
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
  qs("#vendorPurchasesContainer").innerHTML = "";
  if (d && d.purchases) {
    d.purchases.forEach(function(p) { addVendorPurchaseRow(p); });
  }
  // NEW: modal title now reflects Add vs Edit
  var titleEl = qs("#vendorModal .modal-title");
  if (titleEl) titleEl.innerHTML = '<span class="material-icons">business</span> ' + (d ? "Edit Vendor" : "Add Vendor");
  openModal("vendorModal");
}

// NEW: opens a vendor for editing (details + purchase items/prices)
function editVendor(vid) {
  var v = STATE.vendors.find(function (v) { return v.id === vid; });
  if (!v) { toast("Vendor not found", "error"); return; }
  openVendorModal(v);
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

  var editId = qs("#vendorEditId")?.value || "";
  if (editId) {
    var v = STATE.vendors.find(function(v) { return v.id === editId; });
    if (v) {
      v.company = company;
      v.contactPerson = contact;
      v.phone = phone;
      v.email = (qs("#vendorEmail")?.value || "").trim();
      v.address = (qs("#vendorAddress")?.value || "").trim();
      v.category = qs("#vendorCategory")?.value || "General Supplier";
      v.status = qs("#vendorStatus")?.value || "Active";
      // FIXED: previously the modal let you edit purchase items/qty/price
      // but saveVendor() never wrote those changes back — v.purchases and
      // v.totalPurchases were left completely untouched, so any item/price
      // edit silently had no effect. Now both are updated from the form.
      v.purchases = purchases;
      v.totalPurchases = totalPurchases;
    }
    saveVendors();
    closeModal("vendorModal");
    renderVendorTable();
    renderVendorKPIs();
    toast("Vendor updated", "success");
    return;
  }

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
    notes: (qs("#paymentNotes")?.value || "").trim(),
    createdAt: Date.now()
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

  var existing = qs("#vendorViewModal");
  if (existing) existing.remove();
  var modalHTML = '<div class="modal-overlay" id="vendorViewModal"><div class="modal"><div class="modal-header"><h2 class="modal-title"><span class="material-icons">business</span> ' + sanitize(v.company) + '</h2><button class="modal-close" onclick="document.getElementById(\'vendorViewModal\').remove();document.body.style.overflow=\'\';"><span class="material-icons">close</span></button></div><div class="modal-body"><div class="kpi-grid kpi-grid--3"><div class="kpi-card"><div class="kpi-body"><span class="kpi-label">Total Purchases</span><span class="kpi-value">' + fmtPrice(v.totalPurchases || 0) + '</span></div></div><div class="kpi-card"><div class="kpi-body"><span class="kpi-label">Total Paid</span><span class="kpi-value">' + fmtPrice(paid) + '</span></div></div><div class="kpi-card"><div class="kpi-body"><span class="kpi-label">Balance</span><span class="kpi-value" style="color:' + (balance > 0 ? 'var(--danger)' : 'var(--success)') + '">' + fmtPrice(balance) + '</span></div></div></div><div class="invoice-section-label">Payment History</div><table class="data-table"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Notes</th><th>Print</th></tr></thead><tbody>' + paymentHistory + '</tbody></table><div style="display:flex;gap:8px;margin-top:1rem"><button class="btn btn-primary" onclick="openPaymentModal(\'' + v.id + '\');document.getElementById(\'vendorViewModal\').remove()">Add Payment</button><button class="btn btn-outline" onclick="document.getElementById(\'vendorViewModal\').remove();editVendor(\'' + v.id + '\')"><span class="material-icons" style="font-size:16px;vertical-align:middle;">edit</span> Edit Vendor</button></div></div></div></div>';
  document.body.insertAdjacentHTML("beforeend", modalHTML);
  openModal("vendorViewModal");
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
  setText("#vendorTotalPaidKpi", fmtPrice(totalPaid));
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
    return '<tr><td style="font-weight:600">' + sanitize(v.company) + '</td><td>' + sanitize(v.contactPerson) + '</td><td>' + sanitize(v.phone) + '</td><td><span class="badge badge--blue">' + sanitize(v.category) + '</span></td><td>' + fmtPrice(v.totalPurchases || 0) + '</td><td>' + fmtPrice(paid) + '</td><td style="color:' + (balance > 0 ? 'var(--danger)' : 'var(--success)') + ';font-weight:700">' + fmtPrice(balance) + '</td><td><span class="badge ' + (v.status === 'Active' ? 'badge--green' : 'badge--red') + '">' + v.status + '</span></td><td><div class="table-actions"><button class="btn btn-sm btn-outline" onclick="viewVendor(\'' + v.id + '\')">View</button><button class="btn btn-sm btn-ghost" onclick="editVendor(\'' + v.id + '\')" title="Edit Vendor"><span class="material-icons" style="font-size:16px;">edit</span></button><button class="btn btn-sm btn-ghost" onclick="openPurchaseModal(\'' + v.id + '\')">+Purchase</button></div></td></tr>';
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

function openPurchaseModal(vendorId) {
  var existing = qs("#purchaseModal");
  if (existing) existing.remove();

  var sel = '<option value="">Select Vendor</option>';
  STATE.vendors.forEach(function(v) {
    var sel2 = v.id === vendorId ? " selected" : "";
    sel += '<option value="' + v.id + '"' + sel2 + '>' + sanitize(v.company) + '</option>';
  });

  var h = '<div class="modal-overlay" id="purchaseModal"><div class="modal"><div class="modal-header"><h2 class="modal-title"><span class="material-icons">shopping_cart</span> Add Purchase</h2><button class="modal-close" onclick="document.getElementById(\'purchaseModal\').remove();document.body.style.overflow=\'\';"><span class="material-icons">close</span></button></div><div class="modal-body"><div class="form-group"><label class="form-label">Vendor <span class="required">*</span></label><select class="form-input" id="purchaseVendor">' + sel + '</select></div><div class="form-group"><label class="form-label">Description <span class="required">*</span></label><input type="text" class="form-input" id="purchaseDesc" placeholder="e.g. Engine Oil 20W-50" /></div><div class="form-row"><div class="form-group"><label class="form-label">Qty</label><input type="number" class="form-input" id="purchaseQty" value="1" min="1" /></div><div class="form-group"><label class="form-label">Amount <span class="required">*</span></label><input type="number" class="form-input" id="purchaseAmount" min="0" /></div></div><div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="purchaseDate" /></div></div><div class="modal-footer"><button class="btn btn-ghost" onclick="document.getElementById(\'purchaseModal\').remove();document.body.style.overflow=\'\';">Cancel</button><button class="btn btn-primary" id="savePurchaseBtn">Save Purchase</button></div></div></div>';

  document.body.insertAdjacentHTML("beforeend", h);
  openModal("purchaseModal");
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

    closeModal("purchaseModal");
    var pm = document.getElementById("purchaseModal");
    if (pm) pm.remove();
    renderVendorTable();
    renderVendorKPIs();
    toast("Purchase added: " + fmtPrice(amt), "success");
  });
}

// ============================================================
// TOKEN TOTAL — HARDENED
// ============================================================
function updateTokenTotal() {
  var t = 0;
  
  qsa("#tokenServicesList > div").forEach(function (row, idx) {
    var sel = row.querySelector(".token-service-select");
    var priceInput = row.querySelector(".token-service-price");
    if (sel && sel.value && priceInput) {
      var rawVal = priceInput.valueAsNumber || parseFloat(priceInput.value);
      var val = isNaN(rawVal) ? 0 : rawVal;
      t += val;
      console.log("[Token Svc Row " + idx + "]", sel.value, "price:", val);
    }
  });
  
  qsa("#tokenProductsList > div").forEach(function (row, idx) {
    var sel = row.querySelector(".token-product-select");
    var qtyInput = row.querySelector(".token-product-qty");
    var priceInput = row.querySelector(".token-product-price");
    if (sel && sel.value && qtyInput && priceInput) {
      var rawQty = parseInt(qtyInput.value);
      var qty = isNaN(rawQty) ? 0 : rawQty;
      
      var rawPrice = priceInput.valueAsNumber || parseFloat(priceInput.value);
      var price = isNaN(rawPrice) ? 0 : rawPrice;
      
      t += qty * price;
      console.log("[Token Prd Row " + idx + "]", "qty:", qty, "price:", price, "subtotal:", qty * price);
    }
  });
  
  var discount = parseNum(qs("#tokenDiscount")?.value, 0);
  
  var grand = Math.max(0, t - discount);
  console.log("[Token Total] Services+Products:", t, "Discount:", discount, "Grand:", grand);
  setText("#tokenGrandTotal", fmtPrice(grand));
  return grand;
}
function updateCustomTokenTotal() {
  var t = 0;
  
  qsa("#customTokenServicesList > div").forEach(function (row, idx) {
    var sel = row.querySelector(".custom-svc-select");
    var name = row.querySelector(".custom-svc-name");
    var priceInput = row.querySelector(".custom-svc-price");
    
    // ✅ FIX: Only count if service is actually selected
    var hasService = false;
    if (sel && sel.value && sel.value !== "__custom__") {
      hasService = true;
    } else if (sel && sel.value === "__custom__" && name && name.style.display !== "none" && name.value.trim()) {
      hasService = true;
    }
    
    if (!hasService) {
      console.log("[Custom Svc Row " + idx + "]", "SKIPPED — no service selected");
      return;
    }
    
    var rawVal = priceInput ? (priceInput.valueAsNumber || parseFloat(priceInput.value)) : NaN;
    var val = isNaN(rawVal) ? 0 : rawVal;
    t += val;
    console.log("[Custom Svc Row " + idx + "]", "price:", val);
  });
  
  qsa("#customTokenProductsList > div").forEach(function (row, idx) {
    var sel = row.querySelector(".custom-prd-select");
    var name = row.querySelector(".custom-prd-name");
    var qtyInput = row.querySelector(".custom-prd-qty");
    var priceInput = row.querySelector(".custom-prd-price");
    
    // ✅ FIX: Only count if product is actually selected
    var hasProduct = false;
    if (sel && sel.value && sel.value !== "__custom__") {
      hasProduct = true;
    } else if (sel && sel.value === "__custom__" && name && name.style.display !== "none" && name.value.trim()) {
      hasProduct = true;
    }
    
    if (!hasProduct) {
      console.log("[Custom Prd Row " + idx + "]", "SKIPPED — no product selected");
      return;
    }
    
    var rawQty = qtyInput ? parseInt(qtyInput.value) : NaN;
    var qty = isNaN(rawQty) ? 0 : rawQty;
    
    var rawPrice = priceInput ? (priceInput.valueAsNumber || parseFloat(priceInput.value)) : NaN;
    var price = isNaN(rawPrice) ? 0 : rawPrice;
    
    t += qty * price;
    console.log("[Custom Prd Row " + idx + "]", "qty:", qty, "price:", price, "subtotal:", qty * price);
  });
  
  var discount = parseNum(qs("#tokenDiscount")?.value, 0);
  
  var grand = Math.max(0, t - discount);
  console.log("[Custom Total] Subtotal:", t, "Discount:", discount, "Grand:", grand);
  setText("#tokenGrandTotal", fmtPrice(grand));
  return grand;
}

function recomputeTokenTotal() {
  var customSection = document.getElementById("customTokenServicesSection");
  var isCustom = customSection && customSection.style.display !== "none";
  if (isCustom) {
    updateCustomTokenTotal();
  } else {
    updateTokenTotal();
  }
}

function addTokenServiceRow(svcName, svcPrice, keepPrice) {
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
  if (svcName && vt && !keepPrice) {
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
// NEW: variants ko naam ke hisab se A to Z sort karta hai (case ignore)
function sortVariantsAlpha(list) {
  return list.slice().sort(function (a, b) {
    return (a.fullName || "").toLowerCase().localeCompare((b.fullName || "").toLowerCase());
  });
}
function addTokenProduct() {
  var c = qs("#tokenProductsList");
  if (!c) return;
  var variantsList = sortVariantsAlpha(getAllVariantsFlat().filter(function (v) { return v.stock > 0; }));

  var r = document.createElement("div");
  r.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
  r.innerHTML =
    '<div class="tp-picker" style="flex:1;position:relative;">' +
      '<input type="text" class="form-input tp-search" placeholder="Search product..." autocomplete="off" style="width:100%;padding:6px 4px;font-size:0.72rem;" />' +
      '<select class="token-product-select" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;"><option value="">Select variant</option></select>' +
      '<div class="tp-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:4px;max-height:220px;overflow-y:auto;z-index:2000;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>' +
    '</div>' +
    '<input type="number" class="form-input token-product-qty" value="1" min="1" style="width:50px;padding:6px 2px;font-size:0.78rem;text-align:center;" />' +
    '<input type="number" class="form-input token-product-price" value="0" readonly style="width:70px;padding:6px 2px;font-size:0.78rem;background:var(--surface-active);text-align:right;" />' +
    '<button type="button" class="btn-icon btn btn-danger-ghost"><span class="material-icons">close</span></button>';
  c.appendChild(r);

  var searchInput = r.querySelector(".tp-search");
  var dropdown = r.querySelector(".tp-dropdown");
  var selectEl = r.querySelector(".token-product-select");
  var qtyInput = r.querySelector(".token-product-qty");
  var priceInput = r.querySelector(".token-product-price");

  function renderDropdown(filterText) {
    var ft = (filterText || "").trim().toLowerCase();
    var filtered = !ft
      ? variantsList
      : variantsList.filter(function (v) { return v.fullName.toLowerCase().includes(ft); });
    if (!filtered.length) {
      dropdown.innerHTML = '<div style="padding:8px;font-size:0.72rem;color:var(--text-muted);">No match found</div>';
    } else {
      dropdown.innerHTML = filtered.map(function (v) {
        return (
          '<div class="tp-option" data-vid="' + v.id + '" data-price="' + v.sellingPrice +
          '" data-stock="' + v.stock + '" data-name="' + sanitize(v.fullName) +
          '" style="padding:7px 8px;cursor:pointer;font-size:0.72rem;border-bottom:1px solid var(--border);">' +
          sanitize(v.fullName) + " | Stock: " + v.stock + " | " + fmtPrice(v.sellingPrice) +
          "</div>"
        );
      }).join("");
    }
    dropdown.style.display = "block";
  }

  searchInput.addEventListener("focus", function () { renderDropdown(this.value); });
  searchInput.addEventListener("click", function () { renderDropdown(this.value); });
  searchInput.addEventListener("input", function () { renderDropdown(this.value); });

  dropdown.addEventListener("mousedown", function (e) {
    var opt = e.target.closest(".tp-option");
    if (!opt) return;
    e.preventDefault();
    selectEl.innerHTML = '<option value="' + opt.dataset.vid + '" selected>' + opt.dataset.name + "</option>";
    selectEl.value = opt.dataset.vid;
    searchInput.value = opt.dataset.name;
    priceInput.value = parseFloat(opt.dataset.price) || 0;
    qtyInput.max = parseInt(opt.dataset.stock) || 0;
    dropdown.style.display = "none";
    recomputeTokenTotal();
  });

  document.addEventListener("click", function (e) {
    if (!r.contains(e.target)) dropdown.style.display = "none";
  });

  qtyInput.addEventListener("input", recomputeTokenTotal);
  r.querySelector("button").addEventListener("click", function () {
    r.remove();
    recomputeTokenTotal();
  });

  recomputeTokenTotal();
}
function addCustomServiceRow(nm, pr) {
  var c = qs("#customTokenServicesList");
  if (!c) return;
  // NEW: optional prefill (nm, pr) lets Edit Token load a previously
  // saved custom service back into the form. Calling addCustomServiceRow()
  // with no arguments (the "Add Service" button) behaves exactly as before.
  var isKnown = !!nm && STATE.pricingServices.some(function (s) { return s.name === nm; });
  var showCustom = !!nm && !isKnown;
  var opts = STATE.pricingServices.map(function(s) {
    var sel = isKnown && s.name === nm ? " selected" : "";
    return '<option value="' + s.name + '"' + sel + '>' + sanitize(s.name) + '</option>';
  }).join("");
  var r = document.createElement("div");
  r.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
  r.innerHTML = 
    '<select class="form-input custom-svc-select" style="flex:1;padding:6px 4px;font-size:0.72rem;' + (showCustom ? "display:none;" : "") + '"><option value="">Select</option>' + opts + 
    '<option value="__custom__"' + (showCustom ? " selected" : "") + '>Custom Service</option></select>' +
    '<input type="text" class="form-input custom-svc-name" placeholder="Service name" value="' + sanitize(showCustom ? nm : "") + '" style="' + (showCustom ? "" : "display:none;") + 'width:100px;padding:6px 4px;font-size:0.72rem" />' +
    '<input type="number" step="any" class="form-input custom-svc-price" placeholder="Price" value="' + (pr !== undefined && pr !== null ? pr : "") + '" style="width:80px;padding:6px 2px;font-size:0.78rem;text-align:right;" />' +
    '<button type="button" class="btn-icon btn btn-danger-ghost"><span class="material-icons">close</span></button>';
  c.appendChild(r);

  var selectEl = r.querySelector(".custom-svc-select");
  var nameEl = r.querySelector(".custom-svc-name");
  var priceEl = r.querySelector(".custom-svc-price");

  selectEl.addEventListener("change", function () {
    if (this.value === "__custom__") {
      this.style.display = "none";
      nameEl.style.display = "";
      nameEl.value = "";
      priceEl.value = "";
      nameEl.focus();
    } else if (this.value) {
      var vt = qs("#tokenVehicleType")?.value || "";
      var prc = vt ? getMatrixPrice(this.value, vt) : 0;
      // ✅ FIX: Direct assignment, no || ""
      priceEl.value = prc;
      if (prc === 0 && vt) {
        priceEl.style.background = "#fee2e2";
        priceEl.title = "⚠ No matrix price for: " + this.value + " × " + vt;
      } else {
        priceEl.style.background = "";
        priceEl.title = "";
      }
      nameEl.style.display = "none";
      nameEl.value = "";
    } else {
      priceEl.value = "";
      priceEl.style.background = "";
      priceEl.title = "";
    }
    recomputeTokenTotal();
  });

  nameEl.addEventListener("input", function () {
    recomputeTokenTotal();
  });
  priceEl.addEventListener("input", function() {
    console.log("[Custom Price Input]", this.value, "parsed:", this.valueAsNumber);
    recomputeTokenTotal();
  });
  priceEl.addEventListener("change", function() {
    console.log("[Custom Price Change]", this.value, "parsed:", this.valueAsNumber);
    recomputeTokenTotal();
  });
  
  r.querySelector("button").addEventListener("click", function () {
    r.remove();
    recomputeTokenTotal();
  });
}

function addCustomProductRow(nm, pr, qt, vid) {
  var c = qs("#customTokenProductsList");
  if (!c) return;

  // inventory products A to Z
  var av = getAllVariantsFlat().sort(function (a, b) {
    return (a.fullName || "").toLowerCase().localeCompare((b.fullName || "").toLowerCase());
  });
  var knownVariant = vid ? av.find(function (v) { return v.id === vid; }) : null;
  var showCustom = !!nm && !knownVariant;

  var r = document.createElement("div");
  r.style.cssText = "display:flex;align-items:center;gap:6px;margin-bottom:6px;";
  r.innerHTML =
    '<div class="tp-picker" style="flex:1;position:relative;">' +
      '<input type="text" class="form-input custom-prd-search" placeholder="Search product..." autocomplete="off" style="width:100%;padding:6px 4px;font-size:0.72rem;' + (showCustom ? "display:none;" : "") + '" />' +
      '<select class="custom-prd-select" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;"></select>' +
      '<div class="cp-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--border);border-radius:4px;max-height:220px;overflow-y:auto;z-index:2000;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>' +
    '</div>' +
    '<input type="text" class="form-input custom-prd-name" placeholder="Product name" style="' + (showCustom ? "" : "display:none;") + 'width:100px;padding:6px 4px;font-size:0.72rem" />' +
    '<input type="number" class="form-input custom-prd-qty" value="' + (qt || 1) + '" min="1" style="width:50px;padding:6px 2px;font-size:0.78rem;text-align:center;" />' +
    '<input type="number" step="any" class="form-input custom-prd-price" placeholder="Price" value="' + (pr !== undefined && pr !== null ? pr : "") + '" style="width:80px;padding:6px 2px;font-size:0.78rem;text-align:right;" />' +
    '<button type="button" class="btn-icon btn btn-danger-ghost"><span class="material-icons">close</span></button>';
  c.appendChild(r);

  var searchEl = r.querySelector(".custom-prd-search");
  var selectEl = r.querySelector(".custom-prd-select");
  var dropdown = r.querySelector(".cp-dropdown");
  var nameEl = r.querySelector(".custom-prd-name");
  var qtyInput = r.querySelector(".custom-prd-qty");
  var priceEl = r.querySelector(".custom-prd-price");

  // hidden select hi asli value rakhta hai (save/total functions yahi padhte hain)
  function setSel(value, price, variantId) {
    selectEl.innerHTML = "";
    var o = document.createElement("option");
    o.value = value;
    o.textContent = value || "Select";
    if (price !== undefined && price !== null) o.dataset.price = price;
    if (variantId) o.dataset.vid = variantId;
    o.selected = true;
    selectEl.appendChild(o);
    selectEl.value = value;
  }

  if (knownVariant) {
    setSel(knownVariant.fullName, knownVariant.sellingPrice, knownVariant.id);
    searchEl.value = knownVariant.fullName;
  } else if (showCustom) {
    setSel("__custom__");
    nameEl.value = nm;
  } else {
    setSel("");
  }

  var shown = [];
  function renderDropdown(text) {
    var ft = (text || "").trim().toLowerCase();
    shown = !ft
      ? av.slice()
      : av.filter(function (v) { return v.fullName.toLowerCase().includes(ft); })
          .sort(function (a, b) {
            var as = a.fullName.toLowerCase().startsWith(ft) ? 0 : 1;
            var bs = b.fullName.toLowerCase().startsWith(ft) ? 0 : 1;
            return as - bs;
          });
    var h = shown.map(function (v, i) {
      var st = v.stock <= 0 ? " (OUT OF STOCK)" : " | Stock: " + v.stock;
      return '<div class="cp-option" data-i="' + i + '" style="padding:7px 8px;cursor:pointer;font-size:0.72rem;border-bottom:1px solid var(--border);">' +
        sanitize(v.fullName) + st + " | " + fmtPrice(v.sellingPrice) + "</div>";
    }).join("");
    if (!shown.length) h = '<div style="padding:8px;font-size:0.72rem;color:var(--text-muted);">No match found</div>';
    h += '<div class="cp-option" data-custom="1" style="padding:7px 8px;cursor:pointer;font-size:0.72rem;font-weight:700;color:var(--primary);">+ Custom Product (type your own)</div>';
    dropdown.innerHTML = h;
    dropdown.style.display = "block";
  }

  searchEl.addEventListener("focus", function () { renderDropdown(this.value); });
  searchEl.addEventListener("click", function () { renderDropdown(this.value); });
  searchEl.addEventListener("input", function () {
    setSel("");            // typing shuru = purani selection hat gayi
    renderDropdown(this.value);
    recomputeTokenTotal();
  });

  dropdown.addEventListener("mousedown", function (e) {
    var opt = e.target.closest(".cp-option");
    if (!opt) return;
    e.preventDefault();
    if (opt.dataset.custom) {
      setSel("__custom__");
      searchEl.style.display = "none";
      searchEl.value = "";
      nameEl.style.display = "";
      nameEl.value = "";
      priceEl.value = "";
      nameEl.focus();
    } else {
      var v = shown[parseInt(opt.dataset.i, 10)];
      if (!v) return;
      setSel(v.fullName, v.sellingPrice, v.id);
      searchEl.value = v.fullName;
      priceEl.value = v.sellingPrice || 0;
      nameEl.style.display = "none";
      nameEl.value = "";
    }
    dropdown.style.display = "none";
    recomputeTokenTotal();
  });

  document.addEventListener("click", function (e) {
    if (!r.contains(e.target)) dropdown.style.display = "none";
  });

  qtyInput.addEventListener("input", recomputeTokenTotal);
  nameEl.addEventListener("input", recomputeTokenTotal);
  priceEl.addEventListener("input", recomputeTokenTotal);
  priceEl.addEventListener("change", recomputeTokenTotal);
  r.querySelector("button").addEventListener("click", function () {
    r.remove();
    recomputeTokenTotal();
  });
}
document.addEventListener("change", function (e) {
  if (e.target && e.target.id === "tokenVehicleType") {
    var vt = e.target.value;
    qsa("#tokenServicesList .token-service-select").forEach(function (s) {
      var sv = s.value;
      var pr = sv && vt ? getMatrixPrice(sv, vt) : 0;
      var priceInput = s.parentElement.querySelector(".token-service-price");
      if (priceInput) priceInput.value = pr;
    });
    qsa("#customTokenServicesList .custom-svc-select").forEach(function (s) {
      if (s.value && s.value !== "__custom__") {
        var pr = vt ? getMatrixPrice(s.value, vt) : 0;
        var priceInput = s.parentElement.querySelector(".custom-svc-price");
        if (priceInput) priceInput.value = pr;  
      }
    });
    recomputeTokenTotal();
  }
});

document.addEventListener("input", function (e) {
  if (e.target && e.target.id === "tokenDiscount") {
    recomputeTokenTotal();
  }
});

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

// ============================================================
// REMOVED: "Universal Button Delegation" duplicate-listener block
// used to live here. It attached a SECOND click handler to
// manageBrandsBtn, manageCategoriesBtn, addBrandBtn, addCategoryBtn,
// markAllCompletedBtn, exportJSONBtn, exportCSVBtn, exportPDFBtn,
// importDataBtn2, quickBackupBtn, quickRestoreBtn, confirmImportBtn,
// resetCountersBtn and clearDataBtn — every one of which ALREADY has
// its own listener wired in initImportExport() / initInventory() /
// initReminders() / initSettings(). Because both listeners fired on
// the same click, every backup/restore/import/export action ran
// TWICE, which is exactly why file pickers and confirm dialogs
// appeared to pop up twice ("double select"). Deleting this block
// does not remove any feature — every action above still works
// through its original, correct listener.
// ============================================================
// STRONG AUTO BACKUP SYSTEM (v3) — har 5 minute par backup
// - Khali data kabhi backup nahi hota (purani backups safe)
// - Multiple backups: 36 regular (3 ghante), 30 daily, 15 safety, 1 peak
// - Save ke baad verify, duplicate skip, suspicious-drop check
// - Google Drive folder mein 12 rotating slots + latest + weekday + safety
// ============================================================
var AUTO_BACKUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minute
var AUTO_BACKUP_DB_NAME = "servicepro_autobackup_db";
var AUTO_BACKUP_STORE = "backups";
var AUTO_BACKUP_ROLLING_ID = "rolling_backup"; // purana legacy record
var AB_PEAK_ID = "peak_backup";
var AB_KEEP_REGULAR = 36; // 36 x 5 min = pichle 3 ghante
var AB_KEEP_DAILY = 30; // pichle 30 din
var AB_KEEP_SAFETY = 15;
var AB_DRIVE_SLOTS = 12; // 12 x 5 min = pichla 1 ghanta
var autoBackupTimer = null;
var autoBackupDBPromise = null;
var autoBackupQueue = Promise.resolve();

function openAutoBackupDB() {
  if (autoBackupDBPromise) return autoBackupDBPromise;
  autoBackupDBPromise = new Promise(function (resolve, reject) {
    try {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB not available"));
        return;
      }
      var req = indexedDB.open(AUTO_BACKUP_DB_NAME, 1);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(AUTO_BACKUP_STORE)) {
          db.createObjectStore(AUTO_BACKUP_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = function (e) {
        resolve(e.target.result);
      };
      req.onerror = function (e) {
        autoBackupDBPromise = null;
        reject(e);
      };
    } catch (e) {
      autoBackupDBPromise = null;
      reject(e);
    }
  });
  return autoBackupDBPromise;
}

// ---------- helpers ----------
function abDataKeys() {
  return [
    KEYS.tokens, KEYS.vehicles, KEYS.inventory, KEYS.invoices,
    KEYS.expenses, KEYS.productSales, KEYS.vendors, KEYS.vendorPayments,
    KEYS.reminders, KEYS.purchaseOrders, KEYS.pricingMatrix,
  ];
}
// Real business records ki ginti (khali check ke liye)
function countBackupRecords(dataObj) {
  var total = 0;
  if (!dataObj || typeof dataObj !== "object") return 0;
  abDataKeys().forEach(function (k) {
    var raw = dataObj[k];
    if (!raw) return;
    try {
      var v = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (Array.isArray(v)) total += v.length;
      else if (v && typeof v === "object") total += Object.keys(v).length;
    } catch (e) {}
  });
  return total;
}
function abHashString(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}
function abHashData(dataObj) {
  var keys = Object.keys(dataObj).sort();
  var s = "";
  keys.forEach(function (k) {
    s += k + ":" + dataObj[k] + "|";
  });
  return abHashString(s) + "-" + s.length;
}
function abDateStamp(d) {
  d = d || new Date();
  return (
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0")
  );
}
function abIsSafetyReason(reason) {
  return reason === "pre-clear-safety" || reason === "pre-restore-safety";
}
function abIdKind(id) {
  id = String(id || "");
  if (id === AB_PEAK_ID) return "peak";
  if (id.indexOf("daily_") === 0) return "daily";
  if (id.indexOf("safe_") === 0) return "safety";
  if (id.indexOf("bk_") === 0) return "regular";
  return "legacy";
}

// ---------- collect ----------
function collectFullBackupData(reason) {
  var data = {};
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k == null) continue;
      data[k] = localStorage.getItem(k);
    }
  } catch (e) {}
  var now = new Date();
  reason = reason || "auto";
  var sizeBytes = 0;
  Object.keys(data).forEach(function (k) {
    sizeBytes += k.length + (data[k] ? data[k].length : 0);
  });
  return {
    id: (abIsSafetyReason(reason) ? "safe_" : "bk_") + now.getTime(),
    savedAt: now.toISOString(),
    savedAtDisplay: fmtDate() + " " + fmtTime(),
    reason: reason,
    keyCount: Object.keys(data).length,
    recordCount: countBackupRecords(data),
    sizeBytes: sizeBytes,
    dataHash: abHashData(data),
    localStorageData: data,
  };
}

// ---------- IndexedDB ops ----------
function saveAutoBackupToDB(record) {
  return openAutoBackupDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(AUTO_BACKUP_STORE, "readwrite");
        tx.objectStore(AUTO_BACKUP_STORE).put(record);
        tx.oncomplete = function () {
          resolve(record);
        };
        tx.onerror = function (e) {
          reject(e);
        };
        tx.onabort = function (e) {
          reject(e);
        };
      } catch (e) {
        reject(e);
      }
    });
  });
}
function getAutoBackupById(id) {
  return openAutoBackupDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(AUTO_BACKUP_STORE, "readonly");
        var req = tx.objectStore(AUTO_BACKUP_STORE).get(id);
        req.onsuccess = function () {
          resolve(req.result || null);
        };
        req.onerror = function (e) {
          reject(e);
        };
      } catch (e) {
        reject(e);
      }
    });
  });
}
function deleteAutoBackupFromDB(id) {
  return openAutoBackupDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(AUTO_BACKUP_STORE, "readwrite");
        tx.objectStore(AUTO_BACKUP_STORE).delete(id);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function (e) {
          reject(e);
        };
      } catch (e) {
        reject(e);
      }
    });
  });
}
function getAllAutoBackupsFromDB() {
  return openAutoBackupDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      try {
        var tx = db.transaction(AUTO_BACKUP_STORE, "readonly");
        var req = tx.objectStore(AUTO_BACKUP_STORE).getAll();
        req.onsuccess = function () {
          var list = req.result || [];
          list.sort(function (a, b) {
            return (b.savedAt || "").localeCompare(a.savedAt || "");
          });
          resolve(list);
        };
        req.onerror = function (e) {
          reject(e);
        };
      } catch (e) {
        reject(e);
      }
    });
  });
}
function getAutoBackupFromDB() {
  return getAllAutoBackupsFromDB().then(function (list) {
    return list.length ? list[0] : null;
  });
}

// Save ke baad wapas read karke confirm karta hai ke backup sahi likhi gayi
function verifyAutoBackupSaved(record) {
  return getAutoBackupById(record.id).then(function (saved) {
    if (
      !saved ||
      saved.dataHash !== record.dataHash ||
      saved.keyCount !== record.keyCount
    ) {
      throw new Error("verify failed");
    }
    return true;
  });
}

// Sabse zyada data wali backup — kabhi chhote data se overwrite nahi hoti
function updateAutoBackupPeak(record) {
  return getAutoBackupById(AB_PEAK_ID).then(function (peak) {
    if (!peak || record.recordCount >= (peak.recordCount || 0)) {
      var copy = Object.assign({}, record, { id: AB_PEAK_ID });
      return saveAutoBackupToDB(copy);
    }
  });
}

// Har din ki ek backup (us din ki sabse zyada data wali)
function saveDailyBackup(record) {
  var id = "daily_" + abDateStamp(new Date());
  return getAutoBackupById(id).then(function (existing) {
    if (!existing || record.recordCount >= (existing.recordCount || 0)) {
      var copy = Object.assign({}, record, { id: id });
      return saveAutoBackupToDB(copy);
    }
  });
}

function pruneOldAutoBackups() {
  return getAllAutoBackupsFromDB()
    .then(function (list) {
      var del = [];
      function trim(kind, keep) {
        list
          .filter(function (r) {
            return abIdKind(r.id) === kind;
          })
          .slice(keep)
          .forEach(function (r) {
            del.push(r.id);
          });
      }
      trim("regular", AB_KEEP_REGULAR);
      trim("daily", AB_KEEP_DAILY);
      trim("safety", AB_KEEP_SAFETY);
      return Promise.all(del.map(deleteAutoBackupFromDB));
    })
    .catch(function () {});
}

function updateAutoBackupStatusUI(ts) {
  var el = qs("#autoBackupStatus");
  if (el) el.textContent = "Last auto-backup: " + (ts || "Never");
}

// ---------- main runner ----------
function _runAutoBackupInternal(silent, reason) {
  reason = reason || "auto";
  var isSafety = abIsSafetyReason(reason);
  var record;
  try {
    record = collectFullBackupData(reason);
  } catch (e) {
    if (!silent) toast("Backup failed", "error");
    return Promise.resolve(null);
  }

  // GUARD 1: khali data kabhi backup nahi hoga
  if (record.recordCount === 0) {
    if (!silent)
      toast("Backup skipped: app ka data khali hai. Purani backups safe hain.", "warning");
    return Promise.resolve(null);
  }

  return getAllAutoBackupsFromDB()
    .catch(function () {
      return [];
    })
    .then(function (list) {
      var regular = list.filter(function (r) {
        return abIdKind(r.id) === "regular";
      });
      var last = regular[0] || null;

      // GUARD 2: data bilkul pichli backup jaisa hai to naya record nahi banta
      if (reason === "auto" && last && last.dataHash === record.dataHash) {
        updateAutoBackupStatusUI(record.savedAtDisplay);
        saveBackupToGoogleDriveFolder(last, true, false);
        return last;
      }

      // GUARD 3: records achanak 50% se zyada kam ho gaye
      var suspicious =
        !isSafety &&
        !!last &&
        (last.recordCount || 0) >= 10 &&
        record.recordCount < last.recordCount * 0.5;

      return saveAutoBackupToDB(record)
        .then(function () {
          return verifyAutoBackupSaved(record);
        })
        .then(function () {
          return updateAutoBackupPeak(record);
        })
        .then(function () {
          if (!isSafety && !suspicious) return saveDailyBackup(record);
        })
        .then(function () {
          return pruneOldAutoBackups();
        })
        .then(function () {
          updateAutoBackupStatusUI(record.savedAtDisplay);
          saveBackupToGoogleDriveFolder(record, silent, suspicious);
          if (suspicious) {
            toast(
              "Warning: data pichli backup se bohat kam hai. Purani backups safe rakhi gayi hain.",
              "warning",
            );
          } else if (!silent) {
            toast("Backup saved & verified (" + record.savedAtDisplay + ")", "success");
          }
          return record;
        })
        .catch(function () {
          if (!silent) toast("Backup failed", "error");
          return null;
        });
    });
}

// Queue: do backups ek saath nahi chalti, ek ke baad ek chalti hain
function runAutoBackupNow(silent, reason) {
  var p = autoBackupQueue.then(function () {
    return _runAutoBackupInternal(silent, reason);
  });
  autoBackupQueue = p.catch(function () {});
  return p;
}

// ---------- restore ----------
function restoreLocalStorageDataObject(dataObj) {
  try {
    if (
      !dataObj ||
      typeof dataObj !== "object" ||
      countBackupRecords(dataObj) === 0
    ) {
      toast("Is backup mein koi data nahi hai - restore roka gaya", "error");
      return false;
    }
    Object.keys(dataObj).forEach(function (k) {
      try {
        var v = dataObj[k];
        localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
      } catch (e) {}
    });
    toast("Data restored from backup. Reloading...", "success");
    setTimeout(function () {
      location.reload();
    }, 1200);
    return true;
  } catch (e) {
    toast("Restore failed", "error");
    return false;
  }
}

function abFormatSize(bytes) {
  bytes = bytes || 0;
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function openAutoBackupPickerModal() {
  getAllAutoBackupsFromDB().then(function (list) {
    if (!list.length) {
      toast("No backup available yet", "warning");
      return;
    }
    var existing = qs("#autoBackupPickerModal");
    if (existing) existing.remove();
    var reasonLabels = {
      auto: "Auto (5-min)",
      manual: "Manual",
      "pre-clear-safety": "Before Clear All Data",
      "pre-restore-safety": "Before Restore",
    };
    var rows = list
      .map(function (rec, idx) {
        var kind = abIdKind(rec.id);
        var recCount =
          rec.recordCount !== undefined
            ? rec.recordCount
            : countBackupRecords(rec.localStorageData);
        var keyCount = rec.localStorageData ? Object.keys(rec.localStorageData).length : 0;
        var label = reasonLabels[rec.reason] || "Auto";
        var badge = "";
        if (idx === 0) badge += ' <span class="badge badge--green" style="font-size:0.6rem">Latest</span>';
        if (kind === "peak") badge += ' <span class="badge badge--blue" style="font-size:0.6rem">Highest Data</span>';
        if (kind === "daily") badge += ' <span class="badge badge--gray" style="font-size:0.6rem">Daily</span>';
        if (kind === "safety") badge += ' <span class="badge badge--orange" style="font-size:0.6rem">Safety</span>';
        if (recCount === 0) badge += ' <span class="badge badge--red" style="font-size:0.6rem">Empty</span>';
        return (
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border-bottom:1px solid var(--border);gap:10px;"><div><strong>' +
          sanitize(rec.savedAtDisplay || "") +
          "</strong>" +
          badge +
          '<br><small style="color:var(--text-muted);">' +
          sanitize(label) +
          " • " +
          recCount +
          " records • " +
          keyCount +
          " keys • " +
          abFormatSize(rec.sizeBytes) +
          '</small></div><button class="btn btn-sm btn-primary" data-restore-backup="' +
          sanitize(rec.id) +
          '"' +
          (recCount === 0 ? " disabled" : "") +
          ">Restore</button></div>"
        );
      })
      .join("");
    var html =
      '<div class="modal-overlay" id="autoBackupPickerModal"><div class="modal modal--sm"><div class="modal-header"><h2 class="modal-title"><span class="material-icons">history</span> Choose a Backup to Restore</h2><button class="modal-close" onclick="document.getElementById(\'autoBackupPickerModal\').remove();document.body.style.overflow=\'\';"><span class="material-icons">close</span></button></div><div class="modal-body" style="max-height:400px;overflow-y:auto;padding:0 1.25rem;">' +
      rows +
      '</div><div class="modal-footer"><button class="btn btn-ghost" onclick="document.getElementById(\'autoBackupPickerModal\').remove();document.body.style.overflow=\'\';">Cancel</button></div></div></div>';
    document.body.insertAdjacentHTML("beforeend", html);
    openModal("autoBackupPickerModal");
    qsa("[data-restore-backup]", qs("#autoBackupPickerModal")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = this.dataset.restoreBackup;
        var rec = list.find(function (r) {
          return r.id === id;
        });
        if (!rec) return;
        var pickerModal = qs("#autoBackupPickerModal");
        if (pickerModal) pickerModal.remove();
        document.body.style.overflow = "";
        confirm(
          "Restore system from backup (" +
            (rec.savedAtDisplay || "") +
            ")? This will overwrite current data.",
          function () {
            runAutoBackupNow(true, "pre-restore-safety").then(function () {
              restoreLocalStorageDataObject(rec.localStorageData);
            });
          },
          "Restore",
        );
      });
    });
  });
}

// ============================================================
// Google Drive folder writer — multiple rotating files
// ============================================================
function saveBackupToGoogleDriveFolder(record, silent, suspicious) {
  if (!window.electronAPI || !window.electronAPI.saveBackupFile) return;
  try {
    var json = JSON.stringify(record, null, 2);
    var names = [];
    if (record.reason === "pre-clear-safety") {
      names.push("servicepro_safety_pre-clear.json");
    } else if (record.reason === "pre-restore-safety") {
      names.push("servicepro_safety_pre-restore.json");
    } else {
      // 12 rotating slots = pichla ~1 ghanta (har 5 min ka ek slot)
      var slot = (Math.floor(Date.now() / AUTO_BACKUP_INTERVAL_MS) % AB_DRIVE_SLOTS) + 1;
      names.push("servicepro_backup_slot" + slot + ".json");
      if (!suspicious) {
        names.push("servicepro_latest_backup.json");
        var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        names.push("servicepro_backup_" + days[new Date().getDay()] + ".json");
      }
    }
    var firstFail = null;
    names
      .reduce(function (chain, name) {
        return chain.then(function () {
          return window.electronAPI.saveBackupFile(json, name).then(function (res) {
            if (res && res.success) {
              var el = qs("#driveBackupStatus");
              if (el) el.textContent = "Last Drive backup: " + (record.savedAtDisplay || "");
            } else if (!firstFail && res) {
              firstFail = res.reason;
            }
          });
        });
      }, Promise.resolve())
      .then(function () {
        if (!silent && firstFail && firstFail !== "no-folder-selected") {
          toast("Drive backup save failed (" + firstFail + ")", "warning");
        }
      })
      .catch(function () {});
  } catch (e) {}
}

function initAutoBackupSystem() {
  getAutoBackupFromDB()
    .then(function (rec) {
      updateAutoBackupStatusUI(rec ? rec.savedAtDisplay : "Never");
      var shouldRunInitial = true;
      if (rec && rec.savedAt) {
        var last = new Date(rec.savedAt).getTime();
        // pichli backup 2 minute se nayi ho to dobara na karein
        if (!isNaN(last) && Date.now() - last < 2 * 60 * 1000) {
          shouldRunInitial = false;
        }
      }
      if (shouldRunInitial) {
        setTimeout(function () {
          runAutoBackupNow(true, "auto");
        }, 8000);
      }
    })
    .catch(function () {
      setTimeout(function () {
        runAutoBackupNow(true, "auto");
      }, 8000);
    });

  // Har 5 minute par auto backup
  if (autoBackupTimer) clearInterval(autoBackupTimer);
  autoBackupTimer = setInterval(function () {
    runAutoBackupNow(true, "auto");
  }, AUTO_BACKUP_INTERVAL_MS);

  qs("#runAutoBackupNowBtn")?.addEventListener("click", function () {
    runAutoBackupNow(false, "manual");
  });

  qs("#downloadAutoBackupBtn")?.addEventListener("click", function () {
    getAutoBackupFromDB().then(function (rec) {
      if (!rec) {
        toast("No auto-backup available yet", "warning");
        return;
      }
      var blob = new Blob([JSON.stringify(rec, null, 2)], { type: "application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "auto_backup_" + fmtDate() + ".json";
      a.click();
      URL.revokeObjectURL(a.href);
      toast("Auto-backup file downloaded", "success");
    });
  });

  qs("#restoreFromAutoBackupBtn")?.addEventListener("click", function () {
    openAutoBackupPickerModal();
  });

  qs("#selectDriveFolderBtn")?.addEventListener("click", function () {
    if (!window.electronAPI || !window.electronAPI.selectBackupFolder) {
      toast("App update needed (main.js/preload.js) for this feature", "error");
      return;
    }
    window.electronAPI.selectBackupFolder().then(function (res) {
      if (res && res.success) {
        toast("Google Drive backup folder set: " + res.folder, "success");
        var el = qs("#driveFolderPath");
        if (el) el.textContent = res.folder;
        runAutoBackupNow(true, "manual");
      }
    });
  });
  if (window.electronAPI && window.electronAPI.getBackupFolder) {
    window.electronAPI.getBackupFolder().then(function (folder) {
      var el = qs("#driveFolderPath");
      if (el) el.textContent = folder || "Not set";
    });
  }

  qs("#addBackupFileBtn")?.addEventListener("click", function () {
    var inp = document.createElement("input");
    inp.type = "file";
    inp.accept = ".json";
    inp.addEventListener("change", function (e) {
      var f = e.target.files[0];
      if (!f) return;
      var r = new FileReader();
      r.onload = function (ev) {
        try {
          var parsed = JSON.parse(ev.target.result);
          var dataObj =
            parsed && parsed.localStorageData ? parsed.localStorageData : parsed;
          if (!dataObj || typeof dataObj !== "object") {
            toast("Invalid backup file", "error");
            return;
          }
          var cnt = countBackupRecords(dataObj);
          if (cnt === 0) {
            toast("Is backup file mein koi data nahi hai - restore roka gaya", "error");
            return;
          }
          confirm(
            "Is backup file (" + cnt + " records) se restore karein? Current data overwrite hoga.",
            function () {
              runAutoBackupNow(true, "pre-restore-safety").then(function () {
                restoreLocalStorageDataObject(dataObj);
              });
            },
            "Restore",
          );
        } catch (e) {
          toast("Invalid backup file", "error");
        }
      };
      r.readAsText(f);
    });
    inp.click();
  });
}
// ============================================================
// NEW (ADDED ONLY): Dashboard Monthly Summary
// Sirf selected month ka data dikhata hai. Naya month shuru hote hi
// default month khud badal jata hai, isliye sab 0 se start hota hai.
// Koi existing data/function change nahi hota (read-only).
// ============================================================
var MONTHLY_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var _monthlySelected = null; // null = hamesha current month

function mdCurrentKey() {
  var n = new Date();
  return n.getFullYear() + "-" + String(n.getMonth()).padStart(2, "0");
}
function mdKeyOf(d) {
  return d.getFullYear() + "-" + String(d.getMonth()).padStart(2, "0");
}
function mdTokenDate(tk) {
  var d = parseDate(tk.date);
  if (d) return d;
  if (tk.createdAt) return new Date(tk.createdAt);
  var inv = STATE.invoices.find(function (i) {
    return (i.tokenId && i.tokenId === tk.id) ||
      (i.token && tk.number && i.token.toLowerCase() === tk.number.toLowerCase());
  });
  if (inv) return parseDate(inv.date) || (inv.createdAt ? new Date(inv.createdAt) : null);
  return null;
}
function mdTokenNet(tk) {
  var pt = 0;
  (tk.products || []).forEach(function (p) { pt += (p.price || 0) * (p.qty || 0); });
  return Math.max(0, (tk.servicePrice || 0) + pt - (tk.discount || 0));
}

function mdPopulateMonths() {
  var sel = qs("#monthlySummarySelect");
  if (!sel) return;
  var keys = {};
  keys[mdCurrentKey()] = true;
  function add(dateObj) { if (dateObj) keys[mdKeyOf(dateObj)] = true; }
  STATE.tokens.forEach(function (t) { add(mdTokenDate(t)); });
  STATE.productSales.forEach(function (s) { add(parseDate(s.date)); });
  STATE.expenses.forEach(function (e) { add(parseDate(e.date)); });
  STATE.vendorPayments.forEach(function (p) { add(parseDate(p.date)); });

  var list = Object.keys(keys).sort().reverse(); // newest pehle
  var chosen = _monthlySelected && keys[_monthlySelected] ? _monthlySelected : mdCurrentKey();
  sel.innerHTML = list.map(function (k) {
    var y = k.split("-")[0], m = parseInt(k.split("-")[1], 10);
    return '<option value="' + k + '"' + (k === chosen ? " selected" : "") + ">" +
      MONTHLY_NAMES[m] + " " + y + (k === mdCurrentKey() ? " (Current)" : "") + "</option>";
  }).join("");
}
// NEW: product-wise sale amount + profit (selected month)
function mdProductBreakdown(key) {
  var map = {};
  var inMonth = function (d) { return d && mdKeyOf(d) === key; };

  function add(name, qty, price, vid, src) {
    qty = qty || 0;
    var pp = 0;
    var f = vid ? findVariantById(vid) : null;
    if (f) pp = f.variant.purchasePrice || 0;
    // ID wali entry me cost 0 ho ya entry na mile, to usi naam wali entry se cost lo
    if (pp <= 0 && name) {
      var same = getAllVariantsFlat().filter(function (v) { return v.fullName === name; });
      var withCost = same.find(function (v) { return (v.purchasePrice || 0) > 0; });
      if (withCost) pp = withCost.purchasePrice;
    }
    var k = name || "unknown";   // product naam se group, taake ek product ki ek hi row bane
    if (!map[k]) map[k] = { name: name, qty: 0, amt: 0, cost: 0, hasCost: true, sQty: 0, tQty: 0 };
    var r = map[k];
    r.qty += qty;
    r.amt += (price || 0) * qty;
    if (src === "sale") r.sQty += qty; else r.tQty += qty;
    if (pp > 0) r.cost += pp * qty;
    else r.hasCost = false;   // cost maloom nahi to profit "—" dikhega
  }

  STATE.productSales.forEach(function (s) {
    if (!inMonth(parseDate(s.date))) return;
    (s.items || []).forEach(function (i) { add(i.fullName, i.qty, i.price, i.variantId, "sale"); });
  });
  STATE.tokens.forEach(function (tk) {
    if (tk.status !== "completed" || !inMonth(mdTokenDate(tk))) return;
    (tk.products || []).forEach(function (p) { add(p.fullName, p.qty, p.price, p.variantId, "token"); });
  });

  var rows = Object.keys(map).map(function (k) { return map[k]; });
  rows.sort(function (a, b) { return b.amt - a.amt; });
  var totalAmt = 0, totalCost = 0, totalProfit = 0;
  rows.forEach(function (r) {
    totalAmt += r.amt;
    if (r.hasCost) { totalCost += r.cost; totalProfit += r.amt - r.cost; }
  });
  return { rows: rows, totalAmt: totalAmt, totalCost: totalCost, totalProfit: totalProfit };
}

function mdRenderProductPanel(pb, grid) {
  var box = qs("#monthlyProductDetails");
  if (!box) {
    box = document.createElement("div");
    box.id = "monthlyProductDetails";
    box.style.marginTop = "16px";
    grid.parentNode.appendChild(box);
  }
  var body = pb.rows.length
    ? pb.rows.map(function (r) {
        return "<tr><td>" + sanitize(r.name) + "</td>" +
          "<td style='text-align:center'>" + r.qty +
          " <small style='color:var(--text-muted)'>(Sale " + r.sQty + " / Token " + r.tQty + ")</small></td>" +
          "<td style='text-align:right;font-weight:600'>" + fmtPrice(r.amt) + "</td>" +
          "<td style='text-align:right'>" + (r.hasCost ? fmtPrice(r.cost) : "—") + "</td>" +
          "<td style='text-align:right;font-weight:700;color:var(--success)'>" +
          (r.hasCost ? fmtPrice(r.amt - r.cost) : "—") + "</td></tr>";
      }).join("")
    : '<tr><td colspan="5" style="text-align:center;padding:1.5rem;">Is mahine koi product sale nahi hui</td></tr>';

  box.innerHTML =
    '<div class="invoice-section-label"><span class="material-icons">shopping_cart</span> Product Sales Details (Sale + Token Products)</div>' +
    '<div style="overflow-x:auto"><table class="data-table"><thead><tr>' +
    "<th>Product</th><th style='text-align:center'>Qty Sold</th><th style='text-align:right'>Sale Amount</th>" +
    "<th style='text-align:right'>Cost</th><th style='text-align:right'>Profit</th></tr></thead><tbody>" + body +
    "</tbody><tfoot><tr style='font-weight:800'><td>Total</td><td></td>" +
    "<td style='text-align:right'>" + fmtPrice(pb.totalAmt) + "</td>" +
    "<td style='text-align:right'>" + fmtPrice(pb.totalCost) + "</td>" +
    "<td style='text-align:right;color:var(--success)'>" + fmtPrice(pb.totalProfit) + "</td></tr></tfoot></table></div>";
}
function renderMonthlySummary() {
  var sel = qs("#monthlySummarySelect");
  var grid = qs("#monthlySummaryGrid");
  if (!sel || !grid) return;

  mdPopulateMonths();
  var key = sel.value || mdCurrentKey();
  var inMonth = function (d) { return d && mdKeyOf(d) === key; };

  var tokenRevenue = 0, tokensCreated = 0, tokensCompleted = 0;
  STATE.tokens.forEach(function (tk) {
    var d = mdTokenDate(tk);
    if (!inMonth(d)) return;
    tokensCreated++;
    if (tk.status === "completed") {
      tokensCompleted++;
      tokenRevenue += mdTokenNet(tk);
    }
  });

  var saleRevenue = 0, salesCount = 0;
  STATE.productSales.forEach(function (s) {
    if (inMonth(parseDate(s.date))) { saleRevenue += s.total || 0; salesCount++; }
  });

  var otherExp = 0, labour = 0;
  STATE.expenses.forEach(function (e) {
    if (!inMonth(parseDate(e.date))) return;
    if (e.category === "labour") labour += e.amount || 0;
    else otherExp += e.amount || 0;
  });

  var vendorPaid = 0;
  STATE.vendorPayments.forEach(function (p) {
    if (inMonth(parseDate(p.date))) vendorPaid += p.amount || 0;
  });

  var revenue = tokenRevenue + saleRevenue;
  var pb = mdProductBreakdown(key);
  // Net Profit: product ka sirf profit (sale - cost), pura sale amount nahi
  var net = revenue - pb.totalCost - otherExp - labour - vendorPaid;

  function card(icon, color, label, value, extra) {
    return '<div class="kpi-card' + (extra || "") + '"><div class="kpi-icon kpi-icon--' + color +
      '"><span class="material-icons">' + icon + '</span></div><div class="kpi-body"><span class="kpi-label">' +
      label + '</span><span class="kpi-value">' + value + "</span></div></div>";
  }
  grid.innerHTML =
    card("trending_up", "green", "Revenue", fmtPrice(revenue)) +
    card("build", "blue", "Token Revenue", fmtPrice(tokenRevenue)) +
        card("shopping_cart", "blue", "Product Sales (Sale + Token)", fmtPrice(pb.totalAmt)) +
    card("savings", "green", "Product Profit", fmtPrice(pb.totalProfit)) +
    card("trending_down", "red", "Other Expenses", fmtPrice(otherExp)) +
    card("groups", "orange", "Labour Cost", fmtPrice(labour)) +
    card("people", "orange", "Vendor Payments", fmtPrice(vendorPaid)) +
    card("account_balance_wallet", "green", "Net Profit", fmtPrice(net), " kpi-card--success") +
    card("token", "blue", "Tokens Created", tokensCreated) +
    card("check_circle", "green", "Tokens Completed", tokensCompleted) +
    card("receipt", "blue", "Product Sales Count", salesCount);
    mdRenderProductPanel(pb, grid);
}

// Dropdown change hone par refresh (initApp me kuch add karne ki zaroorat nahi)
document.addEventListener("change", function (e) {
  if (e.target && e.target.id === "monthlySummarySelect") {
    _monthlySelected = e.target.value;
    renderMonthlySummary();
  }
});
// ==================== BOOT ====================
document.addEventListener("DOMContentLoaded", function () {
  setLoginBrandName();
  if (!checkLoginSession()) {
    initLogin();
  }
  // Move all modals inside #app
var app = document.getElementById("app");
if (app) {
  document.querySelectorAll(".modal-overlay").forEach(function(m) {
    app.appendChild(m);
  });
}
});