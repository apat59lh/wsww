const OpenAI = require("openai");
const fetch = require("node-fetch");

module.exports = async (req, res) => {
  console.log("API Router loaded");
  try {
    console.log("Incoming body ", req.body);
    const { favorites } = req.body || {};
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY || process.env.REACT_APP_TMDB_API_KEY;

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
    console.log("About to call openAI with prompt ", prompt)

   const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      text: {
      format: { type: "json_object" },
      },
    });


    let aiRecs;
    let recList = [];

    try {
      aiRecs = JSON.parse(response.output[0].content[0].text);

      // Normalize: sometimes the model returns an object like { movies: [...], tv: [...] } 
      if (Array.isArray(aiRecs)) {
        recList = aiRecs;
      } else if (aiRecs.movies || aiRecs.tv) {
        recList = [...(aiRecs.movies || []), ...(aiRecs.tv || [])];
      } else if (aiRecs.recommendations) {
        recList = aiRecs.recommendations;
      } else {
        console.warn("Unexpected AI response format:", aiRecs);
        recList = Object.values(aiRecs).flat();
      }

    } catch (e) {
      console.error("Failed to parse AI output:", e);
      return res.status(500).json({ error: "Could not parse AI response" });
    }

    // Step 2: Enrich with TMDb metadata
    const enriched = [];
    for (const rec of recList.slice(0, 10)) {
    try {
      const type = rec.type === "movie" ? "movie" : "tv";
      const url = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(rec.title)}`;
      const tmdbRes = await fetch(url);
      const tmdbData = await tmdbRes.json();
      const best = tmdbData.results?.[0];

      enriched.push({
        ...rec,
        poster_path: best?.poster_path
             ? `https://image.tmdb.org/t/p/w200${best.poster_path}`
                : null,
        year: best?.release_date?.slice(0, 4) || best?.first_air_date?.slice(0, 4) || "—",
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
};
