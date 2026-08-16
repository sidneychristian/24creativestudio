(async function () {
  "use strict";
  await window.studio24Ready;
  const products = await Store24.loadCatalog();
  const items = products.filter((product) => !product.demo && product.images?.length).slice(0, 7);
  if (!items.length) return;
  document.querySelector("#lookbookGrid").innerHTML = items.map((product, index) => { const image = Store24.primaryImage(product); return `<a class="lookbook-image ${index % 5 === 2 ? "wide" : ""}" href="product.html?slug=${encodeURIComponent(product.slug)}"><img src="${Store24.esc(Store24.safeUrl(image?.url))}" alt="${Store24.esc(image?.alt_text || product.name)}" loading="lazy"><span>${Store24.esc(product.name)} ↗</span></a>`; }).join("");
})();
