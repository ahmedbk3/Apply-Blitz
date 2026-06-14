import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import applicationsRouter from "./applications.js";
import jobsRouter from "./jobs.js";
import priorityTargetsRouter from "./priorityTargets.js";
import coverLettersRouter from "./coverLetters.js";
import configRouter from "./config.js";
import cvRouter from "./cv.js";
import logsRouter from "./logs.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(applicationsRouter);
router.use(jobsRouter);
router.use(priorityTargetsRouter);
router.use(coverLettersRouter);
router.use(configRouter);
router.use(cvRouter);
router.use(logsRouter);

export default router;
