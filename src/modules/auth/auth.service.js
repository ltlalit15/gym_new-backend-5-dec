import { pool } from "../../config/db.js";  // ✅ named import

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { ENV } from "../../config/env.js";
import { uploadToCloudinary } from "../../config/cloudinary.js";

/**************************************
 * REGISTER USER (CREATE)
 **************************************/
export const registerUser = async (data,payload) => {
 
  const fullName = data.fullName?.trim();
  const email = data.email?.trim();
  const password = data.password;
  const phone = data.phone?.trim() || null;
  const roleId = data.roleId;
  const branchId = data.branchId || null;

  const gymName = data.gymName || null;
  const address = data.address || null;
  const planName = data.planName || null;
  const price = data.price || null;
  const duration = data.duration || null;
  const description = data.description || null;
  const status = data.status || null;

  // ✅ Jis admin ne ye user create kiya hai
  const adminId = data.adminId || null;

  if (!fullName || !email || !password || !roleId) {
    throw { status: 400, message: "fullName, email, password, roleId required" };
  }

  // Check email
  const [ex] = await pool.query(
    "SELECT id FROM user WHERE email = ?",
    [email]
  );
  if (ex.length > 0) throw { status: 400, message: "Email already exists" };

  const hash = await bcrypt.hash(password, 10);

  

  // const sql = `
  //   INSERT INTO user (
  //     fullName, email, password, phone, roleId, branchId, 
  //     gymName, address, planName, price, duration, description, status, adminId,profileImage
  //   ) 
  //   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  // `;

  const sql = `
    INSERT INTO user (
      fullName, email, password, phone, roleId, branchId, 
      gymName, address, planName, price, duration, description, status, adminId, profileImage
    ) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await pool.query(sql, [
    fullName,
    email,
    hash,
    phone,
    roleId,
    branchId,
    gymName,
    address,
    planName,
    price,
    duration,
    description,
    status,
    adminId, 
    payload.profileImage || null,
  ]);

  // Return full user object
  return {
    id: result.insertId,
    fullName,
    email,
    phone,
    roleId,
    branchId,
    gymName,
    address,
    planName,
    price,
    duration,
    description,
    status,
    adminId,
    profileImage: payload.profileImage || null,
  };
};



/**************************************
 * LOGIN USER
 **************************************/
// export const loginUser = async ({ email, password }) => {
//   const sql = `
//     SELECT u.*, r.roleId AS roleName, b.name AS branchName
//     FROM user u
//     LEFT JOIN role r ON r.id = u.roleId
//     LEFT JOIN branch b ON b.id = u.branchId
//     WHERE u.email = ?
//   `;

//   const [rows] = await pool.query(sql, [email]);
//   const user = rows[0];
//   if (!user) throw { status: 400, message: "User not found" };

//   const match = await bcrypt.compare(password, user.password);
//   if (!match) throw { status: 401, message: "Invalid password" };

//   const token = jwt.sign(
//     {
//       id: user.id,
//       role: user.roleId,
//       branchId: user.branchId,
//     },
//     ENV.jwtSecret,
//     { expiresIn: "7d" }
//   );

//   return {
//     token,
//     user: {
//       id: user.id,
//       fullName: user.fullName,
//       email: user.email,
//       phone: user.phone,
//       role: user.roleId,
//       branchId: user.branchId,
//       branchName: user.branchName,
//     }
//   };
// };


// ✅ service
export const loginUser = async ({ email, password }) => {

  const sql = `
    SELECT 
      u.id,
      u.fullName,
      u.email,
      u.phone,
      u.password,
      u.roleId,
      u.branchId,
      u.adminId,
      u.profileImage,        -- ✅ IMPORTANT
      r.name AS roleName,
      b.name AS branchName
    FROM user u
    LEFT JOIN role r ON r.id = u.roleId
    LEFT JOIN branch b ON b.id = u.branchId
    WHERE u.email = ?
    LIMIT 1
  `; 

  const [rows] = await pool.query(sql, [email]);
  const user = rows[0];
  

  if (!user) throw { status: 400, message: "User not found" };

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw { status: 401, message: "Invalid password" };

    // ✅ Staff table check
  const [staffRows] = await pool.query(
    `SELECT id FROM staff WHERE userId = ?`,
    [user.id]
  );

  const staffId = staffRows.length ? staffRows[0].id : null;
  //Member status check

//  if (user.roleId === 4) { // assuming roleId 4 = MEMBER
//   const [memberRows] = await pool.query(
//     `SELECT id, status FROM member WHERE userId = ? LIMIT 1`,
//     [user.id]
//   );

//   if (memberRows.length) {
//     const member = memberRows[0];

//     // Check if the member's status is not "ACTIVE"
//     if (member.status !== "ACTIVE") {
//       throw {
//         status: 403,
//         message: "Membership expired or inactive. Please renew your plan.",
//       };
//     }
//   }
// }


if (user.roleId === 4) { // assuming roleId 4 = MEMBER
    const [memberRows] = await pool.query(
      `SELECT id, status, membershipTo FROM member WHERE userId = ? LIMIT 1`,
      [user.id]
    );

    if (memberRows.length) {
      const member = memberRows[0];

      // Check if the membership has expired
      const currentDate = new Date();
      const membershipToDate = new Date(member.membershipTo);

      if (membershipToDate < currentDate) {
        // Mark the member as INACTIVE if their membership has expired
        await pool.query(
          `UPDATE member SET status = 'Inactive' WHERE id = ?`,
          [member.id]
        );

        throw {
          status: 403,
          message: "Membership expired. Please renew your plan.",
        };
      }

      // If the member's status is not "ACTIVE", block login
      if (member.status !== "Active") {
        throw {
          status: 403,
          message: "Membership expired or inactive. Please renew your plan.",
        };
      }
    }
  }

  const token = jwt.sign(
    {
      id: user.id,
      roleId: user.roleId,
      branchId: user.branchId,
      adminId: user.adminId,
            staffId: staffId,               // ✅ token me bhi adminId
    },
    ENV.jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    token,
    user: {
        id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,

      roleId: user.roleId,
      roleName: user.roleName,

      branchId: user.branchId,
      branchName: user.branchName,

      adminId: user.adminId,
      staffId: staffId,

      profileImage: user.profileImage || null, // ✅ HERE
    }
  };
};



/**************************************
 * GET USER BY ID
 **************************************/
export const fetchUserById = async (id) => {
  const sql = `
    SELECT u.*, r.name AS roleName, b.name AS branchName
    FROM user u
    LEFT JOIN role r ON r.id = u.roleId
    LEFT JOIN branch b ON b.id = u.branchId
    WHERE u.id = ?
  `;
  const [rows] = await pool.query(sql, [id]);

  if (rows.length === 0) throw { status: 404, message: "User not found" };

  return rows[0];
};


/**************************************
 * UPDATE USER
 **************************************/
// export const modifyUser = async (id, data,files) => {
//     const [rows] = await pool.query("SELECT * FROM user WHERE id = ?", [id]); // <-- added
//   const existingUser = rows[0]; // <-- added
//   if (data.password) {
//     data.password = await bcrypt.hash(data.password, 10);
//   }
// let profileImageUrl = existingUser.profileImage; // Default to existing profile image

//   if (files?.profileImage) {
//     // If a new image is provided in the request files, upload it to Cloudinary
//     profileImageUrl = await uploadToCloudinary(files.profileImage, "users/profile");
//   }
//   const sql = `
//     UPDATE user SET 
//       fullName=?, email=?, phone=?, roleId=?, branchId=?, 
//       gymName=?, address=?, planName=?, price=?, duration=?, 
//       description=?, status=?, password=IFNULL(?, password), profileImage=?
//     WHERE id=?
//   `;

//   await pool.query(sql, [
//     data.fullName,
//     data.email,
//     data.phone,
//     existingUser.roleId,
//     data.branchId,
//     data.gymName,
//     data.address,
//     data.planName,
//     data.price,
//     data.duration,
//     data.description,
//     data.status,
//     data.password || null,
//     profileImageUrl,
//     id
//   ]);

//   return fetchUserById(id);
// };
export const modifyUser = async (id, data = {}, files) => { // Default to empty object if data is undefined
  const [rows] = await pool.query("SELECT * FROM user WHERE id = ?", [id]); // Get existing user
  const existingUser = rows[0]; // Store the existing user

  // Prepare the fields to be updated
  const updatedFields = [];
  
  // Initialize the updated data with existing data (so fields not passed remain unchanged)
  const updatedData = {
    fullName: existingUser.fullName,
    email: existingUser.email,
    phone: existingUser.phone,
    branchId: existingUser.branchId,
    gymName: existingUser.gymName,
    address: existingUser.address,
    planName: existingUser.planName,
    price: existingUser.price,
    duration: existingUser.duration,
    description: existingUser.description,
    status: existingUser.status,
    password: existingUser.password, // Retain current password if not provided
    profileImage: existingUser.profileImage // Retain current profile image if not provided
  };

  // Update fields if provided in the data or files (check if data exists before updating)
  if (data?.fullName) {
    updatedData.fullName = data.fullName;
    updatedFields.push('fullName');
  }
  if (data?.email) {
    updatedData.email = data.email;
    updatedFields.push('email');
  }
  if (data?.phone) {
    updatedData.phone = data.phone;
    updatedFields.push('phone');
  }
  if (data?.branchId) {
    updatedData.branchId = data.branchId;
    updatedFields.push('branchId');
  }
  if (data?.gymName) {
    updatedData.gymName = data.gymName;
    updatedFields.push('gymName');
  }
  if (data?.address) {
    updatedData.address = data.address;
    updatedFields.push('address');
  }
  if (data?.planName) {
    updatedData.planName = data.planName;
    updatedFields.push('planName');
  }
  if (data?.price) {
    updatedData.price = data.price;
    updatedFields.push('price');
  }
  if (data?.duration) {
    updatedData.duration = data.duration;
    updatedFields.push('duration');
  }
  if (data?.description) {
    updatedData.description = data.description;
    updatedFields.push('description');
  }
  if (data?.status) {
    updatedData.status = data.status;
    updatedFields.push('status');
  }

  // Only hash password if it's provided
  if (data?.password) {
    updatedData.password = await bcrypt.hash(data.password, 10);
    updatedFields.push('password');
  }

  // Handle profile image update if a new image is provided
  if (files?.profileImage) {
    updatedData.profileImage = await uploadToCloudinary(files.profileImage, "users/profile");
    updatedFields.push('profileImage');
  }

  // Dynamically create the SQL query based on updated fields
  const setClause = updatedFields.map(field => `${field} = ?`).join(", ");

  // SQL query to update the user record with only the updated fields
  const sql = `UPDATE user SET ${setClause} WHERE id = ?`;

  // Collect the values for the query in the same order as the updated fields
  const queryValues = updatedFields.map(field => updatedData[field]);
  queryValues.push(id); // Add the user ID to the end of the query

  // Update the user record in the database
  await pool.query(sql, queryValues);

  // Fetch the updated user details and return
  return fetchUserById(id);
};

/**************************************
 * DELETE USER
 **************************************/
export const removeUser = async (id) => {
  const userId = Number(id);

  // ⭐ 1) Delete alerts where user is staff
  await pool.query("DELETE FROM alert WHERE staffId = ?", [userId]); // <-- added

  // ⭐ 2) Delete salary records where user is staff
  await pool.query("DELETE FROM salary WHERE staffId = ?", [userId]); // <-- added
await pool.query(
  `
  DELETE b
  FROM booking b
  INNER JOIN classschedule cs
    ON cs.id = b.scheduleId
  WHERE cs.trainerId = ?
  `,
  [userId]
);
  // ⭐ 3) Delete class schedules where user is trainer
  await pool.query("DELETE FROM classschedule WHERE trainerId = ?", [userId]); // <-- added

  // ⭐ 4) Delete sessions where user is trainer
  await pool.query("DELETE FROM session WHERE trainerId = ?", [userId]); // <-- added

  // ⭐ 5) Delete members where user is assigned
  await pool.query("DELETE FROM member WHERE userId = ?", [userId]); // <-- added

  // ⭐ 6) Set adminId = NULL in memberplan (not delete)
  await pool.query(
    "UPDATE memberplan SET adminId = NULL WHERE adminId = ?",
    [userId]
  ); // <-- added

  // ⭐ 7) Set adminId = NULL in branch (not delete)
  await pool.query(
    "UPDATE branch SET adminId = NULL WHERE adminId = ?",
    [userId]
  ); // <-- added

  // ⭐ 8) Finally delete user
  await pool.query("DELETE FROM user WHERE id = ?", [userId]); // <-- unchanged

  return true;
};



/**************************************
 * GET ADMINS ONLY
 **************************************/
export const fetchAdmins = async () => {
  const sql = `
    SELECT u.*, r.name AS roleName 
    FROM user u
    LEFT JOIN role r ON r.id = u.roleId
    WHERE u.roleId = 2
  `;

  const [rows] = await pool.query(sql);
  return rows;
};


/**************************************
 * DASHBOARD STATS
 **************************************/
export const fetchDashboardStats = async () => {
  const [[{ totalAdmins }]] = await pool.query(
    "SELECT COUNT(*) AS totalAdmins FROM user WHERE roleId = 2"
  );

  const [[{ totalBranches }]] = await pool.query(
    "SELECT COUNT(*) AS totalBranches FROM branch"
  );

  const [[{ newUsersToday }]] = await pool.query(
    "SELECT COUNT(*) AS newUsersToday FROM user WHERE DATE(createdAt) = CURDATE()"
  );

  return { totalAdmins, totalBranches, newUsersToday };
};


/**************************************
 * LOGIN MEMBER (NO BCRYPT)
 **************************************/
export const loginMemberService = async ({ email, password }) => {
  const sql = `
    SELECT m.*, b.name AS branchName
    FROM member m
    LEFT JOIN branch b ON b.id = m.branchId
    WHERE m.email = ?
  `;

  const [rows] = await pool.query(sql, [email]);
  const member = rows[0];

  if (!member) throw { status: 400, message: "Invalid email or password" };

  if (member.status !== "ACTIVE") {
    throw { status: 403, message: "Account disabled" };
  }

  if (member.password !== password) {
    throw { status: 400, message: "Invalid email or password" };
  }

  const token = jwt.sign(
    { id: member.id, role: "MEMBER" },
    ENV.jwtSecret,
    { expiresIn: "7d" }
  );

  return {
    token,
    member: {
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      branchId: member.branchId,
      branchName: member.branchName,
    }
  };
};

/**************************************
 * CHANGE PASSWORD
 **************************************/
export const changeUserPassword = async (id, oldPassword, newPassword) => {
  // 1. Fetch user first
  const [rows] = await pool.query("SELECT * FROM user WHERE id = ?", [id]);
  const user = rows[0];

  if (!user) {
    throw { status: 404, message: "User not found" };
  }

  // 2. Compare old password
  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) {
    throw { status: 400, message: "Old password is incorrect" };
  }

  // 3. Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // 4. Update password
  await pool.query(
    "UPDATE user SET password = ? WHERE id = ?",
    [hashedPassword, id]
  );

  return { message: "Password updated successfully" };
};


