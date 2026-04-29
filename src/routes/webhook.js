// src/routes/webhook.js — simplified, only TwiML needed now
import { Router } from "express";
const router = Router();

router.get("/twiml", (req, res) => {
  res.set("Content-Type", "text/xml");
  res.send(`<Response><Pause length="2"/><Hangup/></Response>`);
});

export default router;
