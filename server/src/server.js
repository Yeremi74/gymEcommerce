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

const stripeSecret = (process.env.STRIPE_SECRET_KEY || "").trim()
const stripe = stripeSecret.startsWith("sk_") ? require("stripe")(stripeSecret) : null

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
const categoriesCollectionName = "product_categories"
const collectionsCollectionName = "product_collections"

const VALID_STORE_BUCKETS = ["trending", "pants", "hoodies", "tees"]

const rootDir = path.join(__dirname, "..")
const uploadsDir = path.join(rootDir, "uploads")

let mongoClient
let productsCollection
let usersCollection
let categoriesCollection
let collectionsCollection

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
  categoriesCollection = db.collection(categoriesCollectionName)
  collectionsCollection = db.collection(collectionsCollectionName)
  await productsCollection.createIndex({ id: 1 }, { unique: true })
  await usersCollection.createIndex({ email: 1 }, { unique: true })
  await usersCollection.createIndex({ googleId: 1 }, { unique: true, sparse: true })
  await categoriesCollection.createIndex({ id: 1 }, { unique: true })
  await categoriesCollection.createIndex({ slug: 1 }, { unique: true })
  await collectionsCollection.createIndex({ id: 1 }, { unique: true })
  await collectionsCollection.createIndex({ slug: 1 }, { unique: true })
}

