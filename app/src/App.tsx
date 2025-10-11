import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './components/Home'
import Profile from './components/Profile'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/profiles/:id" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
