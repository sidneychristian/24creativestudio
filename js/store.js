(function () {
  "use strict";
  const CART_KEY = "studio24-cart-v1";
  const DEFAULTS = {
    whatsapp: "258876778476",
    instagram: "24_creativestudio",
    delivery_days: 2,
    delivery_fee: null,
    delivery_zones: "",
    delivery_text: "Depois da confirmação do pedido, pode esperar receber as suas peças num prazo máximo de 2 dias.",
    hero_eyebrow: "NEW DROP / 2026",
    hero_title: "Creativity\nat its finest.",
    hero_copy: "Culture, style and intentional pieces manufactured in Maputo.",
    hero_image_url: "",
    logo_url: "",
    about_title: "Creativity, culture and style.",
    about_copy: "A 24 Creative Studio é uma marca de roupa orientada pela criatividade, cultura e estilo. As peças são produzidas em Maputo e pensadas como formas de expressão."
  };
  const demoProducts = [
    demoProduct("demo-tee", "Peça de demonstração 01", "T-Shirts", "#f2f0ec", true),
    demoProduct("demo-hoodie", "Peça de demonstração 02", "Hoodies", "#151515", true),
    demoProduct("demo-crewneck", "Peça de demonstração 03", "Crewnecks", "#7d0019", false),
    demoProduct("demo-cap", "Peça de demonstração 04", "Caps", "#e5c687", false)
  ];

  function demoProduct(id, name, category, color, isNew) {
    return {
      id, slug: id, name, description: "Conteúdo de demonstração. Cadastre a peça real no painel administrativo.",
      details: "Esta ficha existe apenas para demonstrar o layout do produto.", price: null, sale_price: null,
      sku: null, active: true, featured: true, new_drop: isNew, personalization_available: false, demo: true,
      category: { id: `cat-${id}`, name: category, slug: category.toLowerCase() }, collection: null,
      images: [], variants: [{ id: `var-${id}`, stock: 0, active: true, color: { id: `color-${id}`, name: "Demonstração", hex_code: color }, size: { id: `size-${id}`, name: "—", sort_order: 0 } }], available: false
    };
  }
  const db = () => window.studio24Supabase;
  const isReady = () => Boolean(window.STUDIO24_SUPABASE_READY && db());
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
  const money = (value) => value == null ? "Adicionar preço" : new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 0 }).format(Number(value));
  const safeUrl = (value) => /^(https?:\/\/|assets\/)/i.test(String(value || "")) ? String(value) : "";
  const slugify = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 90);

  function normalizeProduct(product) {
    const images = (product.images || []).slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    const variants = (product.variants || []).filter((variant) => variant.active !== false).sort((a, b) => Number(a.size?.sort_order || 0) - Number(b.size?.sort_order || 0));
    return { ...product, images, variants, available: variants.some((variant) => Number(variant.stock || 0) > 0) };
  }
  async function loadSettings() {
    if (!isReady()) return { ...DEFAULTS };
    const { data, error } = await db().from("site_settings").select("key,value");
    if (error) return { ...DEFAULTS };
    return (data || []).reduce((settings, row) => {
      settings[row.key] = row.value;
      return settings;
    }, { ...DEFAULTS });
  }
  async function loadCatalog() {
    if (!isReady()) return demoProducts;
    const { data, error } = await db().from("products").select(`
      *,
      category:categories(id,name,slug),
      collection:collections(id,name,slug),
      images:product_images(id,url,alt_text,sort_order,is_primary,color_id),
      variants:product_variants(id,sku,stock,active,color:colors(id,name,hex_code,sort_order),size:sizes(id,name,sort_order))
    `).eq("active", true).order("created_at", { ascending: false });
    if (error || !data?.length) return demoProducts;
    return data.map(normalizeProduct);
  }
  async function loadProduct(slug) {
    if (!isReady()) return demoProducts.find((product) => product.slug === slug) || demoProducts[0];
    const { data, error } = await db().from("products").select(`
      *,
      category:categories(id,name,slug),
      collection:collections(id,name,slug),
      images:product_images(id,url,alt_text,sort_order,is_primary,color_id),
      variants:product_variants(id,sku,stock,active,color:colors(id,name,hex_code,sort_order),size:sizes(id,name,sort_order))
    `).eq("slug", slug).eq("active", true).maybeSingle();
    if (error || !data) return null;
    return normalizeProduct(data);
  }
  async function loadOptions() {
    if (!isReady()) {
      return {
        categories: ["T-Shirts", "Hoodies", "Crewnecks", "Caps"].map((name, index) => ({ id: `demo-c${index}`, name, slug: slugify(name), sort_order: index })),
        colors: [{ id: "demo-black", name: "Black", hex_code: "#000000" }, { id: "demo-burgundy", name: "Burgundy", hex_code: "#7d0019" }],
        sizes: ["XS", "S", "M", "L", "XL", "XXL"].map((name, index) => ({ id: `demo-s${index}`, name, sort_order: index }))
      };
    }
    const [categories, colors, sizes] = await Promise.all([
      db().from("categories").select("*").eq("active", true).order("sort_order"),
      db().from("colors").select("*").eq("active", true).order("sort_order"),
      db().from("sizes").select("*").eq("active", true).order("sort_order")
    ]);
    return { categories: categories.data || [], colors: colors.data || [], sizes: sizes.data || [] };
  }
  function primaryImage(product, colorId) {
    const colorImages = colorId ? product.images.filter((image) => image.color_id === colorId) : [];
    const list = colorImages.length ? colorImages : product.images;
    return list.find((image) => image.is_primary) || list[0] || null;
  }
  function productCard(product) {
    const images = product.images || [];
    const first = primaryImage(product);
    const second = images.find((image) => image.id !== first?.id);
    const price = product.sale_price != null ? `<del>${esc(money(product.price))}</del>${esc(money(product.sale_price))}` : esc(money(product.price));
    const media = first?.url ? `<img class="primary" src="${esc(safeUrl(first.url))}" alt="${esc(first.alt_text || product.name)}" loading="lazy">${second?.url ? `<img class="secondary" src="${esc(safeUrl(second.url))}" alt="" loading="lazy">` : ""}` : '<div class="product-placeholder"></div>';
    const colors = [...new Map((product.variants || []).filter((v) => v.color).map((v) => [v.color.id, v.color])).values()];
    const href = `product.html?slug=${encodeURIComponent(product.slug)}`;
    return `<article class="product-card" data-product-id="${esc(product.id)}"><a class="product-media" href="${href}">${product.new_drop ? '<span class="product-badge">New drop</span>' : ""}${media}<span class="product-hover">Ver peça</span></a><div class="product-card-copy"><div><h3><a href="${href}">${esc(product.name)}</a></h3><span class="product-card-price">${price}</span></div><div class="product-card-meta"><span>${esc(product.category?.name || "24 Creative Studio")}</span><span class="swatches">${colors.slice(0, 5).map((color) => `<i class="swatch" style="background:${esc(color.hex_code || "#999")}" title="${esc(color.name)}"></i>`).join("")}</span></div></div></article>`;
  }
  function readCart() {
    try { const value = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }
  let cart = readCart();
  function writeCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); window.dispatchEvent(new CustomEvent("studio24:cart")); }
  function cartCount() { return cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0); }
  function cartTotal() { return cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0); }
  function addCartItem(item) {
    if (item.demo) return { ok: false, message: "Cadastre as peças reais antes de receber pedidos." };
    const existing = cart.find((entry) => entry.variant_id === item.variant_id);
    const currentQty = existing?.quantity || 0;
    if (currentQty + item.quantity > item.stock) return { ok: false, message: "A quantidade escolhida ultrapassa o stock disponível." };
    if (existing) existing.quantity += item.quantity; else cart.push(item);
    writeCart(); return { ok: true, message: "Peça adicionada à bag." };
  }
  function updateCartItem(variantId, delta) {
    const item = cart.find((entry) => entry.variant_id === variantId); if (!item) return;
    const next = item.quantity + delta;
    if (next <= 0) cart = cart.filter((entry) => entry.variant_id !== variantId);
    else if (next <= item.stock) item.quantity = next;
    writeCart();
  }
  function removeCartItem(variantId) { cart = cart.filter((entry) => entry.variant_id !== variantId); writeCart(); }
  async function checkout(settings) {
    if (!cart.length) return { ok: false, message: "A bag está vazia." };
    const orderItems = cart.map((item) => ({ product_id: item.product_id, variant_id: item.variant_id, product_name: item.name, color_name: item.color, size_name: item.size, quantity: item.quantity, unit_price: item.price }));
    let orderNumber = `24-${Date.now().toString(36).toUpperCase()}`;
    if (isReady()) {
      const { data, error } = await db().rpc("create_public_order", { p_items: orderItems, p_total: cartTotal(), p_customer_name: null, p_customer_phone: null, p_delivery_zone: null, p_notes: null, p_source: "vercel-web" });
      if (error || !data?.[0]?.order_number) return { ok: false, message: "Não foi possível registar o pedido. Confirme o stock e tente novamente." };
      orderNumber = data[0].order_number;
    }
    const lines = cart.map((item) => `*${item.quantity}x ${item.name}*\nCor: ${item.color}\nTamanho: ${item.size}\nPreço: ${money(item.price)}`);
    const message = `Olá, gostaria de fazer este pedido na 24 Creative Studio:\n\nPedido: *${orderNumber}*\n\n${lines.join("\n\n")}\n\n*Total: ${money(cartTotal())}*\n\nGostaria de confirmar o pedido e a entrega.`;
    window.open(`https://wa.me/${settings.whatsapp || DEFAULTS.whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    return { ok: true, message: "Pedido preparado no WhatsApp." };
  }
  window.Store24 = { DEFAULTS, demoProducts, db, isReady, esc, money, safeUrl, slugify, loadSettings, loadCatalog, loadProduct, loadOptions, primaryImage, productCard, getCart: () => cart, cartCount, cartTotal, addCartItem, updateCartItem, removeCartItem, checkout };
})();
