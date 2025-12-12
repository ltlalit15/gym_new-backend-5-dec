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
    // Get booking statistics for group training only
    const [bookingStats] = await pool.query(
      `SELECT 
        COUNT(*) as totalBookings,
        0 as totalRevenue, -- Assuming no price field in unified_bookings
        0 as avgTicket, -- Assuming no price field in unified_bookings
        SUM(CASE WHEN bookingStatus = 'Confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) as booked
      FROM unified_bookings
      WHERE adminId = ? AND bookingType = 'GROUP'`,
      [adminId]
    );

    // Get bookings by day for group training only
    const [bookingsByDay] = await pool.query(
      `SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count
      FROM unified_bookings
      WHERE adminId = ? AND bookingType = 'GROUP'
      GROUP BY DATE(createdAt)
      ORDER BY date ASC`,
      [adminId]
    );

    // Get booking status distribution for group training only
    const [bookingStatus] = await pool.query(
      `SELECT 
        bookingStatus,
        COUNT(*) as count
      FROM unified_bookings
      WHERE adminId = ? AND bookingType = 'GROUP'
      GROUP BY bookingStatus`,
      [adminId]
    );

    // Get transactions for group training only
    const [transactions] = await pool.query(
      `SELECT 
        date,
        trainerId,
        memberId,
        'Group Training' as type,
        startTime as time,
        bookingStatus as status
      FROM unified_bookings
      WHERE adminId = ? AND bookingType = 'GROUP'
      ORDER BY date DESC`,
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
      trainer: transaction.trainerId || 'N/A',
      username: transaction.memberId || 'N/A',
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
    throw new Error(`Error generating general trainer report: ${error.message}`);
  }
};

export const generatePersonalTrainerReportService = async (adminId) => {
  try {
    const [stats] = await pool.query(
      `SELECT 
        COUNT(*) as totalBookings,
        0 as totalRevenue,
        0 as avgTicket,
        SUM(CASE WHEN bookingStatus = 'Confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN bookingStatus = 'Cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN bookingStatus = 'Booked' THEN 1 ELSE 0 END) as booked
      FROM unified_bookings ub
      JOIN branch b ON ub.branchId = b.id
      WHERE b.adminId = ? AND ub.bookingType = 'PT'`,
      [adminId]
    );

    const [bookingsByDay] = await pool.query(
      `SELECT 
        DATE(ub.date) AS date,
        COUNT(*) AS count,
        0 AS revenue
      FROM unified_bookings ub
      JOIN branch b ON ub.branchId = b.id
      WHERE b.adminId = ? AND ub.bookingType = 'PT'
      GROUP BY DATE(ub.date)
      ORDER BY date ASC`,
      [adminId]
    );

    const [bookingStatus] = await pool.query(
      `SELECT bookingStatus, COUNT(*) as count
       FROM unified_bookings ub
       JOIN branch b ON ub.branchId = b.id
       WHERE b.adminId = ? AND ub.bookingType = 'PT'
       GROUP BY bookingStatus`,
      [adminId]
    );

    const [transactions] = await pool.query(
      `SELECT 
        ub.date,
        u.fullName AS trainer,
        m.fullName AS username,
        'Personal Training' AS type,
        CONCAT(ub.startTime, ' - ', ub.endTime) AS time,
        0 AS revenue,
        ub.bookingStatus AS status
      FROM unified_bookings ub
      LEFT JOIN staff s ON ub.trainerId = s.id
      LEFT JOIN user u ON s.userId = u.id
      LEFT JOIN member m ON ub.memberId = m.id
      JOIN branch b ON ub.branchId = b.id
      WHERE b.adminId = ? AND ub.bookingType = 'PT'
      ORDER BY ub.date DESC`,
      [adminId]
    );

    return {
      stats: stats[0],
      bookingsByDay,
      bookingStatus,
      transactions
    };

  } catch (error) {
    throw new Error("PT Report Error: " + error.message);
  }
};