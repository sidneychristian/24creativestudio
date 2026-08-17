(function () {
  "use strict";
  const WHATSAPP = "258840491113";
  const demoProducts = [
    { id: "demo-1", name: "Essência Noir", brand: "Conteúdo de demonstração", category: "Para Ele", volume: "—", price: null, description: "Produto demonstrativo. Substitua-o no painel administrativo.", scent_profile: "Intenso · Amadeirado", image_url: "assets/category.png", available: true, featured: true, is_new: false, demo: true },
    { id: "demo-2", name: "Lumière", brand: "Conteúdo de demonstração", category: "Para Ela", volume: "—", price: null, description: "Produto demonstrativo. Substitua-o no painel administrativo.", scent_profile: "Floral · Luminoso", image_url: "assets/editorial.png", available: true, featured: true, is_new: true, demo: true },
    { id: "demo-3", name: "Ambre Privé", brand: "Conteúdo de demonstração", category: "Unissexo", volume: "—", price: null, description: "Produto demonstrativo. Substitua-o no painel administrativo.", scent_profile: "Quente · Envolvente", image_url: "assets/hero.png", available: false, featured: true, is_new: false, demo: true }
  ];
  let products = [];
  let cart = readCart();

  const $ = (selector) => document.querySelector(selector);
  const money = (value) => value == null ? "Preço sob consulta" : new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 0 }).format(value);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
  const safeImage = (value) => {
    const src = String(value || "assets/category.png");
    return /^(https?:\/\/|assets\/)/i.test(src) ? src : "assets/category.png";
  };

  function readCart() {
    try { return JSON.parse(localStorage.getItem("belmiro-cart") || "[]"); }
    catch { return []; }
  }
  function saveCart() {
    localStorage.setItem("belmiro-cart", JSON.stringify(cart));
    renderCart();
  }
  function showToast(message) {
    document.querySelector(".toast")?.remove();
    const toast = document.createElement("div"); toast.className = "toast"; toast.textContent = message; document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }
  async function loadProducts() {
    const message = $("#catalogMessage");
    if (!window.BELMIRO_SUPABASE_READY) {
      products = demoProducts; message.textContent = "Catálogo de demonstração — configure o Supabase para carregar os produtos reais."; renderProducts(); return;
    }
    const { data, error } = await window.belmiroSupabase.from("products").select("*").eq("active", true).order("created_at", { ascending: false });
    if (error || !data?.length) {
      products = demoProducts;
      message.textContent = error ? "Não foi possível carregar o catálogo. A mostrar conteúdo de demonstração." : "O catálogo ainda está vazio. Adicione produtos no painel administrativo.";
    } else {
      products = data; message.textContent = "";
    }
    await loadCategories(); renderProducts();
  }
  async function loadCategories() {
    const select = $("#categoryFilter");
    let names = [...new Set(products.map((p) => p.category).filter(Boolean))];
    if (window.BELMIRO_SUPABASE_READY) {
      const { data } = await window.belmiroSupabase.from("categories").select("name").eq("active", true).order("sort_order");
      if (data?.length) names = [...new Set([...data.map((c) => c.name), ...names])];
    }
    select.innerHTML = '<option value="">Todas as categorias</option>' + names.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("");
  }
  function filteredProducts() {
    const query = $("#searchInput").value.trim().toLowerCase();
    const category = $("#categoryFilter").value;
    const availableOnly = $("#availableOnly").checked;
    return products.filter((p) => {
      const haystack = `${p.name || ""} ${p.brand || ""} ${p.category || ""}`.toLowerCase();
      const categoryMatch = !category || p.category === category || (category === "Novidades" && p.is_new);
      return (!query || haystack.includes(query)) && categoryMatch && (!availableOnly || p.available);
    });
  }
  function renderProducts() {
    const list = filteredProducts();
    const grid = $("#productGrid");
    if (!list.length) { grid.innerHTML = '<div class="catalog-message">Nenhuma fragrância encontrada. Experimente retirar um filtro.</div>'; return; }
    grid.innerHTML = list.map((p) => `<article class="product-card">
      <div class="product-image">${p.is_new ? '<span class="product-tag">Novo</span>' : ""}${!p.available ? '<span class="product-tag unavailable">Indisponível</span>' : ""}<img src="${escapeHtml(safeImage(p.image_url))}" alt="${escapeHtml(p.name)}" loading="lazy"></div>
      <div class="product-copy"><small>${escapeHtml(p.brand || "Belmiro Fragrâncias")}</small><h3>${escapeHtml(p.name)}</h3><div class="product-meta"><span>${escapeHtml(p.category || "Fragrância")}${p.volume ? ` · ${escapeHtml(p.volume)}` : ""}</span><strong>${escapeHtml(money(p.price))}</strong></div>${p.available ? `<button class="add-button" data-add="${escapeHtml(p.id)}">Adicionar ao pedido <span>+</span></button>` : `<a class="add-button" target="_blank" rel="noreferrer" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Olá, gostaria de perguntar a disponibilidade de ${p.name}.`)}">Perguntar disponibilidade <span>→</span></a>`}</div>
    </article>`).join("");
  }
  function addToCart(id) {
    const product = products.find((p) => String(p.id) === String(id)); if (!product) return;
    const found = cart.find((item) => String(item.product.id) === String(id));
    if (found) found.quantity += 1; else cart.push({ product, quantity: 1 });
    saveCart(); openCart(); showToast(`${product.name} adicionado ao pedido.`);
  }
  function updateQuantity(id, change) {
    const item = cart.find((entry) => String(entry.product.id) === String(id)); if (!item) return;
    item.quantity += change; if (item.quantity <= 0) cart = cart.filter((entry) => String(entry.product.id) !== String(id)); saveCart();
  }
  function renderCart() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0); $("#cartCount").textContent = count;
    const items = $("#cartItems");
    items.innerHTML = cart.length ? cart.map(({ product, quantity }) => `<div class="cart-item"><img src="${escapeHtml(safeImage(product.image_url))}" alt=""><div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(money(product.price))}</p><div class="cart-item-actions"><button data-qty="-1" data-id="${escapeHtml(product.id)}">−</button><span>${quantity}</span><button data-qty="1" data-id="${escapeHtml(product.id)}">+</button></div></div></div>`).join("") : '<div class="empty-cart">O carrinho está vazio.<br>Explore as fragrâncias e guarde as suas escolhas.</div>';
    const hasUnknown = cart.some((item) => item.product.price == null);
    const total = cart.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0);
    $("#cartTotal").textContent = hasUnknown || !cart.length ? "A confirmar" : money(total);
  }
  function openCart() { $("#cartDrawer").classList.add("open"); $("#cartScrim").classList.add("open"); $("#cartDrawer").setAttribute("aria-hidden", "false"); document.body.classList.add("locked"); }
  function closeCart() { $("#cartDrawer").classList.remove("open"); $("#cartScrim").classList.remove("open"); $("#cartDrawer").setAttribute("aria-hidden", "true"); document.body.classList.remove("locked"); }
  async function checkout() {
    if (!cart.length) { showToast("Adicione uma fragrância ao pedido."); return; }
    const hasUnknown = cart.some((item) => item.product.price == null);
    const total = cart.reduce((sum, item) => sum + Number(item.product.price || 0) * item.quantity, 0);
    const payload = cart.map((item) => ({ product_id: item.product.demo ? null : item.product.id, name: item.product.name, quantity: item.quantity, price: item.product.price }));
    if (window.BELMIRO_SUPABASE_READY) {
      await window.belmiroSupabase.from("orders").insert({ reference: `BF-${Date.now().toString(36).toUpperCase()}`, items: payload, total: hasUnknown ? null : total, source: "vercel-website", status: "Novo" });
    }
    const lines = cart.map((item) => `${item.quantity}x ${item.product.name}${item.product.price != null ? ` — ${money(item.product.price)}` : " — preço sob consulta"}`);
    const totalLine = hasUnknown ? "" : `\n\nTotal: ${money(total)}`;
    const text = `Olá, gostaria de fazer este pedido na Belmiro Fragrâncias:\n\n${lines.join("\n")}${totalLine}\n\nGostaria de confirmar disponibilidade.`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }
  function openMenu() { $("#mobileMenu").classList.add("open"); $("#mobileMenu").setAttribute("aria-hidden", "false"); }
  function closeMenu() { $("#mobileMenu").classList.remove("open"); $("#mobileMenu").setAttribute("aria-hidden", "true"); }

  document.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add]"); if (add) addToCart(add.dataset.add);
    const quantity = event.target.closest("[data-qty]"); if (quantity) updateQuantity(quantity.dataset.id, Number(quantity.dataset.qty));
    const category = event.target.closest("[data-category]"); if (category) { $("#categoryFilter").value = category.dataset.category; renderProducts(); $("#perfumes").scrollIntoView(); }
  });
  $("#searchInput").addEventListener("input", renderProducts); $("#categoryFilter").addEventListener("change", renderProducts); $("#availableOnly").addEventListener("change", renderProducts);
  $("#searchJump").addEventListener("click", () => { $("#perfumes").scrollIntoView(); setTimeout(() => $("#searchInput").focus(), 400); });
  $("#cartButton").addEventListener("click", openCart); $("#cartClose").addEventListener("click", closeCart); $("#cartScrim").addEventListener("click", closeCart); $("#checkoutButton").addEventListener("click", checkout);
  $("#menuButton").addEventListener("click", openMenu); $("#menuClose").addEventListener("click", closeMenu); $("#mobileMenu").querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  $("#giftCategory")?.addEventListener("click", () => window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Olá, procuro uma fragrância para oferecer. Podem ajudar-me a escolher?")}`, "_blank"));
  $("#mobileWhatsapp").addEventListener("click", () => window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Saudações, gostaria de adquirir o seguinte perfume")}`, "_blank"));
  renderCart(); loadProducts();
})();
