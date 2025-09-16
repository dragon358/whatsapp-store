export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");
  const { url } = req.body;
  if (!url || !url.includes("aliexpress.com")) {
    return res.status(400).send("Only AliExpress URLs allowed");
  }

  try {
    const resp = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await resp.text();

    // Grab runParams JSON blob
    const runParamsMatch = html.match(/window\.runParams\s*=\s*({.*});/s);
    let data = {};
    if (runParamsMatch) {
      try {
        data = JSON.parse(runParamsMatch[1]);
      } catch (e) {
        console.error("Failed to parse runParams", e);
      }
    }

    // Title
    const title =
      data?.title ||
      data?.product?.subject ||
      html.match(/"subject":"([^"]+)"/i)?.[1] ||
      "Untitled";

    // Description
    const desc =
      data?.seoDescription ||
      html.match(/"seoDescription":"([^"]+)"/i)?.[1] ||
      "";

    // Price
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

    // Image
    let img =
      data?.imageModule?.imagePathList?.[0] ||
      data?.imageModule?.imagePath?.[0] ||
      html.match(/"imagePath":"([^"]+)"/i)?.[1] ||
      "https://via.placeholder.com/200x150?text=No+Image";

    // Fix AliExpress escaping
    img = img.replace(/\\u002F/g, "/").replace(/\\\//g, "/");

    res.status(200).json({ name: title, description: desc, price, image: img });
  } catch (e) {
    res.status(500).send("Scraping failed: " + e.message);
  }
}
