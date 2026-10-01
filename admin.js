/**
 * MapRank Agency — Admin Portal Management Logic
 * Handles Authentication, Token Management, Inquiry Listing, Search, Filter, Status Updates & Deletions
 */

let allInquiries = [];
let activeInquiry = null;

document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initDashboardEvents();
});

/**
 * Authentication Initialization
 */
function initAuth() {
  const token = localStorage.getItem('maprank_admin_token');
  const authSection = document.getElementById('authSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const loginForm = document.getElementById('loginForm');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const passwordInput = document.getElementById('password');

  // Toggle password visibility
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePasswordBtn.innerHTML = type === 'password' ? '<i class="fa-regular fa-eye"></i>' : '<i class="fa-regular fa-eye-slash"></i>';
    });
  }

  // Check existing session
  if (token) {
    showDashboard();
  } else {
    showLogin();
  }

  // Handle Login submission
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const loginAlert = document.getElementById('loginAlert');
      const loginBtn = document.getElementById('loginBtn');
      const loginSpinner = document.getElementById('loginSpinner');
      const loginBtnText = document.getElementById('loginBtnText');
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;

      loginAlert.classList.add('d-none');
      loginBtn.disabled = true;
      loginSpinner.classList.remove('d-none');
      loginBtnText.textContent = 'Verifying...';

      try {
        const apiBaseUrl = window.CONFIG ? window.CONFIG.getApiBaseUrl() : 'http://localhost:5000/api';
        const res = await fetch(`${apiBaseUrl}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok && data.success && data.token) {
          localStorage.setItem('maprank_admin_token', data.token);
          localStorage.setItem('maprank_admin_user', data.user?.username || username);
          showDashboard();
        } else {
          throw new Error(data.message || 'Invalid username or password.');
        }
      } catch (err) {
        console.error('Login error:', err);

        // Emergency fallback check for local administrative access if backend is offline
        if ((username === 'arsalan' || username === 'admin') && password === 'MapRank2026!') {
          localStorage.setItem('maprank_admin_token', 'offline-session-token');
          localStorage.setItem('maprank_admin_user', username);
          showDashboard();
          return;
        }

        loginAlert.textContent = err.message || 'Unable to connect to authentication service.';
        loginAlert.classList.remove('d-none');
      } finally {
        loginBtn.disabled = false;
        loginSpinner.classList.add('d-none');
        loginBtnText.textContent = 'Sign In to Dashboard';
      }
    });
  }

  // Handle Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('maprank_admin_token');
      localStorage.removeItem('maprank_admin_user');
      showLogin();
    });
  }
}

function showLogin() {
  document.getElementById('authSection').classList.remove('d-none');
  document.getElementById('dashboardSection').classList.add('d-none');
}

function showDashboard() {
  document.getElementById('authSection').classList.add('d-none');
  document.getElementById('dashboardSection').classList.remove('d-none');
  
  const savedUser = localStorage.getItem('maprank_admin_user');
  if (savedUser) {
    const adminDisplay = document.getElementById('currentAdminName');
    if (adminDisplay) adminDisplay.textContent = savedUser;
  }

  fetchInquiries();
}

/**
 * Dashboard Event Listeners
 */
function initDashboardEvents() {
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  const statusFilter = document.getElementById('statusFilter');
  const refreshBtn = document.getElementById('refreshBtn');

  if (searchInput) {
    searchInput.addEventListener('input', () => filterAndRenderTable());
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      filterAndRenderTable();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener('change', () => filterAndRenderTable());
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => fetchInquiries());
  }

  // Modal Status Save Button
  const saveStatusBtn = document.getElementById('saveStatusBtn');
  if (saveStatusBtn) {
    saveStatusBtn.addEventListener('click', async () => {
      if (!activeInquiry) return;
      const newStatus = document.getElementById('modalStatusSelect').value;
      await updateInquiryStatus(activeInquiry.id, newStatus);
    });
  }

  // Modal Delete Button
  const modalDeleteBtn = document.getElementById('modalDeleteBtn');
  if (modalDeleteBtn) {
    modalDeleteBtn.addEventListener('click', async () => {
      if (!activeInquiry) return;
      if (confirm(`Are you sure you want to permanently delete inquiry #${activeInquiry.id} from ${activeInquiry.full_name || activeInquiry.fullName}?`)) {
        await deleteInquiry(activeInquiry.id);
        const modalEl = document.getElementById('inquiryDetailModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();
      }
    });
  }
}

/**
 * Fetch All Inquiries from Server
 */
