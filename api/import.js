export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const { url } = req.body;
  if (!url || !url.includes("aliexpress.com")) {
    return res.status(400).send("Only AliExpress URLs allowed");
  }

  try {
    const apiKey = process.env.SCRAPER_API_KEY;
    const apiUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;

    const resp = await fetch(apiUrl);
    const html = await resp.text();

    // Extract JSON block that contains product info
    const jsonMatch = html.match(/window\.runParams\s*=\s*({.*});/s);
    let data = {};
    if (jsonMatch) {
      try {
        data = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error("Failed to parse runParams JSON");
      }
    }

    // Fallback: try alternative JSON blob
    if (!data || Object.keys(data).length === 0) {
      const altMatch = html.match(/data:\s*({.*}),\s*csrfToken/s);
      if (altMatch) {
        try {
          data = JSON.parse(altMatch[1]);
        } catch (e) {
          console.error("Failed to parse alt JSON");
        }
      }
    }

    // Extract product details
    const title =
      data?.product?.subject ||
      data?.title ||
      html.match(/"subject":"([^"]+)"/i)?.[1] ||
      "Untitled";

    const desc =
      data?.seoDescription ||
      html.match(/"seoDescription":"([^"]+)"/i)?.[1] ||
      "";

    let cost = 0;
    if (data?.priceModule?.formatedPrice) {
      cost = parseFloat(data.priceModule.formatedPrice.replace(/[^\d.]/g, ""));
    } else if (data?.priceModule?.minAmount) {
      cost = data.priceModule.minAmount;
    } else {
      const priceStr =
        html.match(/"salePrice":"([^"]+)"/i)?.[1] ||
        html.match(/"price":"([^"]+)"/i)?.[1] ||
        "0";
      cost = parseFloat(priceStr.replace(/[^\d.]/g, "")) || 0;
    }
    const price = +(cost * 1.2).toFixed(2);

    let img =
      data?.imageModule?.imagePathList?.[0] ||
      data?.imageModule?.imagePath?.[0] ||
      html.match(/"imagePath":"([^"]+)"/i)?.[1] ||
      "https://via.placeholder.com/200x150?text=No+Image";

    img = img.replace(/\\u002F/g, "/").replace(/\\\//g, "/");

    res.status(200).json({ name: title, description: desc, price, image: img });
  } catch (e) {
    res.status(500).send("Scraping failed: " + e.message);
  }
}
