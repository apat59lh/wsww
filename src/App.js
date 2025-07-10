
import { useState } from "react"; //useState allows us to create and manage a state which is 
                                  //something that will change overtime

function App() {
  const [query, setQuery] = useState(""); //stores the search string from user
  const [results, setResults] = useState([]); //stores the list of shows/movies returned

  const handleSearch = async () => {
    try {
      const url = 'https://api.themoviedb.org/3/search/multi?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${query}';
  
      const response = await fetch(url);
      const data = await response.json();
  
      if (!data.results) {
        console.error("No results found:", data);
        setResults([]);
        return;
      }
  
      const filteredResults = data.results.filter(
        (item) => item.media_type === "movie" || item.media_type === "tv"
      );
  
      setResults(filteredResults);
    } catch (error) {
      console.error("Error fetching from TMDB:", error);
    }
  };

  const testUrl = 'https://api.themoviedb.org/3/search/multi?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=office';
  console.log("URL being used:", testUrl);

  return (
    <div style={{ padding: "2rem" }}>
      <h1>What Should We Watch?</h1>
      <input
        type="text"
        placeholder="Search for a show or movie" //search input default text
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button onClick={handleSearch}>Search</button>

      <ul>
        {results.map((item) => (
          <li key={item.id}>
            {item.title || item.name} ({item.first_air_date?.slice(0, 4) || item.release_date?.slice(0,4)})
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
