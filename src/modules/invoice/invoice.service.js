import { pool } from "../../config/db.js";

export const getInvoiceDataService = async (paymentId) => {
  // Get payment with member and plan details
  const [rows] = await pool.query(
    `SELECT 
        p.id AS paymentId,
        p.amount,
        p.invoiceNo,
        p.paymentDate,
        m.id AS memberId,
        m.fullName AS memberName,
        m.email AS memberEmail,
        m.phone AS memberPhone,
        m.membershipFrom,
        m.membershipTo,
        b.id AS branchId,
        b.name AS branchName,
        pl.id AS planId,
        pl.name AS planName,
        pl.price AS planPrice,
        pl.duration AS planDuration
     FROM Payment p
     LEFT JOIN Member m ON m.id = p.memberId
     LEFT JOIN Branch b ON b.id = m.branchId
     LEFT JOIN Plan pl ON pl.id = p.planId
     WHERE p.id = ?`,
    [paymentId]
  );

  if (rows.length === 0) {
    throw { status: 404, message: "Payment / Invoice not found" };
  }

  return rows[0];
};
