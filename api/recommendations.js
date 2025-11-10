import OpenAI from "openai";

export default async function handler(req, res) {
  try {
    const { favorites } = req.body || (await req.json());
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const TMDB_API_KEY = process.env.REACT_APP_TMDB_API_KEY;

    if (!favorites?.length) {
      return res.status(400).json({ error: "No favorites provided." });
    }

    // Step 1: Ask OpenAI for smart structured recs
    const prompt = `
      The user's favorite titles are:
      ${favorites.map(f => `${f.title} (${f.type})`).join(", ")}.

      Recommend 2 other movies and 2 other TV shows they might enjoy. 
      For each, include:
      - "title"
      - "type" ("movie" or "tv")
      - "reason" (why they'd like it)
      Respond in JSON format.
    `;

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      response_format: { type: "json" }
    });

    let aiRecs = [];
    try {
      aiRecs = JSON.parse(response.output[0].content[0].text);
    } catch (e) {
      console.error("Failed to parse AI output:", e);
      return res.status(500).json({ error: "Could not parse AI response" });
    }

    // Step 2: Enrich with TMDb posters & metadata
    const enriched = [];
    for (const rec of aiRecs.slice(0, 10)) {
      try {
        const type = rec.type === "movie" ? "movie" : "tv";
        const url = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(rec.title)}`;
        const tmdbRes = await fetch(url);
        const tmdbData = await tmdbRes.json();
        const best = tmdbData.results?.[0];

        enriched.push({
          ...rec,
          poster_path: best?.poster_path || null,
          year: best?.release_date?.slice(0, 4) || best?.first_air_date?.slice(0, 4) || "—"
        });
      } catch (e) {
        enriched.push({ ...rec, poster_path: null, year: "—" });
      }
    }

    return res.status(200).json({ recommendations: enriched });
  } catch (error) {
    console.error("Error in hybrid recommender:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
