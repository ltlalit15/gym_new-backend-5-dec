import { generateGeneralTrainerReportService, generateMemberReportService, generatePersonalTrainerReportService ,getReceptionReportService,getMemberAttendanceReportService,generateManagerReportService} from "./reports.service.js";
// import { generateGeneralTrainerReportService, generateManagerReportService, generateMemberReportService, generatePersonalTrainerReportService ,getReceptionReportService} from "./reports.service.js";

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

export const generatePersonalTrainerReportController = async (req, res) => {
  try {
    const { adminId } = req.query;
    
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required"
      });
    }
    
    const reportData = await generatePersonalTrainerReportService(adminId);
    
    res.status(200).json({
      success: true,
      message: "Personal trainer report generated successfully",
      data: reportData
    });
  } catch (error) {
    console.error("Error in generatePersonalTrainerReportController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate personal trainer report",
      error: error.message
    });
  }
};


export const generateGeneralTrainerReportController = async (req, res) => {
  try {
    const { adminId } = req.query;
    
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID is required"
      });
    }
    
    const reportData = await generateGeneralTrainerReportService(adminId);
    
    res.status(200).json({
      success: true,
      message: "General trainer report generated successfully",
      data: reportData
    });
  } catch (error) {
    console.error("Error in generateGeneralTrainerReportController:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate general trainer report",
      error: error.message
    });
  }
};


// import { getReceptionReportService } from "./receptionReport.service.js";

export const getReceptionReportForAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    const report = await getReceptionReportService(adminId);

    if (report.error) {
      return res.status(404).json({ success: false, message: report.error });
    }

    return res.json({
      success: true,
      ...report
    });

  } catch (error) {
    console.error("Reception Report Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const getMemberAttendanceReport = async (req, res) => {
  try {
    const { adminId } = req.params;

    const data = await getMemberAttendanceReportService(adminId);

    if (data.error) {
      return res.status(404).json({ success: false, message: data.error });
    }

    return res.json({ success: true, ...data });

  } catch (err) {
    console.log("Attendance Report Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export const getManagerReportController = async (req, res) => {
  try {
    const { adminId } = req.query;  

    if (!adminId) {
      return res.status(400).json({ message: "Admin ID missing" });
    }

    const report = await generateManagerReportService(adminId);

    return res.status(200).json({
      success: true,
      message: "Manager report fetched successfully",
      data: report
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
