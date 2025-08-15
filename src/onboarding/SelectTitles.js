import React, { useState } from 'react';
import { db, auth } from '../services/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';

function SelectTitles() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState({});

  const handleSearch = async () => {
    try {
      const url = `https://api.themoviedb.org/3/search/multi?api_key=${process.env.REACT_APP_TMDB_API_KEY}&query=${query}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!data.results) {
        setResults([]);
        return;
      }
      const filtered = data.results.filter(
        item => item.media_type === 'movie' || item.media_type === 'tv'
      );
      setResults(filtered);
    } catch (e) {
      console.error('Error fetching from TMDB:', e);
    }
  };

  const toggleSelect = async (item) => {
    const newSelected = { ...selected };
    const exists = newSelected[item.id];
    if (exists) {
      delete newSelected[item.id];
    } else {
      newSelected[item.id] = item;
    }
    setSelected(newSelected);

    try {
      const user = auth.currentUser;
      if (!user) return;
      const ref = doc(db, 'users', user.uid, 'selections', item.id.toString());
      if (exists) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          id: item.id,
          title: item.title || item.name,
          media_type: item.media_type,
          poster_path: item.poster_path || null,
        });
      }
    } catch (err) {
      console.error('Error persisting selection:', err);
    }
  };

  const movieCount = Object.values(selected).filter(i => i.media_type === 'movie').length;
  const tvCount = Object.values(selected).filter(i => i.media_type === 'tv').length;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>Select Titles</h2>
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search for a show or movie"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button onClick={handleSearch}>Search</button>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <span style={{ marginRight: '1rem' }}>Movies: {movieCount}</span>
        <span>TV Shows: {tvCount}</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {results.map(item => {
          const posterUrl = item.poster_path
            ? `https://image.tmdb.org/t/p/w200${item.poster_path}`
            : null;
          const isSelected = Boolean(selected[item.id]);
          return (
            <li
              key={item.id}
              onClick={() => toggleSelect(item)}
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '1rem',
                gap: '1rem',
                cursor: 'pointer',
                backgroundColor: isSelected ? '#e0ffe0' : 'transparent',
                borderRadius: '5px',
                padding: '0.5rem',
              }}
            >
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={item.title || item.name}
                  style={{ width: '80px', borderRadius: '5px' }}
                />
              ) : (
                <div
                  style={{
                    width: '80px',
                    height: '120px',
                    backgroundColor: '#ccc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    borderRadius: '5px',
                    color: '#666',
                  }}
                >
                  No image
                </div>
              )}
              <div>
                <strong>{item.title || item.name}</strong>{' '}
                <span>(
                  {item.first_air_date?.slice(0, 4) ||
                    item.release_date?.slice(0, 4) ||
                    'N/A'}
                  )</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default SelectTitles;

