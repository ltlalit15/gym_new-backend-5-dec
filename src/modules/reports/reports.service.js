import { pool } from "../../config/db.js";

// Generate Member Report Service
export const generateMemberReportService = async (adminId) => {
  try {
    // Get booking statistics from bookingrequest table
    const [bookingStats] = await pool.query(
      `SELECT 
        COUNT(*) as totalBookings,
        SUM(price) as totalRevenue,
        AVG(price) as avgTicket,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as booked
      FROM booking_requests
      WHERE adminId = ?`,
      [adminId]
    );

    // Get bookings by day from bookingrequest table
    const [bookingsByDay] = await pool.query(
      `SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count,
        SUM(price) as revenue
      FROM booking_requests
      WHERE adminId = ?
      GROUP BY DATE(createdAt)
      ORDER BY date ASC`,
      [adminId]
    );

    // Get booking status distribution from bookingrequest table
    const [bookingStatus] = await pool.query(
      `SELECT 
        status,
        COUNT(*) as count
      FROM booking_requests
      WHERE adminId = ?
      GROUP BY status`,
      [adminId]
    );

    // Get transactions from pt_bookings table
    // const [transactions] = await pool.query(
    //   `SELECT 
    //     ptb.date,
    //     u.fullName as trainer,
    //     m.fullName as username,
    //     'Personal Training' as type,
    //     ptb.startTime as time,
    //     ptb.bookingStatus as status
    //   FROM pt_bookings ptb
    //   LEFT JOIN member m ON ptb.memberId = m.id
    //   LEFT JOIN staff s ON ptb.trainerId = s.id
    //   LEFT JOIN user u ON s.userId = u.id
    //   WHERE m.adminId = ?
    //   ORDER BY ptb.date DESC`,
    //   [adminId]
    // );
   const [transactions] = await pool.query(
  `SELECT 
    ptb.date,
    u.fullName as trainer,
    m.fullName as username,
    CASE 
      WHEN ptb.bookingType = 'PT' THEN 'Personal Training' 
      WHEN ptb.bookingType = 'GROUP' THEN 'Group Class' 
      ELSE ptb.bookingType 
    END as type,
    ptb.startTime as time,
    ptb.bookingStatus as status
  FROM unified_bookings ptb
  LEFT JOIN member m ON ptb.memberId = m.id
  LEFT JOIN user u ON ptb.trainerId = u.id
  WHERE m.adminId = ?
  ORDER BY ptb.date DESC`,
  [adminId]
);
    // Format the data for the UI
    const formattedStats = {
      totalBookings: bookingStats[0].totalBookings || 0,
      totalRevenue: bookingStats[0].totalRevenue || 0,
      avgTicket: bookingStats[0].avgTicket || 0,
      confirmed: bookingStats[0].confirmed || 0,
      cancelled: bookingStats[0].cancelled || 0,
      booked: bookingStats[0].booked || 0
    };

    // Format transactions data
    const formattedTransactions = transactions.map(transaction => ({
      date: transaction.date,
      trainer: transaction.trainer || 'N/A',
      username: transaction.username || 'N/A',
      type: transaction.type,
      time: transaction.time,
      status: transaction.status
    }));

    return {
      stats: formattedStats,
      bookingsByDay,
      bookingStatus,
      transactions: formattedTransactions
    };
  } catch (error) {
    throw new Error(`Error generating member report: ${error.message}`);
  }
};

