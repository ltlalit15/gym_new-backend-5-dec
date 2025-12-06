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
export const getPersonalTrainingPlansByAdminService = async (adminId) => {
  const [rows] = await pool.query(
    `
    SELECT
      p.id,
      p.name,
      p.sessions,
      p.validityDays,
      p.price,
      p.category,
      p.branchId,
      COUNT(m.id) AS customersCount
    FROM plan p
    LEFT JOIN member m
      ON m.planId = p.id
      AND m.adminId = ?
      AND m.status = 'ACTIVE'
    WHERE p.category = 'Personal Training'
    GROUP BY p.id
    ORDER BY p.id DESC
    `,
    [adminId]
  );

  return rows;
};

/**
 * Niche wali "Basic Training Customers" table ke liye
 */
export const getPersonalTrainingCustomersByAdminService = async (
  adminId,
  planId
) => {
  const [rows] = await pool.query(
    `
    SELECT
      m.id           AS memberId,
      m.fullName     AS customerName,
      m.membershipFrom AS purchaseDate,
      m.membershipTo   AS expiryDate,
      m.status,
      p.sessions
    FROM member m
    JOIN plan p ON m.planId = p.id
    WHERE m.adminId = ?
      AND m.planId = ?
    ORDER BY m.membershipFrom DESC
    `,
    [adminId, planId]
  );

  // Abhi tumhare DB me per-member sessions used/left ka field nahi hai,
  // isliye main yahan placeholder de रहा हूँ:
  return rows.map((row, index) => ({
    srNo: index + 1,
    memberId: row.memberId,
    customerName: row.customerName,
    purchaseDate: row.purchaseDate,
    expiryDate: row.expiryDate,
    // TODO: agar future me koi sessions tracking table banega to yahan se calculate karna
    bookedSessions: 0,
    leftSessions: row.sessions, // total sessions from plan
    status: row.status,
  }));
};