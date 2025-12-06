// src/modules/member/memberDashboard.service.js
import { pool } from "../../config/db.js";

export const getMemberDashboardService = async (memberId) => {
  // 1️⃣ MEMBER + MEMBERSHIP DETAIL
  const [memberRows] = await pool.query(
    `
      SELECT 
        m.id              AS memberId,
        m.fullName        AS fullName,
        m.status          AS membershipStatus,
        m.membershipTo    AS membershipTo,
        m.membershipFrom  AS membershipFrom,
        mp.name           AS planName
      FROM member m
      LEFT JOIN memberplan mp ON mp.id = m.planId
      WHERE m.id = ?
    `,
    [memberId]
  );

  if (memberRows.length === 0) {
    throw { status: 404, message: "Member not found" };
  }

  const member = memberRows[0];

  // membership expiry se status
  let derivedStatus = member.membershipStatus;
  if (member.membershipTo && new Date(member.membershipTo) < new Date()) {
    derivedStatus = "Expired";
  }

  // 2️⃣ WORKOUT PROGRESS – last 7 din ka attendance
  const [attendanceRows] = await pool.query(
    `
      SELECT 
        DATE(checkIn) AS date,
        COUNT(*)      AS checkIns
      FROM memberattendance
      WHERE memberId = ?
        AND checkIn >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(checkIn)
      ORDER BY DATE(checkIn)
    `,
    [memberId]
  );

  const today = new Date();
  const days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);

    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD

    const found = attendanceRows.find(
      (r) => r.date.toISOString().slice(0, 10) === key
    );

    days.push({
      date: key,
      dayLabel: d.toLocaleDateString("en-US", { weekday: "short" }), // Mon, Tue...
      checkIns: found ? found.checkIns : 0,
    });
  }

  const workoutProgress = {
    period: "week",
    days,
  };

  // 3️⃣ CLASSES THIS WEEK – abhi STATIC (kyunki booking/classschedule schema clear nahi)
  const classesThisWeek = {
    count: 0,
    message: "No classes data available yet", // UI pe text
  };

  // 4️⃣ NEXT SESSION – abhi koi real calculation nahi, isliye null
  const nextSession = null;

  // FINAL OBJECT – UI ke hisaab se
  return {
    member: {
      id: member.memberId,
      fullName: member.fullName,
      planName: member.planName,
    },
    membership: {
      status: derivedStatus,
      expiresOn: member.membershipTo,
    },
    workoutProgress,
    classesThisWeek,
    nextSession,
  };
};