export const generateGeneralTrainerReportService = async (adminId) => {
   try {
    // 1️⃣ Get all branches owned by this admin
    const [branches] = await pool.query(
      `SELECT id FROM branch WHERE adminId = ?`,
      [adminId]
    );

    if (branches.length === 0) {
      return {
        stats: {
          totalBookings: 0,
          totalRevenue: 0,
          avgTicket: 0,
          confirmed: 0,
          cancelled: 0,
          booked: 0
        },
        bookingsByDay: [],
        bookingStatus: [],
        transactions: []
      };
    }

    // Extract branch IDs
    const branchIds = branches.map(b => b.id);

    // Convert to SQL IN (?,?,?)
    const branchIdPlaceholders = branchIds.map(() => '?').join(',');

    // 2️⃣ Get booking statistics for GROUP bookings in these branches
    const [bookingStats] = await pool.query(
      `SELECT 
        COUNT(*) as totalBookings,
        0 as totalRevenue,
        0 as avgTicket,
        SUM(CASE WHEN bookingStatus = 'Confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) as booked
      FROM unified_bookings
      WHERE branchId IN (${branchIdPlaceholders})
        AND bookingType = 'GROUP'`,
      branchIds
    );

    // 3️⃣ Bookings by day
    const [bookingsByDay] = await pool.query(
      `SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count
      FROM unified_bookings
      WHERE branchId IN (${branchIdPlaceholders})
        AND bookingType = 'GROUP'
      GROUP BY DATE(createdAt)
      ORDER BY date ASC`,
      branchIds
    );

    // 4️⃣ Booking status distribution
    const [bookingStatus] = await pool.query(
      `SELECT 
        bookingStatus,
        COUNT(*) as count
      FROM unified_bookings
      WHERE branchId IN (${branchIdPlaceholders})
        AND bookingType = 'GROUP'
      GROUP BY bookingStatus`,
      branchIds
    );

    // 5️⃣ Transactions list for UI
    // const [transactions] = await pool.query(
    //   `SELECT 
    //     date,
    //     trainerId,
    //     memberId,
    //     'Group Training' as type,
    //     startTime as time,
    //     bookingStatus as status
    //   FROM unified_bookings
    //   WHERE branchId IN (${branchIdPlaceholders})
    //     AND bookingType = 'GROUP'
    //   ORDER BY date DESC`,
    //   branchIds
    // );
const [transactions] = await pool.query(
  `SELECT 
      ub.date,
      trainerUser.fullName AS trainerName,
      memberUser.fullName AS memberName,
      'Group Training' AS type,
      ub.startTime AS time,
      ub.bookingStatus AS status
    FROM unified_bookings ub
    LEFT JOIN user AS trainerUser 
        ON ub.trainerId = trainerUser.id
    LEFT JOIN member AS m
        ON ub.memberId = m.id
    LEFT JOIN user AS memberUser
        ON m.userId = memberUser.id
    WHERE ub.branchId IN (${branchIdPlaceholders})
      AND ub.bookingType = 'GROUP'
    ORDER BY ub.date DESC`,
  branchIds
);
    // Format summary stats
    const formattedStats = {
      totalBookings: bookingStats[0].totalBookings || 0,
    //   totalRevenue: bookingStats[0].totalRevenue || 0,
    //   avgTicket: bookingStats[0].avgTicket || 0,
      confirmed: bookingStats[0].confirmed || 0,
      cancelled: bookingStats[0].cancelled || 0,
      booked: bookingStats[0].booked || 0
    };

    // Format transaction list
   const formattedTransactions = transactions.map(tx => ({
  date: tx.date,
  trainer: tx.trainerName || 'N/A',
  username: tx.memberName || 'N/A',
  type: tx.type,
  time: tx.time,
  status: tx.status
}));

    return {
      stats: formattedStats,
      bookingsByDay,
      bookingStatus,
      transactions: formattedTransactions
    };

  } catch (error) {
    throw new Error(`Error generating general trainer report: ${error.message}`);
  }
};

// export const generatePersonalTrainerReportService = async (adminId) => {

//   try {
//     const [stats] = await pool.query(
//       `SELECT 
//         COUNT(*) as totalBookings,
//         0 as totalRevenue,
//         0 as avgTicket,
//         SUM(CASE WHEN bookingStatus = 'Confirmed' THEN 1 ELSE 0 END) as confirmed,
//         SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
//         SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) as booked
//       FROM unified_bookings ub
//       JOIN branch b ON ub.branchId = b.id
//       WHERE b.adminId = ? AND ub.bookingType = 'PT'`,
//       [adminId]
//     );

