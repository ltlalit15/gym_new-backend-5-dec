// src/modules/dashboard/personalTrainerDashboard.routes.js
import { Router } from "express";
import { getPersonalTrainerDashboard } from "./personalTrainerDashboard.controller.js";

const router = Router();

// Personal Trainer Dashboard
router.get("/trainer/:adminId", getPersonalTrainerDashboard);

export default router;
