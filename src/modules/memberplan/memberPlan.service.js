// src/modules/memberplan/memberPlan.service.js
import { pool } from "../../config/db.js";

/**************************************
 * CREATE MEMBER PLAN
 **************************************/
export const saveMemberPlan = async (payload) => {
  // allow both: name OR planName, validityDays OR validity
  const name = payload.name || payload.planName;
  const sessions = Number(payload.sessions ?? 0);
  const validityDays = Number(payload.validityDays ?? payload.validity ?? 0);
  const price = Number(payload.price ?? 0);
  const type = payload.type || null;
  const adminId = payload.adminId;
  const branchId = payload.branchId ?? null;

  if (!adminId) throw { status: 400, message: "adminId is required" };
  if (!name) throw { status: 400, message: "Plan name is required" };

  const [result] = await pool.query(
    `INSERT INTO memberplan 
      (name, sessions, validityDays, price, type, adminId,branchId)
     VALUES (?, ?, ?, ?, ?, ?,?)`,
    [name, sessions, validityDays, price, type, adminId,branchId]
  );

  const [rows] = await pool.query(
    `SELECT * FROM memberplan WHERE id = ?`,
    [result.insertId]
  );

  return rows[0];
};

/**************************************
 * GET ALL – for a particular admin (simple)
 **************************************/
export const getAllMemberPlans = async (adminId) => {
  const [plans] = await pool.query(
    `SELECT * FROM memberplan WHERE adminId = ? ORDER BY id DESC`,
    [Number(adminId)]
  );
  return plans;
};

/**************************************
 * GET ALL – detailed list by adminId (used in controller)
 **************************************/
// export const getMemberPlansByAdminIdService = async (adminId) => {
//   const [rows] = await pool.query(
//     `SELECT 
//         id,
//         name,
//         sessions,
//         validityDays,
//         price,
//         type,
//         adminId,
//         branchId,
//         createdAt,
//         updatedAt
//      FROM memberplan
//      WHERE adminId = ?
//      ORDER BY id DESC`,
//     [Number(adminId)]
//   );

//   return rows;
// };

export const getMemberPlansByAdminIdService = async (adminId) => {
  const [rows] = await pool.query(
    `
    SELECT 
      id,
      name,
      sessions,
      validityDays,
      price,
      type,
      adminId,
      branchId,
      createdAt,
      updatedAt,

      -- 🔥 days passed
      DATEDIFF(CURRENT_DATE, DATE(createdAt)) AS daysUsed,

      -- 🔥 days left
      GREATEST(
        validityDays - DATEDIFF(CURRENT_DATE, DATE(createdAt)),
        0
      ) AS daysLeft,

      -- 🔥 status
      CASE 
        WHEN validityDays - DATEDIFF(CURRENT_DATE, DATE(createdAt)) <= 0
        THEN 'INACTIVE'
        ELSE 'ACTIVE'
      END AS status

    FROM memberplan
    WHERE adminId = ?
    ORDER BY id DESC
    `,
    [Number(adminId)]
  );

  return rows;
};
/**************************************
 * GET BY ID
 **************************************/
export const getMemberPlanById = async (id) => {
  const [plans] = await pool.query(
    `SELECT * FROM memberplan WHERE id = ?`,
    [Number(id)]
  );
  if (!plans[0]) throw { status: 404, message: "Member plan not found" };
  return plans[0];
};

// UPDATE
// export const updateMemberPlan = async (id, payload) => {
//   await pool.query(
//     `UPDATE memberplan 
//      SET name = ?, sessions = ?, validityDays = ?, price = ?
//      WHERE id = ?`,
//     [payload.planName, Number(payload.sessions), Number(payload.validity), Number(payload.price), id]
//   );

//   const [updated] = await pool.query(`SELECT * FROM memberplan WHERE id = ?`, [id]);
//   return updated[0];
// };

// // DELETE
export const deleteMemberPlan = async (id) => {
  const [result] = await pool.query(
    `DELETE FROM memberplan WHERE id = ?`,
    [Number(id)]
  );

  if (result.affectedRows === 0) {
    throw { status: 404, message: "Plan not found" };
  }

  return true;
};



// export const updateMemberPlan = async (planId, payload, adminId) => {
//   const { planName, sessions, validity, price,branchId  } = payload;

//   const [result] = await pool.query(
//     `UPDATE memberplan 
//      SET name = ?, sessions = ?, validityDays = ?, price = ?, branchId= ?,updatedAt = NOW(3)
//      WHERE id = ? AND adminId = ?`,
//     [planName, sessions, validity, price, planId, adminId,branchId]
//   );

//   if (result.affectedRows === 0) return null;

//   const [rows] = await pool.query(
//     `SELECT * FROM memberplan WHERE id = ? AND adminId = ?`,
//     [planId, adminId]
//   );

//   return rows[0];
// };

export const updateMemberPlan = async (planId, payload, adminId) => {
  const { planName, sessions, validity, price, branchId } = payload;

  const [result] = await pool.query(
    `UPDATE memberplan 
     SET name = ?, sessions = ?, validityDays = ?, price = ?, branchId = ?, updatedAt = NOW(3)
     WHERE id = ? AND adminId = ?`,
    [planName, sessions, validity, price, branchId ?? null, planId, adminId]
  );

  if (result.affectedRows === 0) return null;

  const [rows] = await pool.query(
    `SELECT * FROM memberplan WHERE id = ? AND adminId = ?`,
    [planId, adminId]
  );

  return rows[0];
};


export const getAllMemberPlansService = async () => {
  const [rows] = await pool.query(
    `SELECT 
        id,
        name,
        sessions,
        validityDays,
        price,
        type,
        adminId,
        branchId,
        createdAt,
        updatedAt
     FROM memberplan
     ORDER BY createdAt DESC`
  );

  return rows;
};