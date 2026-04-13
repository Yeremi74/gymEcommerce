const path = require("path")
const fs = require("fs")
const express = require("express")
const cors = require("cors")
const multer = require("multer")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { OAuth2Client } = require("google-auth-library")
const { MongoClient, ObjectId } = require("mongodb")
require("dotenv").config({ path: path.join(__dirname, "..", ".env") })

const port = Number(process.env.PORT || process.env.port) || 3000
const mainAdminSecret =
  process.env.MAIN_ADMIN_SECRET ||
  process.env.ADMIN_SECRET ||
  process.env.admin_secret ||
  "dev-admin-secret"
const mainAdminEmail = (
  process.env.MAIN_ADMIN_EMAIL ||
  process.env.main_admin_email ||
  ""
)
  .trim()
  .toLowerCase()

function isMainAdminEmail(email) {
  if (!mainAdminEmail) return false
  const e = typeof email === "string" ? email.trim().toLowerCase() : ""
  return Boolean(e && e === mainAdminEmail)
}

const jwtSecret = process.env.JWT_SECRET || "dev-jwt-secret-change-in-production"
const googleClientId = (process.env.GOOGLE_CLIENT_ID || "").trim()

let googleOAuth2Client
function getGoogleOAuth2Client() {
  if (!googleOAuth2Client && googleClientId) {
    googleOAuth2Client = new OAuth2Client(googleClientId)
  }
  return googleOAuth2Client
}
const mongoUri = process.env.MONGODB_URI || process.env.mongodb_uri
const mongoDbName = process.env.MONGODB_DB || process.env.mongodb_db || "gym_ecommerce"
const collectionName = "custom_products"
const usersCollectionName = "users"

const rootDir = path.join(__dirname, "..")
const uploadsDir = path.join(rootDir, "uploads")

let mongoClient
let productsCollection
let usersCollection

function ensureUploadsDir() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true })
  }
}

async function connectMongo() {
  if (!mongoUri) {
    console.error("Define MONGODB_URI in server/.env (cadena de conexión de MongoDB).")
    process.exit(1)
  }
  mongoClient = new MongoClient(mongoUri)
  await mongoClient.connect()
  const db = mongoClient.db(mongoDbName)
  productsCollection = db.collection(collectionName)
  usersCollection = db.collection(usersCollectionName)
  await productsCollection.createIndex({ id: 1 }, { unique: true })
  await usersCollection.createIndex({ email: 1 }, { unique: true })
  await usersCollection.createIndex({ googleId: 1 }, { unique: true, sparse: true })
}

function signUserToken(userDoc) {
  return jwt.sign(
    {
      sub: userDoc._id.toString(),
      email: userDoc.email,
      name: userDoc.name,
    },
    jwtSecret,
    { expiresIn: "7d" },
  )
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No autorizado" })
  }
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret)
    req.auth = payload
    next()
  } catch {
    res.status(401).json({ error: "Sesión no válida" })
  }
}

function parseUserObjectId(sub) {
  if (typeof sub !== "string" || !sub) return null
  try {
    return new ObjectId(sub)
  } catch {
    return null
  }
}

