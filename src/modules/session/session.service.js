import { pool } from "../../config/db.js";

// ➤ Create Session
export const createSessionService = async (data) => {
  const { sessionName, trainerId, branchId, date, time, duration, description, status } = data;

  const [result] = await pool.query(
    `INSERT INTO session 
     (sessionName, trainerId, branchId, date, time, duration, description, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [sessionName, Number(trainerId), Number(branchId), new Date(date), time, Number(duration), description, status || "Upcoming"]
  );

  const sessionId = result.insertId;
  const [session] = await pool.query(`SELECT * FROM session WHERE id = ?`, [sessionId]);
  return session[0];
};

// ➤ List Sessions (with search + upcoming first)
export const listSessionsService = async (branchId, search) => {
  const [rows] = await pool.query(
    `SELECT s.*, t.id AS trainerId, t.fullName AS trainerName, b.id AS branchId, b.name AS branchName
     FROM session s
     LEFT JOIN user t ON s.trainerId = t.id
     LEFT JOIN branch b ON s.branchId = b.id
     WHERE s.branchId = ? AND s.sessionName LIKE ?
     ORDER BY 
       FIELD(s.status, 'Upcoming', 'Ongoing', 'Completed') ASC,
       s.date ASC,
       s.time ASC`,
    [branchId, `%${search || ""}%`]
  );
  return rows;
};

// ➤ Update complete session
export const updateSessionService = async (sessionId, data) => {
  const { sessionName, trainerId, branchId, date, time, duration, description, status } = data;

  await pool.query(
    `UPDATE session 
     SET sessionName = ?, trainerId = ?, branchId = ?, date = ?, time = ?, duration = ?, description = ?, status = ?
     WHERE id = ?`,
    [sessionName, Number(trainerId), Number(branchId), new Date(date), time, Number(duration), description, status, sessionId]
  );

  const [updated] = await pool.query(`SELECT * FROM session WHERE id = ?`, [sessionId]);
  return updated[0];
};

// ➤ Update only status
export const updateSessionStatusService = async (sessionId, status) => {
  await pool.query(`UPDATE session SET status = ? WHERE id = ?`, [status, sessionId]);
  const [updated] = await pool.query(`SELECT * FROM session WHERE id = ?`, [sessionId]);
  return updated[0];
};

// ➤ Delete session
export const deleteSessionService = async (sessionId) => {
  await pool.query(`DELETE FROM session WHERE id = ?`, [sessionId]);
  return true;
};
