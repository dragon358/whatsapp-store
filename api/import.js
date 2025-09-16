export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const { url } = req.body;
  if (!url || !url.includes("aliexpress.com")) {
    return res.status(400).send("Only AliExpress URLs allowed");
  }

  try {
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await resp.text();

    const title = html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] || "Untitled";
    const desc = html.match(/<meta name="description" content="([^"]+)"/i)?.[1] || "";
    const priceStr = html.match(/"salePrice":"([^"]+)"/i)?.[1] || "0";
    const image = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] || "";

    const cost = parseFloat(priceStr.replace(/[^\d.]/g, "")) || 0;
    const price = +(cost * 1.2).toFixed(2);

    res.status(200).json({ name: title, description: desc, price, image });
  } catch (e) {
    res.status(500).send("Scraping failed: " + e.message);
  }
}
