exports.getRecommendations = async (req, res) => {
  try {
    const { places, preferences, freeTime } = req.body;

    // Simple filtering (content-based)
    let filtered = places.filter(place =>
      preferences.some(pref => place.types.includes(pref))
    );

    // Simple scoring (GA-inspired)
    filtered = filtered.map(place => ({
      ...place,
      score:
        (place.rating || 3) * 0.5 +
        (1 / (place.distance || 1)) * 0.3 +
        Math.random() * 0.2,
    }));

    filtered.sort((a, b) => b.score - a.score);

    // Limit based on time
    const recommendations = filtered.slice(0, 5);

    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};