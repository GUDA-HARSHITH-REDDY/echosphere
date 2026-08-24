const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const jobForm = document.getElementById('jobForm');
const applyForm = document.getElementById('applyForm');
const resetForm = document.getElementById('resetForm');
const jobSelect = document.getElementById('jobSelect');

function showMessage(elementId, message, isError = false) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.classList.remove('success', 'error');
  el.classList.add(isError ? 'error' : 'success');
}

function setActivePanel(targetId) {
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === targetId);
  });

  document.querySelectorAll('.nav-link').forEach((button) => {
    button.classList.toggle('active', button.dataset.target === targetId);
  });
}

document.querySelectorAll('.nav-link').forEach((button) => {
  button.addEventListener('click', () => setActivePanel(button.dataset.target));
});

async function fetchJobs() {
  try {
    const response = await fetch('/jobs');
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to load jobs');
    }

    const list = document.getElementById('jobList');
    const jobOptions = document.getElementById('jobSelect');

    if (list) {
      list.innerHTML = '';
      if (!data.jobs.length) {
        list.innerHTML = '<div class="job-item"><p>No jobs available yet.</p></div>';
        return;
      }

      data.jobs.forEach((job) => {
        const item = document.createElement('div');
        item.className = 'job-item';
        item.innerHTML = `
          <h3>${job.title}</h3>
          <p><strong>${job.company}</strong> • ${job.location}</p>
          <p>${job.salary || 'Salary not disclosed'}</p>
          <p>${job.description}</p>
        `;
        list.appendChild(item);
      });
    }

    if (jobOptions) {
      jobOptions.innerHTML = '<option value="">Select a job</option>' +
        data.jobs.map((job) => `<option value="${job.id}">${job.title} - ${job.company}</option>`).join('');
    }
  } catch (error) {
    const list = document.getElementById('jobList');
    if (list) {
      list.innerHTML = '<div class="job-item"><p>Unable to load jobs.</p></div>';
    }
  }
}

async function fetchAdminStats() {
  try {
    const response = await fetch('/admin/stats');
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Unable to load dashboard');
    }

    document.getElementById('totalUsers').textContent = data.stats.totalUsers;
    document.getElementById('totalJobs').textContent = data.stats.totalJobs;
    document.getElementById('totalApplications').textContent = data.stats.totalApplications;

    const recentJobs = document.getElementById('recentJobs');
    recentJobs.innerHTML = data.recentJobs.length ? data.recentJobs.map((job) => `
      <div class="mini-item">
        <h3>${job.title}</h3>
        <p>${job.company}</p>
        <p>${new Date(job.created_at).toLocaleDateString()}</p>
      </div>
    `).join('') : '<div class="mini-item"><p>No recent jobs.</p></div>';

    const recentApplications = document.getElementById('recentApplications');
    recentApplications.innerHTML = data.recentApplications.length ? data.recentApplications.map((app) => `
      <div class="mini-item">
        <h3>${app.job_title}</h3>
        <p>${app.full_name} • ${app.email}</p>
        <p>${new Date(app.created_at).toLocaleDateString()}</p>
      </div>
    `).join('') : '<div class="mini-item"><p>No recent applications.</p></div>';
  } catch (error) {
    document.getElementById('recentJobs').innerHTML = '<div class="mini-item"><p>Unable to load recent jobs.</p></div>';
    document.getElementById('recentApplications').innerHTML = '<div class="mini-item"><p>Unable to load recent applications.</p></div>';
  }
}

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    try {
      const response = await fetch('/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage('registerMessage', data.message || 'Registration failed.', true);
        return;
      }

      showMessage('registerMessage', data.message || 'Registration successful!', false);
      registerForm.reset();
    } catch (error) {
      showMessage('registerMessage', 'The server is unavailable. Please try again.', true);
    }
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
      const response = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage('loginMessage', data.message || 'Login failed.', true);
        return;
      }

      showMessage('loginMessage', `${data.message} Welcome, ${data.user.username}!`, false);
      loginForm.reset();
      setActivePanel('jobs-section');
      fetchJobs();
    } catch (error) {
      showMessage('loginMessage', 'The server is unavailable. Please try again.', true);
    }
  });
}

if (jobForm) {
  jobForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const payload = {
      title: document.getElementById('jobTitle').value.trim(),
      company: document.getElementById('jobCompany').value.trim(),
      location: document.getElementById('jobLocation').value.trim(),
      salary: document.getElementById('jobSalary').value.trim(),
      description: document.getElementById('jobDescription').value.trim()
    };

    try {
      const response = await fetch('/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage('jobMessage', data.message || 'Job posting failed.', true);
        return;
      }

      showMessage('jobMessage', data.message || 'Job posted successfully.', false);
      jobForm.reset();
      fetchJobs();
      fetchAdminStats();
    } catch (error) {
      showMessage('jobMessage', 'Unable to post job right now.', true);
    }
  });
}

if (applyForm) {
  applyForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const jobId = jobSelect.value;
    const payload = {
      fullName: document.getElementById('applicantName').value.trim(),
      email: document.getElementById('applicantEmail').value.trim(),
      resume: document.getElementById('applicantResume').value.trim()
    };

    if (!jobId) {
      showMessage('applyMessage', 'Please select a job before applying.', true);
      return;
    }

    try {
      const response = await fetch(`/jobs/${jobId}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage('applyMessage', data.message || 'Application failed.', true);
        return;
      }

      showMessage('applyMessage', data.message || 'Application submitted.', false);
      applyForm.reset();
      fetchAdminStats();
    } catch (error) {
      showMessage('applyMessage', 'Unable to submit application right now.', true);
    }
  });
}

if (resetForm) {
  resetForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('resetEmail').value.trim();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    try {
      const response = await fetch('/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword, confirmPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage('resetMessage', data.message || 'Password reset failed.', true);
        return;
      }

      showMessage('resetMessage', data.message || 'Password reset successful.', false);
      resetForm.reset();
    } catch (error) {
      showMessage('resetMessage', 'Unable to reset password right now.', true);
    }
  });
}

fetchJobs();
fetchAdminStats();