//     const [bookingsByDay] = await pool.query(
//       `SELECT 
//         DATE(ub.date) AS date,
//         COUNT(*) AS count,
//         0 AS revenue
//       FROM unified_bookings ub
//       JOIN branch b ON ub.branchId = b.id
//       WHERE b.adminId = ? AND ub.bookingType = 'PT'
//       GROUP BY DATE(ub.date)
//       ORDER BY date ASC`,
//       [adminId]
//     );

//     const [bookingStatus] = await pool.query(
//       `SELECT bookingStatus, COUNT(*) as count
//        FROM unified_bookings ub
//        JOIN branch b ON ub.branchId = b.id
//        WHERE b.adminId = ? AND ub.bookingType = 'PT'
//        GROUP BY bookingStatus`,
//       [adminId]
//     );

//     const [transactions] = await pool.query(
//       `SELECT 
//         ub.date,
//         u.fullName AS trainer,
//         m.fullName AS username,
//         'Personal Training' AS type,
//         CONCAT(ub.startTime, ' - ', ub.endTime) AS time,
//         0 AS revenue,
//         ub.bookingStatus AS status
//       FROM unified_bookings ub
//       LEFT JOIN staff s ON ub.trainerId = s.id
//       LEFT JOIN user u ON s.userId = u.id
//       LEFT JOIN member m ON ub.memberId = m.id
//       JOIN branch b ON ub.branchId = b.id
//       WHERE b.adminId = ? AND ub.bookingType = 'PT'
//       ORDER BY ub.date DESC`,
//       [adminId]
//     );

//     return {
//       stats: stats[0],
//       bookingsByDay,
//       bookingStatus,
//       transactions
//     };

//   } catch (error) {
//     throw new Error("PT Report Error: " + error.message);
//   }
// };

export const generatePersonalTrainerReportService = async (adminId) => {
  try {

    // 1️⃣ Get all branches for this admin
    const [branches] = await pool.query(
      `SELECT id FROM branch WHERE adminId = ?`,
      [adminId]
    );

    if (branches.length === 0) {
      return {
        stats: {
          totalBookings: 0,
          confirmed: 0,
          cancelled: 0,
          booked: 0
        },
        bookingsByDay: [],
        bookingStatus: [],
        transactions: []
      };
    }

    // Extract branch IDs
    const branchIds = branches.map(b => b.id);
    const placeholders = branchIds.map(() => '?').join(',');

    // 2️⃣ PT booking stats
    const [bookingStats] = await pool.query(
      `SELECT 
        COUNT(*) as totalBookings,
        SUM(CASE WHEN bookingStatus = 'Completed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) as booked
      FROM unified_bookings
      WHERE branchId IN (${placeholders})
        AND bookingType = 'PT'`,
      branchIds
    );

    // 3️⃣ PT bookings group by day
    const [bookingsByDay] = await pool.query(
      `SELECT 
        DATE(createdAt) AS date,
        COUNT(*) AS count
      FROM unified_bookings
      WHERE branchId IN (${placeholders})
        AND bookingType = 'PT'
      GROUP BY DATE(createdAt)
      ORDER BY date ASC`,
      branchIds
    );

    // 4️⃣ PT booking status distribution
    const [bookingStatus] = await pool.query(
      `SELECT 
        bookingStatus,
        COUNT(*) AS count
      FROM unified_bookings
      WHERE branchId IN (${placeholders})
        AND bookingType = 'PT'
      GROUP BY bookingStatus`,
      branchIds
    );

    // 5️⃣ PT transactions list
    const [transactions] = await pool.query(
      `SELECT 
          ub.date,
          trainerUser.fullName AS trainerName,
          memberUser.fullName AS memberName,
          'Personal Training' AS type,
          ub.startTime AS time,
          ub.bookingStatus AS status
        FROM unified_bookings ub
        LEFT JOIN user AS trainerUser 
              ON ub.trainerId = trainerUser.id
        LEFT JOIN member AS m
              ON ub.memberId = m.id
        LEFT JOIN user AS memberUser
              ON m.userId = memberUser.id
        WHERE ub.branchId IN (${placeholders})
          AND ub.bookingType = 'PT'
        ORDER BY ub.date DESC`,
      branchIds
    );

    // Format output for UI
    const formattedStats = {
      totalBookings: bookingStats[0].totalBookings || 0,
      confirmed: bookingStats[0].confirmed || 0,
      cancelled: bookingStats[0].cancelled || 0,
      booked: bookingStats[0].booked || 0
    };

    const formattedTransactions = transactions.map(tx => ({
      date: tx.date,
      trainer: tx.trainerName || 'N/A',
      username: tx.memberName || 'N/A',
      type: tx.type,
      time: tx.time,
      status: tx.status
    }));

    return {
      stats: formattedStats,
      bookingsByDay,
      bookingStatus,
      transactions: formattedTransactions
    };

  } catch (error) {
    throw new Error(`Error generating personal trainer report: ${error.message}`);
  }
};