// export const getAdminDashboardData = async () => {
//   const sql = `
//     SELECT 
//       -- Total Branches
//       (SELECT COUNT(*) FROM branch WHERE status = 'Active') AS totalBranches,

//       -- Total Members (roleId = 4)
//       (SELECT COUNT(*) FROM user WHERE roleId = 4 AND status = 'Active') AS totalMembers,

//       -- Active Staff Count
//       (SELECT COUNT(*) FROM staff WHERE status = 'Active') AS totalStaff,

//       -- Today's Member Check-ins
//       (SELECT COUNT(*) FROM memberattendance 
//        WHERE DATE(checkIn) = CURDATE()) AS todaysMemberCheckins,

//       -- Today's Staff Check-ins
//       (SELECT COUNT(*) FROM staffattendance 
//        WHERE DATE(checkIn) = CURDATE()) AS todaysStaffCheckins
//   `;

//   const [rows] = await pool.query(sql);

//   if (!rows.length) {
//     throw { status: 404, message: "No dashboard data found" };
//   }

//   return rows[0];
// };





// export const getAdminDashboardData = async (adminId) => {
//   // 5 CARDS
//   const statsQuery = `
//     SELECT 
//       -- Branch count
//       (SELECT COUNT(*) FROM branch 
//         WHERE status = 'ACTIVE' AND adminId = ?) AS totalBranches,

