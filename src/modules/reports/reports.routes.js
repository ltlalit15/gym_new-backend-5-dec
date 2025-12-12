

import express from "express";
import { generateMemberReportController } from "./reports.controller.js";

const router = express.Router();

// Generate member report
router.get("/members", generateMemberReportController);

export default router;