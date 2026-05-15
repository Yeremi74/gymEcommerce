import { NavLink, Outlet, Navigate, Link, useLocation } from "react-router-dom"
import { useAuth } from "../../context/AuthContext"
import { AdminTaxonomyProvider } from "../../context/AdminTaxonomyContext"
import { clientConfig } from "../../config/clientConfig.js"
import layoutStyles from "./AdminLayout.module.css"

function IconNav({ children, className }) {
  return (
    <svg
      className={[layoutStyles.navIcon, className].filter(Boolean).join(" ")}
      viewBox="0 0 24 24"
      width="22"
      height="22"
      aria-hidden
    >
      {children}
    </svg>
  )
}

function IconCategories() {
  return (
    <IconNav>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
      />
    </IconNav>
  )
}

function IconCollections() {
  return (
    <IconNav>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      />
    </IconNav>
  )
}

function IconProducts() {
  return (
    <IconNav>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 9.4 7.5 4.21M12 21V11m9 5V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
      />
    </IconNav>
  )
}

function IconInventory() {
  return (
    <IconNav>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8m18 0v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3m18 0H3m6-4v4m4-4v4"
      />
    </IconNav>
  )
}

function IconStore() {
  return (
    <IconNav>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10"
      />
    </IconNav>
  )
}

function navClass({ isActive }) {
  return [
    layoutStyles.navLink,
    isActive ? layoutStyles.navLinkActive : "",
  ]
    .filter(Boolean)
    .join(" ")
}

export default function AdminLayout() {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className={layoutStyles.loadingRoot} role="status">
        Cargando…
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname || "/admin/productos" }}
      />
    )
  }

  if (user.isMainAdmin !== true) {
    return (
      <div className={layoutStyles.denied}>
        <h1 className={layoutStyles.deniedTitle}>Acceso restringido</h1>
        <p className={layoutStyles.deniedText}>
          Solo el administrador principal puede usar el panel.
        </p>
        <Link className={layoutStyles.deniedLink} to="/">
          Volver a la tienda
        </Link>
      </div>
    )
  }

  return (
    <AdminTaxonomyProvider>
      <div className={layoutStyles.shell}>
        <aside className={layoutStyles.sidebar} aria-label="Panel de administración">
          <div className={layoutStyles.brandBlock}>
            <img
              className={layoutStyles.brandLogoImg}
              src={clientConfig.logoUrl?.trim() || "/favicon.svg"}
              alt=""
              width={22}
              height={22}
              decoding="async"
            />
            <span className={layoutStyles.navLabel}>{clientConfig.siteName}</span>
          </div>
          <nav id="admin-nav" className={layoutStyles.nav} aria-label="Secciones">
            <NavLink to="/admin/categorias" className={navClass} end title="Tipos de ropa">
              <IconCategories />
              <span className={layoutStyles.navLabel}>Tipos de ropa</span>
            </NavLink>
            <NavLink to="/admin/colecciones" className={navClass} end title="Colecciones">
              <IconCollections />
              <span className={layoutStyles.navLabel}>Colecciones</span>
            </NavLink>
            <NavLink to="/admin/productos" className={navClass} end title="Productos">
              <IconProducts />
              <span className={layoutStyles.navLabel}>Productos</span>
            </NavLink>
            <NavLink to="/admin/inventario" className={navClass} end title="Inventario">
              <IconInventory />
              <span className={layoutStyles.navLabel}>Inventario</span>
            </NavLink>
          </nav>
          <div className={layoutStyles.sidebarFoot}>
            <Link className={layoutStyles.storeLink} to="/" title="Volver a la tienda">
              <IconStore />
              <span className={layoutStyles.navLabel}>Volver a la tienda</span>
            </Link>
          </div>
        </aside>
        <div className={layoutStyles.main}>
          <Outlet />
        </div>
      </div>
    </AdminTaxonomyProvider>
  )
}
