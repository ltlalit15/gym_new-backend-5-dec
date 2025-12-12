import { generateMemberReportService } from "./reports.service.js";

// Generate Member Report Controller
export const generateMemberReportController = async (req, res) => {
  try {
    const { adminId } = req.query;
    
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required"
      });
    }
    
    const reportData = await generateMemberReportService(adminId);
    
    res.status(200).json({
      success: true,
      message: "Member report generated successfully",
      data: reportData
    });
  } catch (error) {
    console.error("Error in generateMemberReportController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate member report",
      error: error.message
    });
  }
};