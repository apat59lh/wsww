import { useEffect, useState } from "react";

export default function Dashboard() {
  const [movieRankings, setMovieRankings] = useState([]);
  const [showRankings, setShowRankings] = useState([]);
  const [showAddModal, setShowAddModal] = useState(null); // 'movie' or 'show' or null
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Mini-tournament state
  const [tournamentState, setTournamentState] = useState(null); // null, or tournament object
  const [currentMatchup, setCurrentMatchup] = useState(null);
  const [matchupIndex, setMatchupIndex] = useState(0);
  const [, setTournamentResults] = useState({});
  const [toughDecisionUsed, setToughDecisionUsed] = useState(false);
  const [showResults, setShowResults] = useState(null); // null or results object

const [recommendations, setRecommendations] = useState([]);
const [loading, setLoading] = useState(false);

const generateRecommendations = async () => {
  setLoading(true);
  try {
    const favorites = [
      ...movieRankings.map((m) => ({ title: m.title, type: "movie" })),
      ...showRankings.map((s) => ({ title: s.title, type: "tv" })),
    ];

    const res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorites }),
    });

    const data = await res.json();
    setRecommendations(data.recommendations || []);
  } catch (err) {
    console.error("Error fetching recommendations:", err);
  } finally {
    setLoading(false);
  }
};


  // ELO calculation functions
  const calculateExpectedScore = (ratingA, ratingB) => {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  };

  const updateEloRatings = (winnerRating, loserRating, isDraw = false) => {
    const K = 32; // K-factor for rating changes
    const expectedWinner = calculateExpectedScore(winnerRating, loserRating);
    const expectedLoser = calculateExpectedScore(loserRating, winnerRating);

    let actualWinner, actualLoser;
    if (isDraw) {
      actualWinner = actualLoser = 0.5; // Draw
    } else {
      actualWinner = 1;
      actualLoser = 0;
    }

    const newWinnerRating = winnerRating + K * (actualWinner - expectedWinner);
    const newLoserRating = loserRating + K * (actualLoser - expectedLoser);

    return [Math.round(newWinnerRating), Math.round(newLoserRating)];
  };

  const convertEloToDisplayRating = (eloRating) => {
    // 1000 ELO = 9/10 (good), since these are pre-selected favorites
    const baselineElo = 1000;
    const baselineRating = 9.0;

    const ratingChange = ((eloRating - baselineElo) / 400) * 3; // Scale factor
    return Math.max(
      0,
      Math.min(10, Math.round((baselineRating + ratingChange) * 10) / 10)
    );
  };

  const API_KEY =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_TMDB_API_KEY) ||
    process.env.REACT_APP_TMDB_API_KEY;

  useEffect(() => {
    // Load rankings from localStorage
    const savedMovieRankings = JSON.parse(
      localStorage.getItem("movieRankings") || "[]"
    );
    const savedShowRankings = JSON.parse(
      localStorage.getItem("showRankings") || "[]"
    );

    setMovieRankings(savedMovieRankings.slice(0, 5)); // Top 5
    setShowRankings(savedShowRankings.slice(0, 5)); // Top 5
  }, []);

  const searchContent = async () => {
    if (!API_KEY || !searchQuery.trim()) {
      alert("Missing API key or empty search query");
      return;
    }

    setIsSearching(true);
    try {
      const endpoint = showAddModal === "movie" ? "search/movie" : "search/tv";
      const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${API_KEY}&query=${encodeURIComponent(
        searchQuery.trim()
      )}`;

      const response = await fetch(url);
      const data = await response.json();
      setSearchResults(
        Array.isArray(data.results) ? data.results.slice(0, 10) : []
      );
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    }
    setIsSearching(false);
  };

  const handleAddItem = (item) => {
    // Create normalized item object
    const newItem = {
      id: item.id,
      title: showAddModal === "movie" ? item.title : item.name,
      poster_path: item.poster_path,
      year:
        showAddModal === "movie"
          ? (item.release_date || "").slice(0, 4)
          : (item.first_air_date || "").slice(0, 4),
      eloRating: 1000, // Start at baseline
      displayRating: 9.0, // Start at baseline
    };

    // Get current top 5 for mini-tournament
    const currentRankings = JSON.parse(
      localStorage.getItem(
        `${showAddModal === "movie" ? "movie" : "show"}Rankings`
      ) || "[]"
    );
    const top5 = currentRankings.slice(0, 5);

    if (top5.length === 0) {
      // No existing items, just add it
      finalizeTournament(
        newItem,
        showAddModal === "movie" ? "movie" : "show",
        {}
      );
      return;
    }

    // Start mini-tournament against top 5
    startMiniTournament(
      newItem,
      top5,
      showAddModal === "movie" ? "movie" : "show"
    );
  };

  const startMiniTournament = (newItem, top5Items, type) => {
    // Create matchups: new item vs each of top 5
    const matchups = top5Items.map((item) => [newItem, item]);

    setTournamentState({
      newItem,
      top5Items,
      type,
      matchups,
      eloRatings: {
        [newItem.id]: newItem.eloRating,
        ...Object.fromEntries(
          top5Items.map((item) => [item.id, item.eloRating])
        ),
      },
    });

    setCurrentMatchup(matchups[0]);
    setMatchupIndex(0);
    setTournamentResults({});
    setToughDecisionUsed(false);

    // Clear search results to show tournament
    setSearchResults([]);
  };

  const handleTournamentChoice = (winnerId, loserId) => {
    const { eloRatings } = tournamentState;
    const winnerRating = eloRatings[winnerId];
    const loserRating = eloRatings[loserId];
    const [newWinnerRating, newLoserRating] = updateEloRatings(
      winnerRating,
      loserRating,
      false
    );

    // Update tournament ELO ratings
    const updatedRatings = {
      ...eloRatings,
      [winnerId]: newWinnerRating,
      [loserId]: newLoserRating,
    };

    setTournamentState((prev) => ({ ...prev, eloRatings: updatedRatings }));
    advanceToNextMatchup();
  };

  const handleToughDecision = () => {
    const { eloRatings } = tournamentState;
    const [item1, item2] = currentMatchup;
    const rating1 = eloRatings[item1.id];
    const rating2 = eloRatings[item2.id];
    const [newRating1, newRating2] = updateEloRatings(rating1, rating2, true);

    const updatedRatings = {
      ...eloRatings,
      [item1.id]: newRating1,
      [item2.id]: newRating2,
    };

    setTournamentState((prev) => ({ ...prev, eloRatings: updatedRatings }));
    setToughDecisionUsed(true);
    advanceToNextMatchup();
  };

  const advanceToNextMatchup = () => {
    const nextIndex = matchupIndex + 1;

    if (nextIndex >= tournamentState.matchups.length) {
      // Tournament complete
      const { newItem, type, eloRatings } = tournamentState;
      const finalNewItemRating = eloRatings[newItem.id];

      const updatedNewItem = {
        ...newItem,
        eloRating: finalNewItemRating,
        displayRating: convertEloToDisplayRating(finalNewItemRating),
      };

      finalizeTournament(updatedNewItem, type, eloRatings);
    } else {
      setMatchupIndex(nextIndex);
      setCurrentMatchup(tournamentState.matchups[nextIndex]);
    }
  };

  const finalizeTournament = (newItem, type, updatedRatings) => {
    // Get all current rankings
    const allRankings = JSON.parse(
      localStorage.getItem(`${type === "movie" ? "movie" : "show"}Rankings`) ||
        "[]"
    );

    // Update existing items' ratings if they were in the tournament
    const updatedRankings = allRankings.map((item) => {
      if (updatedRatings[item.id]) {
        return {
          ...item,
          eloRating: updatedRatings[item.id],
          displayRating: convertEloToDisplayRating(updatedRatings[item.id]),
        };
      }
      return item;
    });

    // Add new item and sort by ELO rating
    const finalRankings = [...updatedRankings, newItem].sort(
      (a, b) => b.eloRating - a.eloRating
    );

    // Find the new item's position
    const newItemPosition =
      finalRankings.findIndex((item) => item.id === newItem.id) + 1;

    // Save back to localStorage
    localStorage.setItem(
      `${type === "movie" ? "movie" : "show"}Rankings`,
      JSON.stringify(finalRankings)
    );

    // Update dashboard state
    if (type === "movie") {
      setMovieRankings(finalRankings.slice(0, 5));
    } else {
      setShowRankings(finalRankings.slice(0, 5));
    }

    // Show results screen instead of closing immediately
    setShowResults({
      item: newItem,
      position: newItemPosition,
      totalItems: finalRankings.length,
      type: type,
    });

    // Reset tournament state
    setTournamentState(null);
    setCurrentMatchup(null);
  };

  const openModal = (type) => {
    setShowAddModal(type);
    setSearchQuery("");
    setSearchResults([]);
  };

  const closeModal = () => {
    setShowAddModal(null);
    setSearchQuery("");
    setSearchResults([]);
    setTournamentState(null);
    setCurrentMatchup(null);
    setToughDecisionUsed(false);
    setShowResults(null);
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
      <h1
        style={{
          color: "#1f2937",
          marginBottom: "2rem",
          textAlign: "center",
          fontSize: "2.5rem",
        }}
      >
        🎬 Your Entertainment Dashboard
      </h1>

      {/* Top Favorites Section */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "2rem",
          marginBottom: "2rem",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              color: "#374151",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              margin: 0,
            }}
          >
            🏆 Your Top 5 Favorites
          </h2>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button
              onClick={() => openModal("movie")}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "transform 0.2s",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              }}
              onMouseEnter={(e) =>
                (e.target.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
            >
              + Add Movie
            </button>
            <button
              onClick={() => openModal("show")}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "transform 0.2s",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)",
              }}
              onMouseEnter={(e) =>
                (e.target.style.transform = "translateY(-2px)")
              }
              onMouseLeave={(e) => (e.target.style.transform = "translateY(0)")}
            >
              + Add TV Show
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "3rem",
          }}
        >
          {/* Movies Column */}
          <div>
            <h3
              style={{
                color: "#4f46e5",
                marginBottom: "1rem",
                fontSize: "1.2rem",
                textAlign: "center",
              }}
            >
              🎬 Movies
            </h3>
            {movieRankings.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#6b7280",
                  fontStyle: "italic",
                  padding: "2rem",
                }}
              >
                No movies ranked yet
              </div>
            ) : (
              movieRankings.map((movie, index) => (
                <div
                  key={movie.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem",
                    marginBottom: "0.5rem",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    borderLeft: "4px solid #667eea",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      color: "#6b7280",
                      marginRight: "1rem",
                      fontSize: "1.1rem",
                    }}
                  >
                    #{index + 1}
                  </span>
                  <span
                    style={{
                      flexGrow: 1,
                      fontWeight: "600",
                      color: "#1f2937",
                    }}
                  >
                    {movie.title}
                  </span>
                  <span
                    style={{
                      fontWeight: "bold",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "20px",
                      background: "rgba(102, 126, 234, 0.1)",
                      color: "#4f46e5",
                    }}
                  >
                    {movie.displayRating}/10
                  </span>
                </div>
              ))
            )}
          </div>

          {/* TV Shows Column */}
          <div>
            <h3
              style={{
                color: "#059669",
                marginBottom: "1rem",
                fontSize: "1.2rem",
                textAlign: "center",
              }}
            >
              📺 TV Shows
            </h3>
            {showRankings.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  color: "#6b7280",
                  fontStyle: "italic",
                  padding: "2rem",
                }}
              >
                No shows ranked yet
              </div>
            ) : (
              showRankings.map((show, index) => (
                <div
                  key={show.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem",
                    marginBottom: "0.5rem",
                    background: "#f8fafc",
                    borderRadius: "12px",
                    borderLeft: "4px solid #10b981",
                  }}
                >
                  <span
                    style={{
                      fontWeight: "bold",
                      color: "#6b7280",
                      marginRight: "1rem",
                      fontSize: "1.1rem",
                    }}
                  >
                    #{index + 1}
                  </span>
                  <span
                    style={{
                      flexGrow: 1,
                      fontWeight: "600",
                      color: "#1f2937",
                    }}
                  >
                    {show.title}
                  </span>
                  <span
                    style={{
                      fontWeight: "bold",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "20px",
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "#059669",
                    }}
                  >
                    {show.displayRating}/10
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recommendations Section */}
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          padding: "2rem",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            color: "#374151",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          💡 Personalized Recommendations
        </h2>
        <div
          style={{
            color: "#6b7280",
            fontStyle: "italic",
            padding: "3rem",
            background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
            borderRadius: "12px",
            border: "2px dashed #d1d5db",
          }}
        >
        <div>
          {loading ? (
            <p>✨ Analyzing your favorites...</p>
          ) : recommendations.length > 0 ? (
          <div>
            {recommendations.map((r) => (
            <div key={r.title}>
              <h4>{r.title}</h4>
              <p>{r.reason}</p>
          </div>
        ))}
        </div>
      ) : (
      <button onClick={generateRecommendations}>
          Generate Smart Recommendations
      </button>
      )}
      </div>

        </div>
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "2rem",
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "20px",
              padding: "2rem",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ margin: 0, color: "#1f2937" }}>
                {tournamentState
                  ? `Tournament: ${tournamentState.newItem.title}`
                  : `Add New ${showAddModal === "movie" ? "Movie" : "TV Show"}`}
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ×
              </button>
            </div>

            {/* Results View */}
            {showResults ? (
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    width: "100px",
                    height: "100px",
                    background:
                      showResults.type === "movie"
                        ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 2rem",
                    fontSize: "3rem",
                  }}
                >
                  {showResults.type === "movie" ? "🎬" : "📺"}
                </div>

                <h3 style={{ color: "#1f2937", marginBottom: "1rem" }}>
                  Tournament Complete! 🎉
                </h3>

                <div
                  style={{
                    background:
                      showResults.type === "movie"
                        ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    padding: "2rem",
                    borderRadius: "16px",
                    marginBottom: "2rem",
                  }}
                >
                  <h4 style={{ margin: "0 0 1rem", fontSize: "1.3rem" }}>
                    {showResults.item.title}
                  </h4>
                  <div
                    style={{
                      fontSize: "2.5rem",
                      fontWeight: "bold",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {showResults.item.displayRating}/10
                  </div>
                  <p style={{ margin: "0 0 1rem", opacity: 0.9 }}>
                    Ranked #{showResults.position} out of{" "}
                    {showResults.totalItems}{" "}
                    {showResults.type === "movie" ? "movies" : "shows"}
                  </p>
                  {showResults.position <= 5 && (
                    <div
                      style={{
                        background: "rgba(255,255,255,0.2)",
                        padding: "0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.9rem",
                      }}
                    >
                      🏆 Made it to your top 5!
                    </div>
                  )}
                </div>

                <button
                  onClick={closeModal}
                  style={{
                    background:
                      showResults.type === "movie"
                        ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    border: "none",
                    padding: "1rem 2rem",
                    borderRadius: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                    fontSize: "1rem",
                    transition: "transform 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.target.style.transform = "translateY(-2px)")
                  }
                  onMouseLeave={(e) =>
                    (e.target.style.transform = "translateY(0)")
                  }
                >
                  Back to Dashboard
                </button>
              </div>
            ) : tournamentState && currentMatchup ? (
              <div>
                {/* Progress */}
                <div style={{ marginBottom: "2rem" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <span style={{ fontSize: "0.9rem", color: "#666" }}>
                      Mini-Tournament Progress
                    </span>
                    <span style={{ fontSize: "0.9rem", color: "#666" }}>
                      {matchupIndex + 1} of {tournamentState.matchups.length}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "#e5e7eb",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${
                          ((matchupIndex + 1) /
                            tournamentState.matchups.length) *
                          100
                        }%`,
                        height: "100%",
                        background:
                          showAddModal === "movie"
                            ? "linear-gradient(90deg, #667eea, #764ba2)"
                            : "linear-gradient(90deg, #10b981, #059669)",
                        borderRadius: "4px",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </div>
                </div>

                <p
                  style={{
                    textAlign: "center",
                    color: "#666",
                    marginBottom: "2rem",
                  }}
                >
                  Which do you prefer?
                </p>

                {/* Tournament Matchup */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto 1fr",
                    gap: "2rem",
                    alignItems: "center",
                    marginBottom: "2rem",
                  }}
                >
                  {/* Item 1 */}
                  <button
                    onClick={() =>
                      handleTournamentChoice(
                        currentMatchup[0].id,
                        currentMatchup[1].id
                      )
                    }
                    style={{
                      background: "white",
                      border: "2px solid #e5e7eb",
                      borderRadius: "16px",
                      padding: "1.5rem",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "center",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                    }}
                    onMouseEnter={(e) => {
                      const color =
                        showAddModal === "movie" ? "#4f46e5" : "#059669";
                      e.target.style.borderColor = color;
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = `0 8px 20px ${
                        showAddModal === "movie"
                          ? "rgba(79, 70, 229, 0.3)"
                          : "rgba(5, 150, 105, 0.3)"
                      }`;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)";
                    }}
                  >
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        background:
                          showAddModal === "movie"
                            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                            : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1rem",
                        fontSize: "2rem",
                      }}
                    >
                      {showAddModal === "movie" ? "🎬" : "📺"}
                    </div>
                    <h4 style={{ margin: "0 0 0.5rem", color: "#1f2937" }}>
                      {currentMatchup[0].title}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        color: "#6b7280",
                        fontSize: "0.9rem",
                      }}
                    >
                      ({currentMatchup[0].year})
                    </p>
                  </button>

                  {/* VS */}
                  <div
                    style={{
                      background:
                        showAddModal === "movie"
                          ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                          : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                      padding: "1rem",
                      borderRadius: "50%",
                      width: "60px",
                      height: "60px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: "bold",
                      fontSize: "1.2rem",
                      boxShadow:
                        showAddModal === "movie"
                          ? "0 4px 15px rgba(102, 126, 234, 0.4)"
                          : "0 4px 15px rgba(16, 185, 129, 0.4)",
                    }}
                  >
                    VS
                  </div>

                  {/* Item 2 */}
                  <button
                    onClick={() =>
                      handleTournamentChoice(
                        currentMatchup[1].id,
                        currentMatchup[0].id
                      )
                    }
                    style={{
                      background: "white",
                      border: "2px solid #e5e7eb",
                      borderRadius: "16px",
                      padding: "1.5rem",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      textAlign: "center",
                      boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                    }}
                    onMouseEnter={(e) => {
                      const color =
                        showAddModal === "movie" ? "#4f46e5" : "#059669";
                      e.target.style.borderColor = color;
                      e.target.style.transform = "translateY(-2px)";
                      e.target.style.boxShadow = `0 8px 20px ${
                        showAddModal === "movie"
                          ? "rgba(79, 70, 229, 0.3)"
                          : "rgba(5, 150, 105, 0.3)"
                      }`;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = "#e5e7eb";
                      e.target.style.transform = "translateY(0)";
                      e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)";
                    }}
                  >
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        background:
                          showAddModal === "movie"
                            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                            : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        margin: "0 auto 1rem",
                        fontSize: "2rem",
                      }}
                    >
                      {showAddModal === "movie" ? "🎬" : "📺"}
                    </div>
                    <h4 style={{ margin: "0 0 0.5rem", color: "#1f2937" }}>
                      {currentMatchup[1].title}
                    </h4>
                    <p
                      style={{
                        margin: 0,
                        color: "#6b7280",
                        fontSize: "0.9rem",
                      }}
                    >
                      ({currentMatchup[1].year})
                    </p>
                  </button>
                </div>

                {/* Too Tough to Decide Button */}
                <div style={{ textAlign: "center" }}>
                  <button
                    onClick={handleToughDecision}
                    disabled={toughDecisionUsed}
                    style={{
                      background: toughDecisionUsed
                        ? "#f3f4f6"
                        : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                      color: toughDecisionUsed ? "#9ca3af" : "white",
                      border: "none",
                      padding: "0.75rem 1.5rem",
                      borderRadius: "20px",
                      fontWeight: "600",
                      cursor: toughDecisionUsed ? "not-allowed" : "pointer",
                      opacity: toughDecisionUsed ? 0.5 : 1,
                      transition: "all 0.2s",
                      boxShadow: toughDecisionUsed
                        ? "none"
                        : "0 4px 15px rgba(251, 191, 36, 0.4)",
                    }}
                    onMouseEnter={(e) => {
                      if (!toughDecisionUsed) {
                        e.target.style.transform = "translateY(-2px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!toughDecisionUsed) {
                        e.target.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    {toughDecisionUsed
                      ? "🤔 Already Used"
                      : "🤔 Too Tough to Decide"}
                  </button>
                  {!toughDecisionUsed && (
                    <p
                      style={{
                        fontSize: "0.8rem",
                        color: "#6b7280",
                        marginTop: "0.5rem",
                      }}
                    >
                      (Can only be used once!)
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search for a ${
                      showAddModal === "movie" ? "movie" : "TV show"
                    }...`}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "1rem",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") searchContent();
                    }}
                  />
                  <button
                    onClick={searchContent}
                    disabled={isSearching}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: "#4f46e5",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      cursor: isSearching ? "not-allowed" : "pointer",
                      opacity: isSearching ? 0.5 : 1,
                    }}
                  >
                    {isSearching ? "..." : "Search"}
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "0.75rem",
                    maxHeight: "400px",
                    overflowY: "auto",
                  }}
                >
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleAddItem(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "1rem",
                        padding: "1rem",
                        background: "#f8fafc",
                        border: "1px solid #e5e7eb",
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        textAlign: "left",
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = "#f1f5f9";
                        e.target.style.borderColor = "#4f46e5";
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = "#f8fafc";
                        e.target.style.borderColor = "#e5e7eb";
                      }}
                    >
                      {item.poster_path ? (
                        <img
                          src={`https://image.tmdb.org/t/p/w92${item.poster_path}`}
                          alt={
                            showAddModal === "movie" ? item.title : item.name
                          }
                          style={{
                            width: "60px",
                            height: "90px",
                            borderRadius: "8px",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: "60px",
                            height: "90px",
                            background: "#e5e7eb",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "#9ca3af",
                          }}
                        >
                          {showAddModal === "movie" ? "🎬" : "📺"}
                        </div>
                      )}
                      <div>
                        <div
                          style={{
                            fontWeight: "600",
                            color: "#1f2937",
                            marginBottom: "0.25rem",
                          }}
                        >
                          {showAddModal === "movie" ? item.title : item.name}
                        </div>
                        <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                          {showAddModal === "movie"
                            ? (item.release_date || "N/A").slice(0, 4)
                            : (item.first_air_date || "N/A").slice(0, 4)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {searchResults.length === 0 && searchQuery && !isSearching && (
                  <div
                    style={{
                      textAlign: "center",
                      color: "#6b7280",
                      padding: "2rem",
                    }}
                  >
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
