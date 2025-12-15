// staff.service.js
import { pool } from "../../config/db.js";

/**************************************
 * CREATE STAFF
 **************************************/
export const createStaffService = async (data) => {
  const {
    fullName,
    email,
    phone,
    password,
    roleId,
    adminId,
    gender,
    dateOfBirth,
    joinDate,
    exitDate,
    profilePhoto,
  } = data;

  // check duplicate email
  const [exists] = await pool.query(
    "SELECT id FROM user WHERE email = ?",
    [email]
  );
  if (exists.length > 0)
    throw { status: 400, message: "Email already exists" };

  // insert user (staff)
  const [result] = await pool.query(
    `INSERT INTO user 
     (adminId, fullName, email, phone, password, roleId) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      adminId,
      fullName,
      email,
      phone || null,
      password,
      roleId,
    ]
  );

  const userId = result.insertId;

  // insert staff details
  await pool.query(
    `INSERT INTO staff 
     (userId, adminId, gender, dateOfBirth, joinDate, exitDate, profilePhoto) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      adminId,
      gender || null,
      dateOfBirth ? new Date(dateOfBirth) : null,
      joinDate ? new Date(joinDate) : null,
      exitDate ? new Date(exitDate) : null,
      profilePhoto || null,
    ]
  );

  return {
    id: userId,
    fullName,
    email,
    roleId,
    adminId,
    gender,
    dateOfBirth,
    joinDate,
    exitDate,
    profilePhoto,

  };
};


/**************************************
 * LIST STAFF
 **************************************/
export const listStaffService = async (adminId) => {
  const sql = `
    SELECT 
      s.id AS staffId,
      u.id AS userId,
      u.fullName,
      u.email,
      u.phone,
      u.roleId,
      s.adminId,
      s.gender,
      s.dateOfBirth,
      s.joinDate,
      s.exitDate,
      s.profilePhoto,
      u.status
    FROM staff s
    JOIN user u ON u.id = s.userId
    WHERE s.adminId = ?
    ORDER BY s.id DESC
  `;

  const [rows] = await pool.query(sql, [adminId]);
  return rows;
};


/**************************************
 * STAFF DETAIL
 **************************************/
export const staffDetailService = async (staffId) => {
  const sql = `
    SELECT 
      s.id AS staffId,
      u.id AS userId,
      u.fullName,
      u.email,
      u.phone,
      u.roleId,
      s.adminId,
      s.gender,
      s.dateOfBirth,
      s.joinDate,
      s.exitDate,
      s.profilePhoto,
      u.status
    FROM staff s
    JOIN user u ON u.id = s.userId
    WHERE s.id = ?
  `;

  const [rows] = await pool.query(sql, [staffId]);

  if (rows.length === 0) {
    throw { status: 404, message: "Staff not found" };
  }

  return rows[0];
};


/**************************************
 * UPDATE STAFF
 **************************************/
export const updateStaffService = async (staffId, data) => {
  // get userId
  const [staffRows] = await pool.query(
    "SELECT userId FROM staff WHERE id = ?",
    [staffId]
  );

  if (staffRows.length === 0) {
    throw { status: 404, message: "Staff not found" };
  }

  const userId = staffRows[0].userId;

  // update USER
  const userFields = [];
  const userValues = [];

  const userColumns = ["fullName", "email", "phone", "password", "roleId"];

  for (const col of userColumns) {
    if (data[col] !== undefined) {
      userFields.push(`${col} = ?`);
      userValues.push(data[col]);
    }
  }

  if (userFields.length > 0) {
    userValues.push(userId);
    await pool.query(
      `UPDATE user SET ${userFields.join(", ")} WHERE id = ?`,
      userValues
    );
  }

  // update STAFF
  const staffFields = [];
  const staffValues = [];

  const staffColumns = [
    "adminId",
    "gender",
    "dateOfBirth",
    "joinDate",
    "exitDate",
    "profilePhoto",
  ];

  for (const col of staffColumns) {
    if (data[col] !== undefined) {
      staffFields.push(`${col} = ?`);
      staffValues.push(data[col]);
    }
  }

  if (staffFields.length > 0) {
    staffValues.push(staffId);
    await pool.query(
      `UPDATE staff SET ${staffFields.join(", ")} WHERE id = ?`,
      staffValues
    );
  }

  return staffDetailService(staffId);
};


export const getAllStaffService = async () => {
  const sql = `
    SELECT 
      s.id AS staffId,
      u.id AS userId,
      u.fullName,
      u.email,
      u.phone,
      u.roleId,
      s.adminId,
      s.gender,
      s.dateOfBirth,
      s.joinDate,
      s.exitDate,
      s.profilePhoto,
      u.status
    FROM staff s
    JOIN user u ON u.id = s.userId
    ORDER BY s.id DESC
  `;

  const [rows] = await pool.query(sql);
  return rows;
};


