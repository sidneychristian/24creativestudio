(async function () {
  "use strict";
  await window.studio24Ready;
  const $ = (selector) => document.querySelector(selector);
  let products = await Store24.loadCatalog();
  const options = await Store24.loadOptions();
  const selected = { categories: new Set(), colors: new Set(), sizes: new Set(), available: false };
  const params = new URLSearchParams(location.search);
  const requestedCategory = params.get("category");
  if (requestedCategory) selected.categories.add(requestedCategory);
  const newDropOnly = params.get("drop") === "new";
  if (newDropOnly) $("#shopHeading").textContent = "Novo drop";

  function filterMarkup(items, type) {
    return items.map((item) => `<label>${type === "color" ? `<i class="swatch" style="background:${Store24.esc(item.hex_code || "#999")}"></i>` : ""}<input type="checkbox" name="${type}" value="${Store24.esc(type === "category" ? item.slug : item.id)}"${selected[type === "category" ? "categories" : `${type}s`].has(type === "category" ? item.slug : item.id) ? " checked" : ""}><span>${Store24.esc(item.name)}</span></label>`).join("");
  }
  $("#categoryFilters").innerHTML = filterMarkup(options.categories, "category");
  $("#colorFilters").innerHTML = filterMarkup(options.colors, "color");
  $("#sizeFilters").innerHTML = filterMarkup(options.sizes, "size");

  function refreshStateFromForm() {
    selected.categories = new Set([...document.querySelectorAll('input[name="category"]:checked')].map((input) => input.value));
    selected.colors = new Set([...document.querySelectorAll('input[name="color"]:checked')].map((input) => input.value));
    selected.sizes = new Set([...document.querySelectorAll('input[name="size"]:checked')].map((input) => input.value));
    selected.available = Boolean(document.querySelector('input[name="available"]:checked'));
  }
  function results() {
    const query = $("#shopSearch").value.trim().toLowerCase();
    const list = products.filter((product) => {
      if (newDropOnly && !product.new_drop) return false;
      if (selected.categories.size && !selected.categories.has(product.category?.slug)) return false;
      if (selected.colors.size && !product.variants.some((variant) => selected.colors.has(String(variant.color?.id)))) return false;
      if (selected.sizes.size && !product.variants.some((variant) => selected.sizes.has(String(variant.size?.id)))) return false;
      if (selected.available && !product.available) return false;
      const haystack = `${product.name || ""} ${product.category?.name || ""} ${product.collection?.name || ""}`.toLowerCase();
      return !query || haystack.includes(query);
    });
    const sort = $("#sortSelect").value;
    if (sort === "price-asc") list.sort((a, b) => Number(a.sale_price ?? a.price ?? Number.MAX_SAFE_INTEGER) - Number(b.sale_price ?? b.price ?? Number.MAX_SAFE_INTEGER));
    if (sort === "price-desc") list.sort((a, b) => Number(b.sale_price ?? b.price ?? -1) - Number(a.sale_price ?? a.price ?? -1));
    if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "pt"));
    return list;
  }
  function render() {
    const list = results();
    $("#productCount").textContent = list.length;
    $("#activeFilterCount").textContent = selected.categories.size + selected.colors.size + selected.sizes.size + (selected.available ? 1 : 0) || "";
    $("#shopGrid").innerHTML = list.length ? list.map(Store24.productCard).join("") : '<div class="empty-state"><div>Nenhuma peça corresponde aos filtros.<br><a href="shop.html">Limpar e ver todas</a></div></div>';
  }
  function openFilters() { $("#filterDrawer").classList.add("open"); $("#filterScrim").classList.add("open"); $("#filterDrawer").setAttribute("aria-hidden", "false"); document.body.classList.add("locked"); }
  function closeFilters() { $("#filterDrawer").classList.remove("open"); $("#filterScrim").classList.remove("open"); $("#filterDrawer").setAttribute("aria-hidden", "true"); document.body.classList.remove("locked"); }
  $("#filterButton").addEventListener("click", openFilters); $("#filterClose").addEventListener("click", closeFilters); $("#filterScrim").addEventListener("click", closeFilters);
  $("#filterForm").addEventListener("submit", (event) => { event.preventDefault(); refreshStateFromForm(); render(); closeFilters(); });
  $("#clearFilters").addEventListener("click", () => { $("#filterForm").reset(); selected.categories.clear(); selected.colors.clear(); selected.sizes.clear(); selected.available = false; render(); });
  $("#shopSearch").addEventListener("input", render); $("#sortSelect").addEventListener("change", render); $("#openSearch")?.addEventListener("click", () => $("#shopSearch").focus());
  render();
})();