function normalizeFavoriteIds(value) {
  if (!Array.isArray(value)) return []
  const out = []
  const seen = new Set()
  for (const id of value) {
    if (typeof id !== "string" || !id.trim()) continue
    const t = id.trim()
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

function normalizeCartItems(value) {
  if (!Array.isArray(value)) return []
  const out = []
  const byId = new Map()
  for (const row of value) {
    if (!row || typeof row.productId !== "string" || !row.productId.trim()) continue
    const productId = row.productId.trim()
    const q = Number(row.quantity)
    const quantity = Number.isFinite(q) ? Math.min(99, Math.max(1, Math.floor(q))) : 1
    if (byId.has(productId)) {
      const prev = byId.get(productId)
      prev.quantity = Math.min(99, prev.quantity + quantity)
    } else {
      const item = { productId, quantity }
      byId.set(productId, item)
      out.push(item)
    }
  }
  return out
}

function adminProductsAuth(req, res, next) {
  const secret = req.headers["x-admin-secret"]
  if (secret === mainAdminSecret) {
    return next()
  }
  if (!mainAdminEmail) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  const header = req.headers.authorization
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" })
  }
  try {
    const payload = jwt.verify(header.slice(7), jwtSecret)
    const email =
      typeof payload.email === "string" ? payload.email.trim().toLowerCase() : ""
    if (email && email === mainAdminEmail) {
      return next()
    }
  } catch {
    return res.status(401).json({ error: "Unauthorized" })
  }
  return res.status(401).json({ error: "Unauthorized" })
}

function docToBar(doc) {
  const imageUrls =
    Array.isArray(doc.imageUrls) && doc.imageUrls.length > 0
      ? doc.imageUrls
      : doc.imageUrl
        ? [doc.imageUrl]
        : []
  return {
    id: doc.id,
    name: doc.name,
    flavor: doc.flavor || "",
    price: doc.price,
    imageUrl: doc.imageUrl || imageUrls[0],
    imageUrls,
    description: doc.description,
  }
}

function docToPowder(doc) {
  const imageUrls =
    Array.isArray(doc.imageUrls) && doc.imageUrls.length > 0
      ? doc.imageUrls
      : doc.imageUrl
        ? [doc.imageUrl]
        : []
  return {
    id: doc.id,
    name: doc.name,
    sublabel: doc.sublabel || "",
    price: doc.price,
    imageUrl: doc.imageUrl || imageUrls[0],
    imageUrls,
    description: doc.description,
  }
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadsDir()
    cb(null, uploadsDir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg"
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
})

const app = express()
app.use(cors({ origin: true }))
app.use(express.json({ limit: "64kb" }))
app.use("/uploads", express.static(uploadsDir))

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {}
    const nameTrim = typeof name === "string" ? name.trim() : ""
    const emailRaw = typeof email === "string" ? email.trim().toLowerCase() : ""
    const passwordStr = typeof password === "string" ? password : ""
    if (!nameTrim || !emailRaw || !passwordStr) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" })
    }
    if (passwordStr.length < 8) {
      return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres" })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return res.status(400).json({ error: "Correo no válido" })
    }
    const passwordHash = await bcrypt.hash(passwordStr, 12)
    const result = await usersCollection.insertOne({
      email: emailRaw,
      name: nameTrim,
      passwordHash,
      createdAt: new Date(),
    })
    const userDoc = {
      _id: result.insertedId,
      email: emailRaw,
      name: nameTrim,
    }
    const token = signUserToken(userDoc)
    res.status(201).json({
      token,
      user: {
        id: userDoc._id.toString(),
        email: emailRaw,
        name: nameTrim,
        isMainAdmin: isMainAdminEmail(emailRaw),
      },
    })
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "Ese correo ya está registrado" })
    }
    console.error(err)
    res.status(500).json({ error: "No se pudo registrar" })
  }
})

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const emailRaw = typeof email === "string" ? email.trim().toLowerCase() : ""
    const passwordStr = typeof password === "string" ? password : ""
    if (!emailRaw || !passwordStr) {
      return res.status(400).json({ error: "Correo y contraseña son obligatorios" })
    }
    const user = await usersCollection.findOne({ email: emailRaw })
    if (!user) {
      return res.status(401).json({ error: "Credenciales incorrectas" })
    }
    if (!user.passwordHash) {
      return res.status(401).json({ error: "Esta cuenta usa Google. Inicia sesión con Google." })
    }
    const ok = await bcrypt.compare(passwordStr, user.passwordHash)
    if (!ok) {
      return res.status(401).json({ error: "Credenciales incorrectas" })
    }
    const token = signUserToken(user)
    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        isMainAdmin: isMainAdminEmail(user.email),
      },
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "No se pudo iniciar sesión" })
  }
})

