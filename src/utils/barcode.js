export function parseComicBarcode(rawCode) {
  const clean = rawCode.replace(/\s/g, '')

  if (clean.length < 12) {
    return { error: 'BARCODE TOO SHORT', rawCode }
  }

  return {
    fullCode: clean,
    baseUpc: clean.slice(0, 12),
    issueNumber: clean.length >= 15 ? parseInt(clean.slice(12, 15), 10) : null,
    variantCode: clean.length >= 16 ? clean.slice(15, 16) : null,
    printing: clean.length >= 17 ? clean.slice(16, 17) : null,
    hasSupplemental: clean.length >= 17,
  }
}

export async function fetchComicData(barcodeData) {
  const ANTHROPIC_KEY = import.meta.env.VITE_ANTHROPIC_KEY

  const prompt = "You are a comic book expert. A comic has UPC barcode " + barcodeData.baseUpc + " and issue number " + (barcodeData.issueNumber || "unknown") + ". The UPC prefix 761941 belongs to DC Comics. The prefix 759606 belongs to Marvel. The prefix 725130 belongs to Image. The prefix 076194 belongs to DC Comics. Use these prefixes plus the full UPC to identify the series. You must always make your best guess even if uncertain. Never say you cannot identify it. Return ONLY a raw JSON object, no markdown, no explanation. Fields: title (string), issue (string), publisher (string), year (string), variant (true or false), notes (string with your confidence level)."

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }]
      })
    })

    const data = await response.json()
    const text = data.content[0].text
    const cleaned = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(cleaned)

    return {
      title: parsed.title || "",
      issue: parsed.issue || String(barcodeData.issueNumber || ""),
      publisher: parsed.publisher || "",
      year: parsed.year || "",
      condition: "9.2",
      variant: parsed.variant || false,
      purchasePrice: "",
      estimatedValue: "",
      notes: parsed.notes || "",
    }
  } catch (err) {
    console.error("[barcode.js] Claude lookup failed:", err)
    return null
  }
}

export function mapToFormState(comicData) {
  return {
    title: comicData.title || "",
    issue: comicData.issue || "",
    publisher: comicData.publisher || "",
    year: comicData.year || "",
    condition: comicData.condition || "9.2",
    variant: comicData.variant || false,
    purchasePrice: comicData.purchasePrice || "",
    estimatedValue: comicData.estimatedValue || "",
    notes: comicData.notes || "",
  }
}