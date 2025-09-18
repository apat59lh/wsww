import { useEffect, useState } from "react";

export default function Dashboard() {
  const [movieRankings, setMovieRankings] = useState([]);
  const [showRankings, setShowRankings] = useState([]);
  const [showAddModal, setShowAddModal] = useState(null); // 'movie' or 'show' or null
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const API_KEY =
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_TMDB_API_KEY) ||
    process.env.REACT_APP_TMDB_API_KEY;

  useEffect(() => {
    // Load rankings from localStorage
    const savedMovieRankings = JSON.parse(localStorage.getItem("movieRankings") || "[]");
    const savedShowRankings = JSON.parse(localStorage.getItem("showRankings") || "[]");
    
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
      const endpoint = showAddModal === 'movie' ? 'search/movie' : 'search/tv';
      const url = `https://api.themoviedb.org/3/${endpoint}?api_key=${API_KEY}&query=${encodeURIComponent(searchQuery.trim())}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setSearchResults(Array.isArray(data.results) ? data.results.slice(0, 10) : []);
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
      title: showAddModal === 'movie' ? item.title : item.name,
      poster_path: item.poster_path,
      year: showAddModal === 'movie' 
        ? (item.release_date || "").slice(0, 4)
        : (item.first_air_date || "").slice(0, 4),
      eloRating: 1000, // Start at baseline
      displayRating: 9.0 // Start at baseline
    };

    // Add to appropriate list and trigger mini-tournament
    if (showAddModal === 'movie') {
      startMiniTournament(newItem, 'movie');
    } else {
      startMiniTournament(newItem, 'show');
    }

    // Close modal
    closeModal();
  };

  const startMiniTournament = (newItem, type) => {
    // This is a simplified version - we'll store the new item and mark it needs tournament
    localStorage.setItem(`pending${type === 'movie' ? 'Movie' : 'Show'}`, JSON.stringify(newItem));
    
    // For now, just add it at baseline rating and alert user
    // In a full implementation, you'd navigate to a mini-tournament component
    alert(`Added "${newItem.title}"! Mini-tournament feature coming soon - for now it's added with baseline rating.`);
    
    // Add to current list temporarily
    const currentRankings = type === 'movie' ? movieRankings : showRankings;
    const allRankings = JSON.parse(localStorage.getItem(`${type === 'movie' ? 'movie' : 'show'}Rankings`) || "[]");
    const updatedRankings = [...allRankings, newItem].sort((a, b) => b.eloRating - a.eloRating);
    
    localStorage.setItem(`${type === 'movie' ? 'movie' : 'show'}Rankings`, JSON.stringify(updatedRankings));
    
    // Update state
    if (type === 'movie') {
      setMovieRankings(updatedRankings.slice(0, 5));
    } else {
      setShowRankings(updatedRankings.slice(0, 5));
    }
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
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ 
        color: "#1f2937", 
        marginBottom: "2rem", 
        textAlign: "center", 
        fontSize: "2.5rem" 
      }}>
        🎬 Your Entertainment Dashboard
      </h1>
      
      {/* Top Favorites Section */}
      <div style={{
        background: "white",
        borderRadius: "20px",
        padding: "2rem",
        marginBottom: "2rem",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <h2 style={{
            fontSize: "1.5rem",
            color: "#374151",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: 0
          }}>
            🏆 Your Top 5 Favorites
          </h2>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <button
              onClick={() => openModal('movie')}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "transform 0.2s",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)"
              }}
              onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
            >
              + Add Movie
            </button>
            <button
              onClick={() => openModal('show')}
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
                padding: "0.75rem 1.5rem",
                borderRadius: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "transform 0.2s",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.3)"
              }}
              onMouseEnter={(e) => e.target.style.transform = "translateY(-2px)"}
              onMouseLeave={(e) => e.target.style.transform = "translateY(0)"}
            >
              + Add TV Show
            </button>
          </div>
        </div>
        
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "3rem"
        }}>
          {/* Movies Column */}
          <div>
            <h3 style={{
              color: "#4f46e5",
              marginBottom: "1rem",
              fontSize: "1.2rem",
              textAlign: "center"
            }}>
              🎬 Movies
            </h3>
            {movieRankings.length === 0 ? (
              <div style={{
                textAlign: "center",
                color: "#6b7280",
                fontStyle: "italic",
                padding: "2rem"
              }}>
                No movies ranked yet
              </div>
            ) : (
              movieRankings.map((movie, index) => (
                <div key={movie.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem",
                  marginBottom: "0.5rem",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  borderLeft: "4px solid #667eea"
                }}>
                  <span style={{
                    fontWeight: "bold",
                    color: "#6b7280",
                    marginRight: "1rem",
                    fontSize: "1.1rem"
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{
                    flexGrow: 1,
                    fontWeight: "600",
                    color: "#1f2937"
                  }}>
                    {movie.title}
                  </span>
                  <span style={{
                    fontWeight: "bold",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "20px",
                    background: "rgba(102, 126, 234, 0.1)",
                    color: "#4f46e5"
                  }}>
                    {movie.displayRating}/10
                  </span>
                </div>
              ))
            )}
          </div>
          
          {/* TV Shows Column */}
          <div>
            <h3 style={{
              color: "#059669",
              marginBottom: "1rem",
              fontSize: "1.2rem",
              textAlign: "center"
            }}>
              📺 TV Shows
            </h3>
            {showRankings.length === 0 ? (
              <div style={{
                textAlign: "center",
                color: "#6b7280",
                fontStyle: "italic",
                padding: "2rem"
              }}>
                No shows ranked yet
              </div>
            ) : (
              showRankings.map((show, index) => (
                <div key={show.id} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem",
                  marginBottom: "0.5rem",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  borderLeft: "4px solid #10b981"
                }}>
                  <span style={{
                    fontWeight: "bold",
                    color: "#6b7280",
                    marginRight: "1rem",
                    fontSize: "1.1rem"
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{
                    flexGrow: 1,
                    fontWeight: "600",
                    color: "#1f2937"
                  }}>
                    {show.title}
                  </span>
                  <span style={{
                    fontWeight: "bold",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "20px",
                    background: "rgba(16, 185, 129, 0.1)",
                    color: "#059669"
                  }}>
                    {show.displayRating}/10
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Recommendations Section */}
      <div style={{
        background: "white",
        borderRadius: "20px",
        padding: "2rem",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
        textAlign: "center"
      }}>
        <h2 style={{
          color: "#374151",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem"
        }}>
          💡 Personalized Recommendations
        </h2>
        <div style={{
          color: "#6b7280",
          fontStyle: "italic",
          padding: "3rem",
          background: "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
          borderRadius: "12px",
          border: "2px dashed #d1d5db"
        }}>
          <p>🚧 Smart recommendations based on your ratings coming soon!</p>
          <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
            We'll analyze your preferences to suggest new movies and shows you'll love.
          </p>
        </div>
      </div>

      {/* Add Content Modal */}
      {showAddModal && (
        <div style={{
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
          padding: "2rem"
        }}>
          <div style={{
            background: "white",
            borderRadius: "20px",
            padding: "2rem",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "80vh",
            overflowY: "auto"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem"
            }}>
              <h3 style={{ margin: 0, color: "#1f2937" }}>
                Add New {showAddModal === 'movie' ? 'Movie' : 'TV Show'}
              </h3>
              <button
                onClick={closeModal}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#6b7280"
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "1.5rem"
            }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search for a ${showAddModal}...`}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "1rem"
                }}
                onKeyDown={(e) => { if (e.key === "Enter") searchContent(); }}
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
                  opacity: isSearching ? 0.5 : 1
                }}
              >
                {isSearching ? "..." : "Search"}
              </button>
            </div>
            
            <div style={{
              display: "grid",
              gap: "0.75rem",
              maxHeight: "400px",
              overflowY: "auto"
            }}>
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
                    textAlign: "left"
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
                      alt={showAddModal === 'movie' ? item.title : item.name}
                      style={{
                        width: "60px",
                        height: "90px",
                        borderRadius: "8px",
                        objectFit: "cover"
                      }}
                    />
                  ) : (
                    <div style={{
                      width: "60px",
                      height: "90px",
                      background: "#e5e7eb",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#9ca3af"
                    }}>
                      {showAddModal === 'movie' ? '🎬' : '📺'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: "600", color: "#1f2937", marginBottom: "0.25rem" }}>
                      {showAddModal === 'movie' ? item.title : item.name}
                    </div>
                    <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                      {showAddModal === 'movie' 
                        ? (item.release_date || "N/A").slice(0, 4)
                        : (item.first_air_date || "N/A").slice(0, 4)
                      }
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {searchResults.length === 0 && searchQuery && !isSearching && (
              <div style={{
                textAlign: "center",
                color: "#6b7280",
                padding: "2rem"
              }}>
                No results found for "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}