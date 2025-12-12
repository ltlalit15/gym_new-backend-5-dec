

import express from "express";
import { generateGeneralTrainerReportController, generateMemberReportController, generatePersonalTrainerReportController } from "./reports.controller.js";

const router = express.Router();

// Generate member report
router.get("/members", generateMemberReportController);
router.get("/personal-trainer", generatePersonalTrainerReportController);

// General trainer report route
router.get("/general-trainer", generateGeneralTrainerReportController);

export default router;