
export const memberCheckIn = async (req, res, next) => {
  try {
    const { memberId, branchId } = req.body;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "memberId is required",
      });
    }

    // Check if already checked-in but checkout not done
    const [existing] = await pool.query(
      `SELECT id FROM memberattendance 
       WHERE memberId = ? AND DATE(checkIn) = CURDATE() AND checkOut IS NULL`,
      [memberId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Member already checked in",
      });
    }

    await pool.query(
      `INSERT INTO memberattendance (memberId, branchId, checkIn)
       VALUES (?, ?, NOW())`,
      [memberId, branchId]
    );

    res.json({
      success: true,
      message: "Check-in successful",
    });
  } catch (err) {
    next(err);
  }
};

export const memberCheckOut = async (req, res, next) => {
  try {
    const attendanceId = req.params.id;

    await pool.query(
      `UPDATE memberattendance 
       SET checkOut = NOW() 
       WHERE id = ?`,
      [attendanceId]
    );

    res.json({
      success: true,
      message: "Check-out updated successfully",
    });
  } catch (err) {
    next(err);
  }
};
 
export const getDailyAttendance = async (req, res, next) => {
  try {
    const { date, search } = req.query;

    let sql = `
      SELECT 
        a.id,
        a.checkIn,
        a.checkOut,
        m.fullName,
        m.memberCode,
        a.branchId,
        DATE(a.checkIn) AS date
      FROM memberattendance a
      LEFT JOIN member m ON m.id = a.memberId
      WHERE 1=1
    `;

    const params = [];

    if (date) {
      sql += ` AND DATE(a.checkIn) = ?`;
      params.push(date);
    }

    if (search) {
      sql += ` AND (m.fullName LIKE ? OR m.memberCode LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY a.checkIn DESC`;

    const [rows] = await pool.query(sql, params);

    // add status field for UI
    const formatted = rows.map((r) => {
      let status = "Present";

      if (!r.checkOut) status = "Active";

      return { ...r, status };
    });

    res.json({
      success: true,
      attendance: formatted,
    });
  } catch (err) {
    next(err);
  }
};


export const attendanceDetail = async (req, res, next) => {


  try {
    const id = req.params.id;

    const [rows] = await pool.query(
      `
      SELECT 
        a.*, 
        m.fullName, 
        m.phone, 
        m.memberCode
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

export const getTodaySummary = async (req, res, next) => {
  try {
    const [present] = await pool.query(
      `SELECT COUNT(*) AS count FROM memberattendance 
       WHERE DATE(checkIn) = CURDATE()`
    );

    const [active] = await pool.query(
      `SELECT COUNT(*) AS count FROM memberattendance 
       WHERE DATE(checkIn) = CURDATE() AND checkOut IS NULL`
    );

    const [completed] = await pool.query(
      `SELECT COUNT(*) AS count FROM memberattendance 
       WHERE DATE(checkIn) = CURDATE() AND checkOut IS NOT NULL`
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