//       -- Member count (roleId = 4)
//       (SELECT COUNT(*) FROM user 
//         WHERE roleId = 4 AND status = 'ACTIVE' AND adminId = ?) AS totalMembers,

//       -- Staff count
//       (SELECT COUNT(*) FROM staff 
//         WHERE status = 'Active' AND adminId = ?) AS totalStaff,

//       -- Today's Member Check-ins (JOIN member → user → adminId)
//       (SELECT COUNT(*) FROM memberattendance ma
//         JOIN user u ON ma.memberId = u.id
//         WHERE u.adminId = ?
//         AND DATE(ma.checkIn) = CURDATE()
//       ) AS todaysMemberCheckins,

//       -- Today's Staff Check-ins (JOIN staff → adminId)
//       (SELECT COUNT(*) FROM staffattendance sa
//         JOIN staff s ON sa.staffId = s.id
//         WHERE s.adminId = ?
//         AND DATE(sa.checkIn) = CURDATE()
//       ) AS todaysStaffCheckins
//   `;

//   // MEMBER GROWTH (Admin-wise last 6 months)
//   const memberGrowthQuery = `
//     SELECT 
//       DATE_FORMAT(MIN(createdAt), '%b') AS month,
//       COUNT(*) AS count
//     FROM user
//     WHERE roleId = 4
//       AND adminId = ?
//       AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
//     GROUP BY YEAR(createdAt), MONTH(createdAt)
//     ORDER BY YEAR(createdAt), MONTH(createdAt);
//   `;