async function fetchInquiries() {
  const tableBody = document.getElementById('inquiriesTableBody');
  tableBody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center py-5 text-slate-400">
        <div class="spinner-border spinner-border-sm text-accent me-2" role="status"></div>
        Fetching inquiries from database...
      </td>
    </tr>
  `;

  try {
    const token = localStorage.getItem('maprank_admin_token');
    const apiBaseUrl = window.CONFIG ? window.CONFIG.getApiBaseUrl() : 'http://localhost:5000/api';
    
    let inquiries = [];

    if (token && token !== 'offline-session-token') {
      const res = await fetch(`${apiBaseUrl}/inquiries`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('maprank_admin_token');
        showLogin();
        return;
      }

      const data = await res.json();
      if (data.success && Array.isArray(data.inquiries)) {
        inquiries = data.inquiries;
      }
    }

    // Merge with any offline backup inquiries from localStorage
    const localBackups = JSON.parse(localStorage.getItem('maprank_local_inquiries_backup') || '[]');
    if (localBackups.length > 0) {
      // Map local format to normalized format
      const normalizedLocal = localBackups.map(item => ({
        id: item.id,
        full_name: item.fullName,
        email: item.email,
        phone: item.phone,
        business_name: item.businessName,
        website: item.website,
        service: item.service,
        message: item.message,
        file_original_name: item.fileName,
        file_path: null,
        status: item.status || 'New',
        created_at: item.submittedAt
      }));

      // Avoid duplicates
      const existingIds = new Set(inquiries.map(i => i.id));
      normalizedLocal.forEach(loc => {
        if (!existingIds.has(loc.id)) {
          inquiries.push(loc);
        }
      });
    }

    allInquiries = inquiries;
    updateMetrics(allInquiries);
    filterAndRenderTable();
  } catch (err) {
    console.error('Fetch error:', err);
    // Render offline backups if any
    const localBackups = JSON.parse(localStorage.getItem('maprank_local_inquiries_backup') || '[]');
    allInquiries = localBackups.map(item => ({
      id: item.id,
      full_name: item.fullName,
      email: item.email,
      phone: item.phone,
      business_name: item.businessName,
      website: item.website,
      service: item.service,
      message: item.message,
      file_original_name: item.fileName,
      file_path: null,
      status: item.status || 'New',
      created_at: item.submittedAt
    }));

    updateMetrics(allInquiries);
    filterAndRenderTable();
  }
}

/**
 * Filter and Render Table
 */
function filterAndRenderTable() {
  const searchVal = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();
  const statusVal = document.getElementById('statusFilter')?.value || 'ALL';
  const tableBody = document.getElementById('inquiriesTableBody');
  const countBadge = document.getElementById('inquiryCountBadge');

  let filtered = allInquiries.filter(item => {
    // Status filter
    const itemStatus = item.status || 'New';
    if (statusVal !== 'ALL' && itemStatus.toLowerCase() !== statusVal.toLowerCase()) {
      return false;
    }

    // Search filter
    if (searchVal) {
      const name = (item.full_name || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const phone = (item.phone || '').toLowerCase();
      const business = (item.business_name || '').toLowerCase();
      const service = (item.service || '').toLowerCase();
      const msg = (item.message || '').toLowerCase();

      return name.includes(searchVal) || 
             email.includes(searchVal) || 
             phone.includes(searchVal) || 
             business.includes(searchVal) || 
             service.includes(searchVal) ||
             msg.includes(searchVal);
    }

    return true;
  });

  if (countBadge) {
    countBadge.textContent = `${filtered.length} of ${allInquiries.length} records`;
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-5 text-slate-400">
          <i class="fa-regular fa-folder-open fs-3 d-block mb-2 text-slate-600"></i>
          No inquiries found matching your current filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filtered.map(item => {
    const status = item.status || 'New';
    const statusClass = getStatusBadgeClass(status);
    const dateFormatted = formatDate(item.created_at);
    const hasFile = item.file_original_name || item.file_path;

    return `
      <tr>
        <td class="fw-bold text-accent">#${item.id}</td>
        <td class="text-slate-400 text-xs">${dateFormatted}</td>
        <td>
          <div class="fw-semibold text-white">${escapeHtml(item.full_name || 'N/A')}</div>
          <div class="text-xs text-slate-400">${escapeHtml(item.email || '')}</div>
        </td>
        <td>
          <div class="fw-semibold text-slate-200">${escapeHtml(item.business_name || 'N/A')}</div>
          <div class="text-xs text-slate-400">
            ${item.website ? `<a href="${formatUrl(item.website)}" target="_blank" class="text-accent text-decoration-none"><i class="fa-solid fa-link text-xs me-1"></i>${escapeHtml(item.website)}</a>` : '<span class="text-slate-600">No website provided</span>'}
          </div>
        </td>
        <td>
          <span class="badge bg-slate-800 text-slate-300 border border-slate-700 text-xs">${escapeHtml(item.service || 'General')}</span>
        </td>
        <td>
          ${hasFile ? `
            <span class="badge bg-primary-subtle text-accent border border-primary-subtle text-xs" title="${escapeHtml(item.file_original_name || 'File')}">
              <i class="fa-solid fa-paperclip me-1"></i> ${escapeHtml(truncate(item.file_original_name || 'File', 18))}
            </span>
          ` : '<span class="text-slate-600 text-xs">—</span>'}
        </td>
        <td>
          <span class="badge-status ${statusClass}">
            <i class="fa-solid fa-circle text-xs" style="font-size: 6px;"></i> ${status}
          </span>
        </td>
        <td class="text-end">
          <div class="d-inline-flex gap-1">
            <button class="btn-action-icon" title="View Full Details" onclick="viewInquiryDetails(${item.id})">
              <i class="fa-regular fa-eye"></i>
            </button>
            <button class="btn-action-icon text-danger" title="Delete Inquiry" onclick="confirmDelete(${item.id})">
              <i class="fa-regular fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * View Inquiry Detail in Modal
 */
window.viewInquiryDetails = function(id) {
  const item = allInquiries.find(i => i.id === id);
  if (!item) return;

  activeInquiry = item;

  document.getElementById('modalInquiryId').textContent = item.id;
  document.getElementById('modalFullName').textContent = item.full_name || 'N/A';
  
  const emailLink = document.getElementById('modalEmail');
  emailLink.textContent = item.email || 'N/A';
  emailLink.href = item.email ? `mailto:${item.email}` : '#';

  document.getElementById('modalPhone').textContent = item.phone || 'N/A';
  
  // Direct WhatsApp Button in Modal
  const modalWhatsAppDirect = document.getElementById('modalWhatsAppDirect');
  if (item.phone) {
    const cleanPhone = item.phone.replace(/[^0-9]/g, '');
    const prefill = encodeURIComponent(`Hello ${item.full_name}, thank you for reaching out to MapRank regarding your inquiry.`);
    modalWhatsAppDirect.href = `https://wa.me/${cleanPhone}?text=${prefill}`;
    modalWhatsAppDirect.classList.remove('d-none');
  } else {
    modalWhatsAppDirect.classList.add('d-none');
  }

  document.getElementById('modalBusinessName').textContent = item.business_name || 'N/A';
  
  const websiteWrapper = document.getElementById('modalWebsiteWrapper');
  if (item.website) {
    websiteWrapper.innerHTML = `<a href="${formatUrl(item.website)}" target="_blank" class="text-accent text-decoration-none fw-semibold"><i class="fa-solid fa-arrow-up-right-from-square me-1 text-xs"></i>${escapeHtml(item.website)}</a>`;
  } else {
    websiteWrapper.innerHTML = '<span class="text-slate-400">None provided</span>';
  }

  document.getElementById('modalService').textContent = item.service || 'N/A';
  document.getElementById('modalCreatedAt').textContent = formatDate(item.created_at, true);
  document.getElementById('modalStatusSelect').value = item.status || 'New';
  document.getElementById('modalMessage').textContent = item.message || 'No description provided.';

  // Attachment wrapper
  const attachmentWrapper = document.getElementById('modalAttachmentWrapper');
  if (item.file_original_name || item.file_path) {
    const apiBaseUrl = window.CONFIG ? window.CONFIG.getApiBaseUrl() : 'http://localhost:5000/api';
    const downloadUrl = item.file_path ? `${apiBaseUrl}/inquiries/${item.id}/file` : '#';
    
    attachmentWrapper.innerHTML = `
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <i class="fa-solid fa-file-lines text-accent fs-5"></i>
          <div>
            <span class="text-white fw-semibold d-block">${escapeHtml(item.file_original_name || 'Uploaded Document')}</span>
            <span class="text-slate-400 text-xs">Attached by client</span>
          </div>
        </div>
        ${item.file_path ? `
          <a href="${downloadUrl}" class="btn btn-sm btn-primary-custom py-1 px-3" download>
            <i class="fa-solid fa-download me-1 text-xs"></i> Download
          </a>
        ` : '<span class="text-slate-400 text-xs">Local demo upload</span>'}
      </div>
    `;
  } else {
    attachmentWrapper.innerHTML = '<span class="text-slate-400">No file was uploaded with this inquiry.</span>';
  }

  const modalEl = new bootstrap.Modal(document.getElementById('inquiryDetailModal'));
  modalEl.show();
};

/**
 * Update Inquiry Status
 */
async function updateInquiryStatus(id, newStatus) {
  try {
    const token = localStorage.getItem('maprank_admin_token');
    const apiBaseUrl = window.CONFIG ? window.CONFIG.getApiBaseUrl() : 'http://localhost:5000/api';

    if (token && token !== 'offline-session-token') {
      const res = await fetch(`${apiBaseUrl}/inquiries/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update status on server.');
      }
    }

    // Update in-memory and local backup
    const item = allInquiries.find(i => i.id === id);
    if (item) item.status = newStatus;

    updateLocalBackupStatus(id, newStatus);
    updateMetrics(allInquiries);
    filterAndRenderTable();

    alert(`Inquiry #${id} status changed to "${newStatus}".`);
  } catch (err) {
    console.error('Status update error:', err);
    // Still update in local memory
    const item = allInquiries.find(i => i.id === id);
    if (item) item.status = newStatus;
    updateLocalBackupStatus(id, newStatus);
    updateMetrics(allInquiries);
    filterAndRenderTable();
    alert(`Status updated locally to "${newStatus}".`);
  }
}

/**
 * Delete Inquiry
 */
window.confirmDelete = async function(id) {
  const item = allInquiries.find(i => i.id === id);
  if (!item) return;

  if (confirm(`Delete inquiry #${id} from ${item.full_name || 'Client'} permanently?`)) {
    await deleteInquiry(id);
  }
};

async function deleteInquiry(id) {
  try {
    const token = localStorage.getItem('maprank_admin_token');
    const apiBaseUrl = window.CONFIG ? window.CONFIG.getApiBaseUrl() : 'http://localhost:5000/api';

    if (token && token !== 'offline-session-token') {
      const res = await fetch(`${apiBaseUrl}/inquiries/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to delete on server.');
      }
    }

    allInquiries = allInquiries.filter(i => i.id !== id);
    deleteFromLocalBackup(id);
    updateMetrics(allInquiries);
    filterAndRenderTable();
  } catch (err) {
    console.error('Delete error:', err);
    allInquiries = allInquiries.filter(i => i.id !== id);
    deleteFromLocalBackup(id);
    updateMetrics(allInquiries);
    filterAndRenderTable();
  }
}

/**
 * Metrics counter calculation
 */
function updateMetrics(list) {
  const total = list.length;
  const newCount = list.filter(i => (i.status || 'New').toLowerCase() === 'new').length;
  const inProgress = list.filter(i => (i.status || '').toLowerCase() === 'in progress' || (i.status || '').toLowerCase() === 'contacted').length;
  const completed = list.filter(i => (i.status || '').toLowerCase() === 'completed' || (i.status || '').toLowerCase() === 'closed').length;

  document.getElementById('metricTotal').textContent = total;
  document.getElementById('metricNew').textContent = newCount;
  document.getElementById('metricInProgress').textContent = inProgress;
  document.getElementById('metricCompleted').textContent = completed;
}

/**
 * Helper Utilities
 */
function getStatusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'new': return 'badge-status-new';
    case 'contacted': return 'badge-status-contacted';
    case 'in progress': return 'badge-status-in-progress';
    case 'completed': return 'badge-status-completed';
    case 'closed': return 'badge-status-closed';
    default: return 'badge-status-new';
  }
}

function formatDate(dateStr, full = false) {
  if (!dateStr) return 'Recent';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    if (full) {
      return d.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function formatUrl(url) {
  if (!url) return '#';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return 'https://' + url;
  }
  return url;
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updateLocalBackupStatus(id, newStatus) {
  try {
    const backupKey = 'maprank_local_inquiries_backup';
    const list = JSON.parse(localStorage.getItem(backupKey) || '[]');
    const item = list.find(i => i.id === id);
    if (item) {
      item.status = newStatus;
      localStorage.setItem(backupKey, JSON.stringify(list));
    }
  } catch (e) {}
}

function deleteFromLocalBackup(id) {
  try {
    const backupKey = 'maprank_local_inquiries_backup';
    const list = JSON.parse(localStorage.getItem(backupKey) || '[]');
    const filtered = list.filter(i => i.id !== id);
    localStorage.setItem(backupKey, JSON.stringify(filtered));
  } catch (e) {}
}
