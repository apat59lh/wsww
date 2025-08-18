
import { useState } from "react"; //useState allows us to create and manage a state which is 
//something that will change overtime

function App() {
const [query, setQuery] = useState(""); //stores the search string from user
const [results, setResults] = useState([]); //stores the list of shows/movies returned

const handleSearch = async () => {
try {
const url = `https://api.themoviedb.org/3/search/multi?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${query}`;

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

<ul style={{ listStyle: "none", padding: 0}}>
{results.map((item) => {
const posterUrl = item.poster_path
? `https://image.tmdb.org/t/p/w200${item.poster_path}`
: null; 

return (
<li 
key={item.id}
style={{
display: "flex",
alignItems: "center",
marginBottom: "1rem",
gap: "1rem",
}}
>
{posterUrl ? (
<img
src={posterUrl}
alt={item.title || item.name}
style={{ width: "80px", borderRadius: "5px"}}
/>
) : (
<div
style={{
width: "80px",
height: "120px",
backgroundColor: "#ccc",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontSize: "0.7rem",
borderRadius: "5px",
color: "#666",
}}
>
No image
</div>
)}

<div>
<strong>{item.title || item.name}</strong>{" "}
<span>
(
{item.first_air_date?.slice(0, 4) ||
item.release_date?.slice(0, 4) ||
"N/A"}
)
</span>
</div>
</li>
);
})}
</ul>
</div>
);
}

export default App;
