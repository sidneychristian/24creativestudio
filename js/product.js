(async function () {
  "use strict";
  await window.studio24Ready;
  const $ = (selector) => document.querySelector(selector);
  const params = new URLSearchParams(location.search);
  const pathMatch = location.pathname.match(/\/product\/([^/]+)/);
  const slug = params.get("slug") || (pathMatch ? decodeURIComponent(pathMatch[1]) : "demo-tee");
  const product = await Store24.loadProduct(slug);
  if (!product) { $("#productLoading").innerHTML = 'Esta peça não foi encontrada.<br><a href="shop.html">Voltar ao shop</a>'; return; }
  let selectedColor = null, selectedSize = null, selectedVariant = null;
  const colors = [...new Map(product.variants.filter((variant) => variant.color).map((variant) => [variant.color.id, variant.color])).values()];

  function renderGallery(colorId) {
    const related = colorId ? product.images.filter((image) => image.color_id === colorId) : [];
    const images = related.length ? related : product.images;
    $("#productGallery").innerHTML = images.length ? images.map((image) => `<figure class="gallery-item"><img src="${Store24.esc(Store24.safeUrl(image.url))}" alt="${Store24.esc(image.alt_text || product.name)}"></figure>`).join("") : '<div class="gallery-item"><div class="product-placeholder"></div></div>';
  }
  function renderColors() {
    const group = $("#colorGroup");
    if (!colors.length) { group.hidden = true; return; }
    $("#colorSelector").innerHTML = colors.map((color) => `<button type="button" style="--color:${Store24.esc(color.hex_code || "#999")}" data-color="${Store24.esc(color.id)}" aria-label="${Store24.esc(color.name)}" title="${Store24.esc(color.name)}"></button>`).join("");
  }
  function renderSizes() {
    const variants = selectedColor ? product.variants.filter((variant) => variant.color?.id === selectedColor.id) : product.variants;
    const sizes = [...new Map(variants.filter((variant) => variant.size).map((variant) => [variant.size.id, variant.size])).values()].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
    $("#sizeSelector").innerHTML = sizes.map((size) => { const variant = variants.find((item) => item.size?.id === size.id); return `<button type="button" data-size="${Store24.esc(size.id)}"${Number(variant?.stock || 0) <= 0 ? " disabled" : ""}>${Store24.esc(size.name)}</button>`; }).join("");
    selectedSize = null; selectedVariant = null; $("#selectedSizeLabel").textContent = "Selecione"; updateAddButton();
  }
  function updateAddButton() {
    const button = $("#addToBag");
    if (product.demo) { button.disabled = true; button.textContent = "Produto de demonstração"; $("#stockMessage").textContent = "Cadastre a peça real no painel administrativo."; return; }
    if (product.price == null) { button.disabled = true; button.textContent = "Preço não configurado"; $("#stockMessage").textContent = "Defina o preço no painel administrativo."; return; }
    if (!selectedVariant) { button.disabled = true; button.textContent = colors.length ? "Selecione cor e tamanho" : "Selecione o tamanho"; $("#stockMessage").textContent = ""; return; }
    const stock = Number(selectedVariant.stock || 0); button.disabled = stock <= 0; button.textContent = stock > 0 ? "Adicionar à bag" : "Esgotado"; $("#stockMessage").textContent = stock > 0 && stock <= 3 ? `Apenas ${stock} em stock` : "";
    $("#productQuantity").innerHTML = Array.from({ length: Math.min(stock, 10) }, (_, index) => `<option>${index + 1}</option>`).join("");
  }
  function selectColor(colorId) {
    selectedColor = colors.find((color) => String(color.id) === String(colorId));
    $("#selectedColorLabel").textContent = selectedColor?.name || "Selecione";
    document.querySelectorAll("[data-color]").forEach((button) => button.classList.toggle("active", button.dataset.color === String(colorId)));
    renderGallery(colorId); renderSizes();
  }
  function selectSize(sizeId) {
    const size = product.variants.find((variant) => variant.size?.id === sizeId)?.size;
    selectedSize = size || null;
    selectedVariant = product.variants.find((variant) => (!selectedColor || variant.color?.id === selectedColor.id) && variant.size?.id === sizeId) || null;
    $("#selectedSizeLabel").textContent = selectedSize?.name || "Selecione";
    document.querySelectorAll("[data-size]").forEach((button) => button.classList.toggle("active", button.dataset.size === sizeId)); updateAddButton();
  }

  document.title = `${product.name} — 24 Creative Studio`;
  document.querySelector('meta[name="description"]').content = product.description || `Conheça ${product.name} da 24 Creative Studio.`;
  $("#productCategory").textContent = product.category?.name || "Peça"; $("#productName").textContent = product.name;
  $("#productDescription").textContent = product.description || "Descrição disponível em breve.";
  $("#productDetails").textContent = product.details || "Detalhes disponíveis em breve.";
  $("#productPrice").innerHTML = product.sale_price != null ? `<del>${Store24.esc(Store24.money(product.price))}</del>${Store24.esc(Store24.money(product.sale_price))}` : Store24.esc(Store24.money(product.price));
  $("#productBadges").innerHTML = `${product.new_drop ? "<span>New drop</span>" : ""}${!product.available ? "<span>Esgotado</span>" : ""}`;
  renderGallery(); renderColors(); if (colors.length === 1) selectColor(colors[0].id); else renderSizes();
  $("#productLoading").hidden = true; $("#productView").hidden = false;
  $("#colorSelector").addEventListener("click", (event) => { const button = event.target.closest("[data-color]"); if (button) selectColor(button.dataset.color); });
  $("#sizeSelector").addEventListener("click", (event) => { const button = event.target.closest("[data-size]"); if (button && !button.disabled) selectSize(button.dataset.size); });
  $("#addToBag").addEventListener("click", () => {
    if (!selectedVariant) return;
    const result = Store24.addCartItem({ product_id: product.id, variant_id: selectedVariant.id, name: product.name, color: selectedColor?.name || selectedVariant.color?.name || "—", size: selectedSize?.name || "—", quantity: Number($("#productQuantity").value), price: Number(product.sale_price ?? product.price ?? 0), stock: Number(selectedVariant.stock || 0), image: Store24.primaryImage(product, selectedColor?.id)?.url || "", demo: product.demo });
    Studio24Site.showToast(result.message); if (result.ok) Studio24Site.openCart();
  });
  const catalog = await Store24.loadCatalog(); const related = catalog.filter((item) => item.id !== product.id).slice(0, 4); $("#relatedGrid").innerHTML = related.map(Store24.productCard).join("");
  const structured = { "@context": "https://schema.org", "@type": "Product", name: product.name, description: product.description || "", image: product.images.map((image) => image.url), brand: { "@type": "Brand", name: "24 Creative Studio" }, offers: { "@type": "Offer", priceCurrency: "MZN", price: product.sale_price ?? product.price ?? 0, availability: product.available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" } };
  const script = document.createElement("script"); script.type = "application/ld+json"; script.textContent = JSON.stringify(structured); document.head.appendChild(script);
})();
