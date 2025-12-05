import { pool } from "../../config/db.js";

// ===== CREATE =====
export const createSalaryService = async (data) => {
  const {
    salaryId,
    staffId,
    role,
    periodStart,
    periodEnd,
    hoursWorked,
    hourlyRate,
    fixedSalary,
    commissionTotal,
    bonuses,
    deductions,
    status
  } = data;

  const hourlyTotal = (hoursWorked || 0) * (hourlyRate || 0);
  const bonusTotal = bonuses?.reduce((a, b) => a + Number(b.amount), 0) || 0;
  const deductionTotal = deductions?.reduce((a, b) => a + Number(b.amount), 0) || 0;

  const netPay = hourlyTotal + (fixedSalary || 0) + (commissionTotal || 0) + bonusTotal - deductionTotal;

  const [result] = await pool.query(
    `INSERT INTO Salary 
      (salaryId, staffId, role, periodStart, periodEnd, hoursWorked, hourlyRate, hourlyTotal,
       fixedSalary, commissionTotal, bonuses, deductions, netPay, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      salaryId, staffId, role, periodStart, periodEnd, hoursWorked, hourlyRate,
      hourlyTotal, fixedSalary, commissionTotal,
      JSON.stringify(bonuses || []),
      JSON.stringify(deductions || []),
      netPay,
      status
    ]
  );

  return { id: result.insertId, ...data, netPay };
};

// ===== GET ALL =====
// export const getAllSalariesService = async () => {
//   const [rows] = await pool.query(
//     `SELECT s.*, st.fullName 
//      FROM Salary s 
//      LEFT JOIN Staff st ON s.staffId = st.id
//      ORDER BY s.id DESC`
//   );
//   return rows;
// };

export const getAllSalariesService = async () => {
  const sql = `
    SELECT 
      s.*,
      u.fullName AS staffName,
      u.email AS staffEmail,
      u.phone AS staffPhone,
      st.gender,
      st.joinDate
    FROM salary s
    LEFT JOIN user u ON s.staffId = u.id
    LEFT JOIN staff st ON st.userId = u.id
    ORDER BY s.id DESC
  `;

  const [rows] = await pool.query(sql);
  return rows;
};




// ===== GET BY ID =====
export const getSalaryByIdService = async (id) => {
  const sql = `
    SELECT 
      s.*, 
      u.fullName AS staffName,
      u.email AS staffEmail,
      u.phone AS staffPhone,
      st.gender,
      st.joinDate
    FROM salary s
    LEFT JOIN user u ON s.staffId = u.id     -- FIX
    LEFT JOIN staff st ON st.userId = u.id   -- FIX
    WHERE s.id = ?
  `;

  const [rows] = await pool.query(sql, [id]);

  if (!rows.length) throw new Error("Salary not found");

  return rows[0];
};



// ===== DELETE =====
export const deleteSalaryService = async (id) => {
  await pool.query(`DELETE FROM Salary WHERE id = ?`, [id]);
  return { success: true };
};

// ===== UPDATE =====
export const updateSalaryService = async (id, data) => {
  const {
    salaryId,
    staffId,
    role,
    periodStart,
    periodEnd,
    hoursWorked,
    hourlyRate,
    fixedSalary,
    commissionTotal,
    bonuses,
    deductions,
    status
  } = data;

  const hourlyTotal = (hoursWorked || 0) * (hourlyRate || 0);
  const bonusTotal = bonuses?.reduce((a, b) => a + Number(b.amount), 0) || 0;
  const deductionTotal = deductions?.reduce((a, b) => a + Number(b.amount), 0) || 0;

  const netPay =
    hourlyTotal +
    (fixedSalary || 0) +
    (commissionTotal || 0) +
    bonusTotal -
    deductionTotal;

  const sql = `
    UPDATE Salary SET
      salaryId = ?,
      staffId = ?,          -- USER ID
      role = ?,
      periodStart = ?,
      periodEnd = ?,
      hoursWorked = ?,
      hourlyRate = ?,
      hourlyTotal = ?,
      fixedSalary = ?,
      commissionTotal = ?,
      bonuses = ?,
      deductions = ?,
      netPay = ?,
      status = ?
    WHERE id = ?
  `;

  await pool.query(sql, [
    salaryId,
    staffId,
    role,
    new Date(periodStart),
    new Date(periodEnd),
    hoursWorked,
    hourlyRate,
    hourlyTotal,
    fixedSalary,
    commissionTotal,
    JSON.stringify(bonuses || []),
    JSON.stringify(deductions || []),
    netPay,
    status,
    id
  ]);

  return { id, ...data, netPay };
};


// ===== GET BY STAFF ID =====
export const getSalaryByStaffIdService = async (staffId) => {
  const sql = `
    SELECT 
      s.*,
      u.fullName AS staffName,
      u.email AS staffEmail,
      u.phone AS staffPhone,
      st.gender,
      st.joinDate
    FROM salary s
    LEFT JOIN user u ON s.staffId = u.id      -- FIX
    LEFT JOIN staff st ON st.userId = u.id    -- FIX
    WHERE s.staffId = ?
    ORDER BY s.id DESC
  `;

  const [rows] = await pool.query(sql, [staffId]);

  if (!rows.length) throw new Error("No salary records found for this staff");

  return rows;
};


