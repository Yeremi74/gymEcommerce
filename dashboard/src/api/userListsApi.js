import { authRequest } from "./authClient"

export function fetchLibrary(token) {
  return authRequest("/api/me/library", { token })
}

export function toggleFavoriteRequest(token, productId) {
  return authRequest("/api/me/favorites/toggle", {
    method: "POST",
    body: { productId },
    token,
  })
}

export function addCartItemsRequest(token, productId, quantity) {
  return authRequest("/api/me/cart/items", {
    method: "POST",
    body: { productId, quantity },
    token,
  })
}

export function patchCartItemRequest(token, productId, quantity) {
  return authRequest("/api/me/cart/items", {
    method: "PATCH",
    body: { productId, quantity },
    token,
  })
}

export function removeCartItemRequest(token, productId) {
  return authRequest(`/api/me/cart/items/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    token,
  })
}
