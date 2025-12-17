import { pool } from "../../config/db.js";

/* -----------------------------------------------------
   1️⃣  MEMBER CHECK-IN  (Manual + QR + Manual Times)
------------------------------------------------------ */
export const memberCheckIn = async (req, res, next) => {
  
  try {
    // ❌ checkOut hata diya body se
    const { memberId, branchId, mode, status, notes, checkIn } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "memberId required",
      });
    }

    // ✅ checkIn agar nahi bhejoge to current time use hoga
    const finalCheckIn = checkIn ? new Date(checkIn) : new Date();
    if (isNaN(finalCheckIn.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid checkIn format. Use YYYY-MM-DD HH:mm:ss",
      });
    }

    // ✅ checkOut hamesha null (check-in time pe nahi jayega)
    const finalCheckOut = null;

    // 🔁 Same day open attendance already hai to error
    const [existing] = await pool.query(
      `
      SELECT id FROM memberattendance
      WHERE memberId = ?
      AND DATE(checkIn) = CURDATE()
      AND checkOut IS NULL
      `,
      [memberId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Member already checked in",
      });
    }

    // ✅ Insert only checkIn, checkOut = NULL
    await pool.query(
      `
      INSERT INTO memberattendance 
      (memberId, branchId, checkIn, checkOut, mode, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        memberId,
        branchId,
        finalCheckIn,
        finalCheckOut,          // hamesha NULL
        mode || "QR",
        status || "Present",
        notes || null,
      ]
    );

    res.json({
      success: true,
      message: "Attendance saved successfully",
    });

  } catch (err) {
    next(err);
  }
};

export const getAttendanceByMemberId = async (req, res, next) => {
  try {
    const memberId = req.params.memberId;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "memberId is required",
      });
    }

    // 📌 Fetch all attendance of this member (latest first)
    const [rows] = await pool.query(
      `
      SELECT 
        id,
        memberId,
        branchId,
        checkIn,
        checkOut,
        createdAt,
        notes,
        status,
        mode
      FROM memberattendance
      WHERE memberId = ?
      ORDER BY id DESC
      `,
      [memberId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No attendance found for this member",
      });
    }

    res.json({
      success: true,
      attendance: rows,
    });

  } catch (err) {
    next(err);
  }
};


/* -----------------------------------------------------
   2️⃣  MEMBER CHECK-OUT (Manual Checkout Time Supported)
------------------------------------------------------ */
export const memberCheckOut = async (req, res, next) => {
  try {
    const attendanceId = req.params.id;   // /checkout/:id

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: "attendanceId is required in params",
      });
    }

    // 1️⃣ Record exist karta hai?
    const [existing] = await pool.query(
      `SELECT * FROM memberattendance WHERE id = ?`,
      [attendanceId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    const record = existing[0];

    // 2️⃣ Already checkout ho chuka?
    if (record.checkOut !== null) {
      return res.status(400).json({
        success: false,
        message: "Member already checked out",
      });
    }

    // 3️⃣ CheckOut time = abhi ka current time
    const finalCheckOut = new Date();

    const [result] = await pool.query(
      `
      UPDATE memberattendance
      SET checkOut = ?
      WHERE id = ?
      `,
      [finalCheckOut, attendanceId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Checkout update failed",
      });
    }

    res.json({
      success: true,
      message: "Checkout updated successfully",
      checkOut: finalCheckOut,
    });

  } catch (err) {
    next(err);
  }
};


/* -----------------------------------------------------
   3️⃣  DAILY ATTENDANCE LIST (Search + Filter + Status)
------------------------------------------------------ */
export const getDailyAttendance = async (req, res, next) => {
  try {
    const { date, search, branchId } = req.query;

    let sql = `
      SELECT 
        a.id,
        a.memberId,
        a.branchId,
        a.checkIn,
        a.checkOut,
        a.mode,
        a.status,
        a.notes,
        m.fullName,
        DATE(a.checkIn) AS attendanceDate
      FROM memberattendance a
      LEFT JOIN member m ON m.id = a.memberId
      WHERE 1=1
    `;

    const params = [];

    if (branchId) {
      sql += ` AND a.branchId = ?`;
      params.push(branchId);
    }

    if (date) {
      const mysqlDate = new Date(date).toISOString().slice(0, 10);
      sql += ` AND DATE(a.checkIn) = ?`;
      params.push(mysqlDate);
    }

    if (search) {
      sql += ` AND (m.fullName LIKE ? OR m.memberCode LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY a.checkIn DESC`;

    const [rows] = await pool.query(sql, params);

    const formatted = rows.map(r => ({
      ...r,
      computedStatus: r.checkOut ? "Completed" : "Active",
    }));

    res.json({
      success: true,
      attendance: formatted,
    });

  } catch (err) {
    next(err);
  }
};


/* -----------------------------------------------------
   4️⃣  ATTENDANCE DETAIL VIEW
------------------------------------------------------ */
export const attendanceDetail = async (req, res, next) => {
  try {
    const id = req.params.id;

    const [rows] = await pool.query(
      `
      SELECT 
        a.*, 
        m.fullName, 
        m.phone
      FROM memberattendance a
      LEFT JOIN member m ON a.memberId = m.id
      WHERE a.id = ?
      `,
      [id]
    );

    res.json({
      success: true,
      attendance: rows[0],
    });

  } catch (err) {
    next(err);
  }
};


/* -----------------------------------------------------
   5️⃣  TODAY SUMMARY (Dashboard Cards)
------------------------------------------------------ */
export const getTodaySummary = async (req, res, next) => {
  try {
    const [present] = await pool.query(
      `SELECT COUNT(*) AS count FROM memberattendance WHERE DATE(checkIn) = CURDATE()`
    );

    const [active] = await pool.query(
      `SELECT COUNT(*) AS count FROM memberattendance WHERE DATE(checkIn) = CURDATE() AND checkOut IS NULL`
    );

    const [completed] = await pool.query(
      `SELECT COUNT(*) AS count FROM memberattendance WHERE DATE(checkIn) = CURDATE() AND checkOut IS NOT NULL`
    );

    res.json({
      success: true,
      summary: {
        present: present[0].count,
        active: active[0].count,
        completed: completed[0].count,
      },
    });

  } catch (err) {
    next(err);
  }
};

export const deleteAttendance = async (req, res, next) => {
  try {
    const attendanceId = req.params.id;

    if (!attendanceId) {
      return res.status(400).json({
        success: false,
        message: "attendanceId is required",
      });
    }

    // Record exist karta hai?
    const [existing] = await pool.query(
      `SELECT id FROM memberattendance WHERE id = ?`,
      [attendanceId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    // Delete record
    const [result] = await pool.query(
      `DELETE FROM memberattendance WHERE id = ?`,
      [attendanceId]
    );

    if (result.affectedRows === 0) {
      return res.status(500).json({
        success: false,
        message: "Failed to delete attendance",
      });
    }

    res.json({
      success: true,
      message: "Attendance deleted successfully",
    });

  } catch (err) {
    next(err);
  }
};
export const getAttendanceByAdminId = async (req, res, next) => {
  try {
    const { adminId, date, search } = req.query;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    let sql = `
      SELECT
        a.id,
        DATE(a.checkIn) AS date,

        /* NAME */
        CASE
          WHEN a.staffId IS NOT NULL THEN su.fullName
          ELSE mu.fullName
        END AS name,

        /* ROLE */
        CASE
          WHEN a.staffId IS NOT NULL THEN sr.name
          ELSE mr.name
        END AS role,

        a.checkIn,
        a.checkOut,
        a.mode,
        sh.shiftType AS shift,
        a.status

      FROM memberattendance a

      /* ===== STAFF ===== */
      LEFT JOIN staff s ON s.id = a.staffId
      LEFT JOIN user su ON su.id = s.userId
      LEFT JOIN role sr ON sr.id = su.roleId

      /* ===== MEMBER ===== */
      LEFT JOIN member m ON m.userId= a.memberId
      LEFT JOIN user mu ON mu.id = m.userId
      LEFT JOIN role mr ON mr.id = mu.roleId

      /* ===== SHIFT (STAFF ONLY) ===== */
      LEFT JOIN shifts sh
        ON sh.staffIds = a.staffId
       AND DATE(sh.shiftDate) = DATE(a.checkIn)

      /* ===== ADMIN FILTER (CORE LOGIC) ===== */
      WHERE (
        (a.staffId IS NOT NULL AND s.adminId = ?)
        OR
        (a.memberId IS NOT NULL AND m.adminId = ?)
      )
    `;

    const params = [adminId, adminId];

    if (date) {
      sql += ` AND DATE(a.checkIn) = ?`;
      params.push(date);
    }

    if (search) {
      sql += `
        AND (
          su.fullName LIKE ?
          OR mu.fullName LIKE ?
        )
      `;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY a.checkIn DESC`;

    const [rows] = await pool.query(sql, params);

    res.json({
      success: true,
      attendance: rows,
    });
  } catch (err) {
    next(err);
  }
}



