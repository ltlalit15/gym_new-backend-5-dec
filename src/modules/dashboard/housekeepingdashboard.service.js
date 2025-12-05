

// import { pool } from "../../config/db.js";
// import { startOfWeek } from "date-fns";

// export const housekeepingDashboardService = async () => {
//   const today = new Date();
//   const weekStart = startOfWeek(today, { weekStartsOn: 1 }); // Monday start

//   const todayStr = today.toISOString().slice(0, 10);
//   const weekStartStr = weekStart.toISOString().slice(0, 10);
//   const conn = pool;

//   // --- Total Shifts (Today) ---
//   const [[todayShiftsRow]] = await conn.query(
//     `SELECT COUNT(*) AS shifts 
//      FROM housekeepingSchedule 
//      WHERE dutyDate = ?`,
//     [todayStr]
//   );
//   const todayShifts = Number(todayShiftsRow.shifts || 0);

//   // --- Tasks Completed / Pending (This Week) ---
//   const [[taskCountRow]] = await conn.query(
//     `SELECT 
//         SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
//         COUNT(*) AS total
//      FROM HousekeepingTasks
//      WHERE dutyDate >= ?`,
//     [weekStartStr]
//   );
//   const tasksCompleted = Number(taskCountRow.completed);
//   const tasksTotal = Number(taskCountRow.total);

//   // --- Maintenance Pending (Same table) ---
//   const [[pendingMaintenanceRow]] = await conn.query(
//     `SELECT COUNT(*) AS pending
//      FROM HousekeepingTasks
//      WHERE category = 'Maintenance' AND status = 'Pending'`
//   );
//   const pendingMaintenance = Number(pendingMaintenanceRow.pending);

//   // --- Attendance Count (This Week) ---
//   const [[attendanceRow]] = await conn.query(
//     `SELECT 
//         SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
//         COUNT(*) AS total
//      FROM housekeepingAttendance
//      WHERE attendanceDate >= ?`,
//     [weekStartStr]
//   );
//   const attendancePresent = Number(attendanceRow.present);
//   const attendanceTotal = Number(attendanceRow.total);

//   // --- Weekly Duty Roster ---
//   const [weeklyRosterRows] = await conn.query(
//     `SELECT dutyDate, startTime, endTime, location, status
//      FROM housekeepingSchedule
//      WHERE dutyDate >= ?
//      ORDER BY dutyDate ASC`,
//     [weekStartStr]
//   );

//   const weeklyRoster = weeklyRosterRows.map(r => ({
//     date: r.dutyDate,
//     start: r.startTime,
//     end: r.endTime,
//     location: r.location,
//     status: r.status,
//   }));

//   // --- Tasks Completed Last 7 Days Graph ---
//   const [taskGraphRows] = await conn.query(
//     `SELECT DATE(dutyDate) AS day, COUNT(*) AS completed
//      FROM HousekeepingTasks
//      WHERE status = 'Completed' AND dutyDate >= DATE_SUB(?, INTERVAL 7 DAY)
//      GROUP BY DATE(dutyDate)
//      ORDER BY DATE(dutyDate)`,
//     [todayStr]
//   );

//   const taskGraph = taskGraphRows.map(r => ({
//     day: r.day,
//     count: Number(r.completed),
//   }));

//   // --- Maintenance Status Chart (Pending vs Completed) ---
//   const [[maintenanceStatsRow]] = await conn.query(
//     `SELECT 
//        SUM(CASE WHEN category = 'Maintenance' AND status = 'Completed' THEN 1 ELSE 0 END) AS completed,
//        SUM(CASE WHEN category = 'Maintenance' AND status = 'Pending' THEN 1 ELSE 0 END) AS pending
//      FROM HousekeepingTasks`
//   );

//   return {
//     todayShifts,
//     tasksCompleted,
//     tasksTotal,
//     pendingMaintenance,
//     attendancePresent,
//     attendanceTotal,
//     weeklyRoster,
//     taskGraph,
//     maintenanceStats: {
//       completed: Number(maintenanceStatsRow.completed),
//       pending: Number(maintenanceStatsRow.pending),
//     }
//   };
// };
