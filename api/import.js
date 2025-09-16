export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const { url } = req.body;
  if (!url || !url.includes("aliexpress.com")) {
    return res.status(400).send("Only AliExpress URLs allowed");
  }

  try {
    const apiKey = process.env.SCRAPER_API_KEY; // use env variable
    const apiUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;

    const resp = await fetch(apiUrl);
    const html = await resp.text();

    // Extract product info
    const title = html.match(/"subject":"([^"]+)"/i)?.[1] || "Untitled";
    const desc = html.match(/"seoDescription":"([^"]+)"/i)?.[1] || "";
    const priceStr =
      html.match(/"salePrice":"([^"]+)"/i)?.[1] ||
      html.match(/"price":"([^"]+)"/i)?.[1] ||
      "0";

    const cost = parseFloat(priceStr.replace(/[^\d.]/g, "")) || 0;
    const price = +(cost * 1.2).toFixed(2);

    const img =
      html.match(/"imagePath":"([^"]+)"/i)?.[1]
        ?.replace(/\\u002F/g, "/")
        .replace(/\\\//g, "/") ||
      "https://via.placeholder.com/200x150?text=No+Image";

    res.status(200).json({ name: title, description: desc, price, image: img });
  } catch (e) {
    res.status(500).send("Scraping failed: " + e.message);
  }
}
