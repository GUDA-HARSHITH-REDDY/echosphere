let token = sessionStorage.getItem('bankingJwt') || '';
const $ = (id) => document.getElementById(id);

function message(id, text, error = false) {
  $(id).textContent = text;
  $(id).className = `message ${error ? 'error' : 'success'}`;
}

function authHeaders(value = token) {
  return value ? { Authorization: `Bearer ${value}` } : {};
}

function updateToken(value) {
  token = value || '';
  if (token) sessionStorage.setItem('bankingJwt', token);
  else sessionStorage.removeItem('bankingJwt');
  $('tokenPreview').textContent = token ? `${token.slice(0, 24)}...${token.slice(-12)}` : 'No token issued yet';
  $('tokenStatus').textContent = token ? 'TOKEN ACTIVE' : 'NO TOKEN';
  $('tokenStatus').classList.toggle('active', Boolean(token));
  $('loadAccount').disabled = !token;
  $('clearToken').disabled = !token;
  $('copyToken').disabled = !token;
  document.querySelector('[data-test="valid"]').disabled = !token;
  $('accessBadge').textContent = token ? 'AUTHENTICATED' : 'AUTH REQUIRED';
  $('accessBadge').classList.toggle('active', Boolean(token));
  $('accountState').classList.toggle('hidden', Boolean(token));
}

async function requestAccount(headers) {
  const response = await fetch('/account/details', { headers });
  const data = await response.json();
  return { response, data };
}

$('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    const response = await fetch('/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('email').value, password: $('password').value }) });
    const data = await response.json();
    if (!response.ok) return message('loginMessage', data.message, true);
    updateToken(data.token);
    message('loginMessage', `${data.message} Expires in ${data.expiresIn}.`);
    $('successBanner').classList.remove('hidden');
    await loadAccountDetails();
  } catch (error) { message('loginMessage', 'Server unavailable. Start the banking API on port 3001.', true); }
});

  $('registerForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const response = await fetch('/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('registerName').value, email: $('registerEmail').value, password: $('registerPassword').value }) });
      const data = await response.json();
      if (!response.ok) return message('registerMessage', data.message, true);
      $('email').value = $('registerEmail').value;
      $('password').value = $('registerPassword').value;
      $('registerForm').reset();
      message('registerMessage', data.message);
    } catch (error) { message('registerMessage', 'Server unavailable. Start the banking API on port 3001.', true); }
  });

async function loadAccountDetails() {
  const { response, data } = await requestAccount(authHeaders());
  if (!response.ok) return message('accountMessage', data.message, true);
    $('accountDetails').innerHTML = `<div><span>Account holder</span><strong>${data.account.owner}</strong></div><div><span>Registered email</span><strong>${data.account.email}</strong></div><div><span>Account status</span><strong class="balance">${data.account.accountStatus}</strong></div>`;
  $('accountDetails').classList.remove('hidden');
  message('accountMessage', `${data.message} Signature verified.`);
}

$('loadAccount').addEventListener('click', loadAccountDetails);

$('copyToken').addEventListener('click', async () => { try { await navigator.clipboard.writeText(token); $('copyMessage').textContent = 'Copied'; setTimeout(() => { $('copyMessage').textContent = ''; }, 1800); } catch (error) { $('copyMessage').textContent = 'Copy unavailable'; } });

$('clearToken').addEventListener('click', () => { updateToken(''); $('successBanner').classList.add('hidden'); $('accountDetails').classList.add('hidden'); message('accountMessage', 'Token cleared. Protected data is locked again.'); });

document.querySelectorAll('.test-button').forEach((button) => button.addEventListener('click', async () => {
  const kind = button.dataset.test;
  let testToken = token;
  if (kind === 'invalid') testToken = 'eyJhbGciOiJIUzI1NiJ9.invalid.signature';
  if (kind === 'expired') testToken = (await (await fetch('/demo/expired-token')).json()).token;
  const headers = kind === 'missing' ? {} : authHeaders(testToken);
  const { response, data } = await requestAccount(headers);
  const expected = kind === 'valid' ? response.ok : response.status === 401;
  $('testResult').className = `test-result ${expected ? 'passed' : 'failed'}`;
  $('testResult').textContent = `${expected ? 'PASS' : 'FAIL'} · HTTP ${response.status} · ${data.message || 'Account details returned.'}`;
}));

updateToken(token);
if (token) loadAccountDetails();