app.post("/api/auth/google", async (req, res) => {
  try {
    if (!googleClientId) {
      return res.status(503).json({ error: "Inicio de sesión con Google no está configurado" })
    }
    const idToken = typeof req.body?.idToken === "string" ? req.body.idToken : ""
    if (!idToken) {
      return res.status(400).json({ error: "Token requerido" })
    }
    const client = getGoogleOAuth2Client()
    const ticket = await client.verifyIdToken({
      idToken,
      audience: googleClientId,
    })
    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return res.status(401).json({ error: "Token no válido" })
    }
    if (!payload.email_verified) {
      return res.status(401).json({ error: "El correo de Google no está verificado" })
    }
    const emailRaw = payload.email.trim().toLowerCase()
    const nameFromGoogle =
      typeof payload.name === "string" && payload.name.trim()
        ? payload.name.trim()
        : emailRaw.split("@")[0]
    const googleSub = typeof payload.sub === "string" ? payload.sub : ""
    let user = await usersCollection.findOne({ email: emailRaw })
    if (!user && googleSub) {
      user = await usersCollection.findOne({ googleId: googleSub })
    }
    if (!user) {
      const newDoc = {
        email: emailRaw,
        name: nameFromGoogle,
        createdAt: new Date(),
      }
      if (googleSub) {
        newDoc.googleId = googleSub
      }
      const result = await usersCollection.insertOne(newDoc)
      user = {
        _id: result.insertedId,
        email: emailRaw,
        name: nameFromGoogle,
      }
    } else {
      const updates = {}
      if (googleSub && user.googleId !== googleSub) {
        updates.googleId = googleSub
      }
      if (nameFromGoogle && user.name !== nameFromGoogle) {
        updates.name = nameFromGoogle
      }
      if (user.email !== emailRaw && emailRaw) {
        updates.email = emailRaw
      }
      if (Object.keys(updates).length > 0) {
        await usersCollection.updateOne({ _id: user._id }, { $set: updates })
        user = { ...user, ...updates }
      }
    }
    const token = signUserToken(user)
    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        isMainAdmin: isMainAdminEmail(user.email),
      },
    })
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "Ese correo o cuenta de Google ya está en uso" })
    }
    console.error(err)
    res.status(401).json({ error: "No se pudo verificar la cuenta de Google" })
  }
})

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({
    user: {
      id: req.auth.sub,
      email: req.auth.email,
      name: req.auth.name,
      isMainAdmin: isMainAdminEmail(req.auth.email),
    },
  })
})

app.get("/api/me/library", authMiddleware, async (req, res) => {
  try {
    const oid = parseUserObjectId(req.auth.sub)
    if (!oid) {
      return res.status(400).json({ error: "Usuario no válido" })
    }
    const user = await usersCollection.findOne({ _id: oid })
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }
    const favoriteProductIds = normalizeFavoriteIds(user.favoriteProductIds)
    const cartItems = normalizeCartItems(user.cartItems)
    res.json({ favoriteProductIds, cartItems })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "No se pudo leer la biblioteca" })
  }
})

app.post("/api/me/favorites/toggle", authMiddleware, async (req, res) => {
  try {
    const oid = parseUserObjectId(req.auth.sub)
    if (!oid) {
      return res.status(400).json({ error: "Usuario no válido" })
    }
    const productId = typeof req.body?.productId === "string" ? req.body.productId.trim() : ""
    if (!productId) {
      return res.status(400).json({ error: "productId requerido" })
    }
    const product = await productsCollection.findOne({ id: productId })
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" })
    }
    const user = await usersCollection.findOne({ _id: oid })
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }
    const current = normalizeFavoriteIds(user.favoriteProductIds)
    const wasFavorite = current.includes(productId)
    const favoriteProductIds = wasFavorite
      ? current.filter((id) => id !== productId)
      : [...current, productId]
    await usersCollection.updateOne({ _id: oid }, { $set: { favoriteProductIds } })
    res.json({ favoriteProductIds, isFavorite: !wasFavorite })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "No se pudo actualizar favoritos" })
  }
})

app.post("/api/me/cart/items", authMiddleware, async (req, res) => {
  try {
    const oid = parseUserObjectId(req.auth.sub)
    if (!oid) {
      return res.status(400).json({ error: "Usuario no válido" })
    }
    const productId = typeof req.body?.productId === "string" ? req.body.productId.trim() : ""
    const quantityRaw = Number(req.body?.quantity)
    const quantity = Number.isFinite(quantityRaw) ? Math.min(99, Math.max(1, Math.floor(quantityRaw))) : 1
    if (!productId) {
      return res.status(400).json({ error: "productId requerido" })
    }
    const product = await productsCollection.findOne({ id: productId })
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" })
    }
    const user = await usersCollection.findOne({ _id: oid })
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }
    const items = normalizeCartItems(user.cartItems)
    const idx = items.findIndex((i) => i.productId === productId)
    if (idx >= 0) {
      items[idx] = {
        productId,
        quantity: Math.min(99, items[idx].quantity + quantity),
      }
    } else {
      items.push({ productId, quantity })
    }
    await usersCollection.updateOne({ _id: oid }, { $set: { cartItems: items } })
    res.json({ cartItems: items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "No se pudo actualizar el carrito" })
  }
})

