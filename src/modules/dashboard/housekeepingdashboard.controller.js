import { housekeepingDashboardService } from "./housekeepingdashboard.service.js";

export const getHousekeepingDashboard = async (req, res, next) => {
  try {
    const data = await housekeepingDashboardService();
    res.json({
      success: true,
      housekeepingDashboard: data
    });
  } catch (err) {
    next(err);
  }
};