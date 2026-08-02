import "dotenv/config";
import path from "path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import authRouter from "./routes/auth";
import categoriesRouter from "./routes/categories";
import expensesRouter from "./routes/expenses";
import incomeRouter from "./routes/income";
import settingsRouter from "./routes/settings";
import dashboardRouter from "./routes/dashboard";
import analyticsRouter from "./routes/analytics";
import recurringRouter from "./routes/recurring";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const clientOrigin = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === "dev-secret-change-me")) {
  throw new Error(
    "JWT_SECRET must be set to a strong, random value in production (refusing to start with the dev default)."
  );
}

// Render (and most PaaS hosts) sit behind a reverse proxy, so requests arrive
// from a single internal IP unless we trust X-Forwarded-For for the real one.
app.set("trust proxy", 1);

// CSP is left off: the app relies heavily on inline `style` attributes for
// per-category colors and chart theming, which a default CSP would block.
// The rest of helmet's headers (frame-ancestors, nosniff, HSTS, etc.) still apply.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/income", incomeRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/recurring", recurringRouter);

if (isProduction) {
  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
