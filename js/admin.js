(function () {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const db = () => window.studio24Supabase;
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]);
  const money = (value) => value == null ? "—" : new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", maximumFractionDigits: 0 }).format(Number(value));
  const slugify = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100);
  let products = [], categories = [], collections = [], colors = [], sizes = [], orders = [], settings = {}, currentProduct = null;
  const orderStatuses = ["Novo", "Confirmado", "Em preparação", "Saiu para entrega", "Entregue", "Cancelado"];
  const titles = { overview: "Visão geral", products: "Produtos", inventory: "Stock", catalog: "Catálogo", orders: "Pedidos", settings: "Website" };
  let messageTimer;
  function message(text, isError = false) { const box = $("#adminMessage"); box.textContent = text; box.classList.toggle("error", isError); clearTimeout(messageTimer); messageTimer = setTimeout(() => { if (box.textContent === text) box.textContent = ""; }, 4500); }
  async function verifyAccess() {
    if (!window.STUDIO24_SUPABASE_READY) return false;
    const { data } = await db().auth.getSession(); if (!data.session) return false;
    const { data: admin, error } = await db().from("admins").select("user_id").eq("user_id", data.session.user.id).maybeSingle();
    return !error && Boolean(admin);
  }
  function switchTab(tab) {
    $$(".admin-tab").forEach((section) => section.hidden = section.id !== `tab-${tab}`);
    $$("[data-tab]").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
    $("#adminTitle").textContent = titles[tab] || "Administração";
  }
  async function loadAll() {
    const [p, c, col, color, size, order, setting] = await Promise.all([
      db().from("products").select(`*,category:categories(id,name,slug),collection:collections(id,name,slug),images:product_images(id,url,alt_text,sort_order,is_primary,color_id),variants:product_variants(id,sku,stock,active,color:colors(id,name,hex_code,sort_order),size:sizes(id,name,sort_order))`).order("created_at", { ascending: false }),
      db().from("categories").select("*").order("sort_order"), db().from("collections").select("*").order("sort_order"), db().from("colors").select("*").order("sort_order"), db().from("sizes").select("*").order("sort_order"),
      db().from("orders").select("*,items:order_items(*)").order("created_at", { ascending: false }).limit(200), db().from("site_settings").select("key,value")
    ]);
    const firstError = p.error || c.error || col.error || color.error || size.error || order.error || setting.error;
    if (firstError) message(firstError.message, true);
    products = (p.data || []).map((product) => ({ ...product, images: (product.images || []).sort((a, b) => Number(a.sort_order) - Number(b.sort_order)), variants: product.variants || [] }));
    categories = c.data || []; collections = col.data || []; colors = color.data || []; sizes = size.data || []; orders = order.data || []; settings = (setting.data || []).reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    renderAll();
  }
  function stockOf(product) { return (product.variants || []).reduce((sum, variant) => sum + Number(variant.stock || 0), 0); }
  function primaryImage(product) { return product.images?.find((image) => image.is_primary) || product.images?.[0]; }
  function productRows(list, actions = true) {
    return list.map((product) => `<tr><td>${primaryImage(product)?.url ? `<img src="${esc(primaryImage(product).url)}" alt="">` : '<span class="status">Sem imagem</span>'}</td><td><strong>${esc(product.name)}</strong><br><small>${esc(product.sku || "Sem SKU")}</small></td><td>${esc(product.category?.name || "—")}</td>${actions ? `<td>${esc(product.sale_price != null ? money(product.sale_price) : money(product.price))}</td>` : ""}<td>${stockOf(product)}</td><td><span class="status ${product.active ? "active" : ""}">${product.active ? "Visível" : "Oculto"}</span></td>${actions ? `<td><button data-edit-product="${esc(product.id)}">Editar</button> · <button data-duplicate-product="${esc(product.id)}">Duplicar</button> · <button class="danger" data-delete-product="${esc(product.id)}">Apagar</button></td>` : ""}</tr>`).join("");
  }
  function orderRows(list) {
    return list.map((order) => `<tr><td><strong>${esc(order.order_number)}</strong></td><td>${new Date(order.created_at).toLocaleDateString("pt-MZ")}</td><td>${(order.items || []).map((item) => `${item.quantity}× ${esc(item.product_name)} (${esc(item.color_name || "—")}/${esc(item.size_name || "—")})`).join("<br>") || "—"}</td><td>${esc(money(order.total))}</td><td><select class="order-status" data-order-status="${esc(order.id)}">${orderStatuses.map((status) => `<option${order.status === status ? " selected" : ""}>${status}</option>`).join("")}</select></td><td>${esc(order.customer_phone || "WhatsApp")}</td></tr>`).join("");
  }
  function simpleList(items, table, includeColor = false) {
    return items.map((item) => `<div><span>${includeColor ? `<i class="color-dot" style="background:${esc(item.hex_code)}"></i>` : ""}${esc(item.name)}</span><button data-delete-collection="${table}" data-id="${esc(item.id)}">Remover</button></div>`).join("") || '<div class="admin-empty">Nenhum item cadastrado.</div>';
  }
  function renderSelects() {
    $("#pCategory").innerHTML = '<option value="">Sem categoria</option>' + categories.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("");
    $("#pCollection").innerHTML = '<option value="">Sem coleção</option>' + collections.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("");
    $("#imageColor").innerHTML = '<option value="">Todas as cores</option>' + colors.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("");
    $("#inventoryProduct").innerHTML = '<option value="">Selecionar produto</option>' + products.map((product) => `<option value="${esc(product.id)}">${esc(product.name)}</option>`).join("");
  }
  function renderSettings() {
    $("#settingWhatsapp").value = settings.whatsapp ?? "258876778476"; $("#settingInstagram").value = settings.instagram ?? "24_creativestudio"; $("#settingDeliveryDays").value = settings.delivery_days ?? 2; $("#settingDeliveryFee").value = settings.delivery_fee ?? ""; $("#settingDeliveryZones").value = settings.delivery_zones ?? ""; $("#settingDeliveryText").value = settings.delivery_text ?? "Depois da confirmação do pedido, pode esperar receber as suas peças num prazo máximo de 2 dias."; $("#settingHeroEyebrow").value = settings.hero_eyebrow ?? "NEW DROP / 2026"; $("#settingHeroTitle").value = settings.hero_title ?? "Creativity\nat its finest."; $("#settingHeroCopy").value = settings.hero_copy ?? "Culture, style and intentional pieces manufactured in Maputo."; $("#settingHeroImage").value = settings.hero_image_url ?? ""; $("#settingAboutTitle").value = settings.about_title ?? "Creativity, culture and style."; $("#settingAboutCopy").value = settings.about_copy ?? "";
  }
  function renderAll() {
    const totalVariants = products.reduce((sum, product) => sum + product.variants.length, 0); const soldOut = products.filter((product) => stockOf(product) <= 0).length; const newOrders = orders.filter((order) => order.status === "Novo").length;
    $("#statProducts").textContent = products.length; $("#statVariants").textContent = totalVariants; $("#statSoldOut").textContent = soldOut; $("#statOrders").textContent = newOrders;
    $("#recentOrders").innerHTML = orderRows(orders.slice(0, 5)) || '<tr><td colspan="5"><div class="admin-empty">Ainda não existem pedidos.</div></td></tr>';
    $("#recentProducts").innerHTML = productRows(products.slice(0, 5), false) || '<tr><td colspan="5"><div class="admin-empty">Adicione a primeira peça.</div></td></tr>';
    $("#productTable").innerHTML = productRows(products) || '<tr><td colspan="7"><div class="admin-empty">Adicione a primeira peça.</div></td></tr>'; $("#productCount").textContent = `${products.length} peças`;
    $("#orderTable").innerHTML = orderRows(orders) || '<tr><td colspan="6"><div class="admin-empty">Ainda não existem pedidos.</div></td></tr>'; $("#orderCount").textContent = `${orders.length} registos`;
    $("#categoryList").innerHTML = simpleList(categories, "categories"); $("#collectionList").innerHTML = simpleList(collections, "collections"); $("#colorList").innerHTML = simpleList(colors, "colors", true); $("#sizeList").innerHTML = simpleList(sizes, "sizes");
    renderSelects(); renderSettings();
  }
  function openProduct(product = null) {
    currentProduct = product; $("#productForm").reset(); $("#productId").value = product?.id || ""; $("#productDrawerTitle").textContent = product ? "Editar peça" : "Nova peça"; $("#pName").value = product?.name || ""; $("#pSlug").value = product?.slug || ""; $("#pSku").value = product?.sku || ""; $("#pCategory").value = product?.category_id || ""; $("#pCollection").value = product?.collection_id || ""; $("#pPrice").value = product?.price ?? ""; $("#pSalePrice").value = product?.sale_price ?? ""; $("#pDescription").value = product?.description || ""; $("#pDetails").value = product?.details || ""; $("#pActive").checked = product?.active ?? true; $("#pFeatured").checked = product?.featured ?? false; $("#pNewDrop").checked = product?.new_drop ?? false; $("#pPersonalization").checked = product?.personalization_available ?? false; renderImageManager(product); $("#productDrawer").classList.add("open"); $("#drawerScrim").classList.add("open"); $("#productDrawer").setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden";
  }
  function closeProduct() { $("#productDrawer").classList.remove("open"); $("#drawerScrim").classList.remove("open"); $("#productDrawer").setAttribute("aria-hidden", "true"); document.body.style.overflow = ""; currentProduct = null; }
  function renderImageManager(product) {
    const images = product?.images || [];
    $("#imageManager").innerHTML = images.length ? images.map((image) => `<article class="image-admin-card"><img src="${esc(image.url)}" alt=""><div><button data-image-primary="${esc(image.id)}">${image.is_primary ? "Principal ✓" : "Tornar principal"}</button><button data-image-move="up" data-id="${esc(image.id)}">↑</button><button data-image-move="down" data-id="${esc(image.id)}">↓</button><button class="danger" data-image-delete="${esc(image.id)}">Remover</button></div></article>`).join("") : '<div class="admin-empty">As imagens aparecem aqui depois de guardar a peça.</div>';
  }
  async function uploadImages(productId, files, colorId) {
    if (!files.length) return;
    const existing = products.find((product) => product.id === productId)?.images?.length || 0;
    for (let index = 0; index < files.length; index++) {
      const file = files[index]; if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} ultrapassa 8 MB.`);
      const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, ""); const path = `products/${productId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await db().storage.from("product-images").upload(path, file, { cacheControl: "31536000", upsert: false }); if (uploadError) throw uploadError;
      const url = db().storage.from("product-images").getPublicUrl(path).data.publicUrl;
      const { error } = await db().from("product_images").insert({ product_id: productId, color_id: colorId || null, url, alt_text: $("#pName").value.trim(), sort_order: existing + index, is_primary: existing === 0 && index === 0 }); if (error) throw error;
    }
  }
  async function uploadSiteAsset(file, prefix) {
    if (!file) return "";
    if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} ultrapassa 8 MB.`);
    const extension = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `site-assets/${prefix}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await db().storage.from("product-images").upload(path, file, { cacheControl: "31536000", upsert: false });
    if (uploadError) throw uploadError;
    return db().storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }
  async function saveProduct(event) {
    event.preventDefault(); const button = $("#saveProduct"); button.disabled = true; button.textContent = "A guardar…";
    try {
      const id = $("#productId").value; const name = $("#pName").value.trim(); const slug = slugify($("#pSlug").value.trim() || name); const payload = { name, slug: id ? slug : `${slug}-${Date.now().toString(36)}`, sku: $("#pSku").value.trim() || null, category_id: $("#pCategory").value || null, collection_id: $("#pCollection").value || null, price: $("#pPrice").value ? Number($("#pPrice").value) : null, sale_price: $("#pSalePrice").value ? Number($("#pSalePrice").value) : null, description: $("#pDescription").value.trim() || null, details: $("#pDetails").value.trim() || null, active: $("#pActive").checked, featured: $("#pFeatured").checked, new_drop: $("#pNewDrop").checked, personalization_available: $("#pPersonalization").checked };
      const result = id ? await db().from("products").update(payload).eq("id", id).select("id").single() : await db().from("products").insert(payload).select("id").single(); if (result.error) throw result.error;
      await uploadImages(result.data.id, [...$("#productImages").files], $("#imageColor").value || null); await loadAll(); closeProduct(); message(id ? "Peça atualizada." : "Peça criada. Agora configure o stock por cor e tamanho.");
    } catch (error) { message(error.message || "Não foi possível guardar a peça.", true); }
    finally { button.disabled = false; button.textContent = "Guardar peça"; }
  }
  async function deleteProduct(id) { if (!confirm("Apagar esta peça e todas as suas variantes?")) return; const { error } = await db().from("products").delete().eq("id", id); if (error) message(error.message, true); else { message("Peça apagada."); await loadAll(); } }
  async function duplicateProduct(id) {
    const source = products.find((product) => product.id === id); if (!source) return;
    const { data: copy, error } = await db().from("products").insert({ name: `${source.name} — cópia`, slug: `${source.slug}-copia-${Date.now().toString(36)}`, sku: source.sku ? `${source.sku}-COPY` : null, category_id: source.category_id, collection_id: source.collection_id, price: source.price, sale_price: source.sale_price, description: source.description, details: source.details, active: false, featured: false, new_drop: false, personalization_available: source.personalization_available }).select("id").single(); if (error) { message(error.message, true); return; }
    if (source.variants.length) { const rows = source.variants.map((variant) => ({ product_id: copy.id, color_id: variant.color?.id, size_id: variant.size?.id, sku: variant.sku ? `${variant.sku}-COPY` : null, stock: 0, active: true })); await db().from("product_variants").insert(rows); }
    if (source.images.length) { const rows = source.images.map((image) => ({ product_id: copy.id, color_id: image.color_id, url: image.url, alt_text: `${source.name} — cópia`, sort_order: image.sort_order, is_primary: image.is_primary })); await db().from("product_images").insert(rows); }
    message("Cópia criada como produto oculto e com stock zero."); await loadAll();
  }
  function renderInventory(productId) {
    const product = products.find((item) => item.id === productId); const editor = $("#inventoryEditor");
    if (!product) { editor.hidden = true; $("#inventoryEmpty").hidden = false; return; }
    $("#inventoryEmpty").hidden = true; editor.hidden = false; $("#inventoryHead").innerHTML = `<tr><th>Cor / Tamanho</th>${sizes.map((size) => `<th>${esc(size.name)}</th>`).join("")}</tr>`;
    $("#inventoryBody").innerHTML = colors.map((color) => `<tr><td><i class="color-dot" style="background:${esc(color.hex_code)}"></i>${esc(color.name)}</td>${sizes.map((size) => { const variant = product.variants.find((item) => item.color?.id === color.id && item.size?.id === size.id); return `<td><input type="number" min="0" max="99999" value="${Number(variant?.stock || 0)}" data-stock-color="${esc(color.id)}" data-stock-size="${esc(size.id)}"></td>`; }).join("")}</tr>`).join("");
  }
  async function saveInventory() {
    const productId = $("#inventoryProduct").value; const product = products.find((item) => item.id === productId); if (!product) return;
    const rows = $$('[data-stock-color]').map((input) => { const color = colors.find((item) => item.id === input.dataset.stockColor); const size = sizes.find((item) => item.id === input.dataset.stockSize); return { product_id: productId, color_id: color.id, size_id: size.id, sku: `${product.sku || slugify(product.name)}-${slugify(color.name)}-${slugify(size.name)}`.toUpperCase(), stock: Number(input.value || 0), active: true }; });
    const { error } = await db().from("product_variants").upsert(rows, { onConflict: "product_id,color_id,size_id" }); if (error) message(error.message, true); else { message("Stock guardado."); await loadAll(); $("#inventoryProduct").value = productId; renderInventory(productId); }
  }
  async function addCollection(table, payload) { const list = table === "categories" ? categories : table === "collections" ? collections : table === "sizes" ? sizes : colors; const row = { ...payload, sort_order: list.length * 10 + 10, active: true }; if (table !== "colors") row.slug = `${slugify(payload.name)}-${Date.now().toString(36)}`; const { error } = await db().from(table).insert(row); if (error) message(error.message, true); else { message("Item adicionado."); await loadAll(); } }
  async function deleteCollection(table, id) { if (!confirm("Remover este item? Produtos relacionados poderão ficar sem esta informação.")) return; const { error } = await db().from(table).delete().eq("id", id); if (error) message(error.message, true); else await loadAll(); }
  async function updateOrder(id, status) { const { error } = await db().from("orders").update({ status }).eq("id", id); if (error) message(error.message, true); else { message(status === "Confirmado" ? "Pedido confirmado e stock atualizado." : "Estado do pedido atualizado."); await loadAll(); } }
  async function saveSettings(event) {
    event.preventDefault();
    const button = event.submitter || $("#settingsForm button[type='submit']");
    if (button) { button.disabled = true; button.textContent = "A guardar…"; }
    try {
      const heroFile = $("#settingHeroImageFile").files[0];
      const logoFile = $("#settingLogoFile").files[0];
      const heroImageUrl = heroFile ? await uploadSiteAsset(heroFile, "hero") : $("#settingHeroImage").value.trim();
      const logoUrl = logoFile ? await uploadSiteAsset(logoFile, "logo") : (settings.logo_url || "");
      const values = { whatsapp: $("#settingWhatsapp").value.replace(/\D/g, ""), instagram: $("#settingInstagram").value.trim(), delivery_days: Number($("#settingDeliveryDays").value || 2), delivery_fee: $("#settingDeliveryFee").value ? Number($("#settingDeliveryFee").value) : null, delivery_zones: $("#settingDeliveryZones").value.trim(), delivery_text: $("#settingDeliveryText").value.trim(), hero_eyebrow: $("#settingHeroEyebrow").value.trim(), hero_title: $("#settingHeroTitle").value.trim(), hero_copy: $("#settingHeroCopy").value.trim(), hero_image_url: heroImageUrl, logo_url: logoUrl, about_title: $("#settingAboutTitle").value.trim(), about_copy: $("#settingAboutCopy").value.trim() };
      const rows = Object.entries(values).map(([key, value]) => ({ key, value }));
      const { error } = await db().from("site_settings").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      $("#settingHeroImageFile").value = ""; $("#settingLogoFile").value = "";
      message("Configurações guardadas."); await loadAll();
    } catch (error) { message(error.message || "Não foi possível guardar as configurações.", true); }
    finally { if (button) { button.disabled = false; button.textContent = "Guardar configurações"; } }
  }
  async function reloadImages(productId) { await loadAll(); const product = products.find((item) => item.id === productId); currentProduct = product; renderImageManager(product); }
  async function setPrimaryImage(imageId) { const productId = currentProduct?.id; if (!productId) return; await db().from("product_images").update({ is_primary: false }).eq("product_id", productId); const { error } = await db().from("product_images").update({ is_primary: true }).eq("id", imageId); if (error) message(error.message, true); else await reloadImages(productId); }
  async function moveImage(imageId, direction) { const images = currentProduct?.images || []; const index = images.findIndex((image) => image.id === imageId); const targetIndex = direction === "up" ? index - 1 : index + 1; if (index < 0 || targetIndex < 0 || targetIndex >= images.length) return; const a = images[index], b = images[targetIndex]; await Promise.all([db().from("product_images").update({ sort_order: b.sort_order }).eq("id", a.id), db().from("product_images").update({ sort_order: a.sort_order }).eq("id", b.id)]); await reloadImages(currentProduct.id); }
  async function deleteImage(imageId) { if (!confirm("Remover esta imagem do produto?")) return; const productId = currentProduct?.id; const { error } = await db().from("product_images").delete().eq("id", imageId); if (error) message(error.message, true); else await reloadImages(productId); }
  function bindEvents() {
    $("#logoutButton").addEventListener("click", async () => { await db().auth.signOut(); location.replace("login.html"); }); $("#newProductButton").addEventListener("click", () => openProduct()); $("#productAddInline").addEventListener("click", () => openProduct()); $("#closeProductDrawer").addEventListener("click", closeProduct); $("#drawerScrim").addEventListener("click", closeProduct); $("#productForm").addEventListener("submit", saveProduct); $("#inventoryProduct").addEventListener("change", (event) => renderInventory(event.target.value)); $("#saveInventory").addEventListener("click", saveInventory); $("#settingsForm").addEventListener("submit", saveSettings);
    $$("[data-collection-form]").forEach((form) => form.addEventListener("submit", (event) => { event.preventDefault(); const name = new FormData(form).get("name").trim(); if (name) addCollection(form.dataset.collectionForm, { name }).then(() => form.reset()); }));
    $("#colorForm").addEventListener("submit", (event) => { event.preventDefault(); const data = new FormData(event.target); addCollection("colors", { name: data.get("name").trim(), hex_code: data.get("hex_code") }).then(() => event.target.reset()); });
    $("#productSearch").addEventListener("input", (event) => { const query = event.target.value.toLowerCase(); const list = products.filter((product) => `${product.name} ${product.sku || ""} ${product.category?.name || ""}`.toLowerCase().includes(query)); $("#productTable").innerHTML = productRows(list) || '<tr><td colspan="7"><div class="admin-empty">Nenhuma peça encontrada.</div></td></tr>'; });
    document.addEventListener("click", (event) => { const tab = event.target.closest("[data-tab]"); if (tab) switchTab(tab.dataset.tab); const jump = event.target.closest("[data-tab-jump]"); if (jump) switchTab(jump.dataset.tabJump); const edit = event.target.closest("[data-edit-product]"); if (edit) openProduct(products.find((product) => product.id === edit.dataset.editProduct)); const duplicate = event.target.closest("[data-duplicate-product]"); if (duplicate) duplicateProduct(duplicate.dataset.duplicateProduct); const del = event.target.closest("[data-delete-product]"); if (del) deleteProduct(del.dataset.deleteProduct); const collection = event.target.closest("[data-delete-collection]"); if (collection) deleteCollection(collection.dataset.deleteCollection, collection.dataset.id); const primary = event.target.closest("[data-image-primary]"); if (primary) setPrimaryImage(primary.dataset.imagePrimary); const move = event.target.closest("[data-image-move]"); if (move) moveImage(move.dataset.id, move.dataset.imageMove); const imageDelete = event.target.closest("[data-image-delete]"); if (imageDelete) deleteImage(imageDelete.dataset.imageDelete); });
    document.addEventListener("change", (event) => { const status = event.target.closest("[data-order-status]"); if (status) updateOrder(status.dataset.orderStatus, status.value); });
  }
  async function initialize() {
    if (!await verifyAccess()) { location.replace("login.html"); return; }
    $("#adminLoading").style.display = "none"; $("#adminShell").hidden = false; bindEvents(); await loadAll();
  }
  initialize();
})();
