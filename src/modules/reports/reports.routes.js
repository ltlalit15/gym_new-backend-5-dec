

import express from "express";
import { generateGeneralTrainerReportController, generateMemberReportController, generatePersonalTrainerReportController,getReceptionReportForAdmin,getMemberAttendanceReport } from "./reports.controller.js";

const router = express.Router();

// Generate member report
router.get("/members", generateMemberReportController);
router.get("/personal-trainer", generatePersonalTrainerReportController);

//memeber attendence report 
router.get("/attendance/:adminId", getMemberAttendanceReport);

// General trainer report route
router.get("/general-trainer", generateGeneralTrainerReportController);
router.get("/reception/:adminId",getReceptionReportForAdmin)
export default router;