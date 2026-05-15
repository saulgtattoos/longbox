import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import AddComic from './pages/AddComic'
import Export from './pages/Export'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/add" element={<AddComic />} />
        <Route path="/export" element={<Export />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App