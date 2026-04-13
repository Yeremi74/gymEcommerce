import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./global.css"
import App from "./App.jsx"
import { ProductsProvider } from "./context/ProductsContext.jsx"
import { AuthProvider } from "./context/AuthContext.jsx"
import { UserListsProvider } from "./context/UserListsContext.jsx"

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <UserListsProvider>
        <ProductsProvider>
          <App />
        </ProductsProvider>
      </UserListsProvider>
    </AuthProvider>
  </StrictMode>,
)
