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