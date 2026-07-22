import { Hono } from "hono";
import { cors } from "hono/cors";
import auth from "./routes/auth.ts";
import stock from "./routes/stock.ts";
import reports from "./routes/reports.ts";
import upload from "./routes/upload.ts";
import storage from "./routes/storage.ts";
import product from "./routes/products.ts";
import companies from "./routes/companies.ts";

const app = new Hono();

// Configure CORS for security
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [
      "https://coco.tummy.cc",
      "http://localhost:5173",
      "http://localhost:6000",
      "http://127.0.0.1:5173",
      "http://127.0.0.1:6000",
    ];

app.use("*", cors({
  origin: (origin) => {
    if (process.env.NODE_ENV !== "production") return origin || "*";
    if (!origin || allowedOrigins.includes(origin)) return origin;
    return null;
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "x-company-id"],
}));

// Root health check endpoint
app.get("/", (c) => {
  return c.text("Thai Government Inventory Reporting API — Online");
});

// Temporary endpoint to debug browser errors remotely (disabled in production)
app.post("/debug-log", async (c) => {
  if (process.env.NODE_ENV === "production") {
    return c.json({ success: false, message: "Disabled in production" }, 403);
  }
  try {
    const body = await c.req.json();
    console.log("\n🚨 [BROWSER CLIENT ERROR] 🚨");
    console.log(JSON.stringify(body, null, 2));
    console.log("-----------------------------\n");
  } catch (e) {
    console.error("Failed to parse client error log:", e);
  }
  return c.text("Logged");
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Mount Routes
app.route("/auth", auth);
app.route("/stock", stock);
app.route("/reports", reports);
app.route("/upload", upload);
app.route("/storage", storage);
app.route("/products", product);
app.route("/companies", companies);

const port = Number(process.env.API_PORT || 6001);
console.log(`Server is running on port ${port}`);

export default {
  port,
  fetch: app.fetch
};
