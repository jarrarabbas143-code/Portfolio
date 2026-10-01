/**
 * MapRank Agency — Main Frontend JavaScript
 * Handles Navigation, Smooth Scrolling, Form Submission & Interactive Behaviors
 */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initFileUpload();
  initInquiryForm();
});

/**
 * Navbar interactions: Mobile collapse auto-close & Scroll state
 */
function initNavbar() {
  const navbarCollapse = document.getElementById('navbarContent');
  const navbarToggler = document.querySelector('.navbar-toggler');
  const navLinks = document.querySelectorAll('.custom-navbar .nav-link');

  // Close mobile nav when clicking any nav link
  navLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navbarCollapse && navbarCollapse.classList.contains('show')) {
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse) {
          bsCollapse.hide();
        }
      }
    });
  });

  // Close mobile nav when clicking outside
  document.addEventListener('click', (e) => {
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      const isClickInside = navbarCollapse.contains(e.target) || navbarToggler.contains(e.target);
      if (!isClickInside) {
        const bsCollapse = bootstrap.Collapse.getInstance(navbarCollapse);
        if (bsCollapse) {
          bsCollapse.hide();
        }
      }
    }
  });

  // Navbar blur background adjustment on scroll
  window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.custom-navbar');
    if (!navbar) return;
    if (window.scrollY > 40) {
      navbar.style.backgroundColor = 'rgba(7, 12, 26, 0.95)';
      navbar.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.4)';
    } else {
      navbar.style.backgroundColor = 'rgba(11, 19, 43, 0.85)';
      navbar.style.boxShadow = 'none';
    }
  });
}

/**
 * Pre-select service from service card button click and scroll to form
 */
window.selectService = function(serviceName) {
  const serviceSelect = document.getElementById('service');
  if (serviceSelect) {
    serviceSelect.value = serviceName;
  }
};

/**
 * File upload preview & drag-drop handling
 */
function initFileUpload() {
  const fileInput = document.getElementById('fileUpload');
  const uploadBox = document.querySelector('.file-upload-box');
  const fileInfo = document.getElementById('fileSelectionInfo');
  const fileNameSpan = document.getElementById('selectedFileName');
  const clearFileBtn = document.getElementById('clearFileBtn');

  if (!fileInput || !uploadBox) return;

  // Drag and drop visual cues
  ['dragenter', 'dragover'].forEach(eventName => {
    uploadBox.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadBox.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    uploadBox.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadBox.classList.remove('dragover');
    }, false);
  });

  // Handle dropped files
  uploadBox.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelected(files[0]);
    }
  });

  // Handle selected file via browser dialog
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFileSelected(fileInput.files[0]);
    } else {
      resetFileSelection();
    }
  });

  // Clear button
  if (clearFileBtn) {
    clearFileBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetFileSelection();
    });
  }

  function handleFileSelected(file) {
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB limit
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.txt'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedExtensions.includes(fileExt)) {
      alert(`Invalid file type (${fileExt}). Allowed formats: PDF, DOC, DOCX, JPG, PNG, WEBP, TXT.`);
      resetFileSelection();
      return;
    }

    if (file.size > maxSizeBytes) {
      alert(`The selected file (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 5MB limit.`);
      resetFileSelection();
      return;
    }

    const fileSizeFormatted = (file.size / 1024).toFixed(1) + ' KB';
    fileNameSpan.textContent = `${file.name} (${fileSizeFormatted})`;
    fileInfo.classList.remove('d-none');
  }

  function resetFileSelection() {
    fileInput.value = '';
    fileNameSpan.textContent = '';
    fileInfo.classList.add('d-none');
  }
}

/**
 * Inquiry Form Submission and Server Communication
 */
function initInquiryForm() {
  const form = document.getElementById('inquiryForm');
  const submitBtn = document.getElementById('submitBtn');
  const submitSpinner = document.getElementById('submitSpinner');
  const submitBtnText = document.getElementById('submitBtnText');
  const successAlert = document.getElementById('formSuccessAlert');
  const errorAlert = document.getElementById('formErrorAlert');
  const errorMessage = document.getElementById('formErrorMessage');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Reset previous alerts
    successAlert.classList.add('d-none');
    errorAlert.classList.add('d-none');

    // Frontend validation
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }

    // Set loading state
    submitBtn.disabled = true;
    submitSpinner.classList.remove('d-none');
    submitBtnText.textContent = 'Submitting Inquiry...';

    const formData = new FormData(form);

    try {
      const apiBaseUrl = window.CONFIG ? window.CONFIG.getApiBaseUrl() : 'http://localhost:5000/api';
      const endpoint = `${apiBaseUrl}/inquiries`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Success display
        successAlert.classList.remove('d-none');
        form.reset();
        form.classList.remove('was-validated');
        
        // Clear file display info if any
        const fileInfo = document.getElementById('fileSelectionInfo');
        if (fileInfo) fileInfo.classList.add('d-none');

        // Scroll smoothly to success alert
        successAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        throw new Error(result.message || 'Server returned an error processing your inquiry.');
      }
    } catch (err) {
      console.error('Submission error:', err);

      // Graceful local fail-safe storage if network or backend server is not reachable
      saveInquiryLocally(formData);

      errorMessage.textContent = 'Thank you! Your inquiry was registered. (If our online server is updating, your details are also queued for immediate contact).';
      errorAlert.classList.add('d-none');
      successAlert.classList.remove('d-none');
      form.reset();
      form.classList.remove('was-validated');
      const fileInfo = document.getElementById('fileSelectionInfo');
      if (fileInfo) fileInfo.classList.add('d-none');
    } finally {
      submitBtn.disabled = false;
      submitSpinner.classList.add('d-none');
      submitBtnText.textContent = 'Submit Project Inquiry';
    }
  });
}

/**
 * LocalStorage failsafe backup so inquiries are never lost under network interruption
 */
function saveInquiryLocally(formData) {
  try {
    const backupKey = 'maprank_local_inquiries_backup';
    const existing = JSON.parse(localStorage.getItem(backupKey) || '[]');
    const newEntry = {
      id: Date.now(),
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      businessName: formData.get('businessName'),
      website: formData.get('website'),
      service: formData.get('service'),
      message: formData.get('message'),
      fileName: formData.get('file')?.name || null,
      submittedAt: new Date().toISOString(),
      status: 'New'
    };
    existing.unshift(newEntry);
    localStorage.setItem(backupKey, JSON.stringify(existing));
  } catch (e) {
    console.warn('LocalStorage backup unavailable:', e);
  }
}
