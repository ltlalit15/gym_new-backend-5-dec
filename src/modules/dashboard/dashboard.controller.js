import { dashboardService,superAdminDashboardService } from "./dashboard.service.js";

export const getDashboardData = async (req, res, next) => {
  try {
    const data = await dashboardService();
    res.json({ success: true, dashboard: data });
  } catch (err) {
    next(err);
  }
}




export const getSuperAdminDashboard = async (req, res, next) => {
  try {
    const data = await superAdminDashboardService();
    res.json({
      success: true,
      message: "Dashboard loaded successfully",
      data
    });
  } catch (err) {
    next(err);
  }
};