function slugify(str) {
  const s = String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  const slug = s
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "categoria"
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

function stockPairFromDoc(doc) {
  const sm = doc.stockMin
  const sx = doc.stockMax
  const min = Number.isInteger(sm) && sm >= 0 ? sm : 0
  let max = Number.isInteger(sx) && sx >= 0 ? sx : min
  if (max < min) max = min
  return { stockMin: min, stockMax: max }
}

function currentStockFromDoc(doc, pair) {
  const { stockMin, stockMax } = pair
  const cs = doc.currentStock
  if (Number.isInteger(cs) && cs >= 0) {
    return Math.min(cs, stockMax)
  }
  return Math.min(Math.max(0, stockMin), stockMax)
}

function parseStockFields(body) {
  if (!body || typeof body !== "object") {
    return { error: "Datos inválidos" }
  }
  const rawMin = body.stockMin ?? body.stock_min
  const rawMax = body.stockMax ?? body.stock_max
  const minStr = rawMin != null && String(rawMin).trim() !== "" ? String(rawMin).trim() : ""
  const maxStr = rawMax != null && String(rawMax).trim() !== "" ? String(rawMax).trim() : ""
  if (minStr === "" || maxStr === "") {
    return { error: "Stock mínimo y máximo son obligatorios" }
  }
  const stockMin = parseInt(minStr, 10)
  const stockMax = parseInt(maxStr, 10)
  if (!Number.isFinite(stockMin) || stockMin < 0) {
    return { error: "Stock mínimo inválido" }
  }
  if (!Number.isFinite(stockMax) || stockMax < 0) {
    return { error: "Stock máximo inválido" }
  }
  if (stockMax < stockMin) {
    return { error: "El stock máximo debe ser mayor o igual al mínimo" }
  }
  return { stockMin, stockMax }
}

function productCreatedTimestamp(doc) {
  if (doc && doc.createdAt instanceof Date) {
    return doc.createdAt.getTime()
  }
  if (doc && doc._id && typeof doc._id.getTimestamp === "function") {
    return doc._id.getTimestamp().getTime()
  }
  return 0
}

function docToProduct(doc, catById = null, colById = null) {
  const imageUrls =
    Array.isArray(doc.imageUrls) && doc.imageUrls.length > 0
      ? doc.imageUrls
      : doc.imageUrl
        ? [doc.imageUrl]
        : []
  const detail = String(doc.detail || doc.flavor || doc.sublabel || "").trim()
  const out = {
    id: doc.id,
    name: doc.name,
    price: doc.price,
    imageUrl: doc.imageUrl || imageUrls[0],
    imageUrls,
    description: doc.description,
    detail: detail || undefined,
    flavor: detail,
    sublabel: detail,
  }
  if (catById && doc.categoryId) {
    const cat = catById.get(doc.categoryId)
    if (cat) {
      out.categoryId = doc.categoryId
      out.categoryName = cat.name
      out.categorySlug = cat.slug
    }
  }
  if (colById && doc.collectionId) {
    const col = colById.get(doc.collectionId)
    if (col) {
      out.collectionId = doc.collectionId
      out.collectionName = col.name
    }
  }
  const createdMs = productCreatedTimestamp(doc)
  if (createdMs > 0) {
    out.createdAt = new Date(createdMs).toISOString()
  }
  return out
}

function normalizeProductKind(doc) {
  const k = doc.kind
  if (k === "bar") return "trending"
  if (k === "powder") return "hoodies"
  return k || "trending"
}

function bucketKeyForNormalizedKind(kind) {
  if (kind === "pants") return "pants"
  if (kind === "hoodie" || kind === "hoodies") return "hoodies"
  if (kind === "tee" || kind === "tees") return "tees"
  return "trending"
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

app.post("/api/payments/create-payment-intent", authMiddleware, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: "Pagos no configurados en el servidor" })
  }
  const amountUsd = Number(req.body?.amount)
  if (!Number.isFinite(amountUsd) || amountUsd < 0.5) {
    return res.status(400).json({
      error: "El importe debe ser al menos 0,50 USD",
    })
  }
  const amountCents = Math.round(amountUsd * 100)
  if (amountCents < 50) {
    return res.status(400).json({
      error: "El importe debe ser al menos 0,50 USD",
    })
  }
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
    })
    res.json({ clientSecret: paymentIntent.client_secret })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "No se pudo iniciar el pago" })
  }
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
    const [docs, catDocs, colDocs] = await Promise.all([
      productsCollection.find({}).toArray(),
      categoriesCollection.find({}).toArray(),
      collectionsCollection.find({}).toArray(),
    ])
    const catById = new Map(catDocs.map((c) => [c.id, c]))
    const colById = new Map(colDocs.map((c) => [c.id, c]))
    const payload = { trending: [], pants: [], hoodies: [], tees: [] }
    for (const doc of docs) {
      const nk = normalizeProductKind(doc)
      const bucket = bucketKeyForNormalizedKind(nk)
      payload[bucket].push(docToProduct(doc, catById, colById))
    }
    const shopCategories = catDocs.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: String(c.description || "").trim(),
      coverImageUrl: c.coverImageUrl || null,
    }))
    res.json({ ...payload, shopCategories })
  } catch {
    res.status(500).json({ error: "Could not read products" })
  }
})

app.get("/api/admin/categories", adminProductsAuth, async (_req, res) => {
  try {
    const rows = await categoriesCollection.find({}).sort({ name: 1 }).toArray()
    res.json({
      categories: rows.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        description: String(d.description || "").trim(),
        coverImageUrl: d.coverImageUrl || null,
        createdAt: d.createdAt,
      })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Could not read categories" })
  }
})

