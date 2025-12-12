

import express from "express";
import { generateGeneralTrainerReportController, generateMemberReportController, generatePersonalTrainerReportController,getManagerReportController,getReceptionReportForAdmin } from "./reports.controller.js";

const router = express.Router();

// Generate member report
router.get("/members", generateMemberReportController);
router.get("/personal-trainer", generatePersonalTrainerReportController);

// General trainer report route
router.get("/general-trainer", generateGeneralTrainerReportController);
router.get("/reception/:adminId",getReceptionReportForAdmin)
router.get("/manager-report", getManagerReportController);
export default router;