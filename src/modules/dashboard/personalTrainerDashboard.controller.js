// src/modules/dashboard/personalTrainerDashboard.controller.js
import { getAdminDashboardService } from "./personalTrainerdashboard.service.js";

export const getPersonalTrainerDashboard = async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.adminId);

    if (!adminId) {
      return res
        .status(400)
        .json({ success: false, message: "adminId is required" });
    }

    const data = await getAdminDashboardService(adminId);

    res.json({
      success: true,
      message: "Personal Trainer Dashboard data fetched successfully",
      dashboardType: "Personal Trainer",
      data,
    });
  } catch (err) {
    next(err);
  }
};
