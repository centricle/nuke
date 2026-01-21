const domainInput = document.getElementById('domain-input');
const addBtn = document.getElementById('add-btn');
const whitelistEl = document.getElementById('whitelist');
const nukeBtn = document.getElementById('nuke-btn');
const statusEl = document.getElementById('status');

async function loadWhitelist() {
  const { whitelist = [] } = await chrome.storage.sync.get('whitelist');
  renderWhitelist(whitelist);
}

function renderWhitelist(whitelist) {
  if (whitelist.length === 0) {
    whitelistEl.innerHTML = '<div class="empty-state">No domains excluded.</div>';
    return;
  }

  whitelistEl.innerHTML = whitelist.map(domain => `
    <div class="whitelist-item">
      <span>${domain}</span>
      <button class="remove-btn" data-domain="${domain}">Remove</button>
    </div>
  `).join('');

  whitelistEl.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => removeDomain(btn.dataset.domain));
  });
}

async function addDomain() {
  let domain = domainInput.value.trim().toLowerCase();
  if (!domain) return;

  // Strip protocol if user included it
  domain = domain.replace(/^https?:\/\//, '');

  // Normalize: strip www. prefix (we generate both variants when nuking)
  domain = domain.replace(/^www\./, '');

  const { whitelist = [] } = await chrome.storage.sync.get('whitelist');

  if (whitelist.includes(domain)) {
    showStatus('Domain already in whitelist');
    return;
  }

  whitelist.push(domain);
  await chrome.storage.sync.set({ whitelist });

  domainInput.value = '';
  renderWhitelist(whitelist);
}

async function removeDomain(domain) {
  const { whitelist = [] } = await chrome.storage.sync.get('whitelist');
  const filtered = whitelist.filter(d => d !== domain);
  await chrome.storage.sync.set({ whitelist: filtered });
  renderWhitelist(filtered);
}

async function nuke() {
  const { whitelist = [] } = await chrome.storage.sync.get('whitelist');

  const excludeOrigins = whitelist.flatMap(domain => [
    `https://${domain}`,
    `http://${domain}`,
    `https://www.${domain}`,
    `http://www.${domain}`
  ]);

  await chrome.browsingData.remove(
    { excludeOrigins },
    {
      cookies: true,
      localStorage: true,
      indexedDB: true,
      cacheStorage: true,
      serviceWorkers: true
    }
  );

  showStatus(`Nuked! Kept ${whitelist.length} whitelisted domain(s)`);
}

function showStatus(message) {
  statusEl.textContent = message;
  statusEl.classList.add('show');
  setTimeout(() => statusEl.classList.remove('show'), 3500);
}

addBtn.addEventListener('click', addDomain);
domainInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addDomain();
});
nukeBtn.addEventListener('click', nuke);

loadWhitelist();
