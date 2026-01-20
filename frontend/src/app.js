// src/App.js
import React, { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Fetch data from the backend API endpoint
    fetch('http://localhost:5000/api/data')
      .then(response => response.json())
      .then(data => setMessage(data.message))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <div className="App">
      <h1>Frontend</h1>
      <p>Backend says: {message}</p>
    </div>
  );
}

export default App;
