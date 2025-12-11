import { pool } from "../../config/db.js";

export const createTaskService = async (data) => {
  const {
    assignedTo,
    branchId,
    taskTitle,
    dueDate,
    priority,
    description,
    createdById,
  } = data;

  const [result] = await pool.query(
    `INSERT INTO tasks (assignedTo, branchId, taskTitle, dueDate, priority, description, status, createdById)
     VALUES (?, ?, ?, ?, ?, ?,'Pending', ?)`,
    [
      assignedTo,
      branchId,
      taskTitle,
      dueDate,
      priority,
      description,
      createdById,
    ]
  );

  const [rows] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [
    result.insertId,
  ]);

  return rows[0];
};

export const getAllTasksService = async () => {
  const [rows] = await pool.query(`SELECT * FROM tasks ORDER BY id DESC`);
  return rows;
};

 export const getTaskByBranchIdService=async(branchId)=>{
  const [rows]=await pool.query(`SELECT * FROM tasks WHERE branchId=? ORDER BY id DESC`,[branchId]);
  return rows;
 }

 export const getTaskAsignedService=async(assignedTo)=>{
  const [rows]=await pool.query(`SELECT * FROM tasks WHERE assignedTo=? ORDER BY id DESC`,[assignedTo]);
  return rows;
 }
export const getTaskByIdService = async (id) => {
  const [rows] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [id]);
  return rows[0];
};

export const updateTaskService = async (id, data) => {
  const {
    assignedTo,
    branchId,
    taskTitle,
    dueDate,
    priority,
    description,
    status,
  } = data;

  await pool.query(
    `UPDATE tasks SET assignedTo=?, branchId=?, taskTitle=?, dueDate=?, priority=?,description=?, status=? WHERE id=?`,
    [
      assignedTo,
      branchId,
      taskTitle,
      dueDate,
      priority,
      description,
      status,
      id,
    ]
  );

  const [rows] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [id]);
  return rows[0];
};

export const updateTaskStatusService = async (id, status) => {
  await pool.query(`UPDATE tasks SET status = ? WHERE id = ?`, [status, id]);

  const [rows] = await pool.query(`SELECT * FROM tasks WHERE id = ?`, [id]);
  return rows[0];
};

export const deleteTaskService = async (id) => {
  await pool.query(`DELETE FROM tasks WHERE id = ?`, [id]);
  return { message: "Task deleted successfully" };
};
