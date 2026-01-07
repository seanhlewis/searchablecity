import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MapApplication from './components/MapApplication';
import AboutPage from './pages/AboutPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MapApplication />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </Router>
  );
}

export default App;
