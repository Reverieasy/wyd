(function () {
  'use strict';
  const parameters = new URLSearchParams(window.location.search);
  new URLSearchParams(window.location.hash.slice(1)).forEach((value, key) => {
    if (!parameters.has(key)) parameters.set(key, value);
  });
  // The fragment never reaches the hosting server. Clear both URL forms before
  // checking the session, and never persist callback credentials in this browser.
  window.history.replaceState(null, '', window.location.pathname);
  const show = (status, title, message, detail) => {
    document.getElementById('status').textContent = status;
    document.getElementById('title').textContent = title;
    document.getElementById('message').textContent = message;
    document.getElementById('detail').textContent = detail;
  };
  const invalid = expired => show('Let’s try again', expired ? 'This link has expired' : 'We couldn’t confirm that link', 'Return to watchudoin? and request a new confirmation email.', 'Use the newest email. Confirmation links can only be used once.');
  async function confirm() {
    if (parameters.has('error') || parameters.has('error_code') || parameters.has('error_description')) {
      invalid((parameters.get('error_code') + ' ' + parameters.get('error_description')).toLowerCase().includes('expired'));
      for (const key of [...parameters.keys()]) parameters.delete(key);
      return;
    }
    const access = parameters.get('access_token'), refresh = parameters.get('refresh_token');
    parameters.delete('access_token'); parameters.delete('refresh_token');
    if (!access || !refresh || !['signup', 'email'].includes(parameters.get('type') || 'signup')) { invalid(false); return; }
    const config = window.WATCHUDOIN_AUTH;
    if (!config?.url || !config?.publishableKey) { invalid(false); return; }
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), 10000);
    try {
      const response = await fetch(config.url + '/auth/v1/user', { headers: { Authorization: 'Bearer ' + access, apikey: config.publishableKey }, signal: abort.signal, cache: 'no-store', referrerPolicy: 'no-referrer' });
      if (!response.ok) { invalid(response.status === 401); return; }
      const user = await response.json();
      if (!user.id || !user.email_confirmed_at) { invalid(false); return; }
      show('You’re all set', 'Account confirmed', 'You can close this now.', 'Reopen watchudoin? and sign in to continue.');
    } catch {
      show('Couldn’t check the link', 'Let’s reconnect', 'We couldn’t reach watchudoin? right now.', 'Check your connection and try signing in on your phone. If needed, request a new confirmation email.');
    } finally { clearTimeout(timer); }
  }
  void confirm();
}());
