import { Router } from "express";
import { registerSseClient } from "../logs/sseLogger.js";

const router = Router();

router.get("/logs/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  res.write("data: " + JSON.stringify({ type: "connected", data: { message: "ApplyBlitz log stream connected" } }) + "\n\n");

  const keepAlive = setInterval(() => {
    res.write(": ping\n\n");
  }, 15000);

  registerSseClient(res);
  req.on("close", () => clearInterval(keepAlive));
});

export default router;
