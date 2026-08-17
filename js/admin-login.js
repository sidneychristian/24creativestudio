(function () {
  "use strict";
  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/jpeg";
  favicon.href = "../assets/24-creative-studio-logo.jpg?v=3";
  document.head.appendChild(favicon);
  const form = document.querySelector("#loginForm");
  const errorBox = document.querySelector("#loginError");
  const button = document.querySelector("#loginButton");
  const db = () => window.studio24Supabase;
  function error(message) { errorBox.textContent = message; }
  async function isAdmin(userId) {
    const { data, error: queryError } = await db().from("admins").select("user_id").eq("user_id", userId).maybeSingle();
    return !queryError && Boolean(data);
  }
  async function initialize() {
    if (!window.STUDIO24_SUPABASE_READY) { error("Configure primeiro a URL e a chave pública do Supabase no ficheiro js/config.js."); button.disabled = true; return; }
    const { data } = await db().auth.getSession();
    if (data.session && await isAdmin(data.session.user.id)) location.replace("index.html");
  }
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); error(""); button.disabled = true; button.textContent = "A verificar…";
    const email = document.querySelector("#loginEmail").value.trim(); const password = document.querySelector("#loginPassword").value;
    const { data, error: signInError } = await db().auth.signInWithPassword({ email, password });
    if (signInError || !data.session) { error("Email ou senha incorretos."); button.disabled = false; button.textContent = "Entrar no painel"; return; }
    if (!await isAdmin(data.session.user.id)) { await db().auth.signOut(); error("Este utilizador não está autorizado como administrador."); button.disabled = false; button.textContent = "Entrar no painel"; return; }
    location.replace("index.html");
  });
  initialize();
})();
