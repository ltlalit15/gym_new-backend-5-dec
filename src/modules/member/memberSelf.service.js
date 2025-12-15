// db connection import
import { pool } from "../../config/db.js";
import bcrypt from "bcryptjs";

/*******************************************************
 * GET MEMBER PROFILE (using userId)
 * Step-by-step: user → member → plan
 *******************************************************/
export const getMemberProfileService = async (userId) => {
  // 1) DB se user + member + plan ka data ek sath fetch
  const [rows] = await pool.query(
    `
      SELECT
        u.id AS userId,
        u.fullName,
        u.email,
        u.phone,
        u.address,
        u.branchId,
        u.status AS userStatus,

        m.id AS memberId,
        m.gender,
        m.joinDate,
        m.planId,
        m.membershipFrom,
        m.membershipTo,
        m.paymentMode,
        m.interestedIn,
        m.amountPaid,
        m.dateOfBirth,
        m.status AS memberStatus,

        p.name AS membership_plan,
        p.price AS membership_fee,
        p.duration AS plan_duration

      FROM user u
      LEFT JOIN member m ON m.userId = u.id
      LEFT JOIN plan p ON p.id = m.planId
      WHERE u.id = ?
    `,
    [userId]
  );

  // 2) Agar user nahi mila to error
  if (rows.length === 0) {
    throw { status: 404, message: "Member not found" };
  }

  // 3) Ek row milti hai → usse readable object bana do
  const m = rows[0];

  // 4) Name ko split karke first / last name banao
  const nameParts = (m.fullName || "").trim().split(" ");
  m.first_name = nameParts[0] || "";
  m.last_name = nameParts.slice(1).join(" ") || "";

  // 5) Dates ko yyyy-mm-dd format me convert karo
  m.plan_start_date = m.membershipFrom
    ? m.membershipFrom.toISOString().split("T")[0]
    : "";

  m.plan_end_date = m.membershipTo
    ? m.membershipTo.toISOString().split("T")[0]
    : "";

  // 6) Address ko street / city me tod do
  const addr = (m.address || "").split(",");
  m.address_street = addr[0]?.trim() || "";
  m.address_city = addr[1]?.trim() || "";
  m.address_state = "";
  m.address_zip = "";

  return m; // final formatted profile return
};

/*******************************************************
 * UPDATE PERSONAL INFO (using userId)
 * Step-by-step: read → fallback → update member → update user
 *******************************************************/
// export const updateMemberPersonalService = async (userId, data) => {
//   const {
//     first_name,
//     last_name,
//     gender,
//     dob,
//     email,
//     phone,
//     address_street,
//     address_city
//   } = data;

//   /************************************************
//    * 1) USER TABLE CHECK → user must exist
//    ************************************************/
//   const [[userRow]] = await pool.query(
//     `SELECT fullName, email, phone, address FROM user WHERE id = ?`,
//     [userId]
//   );

//   if (!userRow) {
//     throw { status: 404, message: "User not found" };
//   }

//   /************************************************
//    * 2) MEMBER TABLE CHECK → row may be missing
//    ************************************************/
//   const [[memberRow]] = await pool.query(
//     `
//       SELECT fullName, email, phone, gender, dateOfBirth, address
//       FROM member
//       WHERE userId = ?
//     `,
//     [userId]
//   );

//   /************************************************
//    * 3) AUTO-CREATE MEMBER ROW IF MISSING
//    ************************************************/
//   if (!memberRow) {
//     await pool.query(
//       `
//         INSERT INTO member 
//         (userId, adminId, fullName, email, phone, gender, address, branchId)
//         VALUES (?, 1, ?, ?, ?, NULL, NULL, NULL)
//       `,
//       [userId, userRow.fullName, userRow.email, userRow.phone]
//     );

//     // re-fetch for update
//     const [[refetch]] = await pool.query(
//       `SELECT * FROM member WHERE userId = ?`,
//       [userId]
//     );

//     memberRow = refetch;
//   }

//   /************************************************
//    * 4) SAFE FALLBACK LOGIC
//    ************************************************/
//   const fullName =
//     first_name && last_name
//       ? `${first_name} ${last_name}`.trim()
//       : memberRow.fullName;

//   const updatedEmail = email || memberRow.email;
//   const updatedPhone = phone || memberRow.phone;
//   const updatedGender = gender || memberRow.gender;
//   const updatedDob = dob ? new Date(dob) : memberRow.dateOfBirth;

//   const address =
//     address_street || address_city
//       ? [address_street, address_city].filter(Boolean).join(", ")
//       : memberRow.address;

//   /************************************************
//    * 5) EMAIL UNIQUE CHECK
//    ************************************************/
//   const [exists] = await pool.query(
//     `SELECT id FROM member WHERE email = ? AND userId != ?`,
//     [updatedEmail, userId]
//   );

//   if (exists.length > 0) {
//     throw { status: 400, message: "Email already in use" };
//   }