// export const getReceptionReportService = async (adminId) => {

//   // 1️⃣ Get admin's branchId
//   const [adminData] = await pool.query(
//     `SELECT branchId FROM user WHERE id = ? LIMIT 1`,
//     [adminId]
//   );

//   if (adminData.length === 0) {
//     return { error: "Admin not found" };
//   }

//   const branchId = adminData[0].branchId;

//   // ------------------ SUMMARY (ALL TIME) ------------------

//   // ✔ All-time check-ins
//   const [[checkinsSummary]] = await pool.query(
//     `SELECT COUNT(*) AS total 
//      FROM memberattendance
//      WHERE branchId = ?`,
//     [branchId]
//   );

//   // ✔ All-time new members
//   const [[newMembersSummary]] = await pool.query(
//     `SELECT COUNT(*) AS total 
//      FROM member
//      WHERE branchId = ?`,
//     [branchId]
//   );

//   // ✔ All-time payments (No branchId column)
//   const [[paymentsSummary]] = await pool.query(
//     `SELECT IFNULL(SUM(amount), 0) AS total 
//      FROM payment`
//   );

//   // ✔ All PT bookings
//   const [[ptSummary]] = await pool.query(
//     `SELECT COUNT(*) AS total 
//      FROM unified_bookings
//      WHERE branchId = ?
//      AND bookingType = 'PT'`,
//     [branchId]
//   );

//   // ✔ All Class bookings
//   const [[classSummary]] = await pool.query(
//     `SELECT COUNT(*) AS total 
//      FROM unified_bookings
//      WHERE branchId = ?
//      AND bookingType = 'CLASS'`,
//     [branchId]
//   );

//   // ------------------ FULL LISTS (ALL TIME) ------------------

//   // All Check-ins list
//   const [checkinsList] = await pool.query(
//     `SELECT * 
//      FROM memberattendance
//      WHERE branchId = ?`,
//     [branchId]
//   );

//   // All Members list
//   const [newMembersList] = await pool.query(
//     `SELECT *
//      FROM member
//      WHERE branchId = ?`,
//     [branchId]
//   );

//   // All Payments list
//   const [paymentsList] = await pool.query(
//     `SELECT * 
//      FROM payment`
//   );

//   // All PT Bookings list
//   const [ptList] = await pool.query(
//     `SELECT *
//      FROM unified_bookings
//      WHERE branchId = ?
//      AND bookingType = 'PT'`,
//     [branchId]
//   );

//   // All Class Bookings list
//   const [classList] = await pool.query(
//     `SELECT *
//      FROM unified_bookings
//      WHERE branchId = ?
//      AND bookingType = 'CLASS'`,
//     [branchId]
//   );

//   // ------------------ FINAL RETURN ------------------

//   return {
//     success: true,
//     summary: {
//       totalCheckins: checkinsSummary.total,
//       totalMembers: newMembersSummary.total,
//       totalPayments: paymentsSummary.total,
//       totalPTBookings: ptSummary.total,
//       totalClassBookings: classSummary.total
//     },
//     checkins: checkinsList,
//     members: newMembersList,
//     payments: paymentsList,
//     ptSessions: ptList,
//     classSessions: classList
//   };
// };

