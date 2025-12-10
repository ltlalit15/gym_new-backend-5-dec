import { pool } from "../../config/db.js";

/**************************************
 * CREATE BRANCH
 **************************************/
export const createBranchService = async ({ name, address, phone, status, adminId }) => {
  if (!name) throw { status: 400, message: "Branch name is required" };
  if (!adminId) throw { status: 400, message: "Admin ID is required" };

  // Check unique branch name
  const [exists] = await pool.query(
    "SELECT id FROM branch WHERE name = ?",
    [name]
  );
  if (exists.length > 0) throw { status: 400, message: "Branch name already exists" };

  // Check admin exists
  const [adminExists] = await pool.query(
    "SELECT id FROM user WHERE id = ? AND roleId = 2", // assuming 2 = Admin
    [adminId]
  );
  if (adminExists.length === 0) throw { status: 404, message: "Admin not found" };

  // Insert branch
  const [result] = await pool.query(
    `INSERT INTO branch (name, address, phone, status, adminId)
     VALUES (?, ?, ?, ?, ?)`,
    [name, address || null, phone || null, status === "INACTIVE" ? "INACTIVE" : "ACTIVE", adminId]
  );

  // Return created branch
  return { id: result.insertId, name, address, phone, status, adminId };
};

/**************************************
 * LIST ALL BRANCHES
 **************************************/
export const listBranchesService = async () => {
  const [rows] = await pool.query(
    `SELECT b.*, u.fullName AS adminName 
     FROM branch b 
     LEFT JOIN user u ON b.adminId = u.id 
     ORDER BY b.id DESC`
  );
  return rows;
};

/**************************************
 * GET BRANCH BY ID
 **************************************/
export const getBranchByIdService = async (id) => {
  const branchId = Number(id);
  if (!branchId) throw { status: 400, message: "Invalid branch id" };

  const [rows] = await pool.query(
    "SELECT * FROM branch WHERE id = ?",
    [branchId]
  );
  if (rows.length === 0) throw { status: 404, message: "Branch not found" };

  return rows[0];
};

/**************************************
 * GET BRANCH BY ADMIN ID
 **************************************/
export const getBranchByAdminIdService = async (adminId) => {
  const [rows] = await pool.query(
    "SELECT * FROM branch WHERE adminId = ?",
    [Number(adminId)]
  );
  return rows;
};

/**************************************
 * UPDATE BRANCH
 **************************************/
export const updateBranchService = async (id, data) => {
  const branchId = Number(id);
  if (!branchId) throw { status: 400, message: "Invalid branch id" };

  // Check exists
  const [existingRows] = await pool.query(
    "SELECT * FROM branch WHERE id = ?",
    [branchId]
  );
  if (existingRows.length === 0) throw { status: 404, message: "Branch not found" };
  const existing = existingRows[0];

  // Check duplicate name
  if (data.name) {
    const [dup] = await pool.query(
      "SELECT id FROM branch WHERE name = ? AND id != ?",
      [data.name, branchId]
    );
    if (dup.length > 0) throw { status: 400, message: "Branch name already exists" };
  }

  // Check adminId valid
  if (data.adminId) {
    const [adminExists] = await pool.query(
      "SELECT id FROM user WHERE id = ? AND roleId = 2",
      [data.adminId]
    );
    if (adminExists.length === 0) throw { status: 404, message: "Admin not found" };
  }

  // Update
  const [result] = await pool.query(
    `UPDATE branch SET 
       name = ?, 
       address = ?, 
       phone = ?, 
       status = ?, 
       adminId = ? 
     WHERE id = ?`,
    [
      data.name || existing.name,
      data.address || existing.address,
      data.phone || existing.phone,
      data.status === "ACTIVE" || data.status === "INACTIVE" ? data.status : existing.status,
      data.adminId || existing.adminId,
      branchId
    ]
  );

  return getBranchByIdService(branchId);
};

/**************************************
 * DELETE BRANCH
 **************************************/
// export const deleteBranchService = async (id) => {
//   const branchId = Number(id);
//   if (!branchId) throw { status: 400, message: "Invalid branch id" };


//   // Check exists
//     await pool.query("DELETE FROM alert WHERE branchId = ?", [id]);
//   const [existing] = await pool.query("SELECT id FROM branch WHERE id = ?", [branchId]);
//   if (existing.length === 0) throw { status: 404, message: "Branch not found" };

//   await pool.query("DELETE FROM branch WHERE id = ?", [branchId]);
//   return { message: "Branch deleted successfully" };
// };


export const deleteBranchService = async (id) => {
  const branchId = Number(id);
  if (!branchId) throw { status: 400, message: "Invalid branch id" };

  await pool.query(
  "DELETE FROM pt_bookings WHERE sessionId IN (SELECT id FROM session WHERE branchId = ?)",
  [branchId]
); // <-- added

  // ⭐ NEW CHANGE: Delete bookings BEFORE deleting classschedule
  await pool.query("DELETE FROM booking WHERE scheduleId IN (SELECT id FROM classschedule WHERE branchId = ?)", [branchId]); // <-- added


  // ⭐ CHANGE 1: Delete related class schedules
  await pool.query("DELETE FROM classschedule WHERE branchId = ?", [branchId]); // <-- added

  // ⭐ CHANGE 2: Delete related staff
  await pool.query("DELETE FROM staff WHERE branchId = ?", [branchId]); // <-- added

  // ⭐ CHANGE 3: Delete related members
  await pool.query("DELETE FROM member WHERE branchId = ?", [branchId]); // <-- added

  // ⭐ CHANGE 4: Delete related sessions
  await pool.query("DELETE FROM session WHERE branchId = ?", [branchId]); // <-- added

  // ⭐ CHANGE 5: Delete related alerts
  await pool.query("DELETE FROM alert WHERE branchId = ?", [branchId]); // <-- moved + updated

  // Check if branch exists 
  const [existing] = await pool.query("SELECT id FROM branch WHERE id = ?", [branchId]);
  if (existing.length === 0) throw { status: 404, message: "Branch not found" };

  // ⭐ CHANGE 6: Now delete branch safely
  await pool.query("DELETE FROM branch WHERE id = ?", [branchId]); // <-- same but now safe

  return { message: "Branch deleted successfully" };
};
