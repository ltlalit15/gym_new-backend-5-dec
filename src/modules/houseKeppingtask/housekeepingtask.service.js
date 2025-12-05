



import { pool } from "../../config/db.js";

/**************************************
 * CREATE TASK
 **************************************/
export const createTaskService = async (data) => {
  const {
    category,
    taskTitle,
    description,
    createdById
  } = data;

  const [result] = await pool.query(
    `INSERT INTO HousekeepingTasks
      (category, taskTitle, description, status, dutyDate, createdById)
     VALUES (?, ?, ?, 'Pending', CURDATE(), ?)`,
    [
      category,
      taskTitle,
      description || null,
      Number(createdById)
    ]
  );

  const [rows] = await pool.query(
    `SELECT * FROM HousekeepingTasks WHERE id = ?`,
    [result.insertId]
  );

  return rows[0];
};

/**************************************
 * GET ALL TASKS
 **************************************/
export const getAllTasksService = async () => {
  const [rows] = await pool.query(
    `SELECT * FROM HousekeepingTasks
     ORDER BY id DESC`
  );

  return rows;
};

/**************************************
 * GET TASK BY ID
 **************************************/
export const getTaskByIdService = async (id) => {
  const [rows] = await pool.query(
    `SELECT * FROM HousekeepingTasks
     WHERE id = ?`,

    [Number(id)]
  );

  if (rows.length === 0) {
    throw { status: 404, message: "Task not found" };
  }

  return rows[0];
};

/**************************************
 * UPDATE TASK
 **************************************/
export const updateTaskService = async (id, data) => {
  const taskId = Number(id);

  const [existingRows] = await pool.query(
    `SELECT * FROM HousekeepingTasks WHERE id = ?`,
    [taskId]
  );

  if (existingRows.length === 0) {
    throw { status: 404, message: "Task not found" };
  }

  const existing = existingRows[0];

  const category = data.category ?? existing.category;
  const taskTitle = data.taskTitle ?? existing.taskTitle;
  const description = data.description ?? existing.description;
  const status = data.status ?? existing.status;

  await pool.query(
    `UPDATE HousekeepingTasks SET
      category = ?,
      taskTitle = ?,
      description = ?,
      status = ?
     WHERE id = ?`,
    [
      category,
      taskTitle,
      description,
      status,
      taskId
    ]
  );

  const [rows] = await pool.query(
    `SELECT * FROM HousekeepingTasks WHERE id = ?`,
    [taskId]
  );

  return rows[0];
};

/**************************************
 * DELETE TASK
 **************************************/
export const deleteTaskService = async (id) => {
  await pool.query(
    `DELETE FROM HousekeepingTasks
     WHERE id = ?`,
    [Number(id)]
  );

  return { message: "Task deleted successfully" };
};

/**************************************
 * FILTER TASKS BY CATEGORY
 **************************************/
export const getTasksByCategoryService = async (category) => {
  const [rows] = await pool.query(
    `SELECT *
     FROM HousekeepingTasks
     WHERE category = ?
     ORDER BY id DESC`,
    [category]
  );

  return rows;
};