export const getReceptionReportService = async (adminId) => {
  // 1️⃣ Fetch all branches of this admin
  const [branches] = await pool.query(
    `SELECT id FROM branch WHERE adminId = ?`,
    [adminId]
  );

  if (branches.length === 0) {
    return { error: "No branches found for this admin" };
  }

  const branchIds = branches.map(b => b.id);

  // ---------------- WEEKLY ATTENDANCE (ALL BRANCHES) ----------------
  const [weekly] = await pool.query(
    `
    SELECT 
        DAYNAME(checkIn) AS day,
        COUNT(*) AS count,
        DAYOFWEEK(checkIn) AS sortOrder
    FROM memberattendance
    WHERE DATE(checkIn) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      AND branchId IN (?)
    GROUP BY day, sortOrder
    ORDER BY sortOrder
    `,
    [branchIds]
  );

  // ---------------- TODAY SUMMARY (ALL BRANCHES) ----------------

  const [[present]] = await pool.query(
    `SELECT COUNT(*) AS count 
     FROM memberattendance
     WHERE DATE(checkIn)=CURDATE() 
       AND branchId IN (?)`,
    [branchIds]
  );

  const [[active]] = await pool.query(
    `SELECT COUNT(*) AS count 
     FROM memberattendance
     WHERE DATE(checkIn)=CURDATE() 
       AND checkOut IS NULL
       AND branchId IN (?)`,
    [branchIds]
  );

  const [[completed]] = await pool.query(
    `SELECT COUNT(*) AS count 
     FROM memberattendance
     WHERE DATE(checkIn)=CURDATE() 
       AND checkOut IS NOT NULL
       AND branchId IN (?)`,
    [branchIds]
  );

  // TODAY CHECK-INS COUNT (ALL BRANCHES)
  const [[todayCheckinsCount]] = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM memberattendance
    WHERE DATE(checkIn) = CURDATE()
      AND branchId IN (?)
    `,
    [branchIds]
  );

  // ---------------- REVENUE ----------------
  const [[revenue]] = await pool.query(
    `SELECT SUM(amount) AS total FROM payment`
  );

  // ---------------- RECEPTIONIST LIST (ALL BRANCHES) ----------------
  const [receptionists] = await pool.query(
    `
    SELECT id, fullName, branchId
    FROM user
    WHERE branchId IN (?)
      AND roleId = 7
    `,
    [branchIds]
  );

  let receptionistStats = [];

  for (const r of receptionists) {
    // Metrics specific to each receptionist branch
    const branchId = r.branchId;

    const [[totalCheckins]] = await pool.query(
      `SELECT COUNT(*) AS count 
       FROM memberattendance 
       WHERE branchId = ?`,
      [branchId]
    );

    const [[activeMembers]] = await pool.query(
      `SELECT COUNT(*) AS count 
       FROM memberattendance 
       WHERE branchId = ? AND checkOut IS NULL`,
      [branchId]
    );

    const [[completedMembers]] = await pool.query(
      `SELECT COUNT(*) AS count 
       FROM memberattendance 
       WHERE branchId = ? AND checkOut IS NOT NULL`,
      [branchId]
    );

    receptionistStats.push({
      receptionistId: r.id,
      name: r.fullName,
      branchId,
      totalCheckins: totalCheckins.count,
      activeMembers: activeMembers.count,
      completedMembers: completedMembers.count,
      totalRevenue: revenue?.total || 0
    });
  }

  return {
    branches: branchIds,
    weeklyTrend: weekly,
    todayCheckinsCount: todayCheckinsCount.count,
    summary: {
      present: present.count,
      active: active.count,
      completed: completed.count
    },
    revenue: {
      total: revenue?.total || 0
    },
    receptionists: receptionistStats
  };
};





 export const generateManagerReportService = async (adminId) => {
  try {
    const [branches] = await pool.query(
      `SELECT id FROM branch WHERE adminId = ?`,
      [adminId]
    );

    if (branches.length === 0) {
      return {
        memberOverview: {},
        revenueSummary: {},
        sessionsSummary: {},
        classSummary: {},
        inventorySummary: {},
        alertTaskSummary: {}
      };
    }

    const branchIds = branches.map(b => b.id);
    const ph = branchIds.map(() => "?").join(",");

    const [
      memberOverviewData,
      revenueSummaryData,
      sessionsSummaryData,
      classSummaryData,
      inventorySummaryData,
      alertTaskSummaryData
    ] = await Promise.all([

      // MEMBER OVERVIEW
      pool.query(
        `SELECT
            COUNT(*) AS totalMembers,
            SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS activeMembers,
            SUM(CASE WHEN DATE(joinDate) = CURDATE() THEN 1 ELSE 0 END) AS newMembersToday,
            SUM(CASE WHEN membershipTo BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
                     THEN 1 ELSE 0 END) AS expiringSoon,
            (
              SELECT COUNT(*) 
              FROM memberattendance 
              WHERE DATE(checkIn) = CURDATE()
                AND branchId IN (${ph})
            ) AS todayCheckins
         FROM member
         WHERE branchId IN (${ph})`,
        [...branchIds, ...branchIds]
      ),

      // REVENUE SUMMARY
      pool.query(
        `SELECT 
            IFNULL(SUM(amount), 0) AS monthlyRevenue,
            IFNULL(SUM(CASE WHEN DATE(paymentDate) = CURDATE() THEN amount ELSE 0 END), 0) AS todayRevenue,
            IFNULL(SUM(gstAmount), 0) AS gstTotal
         FROM payment
         WHERE memberId IN (
            SELECT id FROM member WHERE branchId IN (${ph})
         )`,
        branchIds
      ),

      // SESSIONS SUMMARY
      pool.query(
        `SELECT
            COUNT(*) AS totalSessions,
            IFNULL(SUM(CASE WHEN bookingStatus = 'Completed' THEN 1 ELSE 0 END), 0) AS completedSessions,
            IFNULL(SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END), 0) AS cancelledSessions,
            (
              SELECT u.fullName
              FROM unified_bookings ub
              LEFT JOIN user u ON ub.trainerId = u.id
              WHERE ub.branchId IN (${ph})
                AND ub.bookingStatus = 'Completed'
              GROUP BY ub.trainerId
              ORDER BY COUNT(*) DESC
              LIMIT 1
            ) AS topTrainer
         FROM unified_bookings
         WHERE branchId IN (${ph})`,
        [...branchIds, ...branchIds]
      ),

      // CLASS SUMMARY
      pool.query(
        `SELECT
            (
              SELECT COUNT(*) 
              FROM classschedule 
              WHERE DATE(date) = CURDATE()
                AND branchId IN (${ph})
            ) AS todayClasses,

            (
              SELECT COUNT(*) 
              FROM group_class_bookings 
              WHERE DATE(date) = CURDATE()
                AND branchId IN (${ph})
            ) AS todayClassAttendance,

            (
              SELECT className 
              FROM classschedule 
              WHERE branchId IN (${ph})
              GROUP BY className
              ORDER BY COUNT(*) DESC
              LIMIT 1
            ) AS popularClass`,
        [...branchIds, ...branchIds, ...branchIds]
      ),

      // INVENTORY SUMMARY
      pool.query(
        `SELECT
            COUNT(*) AS totalProducts,
            IFNULL(SUM(CASE WHEN currentStock < 5 THEN 1 ELSE 0 END), 0) AS lowStockItems
         FROM product
         WHERE branchId IN (${ph})`,
        branchIds
      ),

      // ALERTS + TASKS
      pool.query(
        `SELECT
            (
              SELECT COUNT(*) 
              FROM tasks 
              WHERE status != 'Completed'
                AND branchId IN (${ph})
            ) AS pendingTasks,

            (
              SELECT COUNT(*) 
              FROM alert 
              WHERE branchId IN (${ph})
            ) AS totalAlerts`,
        [...branchIds, ...branchIds]
      )

    ]);

    return {
      memberOverview: memberOverviewData[0][0],
      revenueSummary: revenueSummaryData[0][0],
      sessionsSummary: sessionsSummaryData[0][0],
      classSummary: classSummaryData[0][0],
      inventorySummary: inventorySummaryData[0][0],
      alertTaskSummary: alertTaskSummaryData[0][0]
    };

  } catch (error) {
    throw new Error(`Manager Report Error: ${error.message}`);
  }
};