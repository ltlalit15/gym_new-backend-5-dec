import { pool } from "../../config/db.js";
import { startOfWeek } from "date-fns";




export const housekeepingDashboardService = async () => {
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });

  const todayStr = today.toISOString().slice(0, 10);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const conn = pool;



  const [[todayShiftsRow]] = await conn.query(
  `SELECT COUNT(*) AS shifts
   FROM Shifts
   WHERE DATE(CONVERT_TZ(shiftDate, '+00:00', '+05:30')) = ?`,
  [todayStr]
);

  const todayShifts = Number(todayShiftsRow.shifts || 0);


  // --- Tasks Completed this Week
  const [[taskCountRow]] = await conn.query(
    `SELECT 
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) AS completed,
        COUNT(*) AS total
     FROM tasks
     WHERE dueDate >= ?`,
    [weekStartStr]
  );
  const tasksCompleted = Number(taskCountRow.completed);
  const tasksTotal = Number(taskCountRow.total);


  // --- Maintenance Pending
  const [[pendingMaintenanceRow]] = await conn.query(
    `SELECT COUNT(*) AS pending
     FROM tasks
     WHERE status = 'Pending'`
  );
  const pendingMaintenance = Number(pendingMaintenanceRow.pending);

  // --- Attendance Count (This Week)
  const [[attendanceRow]] = await conn.query(
    `SELECT 
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
        COUNT(*) AS total
     FROM housekeepingAttendance
     WHERE attendanceDate >= ?`,
    [weekStartStr]
  );
  const attendancePresent = Number(attendanceRow.present);
  const attendanceTotal = Number(attendanceRow.total);

  // --- Weekly Roster (Shift Table)
  const [weeklyRosterRows] = await conn.query(
    `SELECT shiftDate, startTime, endTime, branchId, status
     FROM Shifts
     WHERE shiftDate >= ?
     ORDER BY shiftDate ASC`,
    [weekStartStr]
  );



  const weeklyRoster = weeklyRosterRows.map(r => ({
  date: new Date(r.shiftDate).toISOString().slice(0, 10), // clean yyyy-mm-dd
  start: r.startTime,
  end: r.endTime,
  branch: r.branchId,
  status: r.status,
}));


  // --- 7 Day Task Completion Graph
  const [taskGraphRows] = await conn.query(
    `SELECT DATE(dueDate) AS day, COUNT(*) AS completed
     FROM tasks
     WHERE status = 'Completed' 
       AND dueDate >= DATE_SUB(?, INTERVAL 7 DAY)
     GROUP BY DATE(dueDate)
     ORDER BY DATE(dueDate)`,
    [todayStr]
  );

  const taskGraph = taskGraphRows.map(r => ({
    day: r.day,
    count: Number(r.completed),
  }));

  // --- Maintenance Status
  const [[maintenanceStatsRow]] = await conn.query(
    `SELECT 
       SUM(CASE WHEN priority = 'High' AND status = 'Completed' THEN 1 ELSE 0 END) AS completed,
       SUM(CASE WHEN priority = 'High' AND status = 'Pending'   THEN 1 ELSE 0 END) AS pending
     FROM tasks`
  );

  return {
    todayShifts,
    tasksCompleted,
    tasksTotal,
    pendingMaintenance,
    attendancePresent,
    attendanceTotal,
    weeklyRoster,
    taskGraph,
    maintenanceStats: {
      completed: Number(maintenanceStatsRow.completed),
      pending: Number(maintenanceStatsRow.pending),
    }
  };
};
