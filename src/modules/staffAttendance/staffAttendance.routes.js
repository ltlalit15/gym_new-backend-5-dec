import express from "express";
import {
  staffCheckIn,
  staffCheckOut,
  getDailyStaffAttendance,
  staffAttendanceDetail,
  getTodayStaffSummary
} from "./staffAttendance.controller.js";

const router = express.Router();

router.post("/checkin", staffCheckIn);
router.put("/checkout/:id", staffCheckOut);
router.get("/daily", getDailyStaffAttendance);
router.get("/detail/:id", staffAttendanceDetail);
router.get("/summary/today", getTodayStaffSummary);

export default router;
