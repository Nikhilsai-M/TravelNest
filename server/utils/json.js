function extractJsonFromText(text) {
  if (!text) {
    return null;
  }

  const cleaned = String(text)
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    const candidate = objectMatch?.[0] || arrayMatch?.[0];

    if (!candidate) {
      return null;
    }

    try {
      return JSON.parse(candidate);
    } catch (nestedError) {
      return null;
    }
  }
}

module.exports = {
  extractJsonFromText,
};
