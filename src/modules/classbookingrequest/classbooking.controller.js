/* --------------------------------------------------------

   CREATE BOOKING REQUEST (MEMBER)
-------------------------------------------------------- */
import { pool } from "../../config/db.js";


export const createBookingRequest = async (req, res) => {
    console.log("Booking Request Body:", req.body);
  try {
    const { memberId, classId, branchId, price ,adminId} = req.body;

    // Basic validations
    if (!memberId || !classId || !branchId || !price || !adminId) {
      return res.status(400).json({
        success: false,
        message: "memberId, classId, branchId and price are required"
      });
    }

    await pool.query(
      `INSERT INTO booking_requests (adminId,memberId, classId, branchId, price, status)
       VALUES (?,?, ?, ?, ?, 'pending')`,
      [adminId,memberId, classId, branchId, price, adminId]
    );

    res.json({
      success: true,
      message: "Booking request sent to admin",
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


/* --------------------------------------------------------
   GET ALL BOOKING REQUESTS (ADMIN)
-------------------------------------------------------- */
export const getAllBookingRequests = async (req, res) => {
  try {
   const [rows] = await pool.query(`
  SELECT 
    br.*,
    m.fullName AS memberName,
    c.className,
    IFNULL(a.fullName, 'Pending') AS adminName
  FROM booking_requests br
  LEFT JOIN member m ON m.id = br.memberId
  LEFT JOIN classschedule c ON c.id = br.classId
  LEFT JOIN user a ON a.id = br.adminId
  ORDER BY br.createdAt DESC
`);


    res.json({ success: true, requests: rows });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};


/* --------------------------------------------------------
   APPROVE BOOKING (ADMIN)
-------------------------------------------------------- */
/* --------------------------------------------------------
   APPROVE BOOKING (ADMIN)
-------------------------------------------------------- */
export const approveBooking = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId } = req.body;   // ⭐ adminId payload se aa raha hai

    // Validate adminId
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required in the payload",
      });
    }

    const [result] = await pool.query(
      `
      UPDATE booking_requests
      SET status = 'approved',
          adminId = ?,
          updatedAt = NOW()
      WHERE id = ?
      `,
      [adminId, requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking request not found",
      });
    }

    res.json({
      success: true,
      message: "Booking approved successfully",
    });

  } catch (err) {
    console.error("approveBooking Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};




/* --------------------------------------------------------
   REJECT BOOKING (ADMIN)
-------------------------------------------------------- */
/* --------------------------------------------------------
   REJECT BOOKING (ADMIN)
-------------------------------------------------------- */
export const rejectBooking = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required in the payload",
      });
    }

    const [result] = await pool.query(
      `
      UPDATE booking_requests
      SET status = 'rejected',
          adminId = ?,
          updatedAt = NOW()
      WHERE id = ?
      `,
      [adminId, requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking request not found",
      });
    }

    res.json({
      success: true,
      message: "Booking rejected successfully",
    });

  } catch (err) {
    console.error("rejectBooking Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

