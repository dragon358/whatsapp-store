export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const { url } = req.body;
  if (!url || !url.includes("aliexpress.com")) {
    return res.status(400).send("Only AliExpress URLs allowed");
  }

  try {
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await resp.text();

    // Title candidates
    const title =
      html.match(/<meta property="og:title" content="([^"]+)"/i)?.[1] ||
      html.match(/"subject":"([^"]+)"/i)?.[1] ||
      html.match(/"seoTitle":"([^"]+)"/i)?.[1] ||
      "Untitled";

    // Description candidates
    const desc =
      html.match(/<meta name="description" content="([^"]+)"/i)?.[1] ||
      html.match(/"seoDescription":"([^"]+)"/i)?.[1] ||
      "";

    // Price candidates
    const priceStr =
      html.match(/"salePrice":"([^"]+)"/i)?.[1] ||
      html.match(/"discountPrice":"([^"]+)"/i)?.[1] ||
      html.match(/"price":"([^"]+)"/i)?.[1] ||
      "0";

    const cost = parseFloat(priceStr.replace(/[^\d.]/g, "")) || 0;
    const price = +(cost * 1.2).toFixed(2);

    // Image candidates
    const images = [];
    const ogImg = html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1];
    if (ogImg) images.push(ogImg);

    const imgMatches = [...html.matchAll(/"imagePath":"([^"]+)"/g)];
    imgMatches.forEach(m => images.push(m[1].replace(/\\u002F/g, "/").replace(/\\\//g, "/")));

    const img = images.length > 0 ? images[0] : "https://via.placeholder.com/200x150?text=No+Image";

    res.status(200).json({ name: title, description: desc, price, image: img });
  } catch (e) {
    res.status(500).send("Scraping failed: " + e.message);
  }
}

