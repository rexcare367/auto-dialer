import { Router } from "express";
import { getDialerState, startDialer, stopDialer } from "../../dialer.js";

const router = Router();

router.post("/start", (req, res) => {
  if (getDialerState().running) {
    return res.status(409).json({ error: "Dialer already running" });
  }
  startDialer();
  res.json({ message: "Dialer started" });
});

router.post("/stop", (req, res) => {
  if (!getDialerState().running) {
    return res.status(409).json({ error: "Dialer is not running" });
  }
  stopDialer();
  res.json({ message: "Dialer stopping after current call..." });
});

router.get("/status", (req, res) => {
  res.json(getDialerState());
});

export default router;
