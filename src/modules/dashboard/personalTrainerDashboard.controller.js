// src/modules/dashboard/personalTrainerDashboard.controller.js
import { getAdminDashboardService,
            getPersonalTrainingPlansByAdminService,
            getPersonalTrainingCustomersByAdminService
 } from "./personalTrainerdashboard.service.js";

export const getPersonalTrainerDashboard = async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.adminId);
    const trainerUserId = parseInt(req.params.trainerId); // user.id

    if (!adminId || !trainerUserId) {
      return res.status(400).json({
        success: false,
        message: "adminId and trainerId are required",
      });
    }

    // 🔍 1️⃣ VALIDATE TRAINER FROM USER TABLE (roleId = 5)
    const [[trainerRow]] = await pool.query(
      `
      SELECT id
      FROM user
      WHERE id = ?
        AND roleId = 5
        AND adminId = ?
        AND status = 'Active'
      `,
      [trainerUserId, adminId]
    );

    if (!trainerRow) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found or not assigned to this admin",
      });
    }

    const trainerId = trainerRow.id; // ✅ confirmed trainer user.id

    // 📊 2️⃣ FETCH DASHBOARD
    const data = await getAdminDashboardService(adminId, trainerId);

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

export const getPersonalTrainingCustomersByAdmin = async (req, res, next) => {
 try {
    const { adminId, planId } = req.params;

    if (!adminId || !planId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and Plan ID are required"
      });
    }

    const result = await getPersonalTrainingCustomersByAdminService(adminId, planId);

    res.json({
      success: true,
      message: "Membership plan for personal trainer members fetched successfully",
      data: {
        plan: result.plan,
        members: result.members,
        statistics: result.statistics,
        Total_Members: result.members.length
      }
    });
  } catch (error) {
    next(error);
  }
};