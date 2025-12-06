// src/modules/dashboard/personalTrainerDashboard.controller.js
import { getAdminDashboardService,
            getPersonalTrainingPlansByAdminService,
            getPersonalTrainingCustomersByAdminService
 } from "./personalTrainerdashboard.service.js";

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

export const getPersonalTrainingPlansByAdmin = async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.adminId);

    if (!adminId) {
      return res
        .status(400)
        .json({ success: false, message: "adminId is required in URL" });
    }

    const plans = await getPersonalTrainingPlansByAdminService(adminId);

    res.json({
      success: true,
      message: "Personal training plans fetched successfully",
      plans,
    });
  } catch (err) {
    next(err);
  }
};

// ✅ Niche wali "Customers" table
export const getPersonalTrainingCustomersByAdmin = async (
  req,
  res,
  next
) => {
  try {
    const adminId = parseInt(req.params.adminId);
    const planId = parseInt(req.params.planId);

    if (!adminId || !planId) {
      return res.status(400).json({
        success: false,
        message: "adminId and planId are required in URL",
      });
    }

    const customers = await getPersonalTrainingCustomersByAdminService(
      adminId,
      planId
    );

    res.json({
      success: true,
      message: "Personal training customers fetched successfully",
      customers,
    });
  } catch (err) {
    next(err);
  }
}