app.post(
  "/api/admin/categories",
  adminProductsAuth,
  upload.single("cover"),
  async (req, res) => {
    try {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
      const description =
        typeof req.body?.description === "string" ? req.body.description.trim() : ""
      if (!name) {
        return res.status(400).json({ error: "Nombre requerido" })
      }
      const base = slugify(name)
      let slug = base
      let n = 0
      while (await categoriesCollection.findOne({ slug })) {
        n += 1
        slug = `${base}-${n}`
      }
      const id = `cat-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const coverImageUrl = req.file ? `/uploads/${req.file.filename}` : null
      await categoriesCollection.insertOne({
        id,
        name,
        slug,
        description: description || "",
        coverImageUrl,
        createdAt: new Date(),
      })
      res.status(201).json({
        ok: true,
        category: { id, name, slug, description: description || "", coverImageUrl },
      })
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ error: "Slug duplicado" })
      }
      console.error(err)
      res.status(500).json({ error: "Could not save category" })
    }
  },
)

app.delete("/api/admin/categories/:id", adminProductsAuth, async (req, res) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id.trim() : ""
    if (!id) {
      return res.status(400).json({ error: "id requerido" })
    }
    const count = await productsCollection.countDocuments({ categoryId: id })
    if (count > 0) {
      return res.status(409).json({ error: `Hay ${count} producto(s) con esta categoría` })
    }
    const r = await categoriesCollection.deleteOne({ id })
    if (r.deletedCount === 0) {
      return res.status(404).json({ error: "Categoría no encontrada" })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Could not delete category" })
  }
})

app.get("/api/admin/collections", adminProductsAuth, async (_req, res) => {
  try {
    const rows = await collectionsCollection.find({}).sort({ name: 1 }).toArray()
    res.json({
      collections: rows.map((d) => ({
        id: d.id,
        name: d.name,
        slug: d.slug,
        description: String(d.description || "").trim(),
        coverImageUrl: d.coverImageUrl || null,
        createdAt: d.createdAt,
      })),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Could not read collections" })
  }
})

app.post(
  "/api/admin/collections",
  adminProductsAuth,
  upload.single("cover"),
  async (req, res) => {
    try {
      const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
      const description =
        typeof req.body?.description === "string" ? req.body.description.trim() : ""
      if (!name) {
        return res.status(400).json({ error: "Nombre requerido" })
      }
      const base = slugify(name)
      let slug = base
      let n = 0
      while (await collectionsCollection.findOne({ slug })) {
        n += 1
        slug = `${base}-${n}`
      }
      const id = `col-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const coverImageUrl = req.file ? `/uploads/${req.file.filename}` : null
      await collectionsCollection.insertOne({
        id,
        name,
        slug,
        description: description || "",
        coverImageUrl,
        createdAt: new Date(),
      })
      res.status(201).json({
        ok: true,
        collection: {
          id,
          name,
          slug,
          description: description || "",
          coverImageUrl,
        },
      })
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ error: "Slug duplicado" })
      }
      console.error(err)
      res.status(500).json({ error: "Could not save collection" })
    }
  },
)

app.delete("/api/admin/collections/:id", adminProductsAuth, async (req, res) => {
  try {
    const id = typeof req.params.id === "string" ? req.params.id.trim() : ""
    if (!id) {
      return res.status(400).json({ error: "id requerido" })
    }
    const count = await productsCollection.countDocuments({ collectionId: id })
    if (count > 0) {
      return res.status(409).json({ error: `Hay ${count} producto(s) en esta colección` })
    }
    const r = await collectionsCollection.deleteOne({ id })
    if (r.deletedCount === 0) {
      return res.status(404).json({ error: "Colección no encontrada" })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Could not delete collection" })
  }
})

app.post(
  "/api/admin/products",
  adminProductsAuth,
  upload.array("images", 12),
  async (req, res) => {
  const { name, price, detail, description, categoryId, collectionId } = req.body
  const files = req.files
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "At least one image required" })
  }
  const categoryIdTrim =
    typeof categoryId === "string" ? categoryId.trim() : ""
  const collectionIdTrim =
    typeof collectionId === "string" ? collectionId.trim() : ""
  if (!categoryIdTrim || !collectionIdTrim) {
    return res.status(400).json({ error: "Categoría y colección son obligatorias" })
  }
  const category = await categoriesCollection.findOne({ id: categoryIdTrim })
  const collection = await collectionsCollection.findOne({ id: collectionIdTrim })
  if (!category) {
    return res.status(400).json({ error: "Categoría no válida" })
  }
  if (!collection) {
    return res.status(400).json({ error: "Colección no válida" })
  }
  const bucket =
    category.storeBucket && VALID_STORE_BUCKETS.includes(category.storeBucket)
      ? category.storeBucket
      : "trending"
  const kindByBucket = {
    trending: "trending",
    pants: "pants",
    hoodies: "hoodie",
    tees: "tee",
  }
  const prefixByBucket = {
    trending: "tr-custom-",
    pants: "pn-custom-",
    hoodies: "hd-custom-",
    tees: "ts-custom-",
  }
  const kind = kindByBucket[bucket]
  const idPrefix = prefixByBucket[bucket]
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "Name required" })
  }
  if (!price || !String(price).trim()) {
    return res.status(400).json({ error: "Price required" })
  }
  if (!description || !String(description).trim()) {
    return res.status(400).json({ error: "Description required" })
  }
  const stockParsed = parseStockFields(req.body)
  if (stockParsed.error) {
    return res.status(400).json({ error: stockParsed.error })
  }
  const { stockMin, stockMax } = stockParsed
  const imageUrls = files.map((f) => `/uploads/${f.filename}`)
  const imageUrl = imageUrls[0]
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const id = `${idPrefix}${suffix}`
  const detailStr = detail ? String(detail).trim() : ""
  try {
    await productsCollection.insertOne({
      kind,
      id,
      categoryId: categoryIdTrim,
      collectionId: collectionIdTrim,
      name: String(name).trim(),
      detail: detailStr,
      flavor: detailStr,
      sublabel: detailStr,
      price: String(price).trim(),
      imageUrl,
      imageUrls,
      description: String(description).trim(),
      createdAt: new Date(),
    })
    res.status(201).json({ ok: true })
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({ error: "Duplicate product id" })
    }
    res.status(500).json({ error: "Could not save product" })
  }
  }
)

