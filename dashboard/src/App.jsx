import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import HomePage from "./pages/HomePage/HomePage"
import ArticlePage from "./pages/ArticlePage/ArticlePage"
import ProductDetailPage from "./pages/ProductDetailPage/ProductDetailPage"
import AdminPage from "./pages/AdminPage/AdminPage"
import LoginPage from "./pages/auth/LoginPage"
import RegisterPage from "./pages/auth/RegisterPage"
import FavoritesPage from "./pages/FavoritesPage/FavoritesPage"
import CartPage from "./pages/CartPage/CartPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/articles/:slug" element={<ArticlePage />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/favoritos" element={<Navigate to="/favorites" replace />} />
        <Route path="/carrito" element={<Navigate to="/cart" replace />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
