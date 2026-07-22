import { supabase } from '@/lib/supabaseClient';

document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('login-section')!;
  const loggedInSection = document.getElementById('logged-in-section')!;
  const loginForm = document.getElementById('login-form') as HTMLFormElement;
  const loginError = document.getElementById('login-error')!;
  const userEmail = document.getElementById('user-email')!;
  const logoutBtn = document.getElementById('logout-btn')!;
  const loginBtn = document.getElementById('login-btn') as HTMLButtonElement;

  // --- Check existing session ---
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) showLoggedIn(session.user.email ?? session.user.id);
  });

  // --- React to auth changes (e.g. session refresh) ---
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      showLoggedIn(session.user.email ?? session.user.id);
    } else {
      showLoggedOut();
    }
  });

  // --- Login ---
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.hidden = true;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Logging in…';

    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    loginBtn.disabled = false;
    loginBtn.textContent = 'Log in';

    if (error) {
      loginError.textContent = error.message;
      loginError.hidden = false;
    }
    // Success handled by onAuthStateChange
  });

  // --- Logout ---
  logoutBtn.addEventListener('click', async () => {
    await supabase.auth.signOut();
    // onAuthStateChange handles UI update
  });

  function showLoggedIn(email: string) {
    userEmail.textContent = `Logged in as ${email}`;
    loginSection.hidden = true;
    loggedInSection.hidden = false;
  }

  function showLoggedOut() {
    loginSection.hidden = false;
    loggedInSection.hidden = true;
  }
});
