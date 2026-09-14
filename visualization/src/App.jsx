import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MapApplication from './components/MapApplication';
import AboutPage from './pages/AboutPage';
import DatasetPage from './pages/DatasetPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/dataset" element={<DatasetPage />} />
        <Route path="/" element={<MapApplication />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </Router>
  );
}

export default App;
