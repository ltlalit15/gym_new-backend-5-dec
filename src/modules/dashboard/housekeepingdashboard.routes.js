import { Router } from "express";
import { getHousekeepingDashboard } from "./housekeepingdashboard.controller.js";

const router = Router();

router.get("/", getHousekeepingDashboard);

export default router;
