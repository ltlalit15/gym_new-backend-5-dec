import { pool } from "../../config/db.js";

export const staffCheckIn = async (req, res, next) => {
  try {
    const {
      staffId,
      branchId,
      mode,
      status,
      notes,
      checkIn,
      checkOut
    } = req.body;

    if (!staffId || !branchId) {
      return res.status(400).json({
        success: false,
        message: "staffId & branchId are required"
      });
    }

    // Handle manual or auto check-in
    const finalCheckIn = checkIn ? new Date(checkIn) : new Date();
    if (isNaN(finalCheckIn.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid checkIn format (YYYY-MM-DD HH:mm:ss)"
      });
    }

    let finalCheckOut = null;
    if (checkOut) {
      finalCheckOut = new Date(checkOut);
      if (isNaN(finalCheckOut.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid checkOut format"
        });
      }
    }

    // Prevent duplicate check-in for today (only if no manual checkout)
    if (!finalCheckOut) {
      const [existing] = await pool.query(
        `
        SELECT id FROM staffattendance
        WHERE staffId = ?
        AND DATE(checkIn) = CURDATE()
        AND checkOut IS NULL
        `,
        [staffId]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Staff already checked in"
        });
      }
    }

    // Insert attendance
    await pool.query(
      `
      INSERT INTO staffattendance
      (staffId, branchId, checkIn, checkOut, mode, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        staffId,
        branchId,
        finalCheckIn,
        finalCheckOut,
        mode || "Manual",
        status || "Present",
        notes || null
      ]
    );

    res.json({
      success: true,
      message: "Staff check-in saved"
    });

  } catch (err) {
    next(err);
  }
};


export const staffCheckOut = async (req, res, next) => {
  try {
    const attendanceId = req.params.id;
    const { checkOut } = req.body;

    const [existing] = await pool.query(
      `SELECT * FROM staffattendance WHERE id = ?`,
      [attendanceId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found"
      });
    }

    const record = existing[0];

    if (record.checkOut !== null) {
      return res.status(400).json({
        success: false,
        message: "Staff already checked out"
      });
    }

    let finalCheckOut = checkOut ? new Date(checkOut) : new Date();

    await pool.query(
      `
      UPDATE staffattendance
      SET checkOut = ?
      WHERE id = ?
      `,
      [finalCheckOut, attendanceId]
    );

    res.json({
      success: true,
      message: "Staff checked out successfully"
    });

  } catch (err) {
    next(err);
  }
};


export const getDailyStaffAttendance = async (req, res, next) => {
  try {
    const { date, search, branchId } = req.query;

    let sql = `
      SELECT 
        sa.id,
        sa.staffId,
        sa.branchId,
        sa.checkIn,
        sa.checkOut,
        sa.mode,
        sa.status,
        sa.notes,
        u.fullName AS staffName,
        u.email AS staffEmail,
        u.phone AS staffPhone,
        u.roleId AS staffRole,
        DATE(sa.checkIn) AS attendanceDate
      FROM staffattendance sa
      LEFT JOIN user u ON u.id = sa.staffId
      WHERE 1=1
    `;

    const params = [];

    // 🔹 Filter by branch
    if (branchId) {
      sql += ` AND sa.branchId = ?`;
      params.push(branchId);
    }

    // 🔹 Filter by date
    if (date) {
      const mysqlDate = new Date(date).toISOString().slice(0, 10);
      sql += ` AND DATE(sa.checkIn) = ?`;
      params.push(mysqlDate);
    }

    // 🔹 Search staff by name or phone
    if (search) {
      sql += ` AND (u.fullName LIKE ? OR u.phone LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY sa.checkIn DESC`;

    const [rows] = await pool.query(sql, params);

    // 🔹 Computed Status
    const formatted = rows.map((r) => ({
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



export const staffAttendanceDetail = async (req, res, next) => {
  try {
    const id = req.params.id;

    const [rows] = await pool.query(
      `
      SELECT 
        sa.id,
        sa.staffId,
        sa.branchId,
        sa.checkIn,
        sa.checkOut,
        sa.mode,
        sa.status,
        sa.notes,
        sa.createdAt,
        u.fullName AS staffName,
        u.email AS staffEmail,
        u.phone AS staffPhone,
        u.roleId AS staffRole,
        u.branchId AS userBranch
      FROM staffattendance sa
      LEFT JOIN user u ON u.id = sa.staffId
      WHERE sa.id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance record not found",
      });
    }

    const record = rows[0];

    // 🔥 Calculate working duration
    let duration = null;
    if (record.checkIn && record.checkOut) {
      const diffMs = new Date(record.checkOut) - new Date(record.checkIn);
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs / (1000 * 60)) % 60);
      duration = `${hours}h ${mins}m`;
    }

    res.json({
      success: true,
      attendance: {
        ...record,
        duration,
        computedStatus: record.checkOut ? "Completed" : "Active",
      },
    });

  } catch (err) {
    next(err);
  }
};



