import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MovieRanking() {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [currentMatchup, setCurrentMatchup] = useState(null);
  const [matchupIndex, setMatchupIndex] = useState(0);
  const [allMatchups, setAllMatchups] = useState([]);
  const [eloRatings, setEloRatings] = useState({});
  const [toughDecisionUsed, setToughDecisionUsed] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

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
    // 1000 ELO = 7/10 (good), since these are pre-selected favorites
    const baselineElo = 1000; // This represents "7/10 quality"
    const baselineRating = 9.0;

    const ratingChange = ((eloRating - baselineElo) / 400) * 3; // Scale factor
    return Math.max(
      0,
      Math.min(10, Math.round((baselineRating + ratingChange) * 10) / 10)
    );
  };

  useEffect(() => {
    // Load selected movies from localStorage
    const savedMovies = JSON.parse(
      localStorage.getItem("movieFavorites") || "[]"
    );
    if (savedMovies.length === 0) {
      navigate("/onboarding/movies");
      return;
    }

    setMovies(savedMovies);

    // Generate all possible matchups (round-robin)
    const matchups = [];
    for (let i = 0; i < savedMovies.length; i++) {
      for (let j = i + 1; j < savedMovies.length; j++) {
        matchups.push([savedMovies[i], savedMovies[j]]);
      }
    }

    // Shuffle matchups for variety
    const shuffledMatchups = matchups.sort(() => Math.random() - 0.5);
    setAllMatchups(shuffledMatchups);
    setCurrentMatchup(shuffledMatchups[0]);

    // Initialize ELO ratings - everyone starts at 1000
    const initialRatings = {};
    savedMovies.forEach((movie) => {
      initialRatings[movie.id] = 1000;
    });
    setEloRatings(initialRatings);
  }, [navigate]);

  const handleChoice = (winnerId, loserId) => {
    // Update ELO ratings
    setEloRatings(prev => {
      const winnerRating = prev[winnerId];
      const loserRating = prev[loserId];
      const [newWinnerRating, newLoserRating] = updateEloRatings(winnerRating, loserRating, false);
      
      return {
        ...prev,
        [winnerId]: newWinnerRating,
        [loserId]: newLoserRating
      };
    });

    advanceToNextMatchup();
  };

  const handleToughDecision = () => {
    setToughDecisionUsed(true);
    
    // Both items get 0.5 points (draw) in ELO
    const [item1, item2] = currentMatchup;
    setEloRatings(prev => {
      const rating1 = prev[item1.id];
      const rating2 = prev[item2.id];
      const [newRating1, newRating2] = updateEloRatings(rating1, rating2, true);
      
      return {
        ...prev,
        [item1.id]: newRating1,
        [item2.id]: newRating2
      };
    });
    
    advanceToNextMatchup();
  };

  const advanceToNextMatchup = () => {
    const nextIndex = matchupIndex + 1;
    
    if (nextIndex >= allMatchups.length) {
      // Tournament complete
      setIsComplete(true);
      
      // Save ELO ratings to localStorage
      const moviesWithRatings = movies.map(movie => ({
        ...movie,
        eloRating: eloRatings[movie.id],
        displayRating: convertEloToDisplayRating(eloRatings[movie.id])
      }));
      
      localStorage.setItem("movieRankings", JSON.stringify(moviesWithRatings));
    } else {
      setMatchupIndex(nextIndex);
      setCurrentMatchup(allMatchups[nextIndex]);
    }
  };

  const getRankedMovies = () => {
    return movies
      .map(movie => ({
        ...movie,
        eloRating: eloRatings[movie.id] || 1000,
        displayRating: convertEloToDisplayRating(eloRatings[movie.id] || 1000)
      }))
      .sort((a, b) => b.eloRating - a.eloRating);
  };

  if (movies.length === 0) return <div>Loading...</div>;

  if (isComplete) {
    const rankedMovies = getRankedMovies();
    
    return (
      <div style={{ padding: "2rem", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ marginBottom: "2rem", color: "#4f46e5" }}>🎬 Movie Rankings Complete!</h1>
        
        <div style={{ 
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: "2rem", 
          borderRadius: "20px",
          marginBottom: "2rem",
          color: "white"
        }}>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem" }}>Your Movie Leaderboard</h2>
          
          {rankedMovies.map((movie, index) => (
            <div key={movie.id} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "rgba(255,255,255,0.1)",
              padding: "1rem",
              borderRadius: "12px",
              marginBottom: "0.5rem",
              backdropFilter: "blur(10px)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <span style={{ 
                  fontSize: "1.5rem", 
                  fontWeight: "bold",
                  color: index === 0 ? "#ffd700" : index === 1 ? "#c0c0c0" : index === 2 ? "#cd7f32" : "white"
                }}>
                  #{index + 1}
                </span>
                <div>
                  <div style={{ fontWeight: "600" }}>{movie.title}</div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>({movie.year})</div>
                </div>
              </div>
              <div style={{ 
                background: "rgba(255,255,255,0.2)", 
                padding: "0.5rem 1rem", 
                borderRadius: "20px",
                fontWeight: "600"
              }}>
                {movie.displayRating}/10
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate("/onboarding/shows")}
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            padding: "1rem 2rem",
            borderRadius: "25px",
            fontSize: "1.1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "transform 0.2s",
            boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)"
          }}
          onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
          onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
        >
          Select Your TV Shows →
        </button>
      </div>
    );
  }

  if (!currentMatchup) return <div>Setting up tournament...</div>;

  const [movie1, movie2] = currentMatchup;
  const progress = ((matchupIndex + 1) / allMatchups.length) * 100;

  return (
    <div style={{ padding: "2rem", maxWidth: 700, margin: "0 auto" }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem", color: "#666" }}>Movie Tournament Progress</span>
          <span style={{ fontSize: "0.9rem", color: "#666" }}>
            {matchupIndex + 1} of {allMatchups.length}
          </span>
        </div>
        <div style={{ 
          width: "100%", 
          height: "8px", 
          background: "#e5e7eb", 
          borderRadius: "4px",
          overflow: "hidden"
        }}>
          <div style={{
            width: `${progress}%`,
            height: "100%",
            background: "linear-gradient(90deg, #667eea, #764ba2)",
            borderRadius: "4px",
            transition: "width 0.3s ease"
          }} />
        </div>
      </div>

      <h1 style={{ textAlign: "center", marginBottom: "1rem", color: "#4f46e5" }}>
        🎬 Movie Face-Off
      </h1>
      <p style={{ textAlign: "center", color: "#666", marginBottom: "3rem" }}>
        Which movie do you prefer?
      </p>

      {/* Movie Matchup */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: "2rem",
        alignItems: "center",
        marginBottom: "3rem"
      }}>
        {/* Movie 1 */}
        <button
          onClick={() => handleChoice(movie1.id, movie2.id)}
          style={{
            background: "white",
            border: "2px solid #e5e7eb",
            borderRadius: "16px",
            padding: "1.5rem",
            cursor: "pointer",
            transition: "all 0.2s",
            textAlign: "center",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = "#4f46e5";
            e.target.style.transform = "translateY(-4px)";
            e.target.style.boxShadow = "0 8px 20px rgba(79, 70, 229, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "#e5e7eb";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)";
          }}
        >
          {movie1.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w300${movie1.poster_path}`}
              alt={movie1.title}
              style={{ width: "100%", maxWidth: "200px", borderRadius: "12px", marginBottom: "1rem" }}
            />
          ) : (
            <div style={{
              width: "200px",
              height: "300px",
              background: "#f3f4f6",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              color: "#9ca3af"
            }}>
              🎬
            </div>
          )}
          <h3 style={{ margin: "0 0 0.5rem", color: "#1f2937" }}>{movie1.title}</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>({movie1.year})</p>
        </button>

        {/* VS */}
        <div style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
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
          boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)"
        }}>
          VS
        </div>

        {/* Movie 2 */}
        <button
          onClick={() => handleChoice(movie2.id, movie1.id)}
          style={{
            background: "white",
            border: "2px solid #e5e7eb",
            borderRadius: "16px",
            padding: "1.5rem",
            cursor: "pointer",
            transition: "all 0.2s",
            textAlign: "center",
            boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = "#4f46e5";
            e.target.style.transform = "translateY(-4px)";
            e.target.style.boxShadow = "0 8px 20px rgba(79, 70, 229, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "#e5e7eb";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)";
          }}
        >
          {movie2.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w300${movie2.poster_path}`}
              alt={movie2.title}
              style={{ width: "100%", maxWidth: "200px", borderRadius: "12px", marginBottom: "1rem" }}
            />
          ) : (
            <div style={{
              width: "200px",
              height: "300px",
              background: "#f3f4f6",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
              color: "#9ca3af"
            }}>
              🎬
            </div>
          )}
          <h3 style={{ margin: "0 0 0.5rem", color: "#1f2937" }}>{movie2.title}</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>({movie2.year})</p>
        </button>
      </div>

      {/* Too Tough to Decide Button */}
      <div style={{ textAlign: "center" }}>
        <button
          onClick={handleToughDecision}
          disabled={toughDecisionUsed}
          style={{
            background: toughDecisionUsed ? "#f3f4f6" : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            color: toughDecisionUsed ? "#9ca3af" : "white",
            border: "none",
            padding: "0.75rem 1.5rem",
            borderRadius: "20px",
            fontWeight: "600",
            cursor: toughDecisionUsed ? "not-allowed" : "pointer",
            opacity: toughDecisionUsed ? 0.5 : 1,
            transition: "all 0.2s",
            boxShadow: toughDecisionUsed ? "none" : "0 4px 15px rgba(251, 191, 36, 0.4)"
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
          {toughDecisionUsed ? "🤔 Already Used" : "🤔 Too Tough to Decide"}
        </button>
        {!toughDecisionUsed && (
          <p style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.5rem" }}>
            (Can only be used once!)
          </p>
        )}
      </div>
    </div>
  );
}