//   /************************************************
//    * 6) UPDATE MEMBER TABLE
//    ************************************************/
//   await pool.query(
//     `
//       UPDATE member SET
//         fullName = ?,
//         email = ?,
//         phone = ?,
//         gender = ?,
//         dateOfBirth = ?,
//         address = ?
//       WHERE userId = ?
//     `,
//     [
//       fullName,
//       updatedEmail,
//       updatedPhone,
//       updatedGender,
//       updatedDob,
//       address,
//       userId
//     ]
//   );

//   /************************************************
//    * 7) UPDATE USER TABLE ALSO
//    ************************************************/
//   await pool.query(
//     `
//       UPDATE user SET
//         fullName = ?,
//         email = ?,
//         phone = ?,
//         address = ?
//       WHERE id = ?
//     `,
//     [fullName, updatedEmail, updatedPhone, address, userId]
//   );

//   /************************************************
//    * 8) RETURN UPDATED PROFILE
//    ************************************************/
//   return getMemberProfileService(userId);
// };

export const updateMemberPersonalService = async (userId, data) => {
  const {
    first_name,
    last_name,
    dateOfBirth, // FIX: match payload
    email,
    phone,
    address_street,
    address_city,
    address_state,
    address_zip,
    gender // Add gender to the destructured data
  } = data;

  /**********************************************
   * 1) USER MUST EXIST
   **********************************************/
  const [[userRow]] = await pool.query(
    `SELECT * FROM user WHERE id = ?`,
    [userId]
  );

  if (!userRow) {
    throw { status: 404, message: "User not found" };
  }

  /**********************************************
   * 2) FULL NAME FALLBACK
   **********************************************/
  const fullName =
    first_name && last_name
      ? `${first_name} ${last_name}`.trim()
      : userRow.fullName;

  /**********************************************
   * 3) SAFE FALLBACK VALUES
   **********************************************/
  const updatedEmail = email || userRow.email;
  const updatedPhone = phone || userRow.phone || "0000000000";

  const updatedDob = dateOfBirth
    ? new Date(dateOfBirth)
    : userRow.dateOfBirth;

  /**********************************************
   * 4) BUILD FULL ADDRESS (OPTIONAL: if you want to combine the address fields)
   **********************************************/
  const addressParts = [
    address_street || null,
    address_city || null,
    address_state || null,
    address_zip || null
  ].filter(Boolean);

  const address =
    addressParts.length > 0 ? addressParts.join(", ") : userRow.address;

  /**********************************************
   * 5) EMAIL UNIQUE CHECK
   **********************************************/
  const [emailExists] = await pool.query(
    `SELECT id FROM user WHERE email = ? AND id != ?`,
    [updatedEmail, userId]
  );

  if (emailExists.length > 0) {
    throw { status: 400, message: "Email already in use" };
  }

  /**********************************************
   * 6) UPDATE USER TABLE ONLY
   **********************************************/
  await pool.query(
    `
      UPDATE user SET
        fullName = ?,
        email = ?,
        phone = ?,
        dateOfBirth = ?,
        address_street = ?,
        address_city = ?,
        address_state = ?,
        address_zip = ?,
        address = ?,
        gender = ?  -- Add gender here
      WHERE id = ?
    `,
    [
      fullName,
      updatedEmail,
      updatedPhone,
      updatedDob,
      address_street,
      address_city,
      address_state,
      address_zip,
      address,  // If you want to update the combined address field
      gender,  // Gender field updated here
      userId
    ]
  );

  /**********************************************
   * 7) RETURN UPDATED USER PROFILE
   **********************************************/
  const [[updatedUser]] = await pool.query(
    `SELECT * FROM user WHERE id = ?`,
    [userId]
  );

  return updatedUser;
};
;





/*******************************************************
 * CHANGE PASSWORD (using userId)
 * Step-by-step: verify old → hash new → update user & member
 *******************************************************/
export const changeMemberPasswordService = async (
  userId,
  currentPassword,
  newPassword
) => {
  // 1) User table se current password lao (correct column = id)
  const [[userRow]] = await pool.query(
    `SELECT password FROM user WHERE id = ?`,
    [userId]
  );

  if (!userRow) {
    throw { status: 404, message: "Member not found" };
  }

  // 2) Old password compare karo
  const match = await bcrypt.compare(currentPassword, userRow.password);
  if (!match) {
    throw { status: 400, message: "Current password is incorrect" };
  }

  // 3) New password hash karo
  const hashed = await bcrypt.hash(newPassword, 10);

  // 4) USER table update (correct)
  await pool.query(
    `UPDATE user SET password = ? WHERE id = ?`,
    [hashed, userId]
  );

  // 5) MEMBER table update (correct column = userId)
  await pool.query(
    `UPDATE member SET password = ? WHERE userId = ?`,
    [hashed, userId]
  );

  return { message: "Password updated successfully" };
};