export const getTrainerByIdService = async (trainerId) => {
  const sql = `
    SELECT 
      u.id AS trainerId,
      u.fullName,
      u.email,
      u.phone,
      u.branchId,
      u.roleId
    FROM user u
    WHERE u.id = ? AND u.roleId = 4
    LIMIT 1
  `;

  const [rows] = await pool.query(sql, [trainerId]);

  if (rows.length === 0) {
    throw { status: 404, message: "Trainer not found" };
  }

  return rows[0];
};

/**************************************
 * DELETE STAFF
 **************************************/
// export const deleteStaffService = async (id) => {
//   // soft delete user and staff
//   await pool.query(
//     `UPDATE user SET status='Inactive' WHERE id=?`,
//     [id]
//   );
//   await pool.query(
//     `UPDATE staff SET status='Inactive', exitDate=? WHERE userId=?`,
//     [new Date(), id]
//   );

//   return { message: "Staff deactivated successfully" };
// };

// export const deleteStaffService = async (staffId) => {
//   // 1️⃣ Find staff entry using staff.id
//   const [rows] = await pool.query(
//     "SELECT userId FROM staff WHERE id = ?",
//     [staffId]
//   );

//   if (rows.length === 0) {
//     throw { status: 404, message: "Staff not found" };
//   }

//   const userId = rows[0].userId;

//   // 2️⃣ Delete from staff table using staff.id
//   await pool.query("DELETE FROM staff WHERE id = ?", [staffId]);

//   // 3️⃣ Delete linked user
//   await pool.query("DELETE FROM user WHERE id = ?", [userId]);

//   return { message: "Staff deleted permanently" };
// };
export const deleteStaffService = async (staffId) => {
  const sid = Number(staffId);
  if (!sid) {
    throw { status: 400, message: "Invalid staff id" };
  }

  /* ----------------------------------------------------
     1️⃣ FETCH STAFF ROW (DEBUG INCLUDED)
  ---------------------------------------------------- */
  const [staffRows] = await pool.query(
    "SELECT id, userId FROM staff WHERE id = ?",
    [sid]
  );

  console.log("DELETE STAFF → staffId:", sid);
  console.log("STAFF ROW FOUND:", staffRows);

  if (staffRows.length === 0) {
    throw { status: 404, message: "Staff not found" };
  }

  const userId = staffRows[0].userId;

  /* ----------------------------------------------------
     2️⃣ DELETE CLASSES ASSIGNED TO THIS TRAINER
     (trainerId → user.id, NOT NULL SAFE)
  ---------------------------------------------------- */
  const [classResult] = await pool.query(
    "DELETE FROM classschedule WHERE trainerId = ?",
    [userId]
  );

  console.log("CLASSES DELETED:", classResult.affectedRows);

  /* ----------------------------------------------------
     3️⃣ DELETE STAFF RELATED DATA (FK TABLES)
  ---------------------------------------------------- */
  await pool.query("DELETE FROM salary WHERE staffId = ?", [sid]);

  const relatedTables = [
    "alert",
    "housekeepingattendance",
    "housekeepingschedule",
    "staffattendance",
  ];

  for (const table of relatedTables) {
    await pool.query(
      `DELETE FROM ${table} WHERE staffId = ?`,
      [sid]
    );
  }

  /* ----------------------------------------------------
     4️⃣ CLEAN shifts.staffIds (CSV TEXT FIELD)
  ---------------------------------------------------- */
  await pool.query(
    `UPDATE shifts
     SET staffIds = TRIM(BOTH ',' FROM
       REPLACE(CONCAT(',', staffIds, ','), CONCAT(',', ?, ','), ',')
     )
     WHERE FIND_IN_SET(?, staffIds)`,
    [sid, sid]
  );

  /* ----------------------------------------------------
     5️⃣ DELETE STAFF ROW
  ---------------------------------------------------- */
  await pool.query(
    "DELETE FROM staff WHERE id = ?",
    [sid]
  );

  /* ----------------------------------------------------
     6️⃣ DELETE USER ROW
  ---------------------------------------------------- */
  await pool.query(
    "DELETE FROM user WHERE id = ?",
    [userId]
  );

  return {
    message: "Staff & trainer deleted successfully",
    staffId: sid,
    userId,
  };
};




export const getAdminStaffService = async (adminId) => {
  const sql = `
    SELECT 
      s.id AS staffId,
      u.id AS userId,
      u.fullName,
      u.email,
      u.phone,
      u.roleId,
      u.branchId,
      s.gender,
      s.dateOfBirth,
      s.joinDate,
      s.exitDate,
      s.profilePhoto,
      u.status AS userStatus   -- important!
    FROM staff s
    JOIN user u ON u.id = s.userId
    WHERE s.adminId = ?
    ORDER BY s.id DESC
  `;

  const [rows] = await pool.query(sql, [adminId]);
  return rows;
};
