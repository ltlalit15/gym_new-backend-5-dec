// const express = require('express');
// const router = express.Router();

// router.get('/', (req, res) => {
//   res.json({ status: 'ok', message: 'Gym backend running' });
// });

// module.exports = router;

import { Router } from "express";
import authRoutes from "../modules/auth/auth.routes.js";
import branchRoutes from "../modules/branch/branch.routes.js";
import staffRoutes from "../modules/staff/staff.routes.js";
import memberRoutes from "../modules/member/member.routes.js";
import planRoutes from "../modules/plans/plan.routes.js";
import attendanceRoutes from "../modules/attendance/memberAttendance.routes.js";
import classRoutes from "../modules/classes/class.routes.js";
import paymentRoutes from "../modules/payments/payment.routes.js";
import dashboardRoutes from "../modules/dashboard/dashboard.routes.js";
import alertRoutes from "../modules/alert/alert.routes.js";
import expenseRoutes from "../modules/expenses/expense.routes.js";
import dietRoutes from "../modules/diet/diet.routes.js";
import workoutRoutes from "../modules/workout/workout.routes.js";
import notifRoutes from "../modules/notifications/notif.routes.js";
import invoiceRoutes from "../modules/invoice/invoice.routes.js";
import financeRoutes from "../modules/finance/finance.routes.js";
import inventoryRoutes from "../modules/inventory/inventory.routes.js";
import purchaseRoutes from "../modules/purchase/purchase.routes.js";
import sessionRoutes from "../modules/session/session.routes.js";
import  MemberPlan  from "../modules/memberplan/memberPlan.routes.js";
import  SalaryRoutes from "../modules/salary/salary.routes.js";
import houseKeepingRoutes from "../modules/houseKeppingtask/housekeepingtask.routes.js";
import staffAttendanceRoutes from "../modules/staffAttendance/staffAttendance.routes.js";
// import housekeepingDashboardRoutes from "../modules/dashboard/housekeepingdashboard.routes.js";
import generaltrainerRoutes from "../modules/generaltrainer/generalTrainer.routes.js";
const router = Router();

// test route
router.get("/ping", (req, res) => {
  res.json({ status: "ok" });
});

//auth
router.use("/auth", authRoutes);
router.use("/branches", branchRoutes);
router.use("/staff", staffRoutes);
router.use("/members", memberRoutes);
router.use("/plans", planRoutes);
router.use("/attendance", attendanceRoutes);
router.use("/memberattendence", attendanceRoutes);
router.use("/class", classRoutes);
router.use("/payments", paymentRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/alerts", alertRoutes);
router.use("/expenses", expenseRoutes);
router.use("/finance", financeRoutes);
router.use("/diet", dietRoutes);
router.use("/workout", workoutRoutes);
router.use("/notify", notifRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/MemberPlan", MemberPlan);
router.use("/sessions", sessionRoutes);
router.use("/salaries", SalaryRoutes);
router.use("/housekeepingtask", houseKeepingRoutes);
router.use("/staff-attendance", staffAttendanceRoutes);
// router.use("/housekeepingdashboard", housekeepingDashboardRoutes);
router.use("/generaltrainer", generaltrainerRoutes);




export default router;