app.put(
  "/api/admin/products/:productId",
  adminProductsAuth,
  upload.array("images", 12),
  async (req, res) => {
    const productId =
      typeof req.params.productId === "string" ? req.params.productId.trim() : ""
    if (!productId) {
      return res.status(400).json({ error: "productId requerido" })
    }
    try {
      const existing = await productsCollection.findOne({ id: productId })
      if (!existing) {
        return res.status(404).json({ error: "Producto no encontrado" })
      }
      const { name, price, detail, description } = req.body
      const files = req.files || []
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "Name required" })
      }
      if (!price || !String(price).trim()) {
        return res.status(400).json({ error: "Price required" })
      }
      if (!description || !String(description).trim()) {
        return res.status(400).json({ error: "Description required" })
      }
      const stockParsed = parseStockFields(req.body)
      if (stockParsed.error) {
        return res.status(400).json({ error: stockParsed.error })
      }
      const { stockMin, stockMax } = stockParsed
      let imageUrl = existing.imageUrl
      let imageUrls =
        Array.isArray(existing.imageUrls) && existing.imageUrls.length > 0
          ? existing.imageUrls
          : existing.imageUrl
            ? [existing.imageUrl]
            : []
      if (files.length > 0) {
        const newUrls = files.map((f) => `/uploads/${f.filename}`)
        imageUrls = newUrls
        imageUrl = newUrls[0]
      }
      const update = {
        name: String(name).trim(),
        price: String(price).trim(),
        description: String(description).trim(),
        imageUrl,
        imageUrls,
        stockMin,
        stockMax,
      }
      if (existing.kind === "bar") {
        update.flavor = detail ? String(detail).trim() : ""
      } else if (existing.kind === "powder") {
        update.sublabel = detail ? String(detail).trim() : ""
      }
      const prevCs =
        Number.isInteger(existing.currentStock) && existing.currentStock >= 0
          ? existing.currentStock
          : stockMin
      let nextCurrent = Math.min(prevCs, stockMax)
      nextCurrent = Math.max(0, nextCurrent)
      update.currentStock = nextCurrent
      await productsCollection.updateOne({ id: productId }, { $set: update })
      res.json({ ok: true })
    } catch (err) {
      console.error(err)
      res.status(500).json({ error: "Could not update product" })
    }
  },
)