export const getTodayStaffSummary = async (req, res, next) => {
  try {
    const [[present]] = await pool.query(
      `SELECT COUNT(*) AS count FROM staffattendance WHERE DATE(checkIn) = CURDATE()`
    );

    const [[active]] = await pool.query(
      `SELECT COUNT(*) AS count FROM staffattendance WHERE DATE(checkIn) = CURDATE() AND checkOut IS NULL`
    );

    const [[completed]] = await pool.query(
      `SELECT COUNT(*) AS count FROM staffattendance WHERE DATE(checkIn) = CURDATE() AND checkOut IS NOT NULL`
    );

    res.json({
      success: true,
      summary: {
        present: present.count,
        active: active.count,
        completed: completed.count
      }
    });

  } catch (err) {
    next(err);
  }
};

export const getHousekeepingAttendance = async (req, res, next) => {
  try {
    const { date, branchId, search } = req.query;
    const adminId = req.user?.id || req.query.adminId; // agar token nai hai to query se le lo

    // 🔁 date default: aaj ka
    const targetDate = date
      ? new Date(date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    // 📌 1) Total housekeeping staff (user table se)
    // Yahan roleName ya roleId jo bhi tum use kar rahe ho usko lagao
    const [housekeepingStaff] = await pool.query(
      `
      SELECT u.id AS staffId, u.fullName, s.position
      FROM staff s
      JOIN user u ON u.id = s.userId
      LEFT JOIN role r ON r.id = u.roleId
      WHERE r.name = 'Housekeeper'
      ${branchId ? " AND u.branchId = ?" : ""}
      ${adminId ? " AND u.adminId = ?" : ""}
      ${search ? " AND (u.fullName LIKE ? OR u.phone LIKE ?)" : ""}
      `,
      [
        ...(branchId ? [branchId] : []),
        ...(adminId ? [adminId] : []),
        ...(search ? [`%${search}%`, `%${search}%`] : []),
      ]
    );

    const totalStaff = housekeepingStaff.length;

    // 📌 2) Aaj ka attendance housekeeping ke liye
    const [todayAttendance] = await pool.query(
      `
      SELECT sa.*, u.fullName
      FROM staffattendance sa
      JOIN user u ON u.id = sa.staffId
      LEFT JOIN role r ON r.id = u.roleId
      WHERE DATE(sa.checkIn) = ?
        AND r.name = 'Housekeeper'
      ${branchId ? " AND sa.branchId = ?" : ""}
      `,
      [targetDate, ...(branchId ? [branchId] : [])]
    );

    const presentCount = new Set(todayAttendance.map(a => a.staffId)).size;

    // Late logic: example – 09:00 ke baad aane wale
    const [lateRows] = await pool.query(
      `
      SELECT COUNT(DISTINCT sa.staffId) AS count
      FROM staffattendance sa
      JOIN user u ON u.id = sa.staffId
      LEFT JOIN role r ON r.id = u.roleId
      WHERE DATE(sa.checkIn) = ?
        AND r.name = 'Housekeeper'
        AND TIME(sa.checkIn) > '09:00:00'
      ${branchId ? " AND sa.branchId = ?" : ""}
      `,
      [targetDate, ...(branchId ? [branchId] : [])]
    );

    const late = lateRows[0]?.count || 0;
    const absent = totalStaff - presentCount;

    // 📌 3) Mark Daily Attendance table ke liye rows:
    // har staff + uska aaj ka attendance (agar hai to)
    const [markList] = await pool.query(
      `
      SELECT 
        u.id AS staffId,
        u.fullName AS staffName,
        s.position,
        sa.id AS attendanceId,
        sa.status,
        sa.checkIn,
        sa.checkOut,
        sa.notes
      FROM staff s
      JOIN user u ON u.id = s.userId
      LEFT JOIN role r ON r.id = u.roleId
      LEFT JOIN staffattendance sa 
        ON sa.staffId = u.id 
        AND DATE(sa.checkIn) = ?
      WHERE r.name = 'Housekeeper'
      ${branchId ? " AND u.branchId = ?" : ""}
      ${adminId ? " AND u.adminId = ?" : ""}
      ${search ? " AND (u.fullName LIKE ? OR u.phone LIKE ?)" : ""}
      ORDER BY u.fullName ASC
      `,
      [
        targetDate,
        ...(branchId ? [branchId] : []),
        ...(adminId ? [adminId] : []),
        ...(search ? [`%${search}%`, `%${search}%`] : []),
      ]
    );

    // 📌 4) History table (neeche wala)
    const [history] = await pool.query(
      `
      SELECT 
        sa.id,
        DATE(sa.checkIn) AS date,
        u.fullName AS staffName,
        s.position,
        sa.status,
        sa.checkIn,
        sa.checkOut,
        TIMESTAMPDIFF(MINUTE, sa.checkIn, IFNULL(sa.checkOut, sa.checkIn)) AS workMinutes,
        sa.notes
      FROM staffattendance sa
      JOIN user u ON u.id = sa.staffId
      JOIN staff s ON s.userId = u.id
      LEFT JOIN role r ON r.id = u.roleId
      WHERE r.name = 'Housekeeper'
      ${branchId ? " AND sa.branchId = ?" : ""}
      ${adminId ? " AND u.adminId = ?" : ""}
      ORDER BY sa.checkIn DESC
      LIMIT 100
      `,
      [
        ...(branchId ? [branchId] : []),
        ...(adminId ? [adminId] : []),
      ]
    );

    // frontend ko workHours "H:MM" format me
    const historyFormatted = history.map(h => ({
      ...h,
      workHours: `${Math.floor(h.workMinutes / 60)}:${String(h.workMinutes % 60).padStart(2,"0")}`
    }));

    res.json({
      success: true,
      summary: {
        totalStaff,
        present: presentCount,
        absent,
        late
      },
      markList,
      history: historyFormatted
    });

  } catch (err) {
    next(err);
  }
};

export const getTodayHousekeeperHistory = async (req, res, next) => {
  try {
    const staffId = req.params.staffId;

    const [rows] = await pool.query(
      `
      SELECT 
        id,
        checkIn,
        checkOut,
        status,
        notes
      FROM staffattendance
      WHERE staffId = ?
        AND DATE(checkIn) = CURDATE()
      ORDER BY checkIn ASC
      `,
      [staffId]
    );

    const history = rows.map((r, idx) => ({
      srNo: idx + 1,
      checkIn: r.checkIn,
      checkOut: r.checkOut || "Still in gym",
      status: r.checkOut ? "Completed" : "Active",
      notes: r.notes || null
    }));

    res.json({
      success: true,
      history
    });

  } catch (err) {
    next(err);
  }
};

