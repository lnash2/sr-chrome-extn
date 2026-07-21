document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('login-section')!;
  const loggedInSection = document.getElementById('logged-in-section')!;
  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const loginError = document.getElementById('login-error')!;
  const userEmail = document.getElementById('user-email')!;
  const logoutBtn = document.getElementById('logout-btn')!;

  // Check stored session on open
  chrome.storage.local.get(['sr_user_email'], (result) => {
    if (result.sr_user_email) {
      showLoggedIn(result.sr_user_email);
    }
  });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = (document.getElementById('email') as HTMLInputElement).value;
    // Phase 1 stub — real auth in Phase 3
    loginError.hidden = true;
    chrome.storage.local.set({ sr_user_email: email }, () => {
      showLoggedIn(email);
    });
  });

  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['sr_user_email'], () => {
      loginSection.hidden = false;
      loggedInSection.hidden = true;
    });
  });

  function showLoggedIn(email: string) {
    userEmail.textContent = `Logged in as ${email}`;
    loginSection.hidden = true;
    loggedInSection.hidden = false;
  }
});