app.patch("/api/admin/products/:productId/inventory", adminProductsAuth, async (req, res) => {
  const productId =
    typeof req.params.productId === "string" ? req.params.productId.trim() : ""
  if (!productId) {
    return res.status(400).json({ error: "productId requerido" })
  }
  const raw = req.body?.currentStock ?? req.body?.current_stock
  const n = parseInt(String(raw ?? "").trim(), 10)
  if (!Number.isFinite(n) || n < 0) {
    return res.status(400).json({ error: "Stock actual inválido" })
  }
  try {
    const doc = await productsCollection.findOne({ id: productId })
    if (!doc) {
      return res.status(404).json({ error: "Producto no encontrado" })
    }
    const pair = stockPairFromDoc(doc)
    const { stockMax } = pair
    if (n > stockMax) {
      return res.status(400).json({
        error: `El stock actual no puede superar el máximo (${stockMax})`,
      })
    }
    await productsCollection.updateOne({ id: productId }, { $set: { currentStock: n } })
    res.json({ ok: true, currentStock: n })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "No se pudo actualizar el inventario" })
  }
})

app.post("/api/admin/inventory/movements", adminProductsAuth, async (req, res) => {
  const productId =
    typeof req.body?.productId === "string" ? req.body.productId.trim() : ""
  const kind = req.body?.kind
  const noteRaw = req.body?.note
  const note = typeof noteRaw === "string" ? noteRaw.trim().slice(0, 500) : ""

  if (!productId) {
    return res.status(400).json({ error: "productId requerido" })
  }
  if (kind !== "set" && kind !== "in" && kind !== "out") {
    return res.status(400).json({ error: "Tipo de movimiento inválido" })
  }

  const amt = parseInt(String(req.body?.amount ?? "").trim(), 10)

  try {
    const doc = await productsCollection.findOne({ id: productId })
    if (!doc) {
      return res.status(404).json({ error: "Producto no encontrado" })
    }
    const pair = stockPairFromDoc(doc)
    const { stockMax } = pair
    const previousStock = currentStockFromDoc(doc, pair)

    let newStock
    if (kind === "set") {
      if (!Number.isFinite(amt) || amt < 0) {
        return res.status(400).json({ error: "Indica un stock válido (entero ≥ 0)" })
      }
      if (amt > stockMax) {
        return res.status(400).json({
          error: `El stock no puede superar el máximo (${stockMax})`,
        })
      }
      newStock = amt
    } else if (kind === "in") {
      if (!Number.isFinite(amt) || amt < 1) {
        return res.status(400).json({ error: "Indica al menos 1 unidad de entrada" })
      }
      newStock = Math.min(previousStock + amt, stockMax)
    } else {
      if (!Number.isFinite(amt) || amt < 1) {
        return res.status(400).json({ error: "Indica al menos 1 unidad de salida" })
      }
      newStock = Math.max(0, previousStock - amt)
    }

    await productsCollection.updateOne({ id: productId }, { $set: { currentStock: newStock } })
    await inventoryMovementsCollection.insertOne({
      productId,
      kind,
      amount: amt,
      previousStock,
      newStock,
      note,
      createdAt: new Date(),
    })
    res.json({ ok: true, currentStock: newStock, previousStock })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "No se pudo registrar el movimiento" })
  }
})

app.delete("/api/admin/products/:productId", adminProductsAuth, async (req, res) => {
  const productId =
    typeof req.params.productId === "string" ? req.params.productId.trim() : ""
  if (!productId) {
    return res.status(400).json({ error: "productId requerido" })
  }
  try {
    const result = await productsCollection.deleteOne({ id: productId })
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Producto no encontrado" })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: "Could not delete product" })
  }
})

ensureUploadsDir()

connectMongo()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on http://127.0.0.1:${port}`)
      console.log(`MongoDB: ${mongoDbName} / ${collectionName}, ${inventoryMovementsCollectionName}`)
    })
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
