import { housekeepingDashboardService } from "./housekeepingDashboard.service.js";

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
