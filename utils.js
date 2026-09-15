// utils.js – shared helper functions exposed globally
window.uuid = function() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

window.formatDate = function(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
};

window.showToast = function(message, type = "info") {
  // Remove existing toasts first to prevent piling up
  const existing = document.querySelectorAll(".toast");
  existing.forEach(t => t.remove());

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};
