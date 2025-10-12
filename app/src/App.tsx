import {BrowserRouter as Router, Routes, Route} from 'react-router-dom';
import Home from './components/Home';
import Profile from './components/Profile';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profiles/:id" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
