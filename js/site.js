(function () {
  "use strict";
  const favicon = document.createElement("link");
  favicon.rel = "icon";
  favicon.type = "image/jpeg";
  favicon.href = "assets/24-creative-studio-logo.jpg?v=3";
  document.head.appendChild(favicon);
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  let settings = { ...Store24.DEFAULTS };
  let toastTimer;
  function showToast(message) { const toast = $("#toast"); if (!toast) return; toast.textContent = message; toast.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove("show"), 3000); }
  function applySettings() {
    $$('[data-setting]').forEach((element) => {
      const key = element.dataset.setting; if (settings[key] == null) return;
      const value = String(settings[key]);
      if (key === "hero_title") {
        const lines = value.split(/\n/); element.innerHTML = `${Store24.esc(lines[0] || value)}${lines[1] ? `<br><em>${Store24.esc(lines.slice(1).join(" "))}</em>` : ""}`;
      } else if (key === "about_title") {
        const parts = value.split(/\s+/); const last = parts.pop(); element.innerHTML = `${Store24.esc(parts.join(" "))}<br><em>${Store24.esc(last || "")}</em>`;
      } else element.textContent = value;
    });
    const hero = $("#heroArt"); const heroUrl = Store24.safeUrl(settings.hero_image_url);
    if (hero && heroUrl) { hero.style.backgroundImage = `url("${heroUrl.replace(/["\\]/g, "")}")`; hero.classList.add("has-image"); }
    const logoUrl = Store24.safeUrl(settings.logo_url) || Store24.DEFAULTS.logo_url;
    if (logoUrl) {
      $$(".wordmark").forEach((wordmark) => { wordmark.innerHTML = `<span class="brand-logo-frame"><img class="brand-logo" src="${Store24.esc(logoUrl)}" alt="24 Creative Studio"></span>`; });
      $$(".footer-wordmark").forEach((wordmark) => { wordmark.innerHTML = `<span class="footer-logo-frame"><img src="assets/24-creative-studio-wordmark.jpeg" alt="24 Creative Studio"></span>`; });
      $$(".mobile-nav-inner>p").forEach((wordmark) => { wordmark.innerHTML = `<span class="mobile-menu-logo-frame"><img src="assets/24-creative-studio-wordmark.jpeg" alt="24 Creative Studio"></span>`; });
    }
    const whatsapp = String(settings.whatsapp || Store24.DEFAULTS.whatsapp).replace(/\D/g, "");
    $$('[data-whatsapp-link]').forEach((link) => { link.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent("Olá, gostaria de conhecer as peças disponíveis na 24 Creative Studio.")}`; });
    $$('[data-custom-whatsapp]').forEach((link) => { link.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent("Olá, gostaria de saber mais sobre personalização de peças na 24 Creative Studio.")}`; });
  }
  function openMenu() { $("#mobileNav")?.classList.add("open"); $("#mobileNav")?.setAttribute("aria-hidden", "false"); $("#menuToggle")?.setAttribute("aria-expanded", "true"); document.body.classList.add("locked"); }
  function closeMenu() { $("#mobileNav")?.classList.remove("open"); $("#mobileNav")?.setAttribute("aria-hidden", "true"); $("#menuToggle")?.setAttribute("aria-expanded", "false"); document.body.classList.remove("locked"); }
  function openCart() { $("#cartDrawer")?.classList.add("open"); $(".cart-scrim")?.classList.add("open"); $("#cartDrawer")?.setAttribute("aria-hidden", "false"); document.body.classList.add("locked"); renderCart(); }
  function closeCart() { $("#cartDrawer")?.classList.remove("open"); $(".cart-scrim")?.classList.remove("open"); $("#cartDrawer")?.setAttribute("aria-hidden", "true"); document.body.classList.remove("locked"); }
  function renderCart() {
    $$('[data-cart-count]').forEach((node) => node.textContent = Store24.cartCount());
    const container = $("#cartItems"); if (!container) return;
    const cart = Store24.getCart();
    if (!cart.length) { container.innerHTML = '<div class="cart-empty">A sua bag está vazia.<br>Explore as peças e escolha a sua.</div>'; $("#cartTotal").textContent = Store24.money(0); return; }
    container.innerHTML = cart.map((item) => `<article class="cart-item"><div class="cart-item-media">${item.image ? `<img src="${Store24.esc(Store24.safeUrl(item.image))}" alt="">` : '<div class="product-placeholder"></div>'}</div><div><h3>${Store24.esc(item.name)}</h3><p>Cor: ${Store24.esc(item.color)} · Tamanho: ${Store24.esc(item.size)}<br>${Store24.esc(Store24.money(item.price))}</p><div class="cart-item-row"><div class="cart-qty"><button data-cart-qty="-1" data-variant="${Store24.esc(item.variant_id)}">−</button><span>${item.quantity}</span><button data-cart-qty="1" data-variant="${Store24.esc(item.variant_id)}">+</button></div><button class="cart-remove" data-cart-remove="${Store24.esc(item.variant_id)}">Remover</button></div></div></article>`).join("");
    $("#cartTotal").textContent = Store24.money(Store24.cartTotal());
  }
  async function init() {
    settings = await Store24.loadSettings(); applySettings(); renderCart();
    const header = $("#siteHeader");
    if (header && !header.classList.contains("solid")) window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 80), { passive: true });
    $("#menuToggle")?.addEventListener("click", openMenu); $("#menuClose")?.addEventListener("click", closeMenu); $$("#mobileNav a").forEach((link) => link.addEventListener("click", closeMenu));
    $$('[data-open-cart]').forEach((button) => button.addEventListener("click", openCart)); $$('[data-cart-close]').forEach((button) => button.addEventListener("click", closeCart));
    document.addEventListener("click", (event) => { const qty = event.target.closest("[data-cart-qty]"); if (qty) Store24.updateCartItem(qty.dataset.variant, Number(qty.dataset.cartQty)); const remove = event.target.closest("[data-cart-remove]"); if (remove) Store24.removeCartItem(remove.dataset.cartRemove); });
    window.addEventListener("studio24:cart", renderCart);
    $("#checkoutButton")?.addEventListener("click", async (event) => { event.currentTarget.disabled = true; const result = await Store24.checkout(settings); showToast(result.message); event.currentTarget.disabled = false; });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeMenu(); closeCart(); } });
    return settings;
  }
  window.Studio24Site = { showToast, openCart, closeCart, getSettings: () => settings };
  window.studio24Ready = init();
})();
