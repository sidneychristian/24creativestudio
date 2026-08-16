(async function () {
  "use strict";
  await window.studio24Ready;
  const [products, options] = await Promise.all([Store24.loadCatalog(), Store24.loadOptions()]);
  const selected = products.filter((product) => product.new_drop || product.featured).slice(0, 8);
  const grid = document.querySelector("#latestGrid");
  grid.innerHTML = (selected.length ? selected : products.slice(0, 4)).map(Store24.productCard).join("") || '<div class="empty-state">O novo drop será apresentado aqui.</div>';
  const categoryLinks = document.querySelector("#categoryLinks");
  if (options.categories?.length) categoryLinks.innerHTML = options.categories.slice(0, 6).map((category, index) => `<a href="shop.html?category=${encodeURIComponent(category.slug)}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${Store24.esc(category.name)}</strong><i>↗</i></a>`).join("");
})();
