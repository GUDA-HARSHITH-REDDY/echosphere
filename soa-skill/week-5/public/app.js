const clientOrigin = window.location.origin;
document.querySelector('#client-origin').textContent = clientOrigin.replace(/^https?:\/\//, '');

const renderResult = (port, state, label, message) => {
  const box = document.querySelector(`#response-${port}`);
  box.className = `response-box ${state}`;
  box.querySelector('.response-label').textContent = label;
  box.querySelector('.response-message').textContent = message;
};

const sendRequest = async (button) => {
  const port = button.dataset.port;
  button.disabled = true;
  button.querySelector('span:last-child').textContent = ' Requesting...';
  renderResult(port, 'loading', 'LISTENING', 'Browser is checking the response policy...');

  try {
    const response = await fetch(`http://localhost:${port}/profile`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const profile = await response.json();
    renderResult(port, 'success', '4001 · WORKING', `${profile.name} · ${profile.role}`);
  } catch (error) {
    const isCorsFailure = error instanceof TypeError;
    renderResult(port, 'failure', '4000 · ERROR', isCorsFailure ? 'CORS policy hid the response from this origin.' : error.message);
  } finally {
    button.disabled = false;
    button.querySelector('span:last-child').textContent = ' Send request';
  }
};

document.querySelectorAll('.run-button').forEach((button) => {
  button.addEventListener('click', () => sendRequest(button));
});
