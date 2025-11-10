import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function OnboardingShows() {
  const navigate = useNavigate();

  const API_KEY =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_TMDB_API_KEY) ||
    process.env.REACT_APP_TMDB_API_KEY;

  const MIN = 5;
  const MAX = 10;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("showFavorites") || "[]");
    } catch {
      return [];
    }
  });

  const selectedIds = useMemo(() => new Set(selected.map(s => s.id)), [selected]);
  const canFinish = selected.length >= MIN && selected.length <= MAX;

  const searchShows = async () => {
    if (!API_KEY) {
      alert("Missing TMDB API key. Set VITE_TMDB_API_KEY or REACT_APP_TMDB_API_KEY.");
      return;
    }
    const url = `https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(
      query.trim()
    )}&language=en-US&page=1`;
    const res = await fetch(url);
    const data = await res.json();
    setResults(Array.isArray(data.results) ? data.results : []);
  };

  const toggle = (item) => {
    setSelected(prev => {
      const exists = prev.some(p => p.id === item.id);
      if (exists) {
        return prev.filter(p => p.id !== item.id);
      }
      if (prev.length >= MAX) return prev; // cap
      return [
        ...prev,
        {
          id: item.id,
          title: item.name,
          poster_path: item.poster_path,
          year: (item.first_air_date || "").slice(0, 4)
        }
      ];
    });
  };

  useEffect(() => {
    localStorage.setItem("showFavorites", JSON.stringify(selected));
  }, [selected]);

  return (
    <div style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>
        Step 2: Pick {MIN}–{MAX} shows
      </h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        Search and select your favorites. Click again to unselect. (
        {selected.length}/{MAX})
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search TV shows (e.g., The Office)"
          style={{
            flex: 1,
            padding: "0.6rem",
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") searchShows();
          }}
        />
        <button
          onClick={searchShows}
          style={{ padding: "0.6rem 1rem", borderRadius: 8 }}
        >
          Search
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {results.map((tv) => {
          const posterUrl = tv.poster_path
            ? `https://image.tmdb.org/t/p/w200${tv.poster_path}`
            : null;
          const isSelected = selectedIds.has(tv.id);
          return (
            <button
              key={tv.id}
              onClick={() => toggle(tv)}
              style={{
                textAlign: "left",
                border: isSelected ? "2px solid #4f46e5" : "1px solid #e5e7eb",
                background: isSelected ? "rgba(79,70,229,0.08)" : "white",
                borderRadius: 10,
                padding: 8,
                cursor: "pointer",
              }}
            >
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={tv.name}
                  style={{ width: "100%", borderRadius: 8 }}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: 210,
                    background: "#eee",
                    borderRadius: 8,
                    display: "grid",
                    placeItems: "center",
                    color: "#666",
                  }}
                >
                  No image
                </div>
              )}
              <div style={{ marginTop: 6 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{tv.name}</div>
                <div style={{ color: "#666", fontSize: 12 }}>
                  {(tv.first_air_date || "N/A").slice(0, 4)}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h3>Your picks</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {selected.map((s) => (
              <span
                key={s.id}
                style={{
                  border: "1px solid #ddd",
                  padding: "4px 10px",
                  borderRadius: 999,
                }}
              >
                {s.title}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 12 }}>
        <button
          disabled={!canFinish}
          onClick={() => navigate("/onboarding/shows/ranking")}
          style={{
            padding: "0.7rem 1.2rem",
            borderRadius: 10,
            opacity: canFinish ? 1 : 0.5,
            cursor: canFinish ? "pointer" : "not-allowed",
          }}
        >
          Continue to rankings →
        </button>
      </div>
    </div>
  );
}
