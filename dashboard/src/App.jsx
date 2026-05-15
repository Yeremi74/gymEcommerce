import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import HomePage from "./pages/HomePage/HomePage"
import ArticlePage from "./pages/ArticlePage/ArticlePage"
import ProductDetailPage from "./pages/ProductDetailPage/ProductDetailPage"
import AdminLayout from "./pages/Admin/AdminLayout"
import AdminCategoriesPage from "./pages/Admin/AdminCategoriesPage"
import AdminCollectionsPage from "./pages/Admin/AdminCollectionsPage"
import AdminProductNewPage from "./pages/Admin/AdminProductNewPage"
import AdminInventoryPage from "./pages/Admin/AdminInventoryPage"
import LoginPage from "./pages/auth/LoginPage"
import RegisterPage from "./pages/auth/RegisterPage"
import FavoritesPage from "./pages/FavoritesPage/FavoritesPage"
import CartPage from "./pages/CartPage/CartPage"
import ShopPage from "./pages/ShopPage/ShopPage"
import CollectionsPage from "./pages/CollectionsPage/CollectionsPage"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/tienda" element={<ShopPage />} />
        <Route path="/colecciones" element={<CollectionsPage />} />
        <Route path="/articles/:slug" element={<ArticlePage />} />
        <Route path="/products/:productId" element={<ProductDetailPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/favoritos" element={<Navigate to="/favorites" replace />} />
        <Route path="/carrito" element={<Navigate to="/cart" replace />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="productos" replace />} />
          <Route path="categorias" element={<AdminCategoriesPage />} />
          <Route path="colecciones" element={<AdminCollectionsPage />} />
          <Route path="productos" element={<AdminProductNewPage />} />
          <Route path="inventario" element={<AdminInventoryPage />} />
        </Route>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
