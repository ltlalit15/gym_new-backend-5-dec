import { pool } from "../../config/db.js";

export const createShiftService = async (data) => {
  const {
    staffIds,
    branchId,
    shiftDate,
    startTime,
    endTime,
    shiftType,
    description,
    createdById,
  } = data;

  const [result] = await pool.query(
    `INSERT INTO Shifts (staffIds, branchId, shiftDate, startTime, endTime, shiftType, description, status, createdById)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)`,
    [
      staffIds,
      branchId,
      shiftDate,
      startTime,
      endTime,
      shiftType,
      description || null,
      createdById,
    ]
  );

  const [rows] = await pool.query(`SELECT * FROM Shifts WHERE id = ?`, [
    result.insertId,
  ]);
  return rows[0];
};

export const getAllShiftsService = async () => {
  const [rows] = await pool.query(`SELECT * FROM Shifts ORDER BY id DESC`);
  return rows;
};

export const getShiftByIdService = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM Shifts WHERE id = ?`, [id]);
  return rows[0];
};

export const updateShiftService = async (id, data) => {
  const {
    staffIds,
    branchId,
    shiftDate,
    startTime,
    endTime,
    shiftType,
    description,
    status,
  } = data;
  await pool.query(
    `UPDATE Shifts SET staffIds=?, branchId=?, shiftDate=?, startTime=?, endTime=?, shiftType=?, description=?, status=? WHERE id=?`,
    [
      staffIds,
      branchId,
      shiftDate,
      startTime,
      endTime,
      shiftType,
      description,
      status,
      id,
    ]
  );
  const [rows] = await pool.query(`SELECT * FROM Shifts WHERE id = ?`, [id]);
  return rows[0];
};

export const deleteShiftService = async (id) => {
  await pool.query(`DELETE FROM Shifts WHERE id = ?`, [id]);
  return { message: "Shift deleted successfully" };
};
