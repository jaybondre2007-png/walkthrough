import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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

app.use(cors({ origin: clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/income", incomeRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/recurring", recurringRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`API server running on http://localhost:${port}`);
});
