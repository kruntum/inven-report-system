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

// Enable CORS for frontend cross-origin requests
app.use("*", cors({
  origin: "*", // Adjust this in production
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Root health check endpoint
app.get("/", (c) => {
  return c.text("Thai Government Inventory Reporting API — Online");
});

// Temporary endpoint to debug browser errors remotely
app.post("/debug-log", async (c) => {
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
