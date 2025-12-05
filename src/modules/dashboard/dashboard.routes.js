import { Router } from "express";
// import { verifyToken } from "../../middlewares/auth.js";
import { getDashboardData,getSuperAdminDashboard } from "./dashboard.controller.js";

const router = Router();
router.get("/dashboard", getSuperAdminDashboard);
router.get("/",  getDashboardData);

export default router;