app.patch("/api/me/cart/items", authMiddleware, async (req, res) => {
  try {
    const oid = parseUserObjectId(req.auth.sub)
    if (!oid) {
      return res.status(400).json({ error: "Usuario no válido" })
    }
    const productId = typeof req.body?.productId === "string" ? req.body.productId.trim() : ""
    const quantityRaw = Number(req.body?.quantity)
    const quantity = Number.isFinite(quantityRaw) ? Math.min(99, Math.max(1, Math.floor(quantityRaw))) : 1
    if (!productId) {
      return res.status(400).json({ error: "productId requerido" })
    }
    const product = await productsCollection.findOne({ id: productId })
    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" })
    }
    const user = await usersCollection.findOne({ _id: oid })
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }
    const items = normalizeCartItems(user.cartItems)
    const idx = items.findIndex((i) => i.productId === productId)
    if (idx >= 0) {
      items[idx] = { productId, quantity }
    } else {
      items.push({ productId, quantity })
    }
    await usersCollection.updateOne({ _id: oid }, { $set: { cartItems: items } })
    res.json({ cartItems: items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "No se pudo actualizar el carrito" })
  }
})

app.delete("/api/me/cart/items/:productId", authMiddleware, async (req, res) => {
  try {
    const oid = parseUserObjectId(req.auth.sub)
    if (!oid) {
      return res.status(400).json({ error: "Usuario no válido" })
    }
    const productId = typeof req.params.productId === "string" ? req.params.productId.trim() : ""
    if (!productId) {
      return res.status(400).json({ error: "productId requerido" })
    }
    const user = await usersCollection.findOne({ _id: oid })
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado" })
    }
    const items = normalizeCartItems(user.cartItems).filter((i) => i.productId !== productId)
    await usersCollection.updateOne({ _id: oid }, { $set: { cartItems: items } })
    res.json({ cartItems: items })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "No se pudo actualizar el carrito" })
  }
})

app.get("/api/products", async (_req, res) => {
  try {
    const docs = await productsCollection.find({}).toArray()
    const bars = []
    const powder = []
    for (const doc of docs) {
      if (doc.kind === "bar") {
        bars.push(docToBar(doc))
      } else if (doc.kind === "powder") {
        powder.push(docToPowder(doc))
      }
    }
    res.json({ powder, bars })
  } catch {
    res.status(500).json({ error: "Could not read products" })
  }
})

app.post(
  "/api/admin/products",
  adminProductsAuth,
  upload.array("images", 12),
  async (req, res) => {
  const { type, name, price, detail, description } = req.body
  const files = req.files
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "At least one image required" })
  }
  if (!type || (type !== "bar" && type !== "powder")) {
    return res.status(400).json({ error: "Invalid type" })
  }
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Name required" })
  }
  if (!price || !String(price).trim()) {
    return res.status(400).json({ error: "Price required" })
  }
  if (!description || !String(description).trim()) {
    return res.status(400).json({ error: "Description required" })
  }
  const imageUrls = files.map((f) => `/uploads/${f.filename}`)
  const imageUrl = imageUrls[0]
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  try {
    if (type === "bar") {
      const id = `b-custom-${suffix}`
      await productsCollection.insertOne({
        kind: "bar",
        id,
        name: String(name).trim(),
        flavor: detail ? String(detail).trim() : "",
        price: String(price).trim(),
        imageUrl,
        imageUrls,
        description: String(description).trim(),
      })
    } else {
      const id = `pow-custom-${suffix}`
      await productsCollection.insertOne({
        kind: "powder",
        id,
        name: String(name).trim(),
        sublabel: detail ? String(detail).trim() : "",
        price: String(price).trim(),
        imageUrl,
        imageUrls,
        description: String(description).trim(),
      })
    }
    res.status(201).json({ ok: true })
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "Duplicate product id" })
    }
    res.status(500).json({ error: "Could not save product" })
  }
  }
)

ensureUploadsDir()

connectMongo()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on http://127.0.0.1:${port}`)
      console.log(`MongoDB: ${mongoDbName} / ${collectionName}`)
    })
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