//   // recent activity
// const recentActivitiesQuery = `
// (
//   SELECT 
//     CONCAT('New member registration: ', fullName) AS activity,
//     joinDate AS time,
//     'member' AS type
//   FROM member
//   WHERE adminId = ?
// )

// UNION ALL

// (
//   SELECT 
//     CONCAT('Payment received: ₹', amount) AS activity,
//     createdAt AS time,
//     'payment' AS type
//   FROM payment
//   WHERE adminId = ?
// )

// UNION ALL

// (
//   SELECT 
//     CONCAT('Class booking by Member ID ', memberId) AS activity,
//     createdAt AS time,
//     'class_booking' AS type
//   FROM booking_requests
//   WHERE adminId = ?
// )

// UNION ALL

// (
//   SELECT 
//     CONCAT('Staff check-in: Staff ID ', sa.staffId) AS activity,
//     sa.checkIn AS time,
//     'staff_checkin' AS type
//   FROM staffattendance sa
//   JOIN staff s ON sa.staffId = s.id
//   WHERE s.adminId = ?
// )

// ORDER BY time DESC
// LIMIT 5;
// `;
  

// const [recentActivities] = await pool.query(recentActivitiesQuery, [
//   adminId,
//   adminId,
//   adminId,
//   adminId
// ]);

