import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ShowRanking() {
  const navigate = useNavigate();
  const [shows, setShows] = useState([]);
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
    // Convert ELO (roughly 800-1200 range) to 0-10 scale
    const minElo = 600;
    const maxElo = 1400;
    const normalized = Math.max(0, Math.min(1, (eloRating - minElo) / (maxElo - minElo)));
    return Math.round(normalized * 100) / 10; // Round to 1 decimal place
  };

  useEffect(() => {
    // Load selected shows from localStorage
    const savedShows = JSON.parse(localStorage.getItem("showFavorites") || "[]");
    if (savedShows.length === 0) {
      navigate("/onboarding/shows");
      return;
    }

    setShows(savedShows);
    
    // Generate all possible matchups (round-robin)
    const matchups = [];
    for (let i = 0; i < savedShows.length; i++) {
      for (let j = i + 1; j < savedShows.length; j++) {
        matchups.push([savedShows[i], savedShows[j]]);
      }
    }
    
    // Shuffle matchups for variety
    const shuffledMatchups = matchups.sort(() => Math.random() - 0.5);
    setAllMatchups(shuffledMatchups);
    setCurrentMatchup(shuffledMatchups[0]);

    // Initialize ELO ratings - everyone starts at 1000
    const initialRatings = {};
    savedShows.forEach(show => {
      initialRatings[show.id] = 1000;
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
      const showsWithRatings = shows.map(show => ({
        ...show,
        eloRating: eloRatings[show.id],
        displayRating: convertEloToDisplayRating(eloRatings[show.id])
      }));
      
      localStorage.setItem("showRankings", JSON.stringify(showsWithRatings));
    } else {
      setMatchupIndex(nextIndex);
      setCurrentMatchup(allMatchups[nextIndex]);
    }
  };

  const getRankedShows = () => {
    return shows
      .map(show => ({
        ...show,
        eloRating: eloRatings[show.id] || 1000,
        displayRating: convertEloToDisplayRating(eloRatings[show.id] || 1000)
      }))
      .sort((a, b) => b.eloRating - a.eloRating);
  };

  if (shows.length === 0) return <div>Loading...</div>;

  if (isComplete) {
    const rankedShows = getRankedShows();
    
    return (
      <div style={{ padding: "2rem", maxWidth: 600, margin: "0 auto", textAlign: "center" }}>
        <h1 style={{ marginBottom: "2rem", color: "#059669" }}>📺 TV Show Rankings Complete!</h1>
        
        <div style={{ 
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          padding: "2rem", 
          borderRadius: "20px",
          marginBottom: "2rem",
          color: "white"
        }}>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.5rem" }}>Your TV Show Leaderboard</h2>
          
          {rankedShows.map((show, index) => (
            <div key={show.id} style={{
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
                  <div style={{ fontWeight: "600" }}>{show.title}</div>
                  <div style={{ fontSize: "0.9rem", opacity: 0.8 }}>({show.year})</div>
                </div>
              </div>
              <div style={{ 
                background: "rgba(255,255,255,0.2)", 
                padding: "0.5rem 1rem", 
                borderRadius: "20px",
                fontWeight: "600"
              }}>
                {show.displayRating}/10
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => {
            // Mark onboarding as complete and go to home
            localStorage.setItem("hasOnboarded", "true");
            navigate("/home");
          }}
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            border: "none",
            padding: "1rem 2rem",
            borderRadius: "25px",
            fontSize: "1.1rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "transform 0.2s",
            boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)"
          }}
          onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
          onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
        >
          Complete Setup! 🎉
        </button>
      </div>
    );
  }

  if (!currentMatchup) return <div>Setting up tournament...</div>;

  const [show1, show2] = currentMatchup;
  const progress = ((matchupIndex + 1) / allMatchups.length) * 100;

  return (
    <div style={{ padding: "2rem", maxWidth: 700, margin: "0 auto" }}>
      {/* Progress Bar */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.9rem", color: "#666" }}>TV Show Tournament Progress</span>
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
            background: "linear-gradient(90deg, #10b981, #059669)",
            borderRadius: "4px",
            transition: "width 0.3s ease"
          }} />
        </div>
      </div>

      <h1 style={{ textAlign: "center", marginBottom: "1rem", color: "#059669" }}>
        📺 TV Show Face-Off
      </h1>
      <p style={{ textAlign: "center", color: "#666", marginBottom: "3rem" }}>
        Which TV show do you prefer?
      </p>

      {/* Show Matchup */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        gap: "2rem",
        alignItems: "center",
        marginBottom: "3rem"
      }}>
        {/* Show 1 */}
        <button
          onClick={() => handleChoice(show1.id, show2.id)}
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
            e.target.style.borderColor = "#059669";
            e.target.style.transform = "translateY(-4px)";
            e.target.style.boxShadow = "0 8px 20px rgba(5, 150, 105, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "#e5e7eb";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)";
          }}
        >
          {show1.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w300${show1.poster_path}`}
              alt={show1.title}
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
              📺
            </div>
          )}
          <h3 style={{ margin: "0 0 0.5rem", color: "#1f2937" }}>{show1.title}</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>({show1.year})</p>
        </button>

        {/* VS */}
        <div style={{
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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
          boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)"
        }}>
          VS
        </div>

        {/* Show 2 */}
        <button
          onClick={() => handleChoice(show2.id, show1.id)}
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
            e.target.style.borderColor = "#059669";
            e.target.style.transform = "translateY(-4px)";
            e.target.style.boxShadow = "0 8px 20px rgba(5, 150, 105, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "#e5e7eb";
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)";
          }}
        >
          {show2.poster_path ? (
            <img
              src={`https://image.tmdb.org/t/p/w300${show2.poster_path}`}
              alt={show2.title}
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
              📺
            </div>
          )}
          <h3 style={{ margin: "0 0 0.5rem", color: "#1f2937" }}>{show2.title}</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>({show2.year})</p>
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