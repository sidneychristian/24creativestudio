module.exports = function sitemap(req, res) {
  const protocol = String(req.headers["x-forwarded-proto"] || "https").split(",")[0];
  const host = req.headers.host;
  const base = `${protocol}://${host}`;
  const pages = ["/", "/shop", "/lookbook", "/about"];
  const urls = pages.map((path) => `<url><loc>${base}${path}</loc><changefreq>${path === "/" ? "weekly" : "monthly"}</changefreq><priority>${path === "/" ? "1.0" : "0.8"}</priority></url>`).join("");
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400");
  res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
};
