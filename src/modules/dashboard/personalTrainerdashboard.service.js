// src/modules/dashboard/dashboard.service.js
import { pool } from "../../config/db.js";

export const getAdminDashboardService = async (adminId) => {
  // 1) Total active members for this admin
  const [[totalRow]] = await pool.query(
    `SELECT COUNT(*) AS totalMembers
     FROM member
     WHERE adminId = ? AND status = 'Active'`,
    [adminId]
  );
  const totalMembers = totalRow.totalMembers || 0;

  // 2) Today's check-ins from memberattendance
  const [[checkRow]] = await pool.query(
    `SELECT COUNT(*) AS todaysCheckIns
     FROM memberattendance ma
     JOIN member m ON ma.memberId = m.id
     WHERE m.adminId = ?
       AND DATE(ma.checkIn) = CURDATE()`,
    [adminId]
  );
  const todaysCheckIns = checkRow.todaysCheckIns || 0;

  // 3) Earnings overview (last 7 days) – from member.amountPaid
  const [earningRows] = await pool.query(
    `SELECT 
        DATE(membershipFrom) AS date,
        SUM(amountPaid)      AS totalEarnings
     FROM member
     WHERE adminId = ?
       AND membershipFrom >= CURDATE() - INTERVAL 6 DAY
     GROUP BY DATE(membershipFrom)
     ORDER BY date`,
    [adminId]
  );

  const earningsOverview = earningRows.map((r) => ({
    date: r.date,                      // e.g. "2025-12-01"
    total: Number(r.totalEarnings || 0)
  }));

  // 4) Sessions overview (optional) – needs "session" table
  let sessionsOverview = { completed: 0, upcoming: 0, cancelled: 0 };

  try {
    const [sessionRows] = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM session
       WHERE adminId = ?
       GROUP BY status`,
      [adminId]
    );

    sessionRows.forEach((row) => {
      const s = (row.status || "").toLowerCase();
      if (s === "completed") sessionsOverview.completed = row.count;
      if (s === "upcoming") sessionsOverview.upcoming = row.count;
      if (s === "cancelled") sessionsOverview.cancelled = row.count;
    });
  } catch (e) {
    // agar session table abhi nahi hai to error ignore kar dena
    sessionsOverview = null;
  }

  // 5) Recent activities – last 5 check-ins
  const [activityRows] = await pool.query(
    `SELECT 
        ma.id,
        m.fullName,
        ma.checkIn,
        ma.status,
        ma.mode,
        ma.notes
     FROM memberattendance ma
     JOIN member m ON ma.memberId = m.id
     WHERE m.adminId = ?
     ORDER BY ma.checkIn DESC
     LIMIT 5`,
    [adminId]
  );

  const recentActivities = activityRows.map((row) => ({
    id: row.id,
    memberName: row.fullName,
    time: row.checkIn,
    status: row.status,
    mode: row.mode,
    notes: row.notes,
  }));

  return {
    totalMembers,
    todaysCheckIns,
    earningsOverview,
    sessionsOverview,
    recentActivities,
  };
};
// export const getPersonalTrainingPlansByAdminService = async (adminId) => {
//   const [rows] = await pool.query(
//     `
//     SELECT
//       p.id,
//       p.name,
//       p.sessions,
//       p.validityDays,
//       p.price,
//       p.type,
//       COUNT(m.id) AS customersCount
//     FROM memberplan p
//     LEFT JOIN member m
//       ON m.planId = p.id
//       AND m.status = 'ACTIVE'
//       AND m.adminId = ?        -- yahi se "by admin" wala count aa raha hai
//     GROUP BY p.id
//     HAVING p.sessions IS NOT NULL AND p.sessions > 0   -- sirf training plans
//     ORDER BY p.id DESC
//     `,
//     [adminId]
//   );

//   return rows;
// };


export const getPersonalTrainingPlansByAdminService = async (adminId) => {
  const [rows] = await pool.query(
    `
    SELECT * FROM memberplan  WHERE adminId = ? `,
    [adminId]
  );

  return rows;
};

export const getPersonalTrainingCustomersByAdminService = async (adminId, planId) => {
  try {
    /* =========================
       FETCH PLAN (VALIDATION)
    ========================= */

    const planQuery = `
      SELECT 
        mp.id,
        mp.name,
        mp.sessions,
        mp.validityDays,
        mp.price,
        mp.type,
        mp.trainerType
      FROM memberplan mp
      WHERE 
        mp.id = ?
        AND mp.type = 'MEMBER'
        AND mp.trainerType = 'personal'
    `;

    const [planResult] = await pool.query(planQuery, [planId]);

    if (planResult.length === 0) {
      const error = new Error("Membership plan for trainertype personal not found.");
      error.statusCode = 404;
      throw error;
    }

    const plan = planResult[0];

    /* =========================
       FETCH MEMBERS
    ========================= */
    const membersQuery = `
      SELECT 
        m.id,
        m.userId,
        m.fullName,
        m.email,
        m.phone,
        m.gender,
        m.address,
        m.joinDate,
        m.branchId,
        m.membershipFrom,
        m.membershipTo,
        m.paymentMode,
        m.amountPaid,
        m.dateOfBirth,
        m.status,
        m.planId,
        mp.name AS planName,
        mp.sessions,
        mp.validityDays,
        mp.price,
        mp.type AS planType,
        mp.trainerType
      FROM member m
      JOIN memberplan mp ON m.planId = mp.id
      WHERE 
        m.adminId = ?
        AND mp.id = ?
        AND mp.type = 'MEMBER'
        AND mp.trainerType = 'personal'
      ORDER BY m.fullName
    `;

    const [members] = await pool.query(membersQuery, [adminId, planId]);

    /* =========================
       STATISTICS
    ========================= */
    const currentDate = new Date();
    let active = 0;
    let expired = 0;
    let completed = 0;

    members.forEach(member => {
      if (member.membershipTo && new Date(member.membershipTo) >= currentDate) {
        active++;
      } else if (member.membershipTo && new Date(member.membershipTo) < currentDate) {
        expired++;
        completed++;
      }
    });

    return {
      plan,
      members,
      statistics: {
        active,
        expired,
        completed
      }
    };
  } catch (error) {
    throw error;
  }
};