//   const [stats] = await pool.query(statsQuery, [
//     adminId,
//     adminId,
//     adminId,
//     adminId,
//     adminId,
//   ]);

//   const [memberGrowth] = await pool.query(memberGrowthQuery, [adminId]);

//   return {
//     ...stats[0],
//     memberGrowth,
//      recentActivities
//   };
// };


export const getAdminDashboardData = async (adminId) => {
  // 5 CARDS
  const statsQuery = `
    SELECT 
      -- Member count (roleId = 4)
      (SELECT COUNT(*) FROM member 
        WHERE status = 'ACTIVE' AND adminId = ?) AS totalMembers,

      -- Staff count
      (SELECT COUNT(*) FROM staff 
        WHERE status = 'Active' AND adminId = ?) AS totalStaff,

      -- Today's Member Check-ins (JOIN member → user → adminId)
      (SELECT COUNT(*) FROM memberattendance ma
        JOIN user u ON ma.memberId = u.id
        WHERE u.adminId = ?
        AND DATE(ma.checkIn) = CURDATE()
      ) AS todaysMemberCheckins,

      -- Today's Staff Check-ins (JOIN staff → adminId)
      (SELECT COUNT(*) FROM staffattendance sa
        JOIN staff s ON sa.staffId = s.id
        WHERE s.adminId = ?
        AND DATE(sa.checkIn) = CURDATE()
      ) AS todaysStaffCheckins
  `;

  // MEMBER GROWTH (Admin-wise last 6 months)
  const memberGrowthQuery = `
    SELECT 
      DATE_FORMAT(MIN(createdAt), '%b') AS month,
      COUNT(*) AS count
    FROM user
    WHERE roleId = 4
      AND adminId = ?
      AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
    GROUP BY YEAR(createdAt), MONTH(createdAt)
    ORDER BY YEAR(createdAt), MONTH(createdAt);
  `;

  // recent activity
const recentActivitiesQuery = `
  (
    SELECT 
      CONCAT('New member registration: ', fullName) AS activity,
      joinDate AS time,
      'member' AS type
    FROM member
    WHERE adminId = ?
  )

  UNION ALL

  (
    SELECT 
      CONCAT('Class booking by Member ID ', memberId) AS activity,
      createdAt AS time,
      'class_booking' AS type
    FROM booking_requests
    WHERE adminId = ?
  )

  UNION ALL

  (
    SELECT 
      CONCAT('Staff check-in: Staff ID ', sa.staffId) AS activity,
      sa.checkIn AS time,
      'staff_checkin' AS type
    FROM staffattendance sa
    JOIN staff s ON sa.staffId = s.id
    WHERE s.adminId = ?
  )

  ORDER BY time DESC
  LIMIT 5;
  `;

const [recentActivities] = await pool.query(recentActivitiesQuery, [
  adminId,
  adminId,
  adminId,
  adminId
]);

  const [stats] = await pool.query(statsQuery, [
    adminId,
    adminId,
    adminId,
    adminId,
    adminId,
  ]);

  const [memberGrowth] = await pool.query(memberGrowthQuery, [adminId]);

  return {
    ...stats[0],
    memberGrowth,
     recentActivities
  };
};


