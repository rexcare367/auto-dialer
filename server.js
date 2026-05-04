import express from "express";
import cors from "cors";
import "dotenv/config";
import numbersRouter from "./src/routes/numbers.js";
import dialerRouter from "./src/routes/dialer.js";
import webhookRouter from "./src/routes/webhook.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    // Allow all origins (any host/port). If credentials are used, this echoes the request origin.
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.options(/.*/, cors());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/numbers", numbersRouter);
app.use("/api/dialer", dialerRouter);
app.use("/webhook", webhookRouter);

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
