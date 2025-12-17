import { pool } from "../../config/db.js";

/**************************************
 * CREATE MEMBER
 **************************************/
import bcrypt from "bcryptjs";

export const createMemberService = async (data) => {
  const {
    fullName,
    email,
    password,
    phone,
    planId,
    membershipFrom,
    dob,
    paymentMode,
    amountPaid,
    branchId,
    gender,
    interestedIn,
    address,
    adminId,
    profileImage,
  } = data;

  if (!fullName || !email || !password) {
    throw {
      status: 400,
      message: "fullName, email, and password are required",
    };
  }

  // HASH PASSWORD
  const hashedPassword = await bcrypt.hash(password, 10);

  // Check duplicate email
  const [u1] = await pool.query("SELECT id FROM user WHERE email = ?", [email]);
  const [m1] = await pool.query("SELECT id FROM member WHERE email = ?", [
    email,
  ]);
  if (u1.length > 0 || m1.length > 0)
    throw { status: 400, message: "Email already exists" };

  // Membership Start Date
  const startDate = membershipFrom ? new Date(membershipFrom) : new Date();
  let endDate = null;

  // Membership End Date (Based on Plan Duration)
  if (planId) {
    const [planRows] = await pool.query(
      "SELECT * FROM memberplan WHERE id = ?",
      [planId]
    );
    if (!planRows.length)
      throw { status: 404, message: "Invalid plan selected" };

    const plan = planRows[0];

    endDate = new Date(startDate);
    const days = Number(plan.validityDays ?? plan.duration ?? 0);
    endDate.setDate(endDate.getDate() + days);  
  }

  // ---------------------------------------------------
  // 1️⃣ INSERT INTO USER TABLE (only required fields)
  // ---------------------------------------------------
  const [userResult] = await pool.query(
    `INSERT INTO user 
      (adminId,fullName, email, password, phone, roleId, branchId, address, 
       description, duration, gymName, planName, price, profileImage,status)
     VALUES (?,?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?,'Active')`,
    [
      adminId,
      fullName,
      email,
      hashedPassword,
      phone || null,
      4, // roleId = 3 = MEMBER
      branchId || null,
      address || null,
      profileImage || null,
    ]
  );

  const userId = userResult.insertId;

  // ---------------------------------------------------
  // 2️⃣ INSERT INTO MEMBER TABLE
  // ---------------------------------------------------
  const [memberRes] = await pool.query(
    `INSERT INTO member
      (userId, fullName, email, password, phone, planId, membershipFrom, membershipTo,
       dateOfBirth, paymentMode, amountPaid, branchId, gender, interestedIn, address, 
       adminId, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
    [
      userId,
      fullName,
      email,
      hashedPassword,
      phone || null,
      planId || null,
      startDate,
      endDate,
      dob ? new Date(dob) : null,
      paymentMode || null,
      amountPaid ? Number(amountPaid) : 0,
      branchId || null,
      gender || null,
      interestedIn || null,
      address || null,
      adminId || null,
    ]
  );

  return {
    message: "Member created successfully",
    userId,
    memberId: memberRes.insertId,
    fullName,
    email,
    branchId,
    membershipFrom: startDate,
    membershipTo: endDate,
    status: "Active",
  };
};

// export const renewMembershipService = async (memberId, body) => {
//   const { planId, paymentMode, amountPaid, adminId } = body;

//   // 1️⃣ Member check
//   const [[member]] = await pool.query("SELECT * FROM member WHERE id = ?", [
//     memberId,
//   ]);

//   if (!member) throw { status: 404, message: "Member not found" };

//   // 2️⃣ Fetch plan
//   const [[plan]] = await pool.query("SELECT * FROM memberplan WHERE id = ?", [
//     planId,
//   ]);

//   if (!plan) throw { status: 404, message: "Invalid Plan" };

//   // 3️⃣ Calculate new membership dates
//   let startDate = member.membershipTo
//     ? new Date(member.membershipTo)
//     : new Date();

//   startDate.setDate(startDate.getDate() + 1); // next day after previous expiry

//   let endDate = new Date(startDate);
//   endDate.setDate(endDate.getDate() + Number(plan.duration));

//   // 4️⃣ Update member table
//   await pool.query(
//     `UPDATE member SET
//         planId = ?,
//         membershipFrom = ?,
//         membershipTo = ?,
//         paymentMode = ?,
//         amountPaid = ?,
//         adminId = ?
//      WHERE id = ?`,
//     [
//       planId,
//       startDate,
//       endDate,
//       paymentMode,
//       amountPaid,
//       adminId || member.adminId,
//       memberId,
//     ]
//   );

//   return {
//     memberId,
//     planId,
//     membershipFrom: startDate,
//     membershipTo: endDate,
//     paymentMode,
//     amountPaid,
//   };
// };
export const renewMembershipService = async (memberId, body) => {
  const { planId, paymentMode, amountPaid, adminId } = body;

  // 1️⃣ Member check
  const [[member]] = await pool.query("SELECT * FROM member WHERE id = ?", [
    memberId,
  ]);

  if (!member) throw { status: 404, message: "Member not found" };

  // 2️⃣ Fetch plan
  const [[plan]] = await pool.query("SELECT * FROM memberplan WHERE id = ?", [
    planId,
  ]);

  if (!plan) throw { status: 404, message: "Invalid Plan" };

  // 3️⃣ Calculate new membership dates
  let startDate = member.membershipTo
    ? new Date(member.membershipTo)
    : new Date();

  startDate.setDate(startDate.getDate() + 1); // next day after previous expiry

  let endDate = new Date(startDate);

  // 4️⃣ Use validityDays from plan to calculate end date
  const validityDays = plan.validityDays ?? 30; // default to 30 if not defined
  endDate.setDate(endDate.getDate() + validityDays);

  // 5️⃣ Update member table and set status to ACTIVE
  await pool.query(
    `UPDATE member SET 
        planId = ?, 
        membershipFrom = ?, 
        membershipTo = ?, 
        paymentMode = ?, 
        amountPaid = ?, 
        adminId = ?, 
        status = 'Active'  
     WHERE id = ?`,
    [
      planId,
      startDate,
      endDate,
      paymentMode,
      amountPaid,
      adminId || member.adminId,
      memberId,
    ]
  );

  const [[updatedMember]] = await pool.query(
    `SELECT id, status, membershipFrom, membershipTo, planId, paymentMode, amountPaid, adminId, branchId 
     FROM member WHERE id = ?`,
    [memberId]
  );

  return {
    memberId: updatedMember.id,
    planId: updatedMember.planId,
    membershipFrom: updatedMember.membershipFrom,
    membershipTo: updatedMember.membershipTo,
    paymentMode: updatedMember.paymentMode,
    amountPaid: updatedMember.amountPaid,
    status: updatedMember.status, // Return ACTIVE status in the response
  };
};
/**************************************
 * LIST MEMBERS
 **************************************/
export const listMembersService = async (
  branchId,
  page = 1,
  limit = 20,
  search = ""
) => {
  const offset = (page - 1) * limit;
  let query = `
    SELECT * FROM member
    WHERE branchId = ?
  `;
  const params = [branchId];

  if (search) {
    query += " AND (fullName LIKE ? OR email LIKE ? OR phone LIKE ?)";
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += " ORDER BY id DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [items] = await pool.query(query, params);

  // Count total
  let countQuery = "SELECT COUNT(*) as total FROM member WHERE branchId = ?";
  const countParams = [branchId];
  if (search) {
    countQuery += " AND (fullName LIKE ? OR email LIKE ? OR phone LIKE ?)";
    countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [countRows] = await pool.query(countQuery, countParams);
  const total = countRows[0].total;

  return {
    items,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
};

/**************************************
 * MEMBER DETAIL
 **************************************/
export const memberDetailService = async (id) => {
  const [rows] = await pool.query("SELECT * FROM member WHERE id = ?", [id]);

  if (rows.length === 0) throw { status: 404, message: "Member not found" };

  const member = rows[0];
  delete member.password; // 👈 Remove password from response

  return member;
};

/**************************************
 * UPDATE MEMBER
 **************************************/
// export const updateMemberService = async (id, data) => {
//   // 1️⃣ Fetch existing member
//   const [[existing]] = await pool.query(
//     "SELECT * FROM member WHERE id = ?",
//     [id]
//   );

//   if (!existing) throw { status: 404, message: "Member not found" };

//   // 2️⃣ Extract fields
//   const {
//     fullName = existing.fullName,
//     email = existing.email,
//     phone = existing.phone,
//     password,

//     planId,
//     membershipFrom,
//     dateOfBirth,
//     paymentMode,
//     amountPaid,
//     branchId,
//     gender,
//     interestedIn,
//     address,
//     adminId,
//     status  // <-- NEW
//   } = data;

//   // 3️⃣ Hash password only if updating
//   let hashedPassword = existing.password;
//   if (password) {
//     hashedPassword = await bcrypt.hash(password, 10);
//   }

//   let startDate = membershipFrom ? new Date(membershipFrom) : undefined;
//   let endDate = undefined;

//   // 5️⃣ Recalculate membershipTo if plan changed
//   // let startDate = new Date(membershipFrom);
//   // let endDate = existing.membershipTo;

//   if (planId) {
//     const [planRows] = await pool.query("SELECT * FROM memberplan WHERE id = ?", [planId]);
//     if (!planRows.length) throw { status: 404, message: "Invalid plan selected" };

//     const plan = planRows[0];
//     endDate = new Date(startDate);
//     endDate.setDate(endDate.getDate() + Number(plan.duration || 0));
//   }

//   // 6️⃣ Update member table
//   await pool.query(
//     `UPDATE member SET
//       fullName = ?,
//       email = ?,
//       password = ?,
//       phone = ?,
//       planId = ?,
//       membershipFrom = ?,
//       membershipTo = ?,
//       dateOfBirth = ?,
//       paymentMode = ?,
//       amountPaid = ?,
//       branchId = ?,
//       gender = ?,
//       interestedIn = ?,
//       address = ?,
//       adminId = ?,
//       status=?
//      WHERE id = ?`,
//     [
//       fullName,
//       email,
//       hashedPassword,
//       phone,
//       planId,
//       startDate,
//       endDate,
//       dateOfBirth ? new Date(dateOfBirth) : null,
//       paymentMode,
//       amountPaid,
//       branchId,
//       gender,
//       interestedIn,
//       address,
//       adminId,
//       status,
//       id
//     ]
//   );

//   // 7️⃣ Update user table also (important)
//   await pool.query(
//     `UPDATE user SET
//       fullName = ?,
//       email = ?,
//       phone = ?,
//       password = ?,
//       branchId = ?,
//       address = ?
//      WHERE id = ?`,
//     [
//       fullName,
//       email,
//       phone,
//       hashedPassword,
//       branchId,
//       address,
//       existing.userId
//     ]
//   );

//   return memberDetailService(id);
// };

export const updateMemberService = async (id, data) => {
  /* --------------------------------
     1️⃣ FETCH EXISTING MEMBER
  -------------------------------- */
  const [[existing]] = await pool.query(
    "SELECT * FROM member WHERE id = ?",
    [id]
  );

  if (!existing) {
    throw { status: 404, message: "Member not found" };
  }

  /* --------------------------------
     2️⃣ EXTRACT FIELDS (WITH FALLBACKS)
  -------------------------------- */
  const {
    fullName = existing.fullName,
    email = existing.email,
    phone = existing.phone,
    password,
    planId = existing.planId,
    membershipFrom = existing.membershipFrom,
    dateOfBirth = existing.dateOfBirth,
    paymentMode = existing.paymentMode,
    amountPaid = existing.amountPaid,
    branchId = existing.branchId,
    gender = existing.gender,
    interestedIn = existing.interestedIn,
    address = existing.address,
    adminId = existing.adminId,
    status = existing.status,
    profileImage, // ✅ ONLY FOR USER TABLE
  } = data;

  /* --------------------------------
     3️⃣ PASSWORD HASH (IF PROVIDED)
  -------------------------------- */
  let hashedPassword = existing.password;
  if (password) {
    hashedPassword = await bcrypt.hash(password, 10);
  }

  /* --------------------------------
     4️⃣ MEMBERSHIP DATES
  -------------------------------- */
  const startDate = membershipFrom
    ? new Date(membershipFrom)
    : existing.membershipFrom;

  let endDate = existing.membershipTo;

  /* --------------------------------
     5️⃣ RECALCULATE membershipTo (PLAN BASED)
     ❗ memberplan → ONLY validityDays
  -------------------------------- */
  if (planId && membershipFrom) {
    const [planRows] = await pool.query(
      "SELECT validityDays FROM memberplan WHERE id = ?",
      [planId]
    );

    if (!planRows.length) {
      throw { status: 404, message: "Invalid plan selected" };
    }

    const days = Number(planRows[0].validityDays || 0);

    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + days);
  }

  /* --------------------------------
     6️⃣ UPDATE MEMBER TABLE
     ❌ NO profileImage HERE
  -------------------------------- */
  await pool.query(
    `UPDATE member SET
      fullName = ?,
      email = ?,
      password = ?,
      phone = ?,
      planId = ?,
      membershipFrom = ?,
      membershipTo = ?,
      dateOfBirth = ?,
      paymentMode = ?,
      amountPaid = ?,
      branchId = ?,
      gender = ?,
      interestedIn = ?,
      address = ?,
      adminId = ?,
      status = ?
     WHERE id = ?`,
    [
      fullName,
      email,
      hashedPassword,
      phone,
      planId,
      startDate,
      endDate,
      dateOfBirth ? new Date(dateOfBirth) : null,
      paymentMode,
      amountPaid,
      branchId,
      gender,
      interestedIn,
      address,
      adminId,
      status,
      id,
    ]
  );

  /* --------------------------------
     7️⃣ UPDATE USER TABLE
     ✅ profileImage ONLY HERE
  -------------------------------- */
  await pool.query(
    `UPDATE user SET
      fullName = ?,
      email = ?,
      phone = ?,
      password = ?,
      branchId = ?,
      address = ?,
      status = ?,
      profileImage = ?
     WHERE id = ?`,
    [
      fullName,
      email,
      phone,
      hashedPassword,
      branchId,
      address,
      status,
      profileImage ?? null,
      existing.userId,
    ]
  );

  /* --------------------------------
     8️⃣ RETURN UPDATED MEMBER DETAIL
  -------------------------------- */
  return memberDetailService(id);
};


/**************************************
 * DELETE (SOFT DELETE)
 **************************************/
export const deleteMemberService = async (id) => {
  const [rows] = await pool.query("SELECT userId FROM member WHERE id = ?", [
    id,
  ]);

  if (rows.length === 0) {
    throw { status: 404, message: "Member not found" };
  }

  const userId = rows[0].userId;
  await pool.query("DELETE FROM booking WHERE memberId = ?", [id]);

  // 1️⃣ Delete Attendance
  await pool.query("DELETE FROM memberattendance WHERE memberId = ?", [id]);

  // 2️⃣ Delete Payments (if exists)
  await pool.query("DELETE FROM payment WHERE memberId = ?", [id]);

  // 3️⃣ Delete Bookings (if exists)
  await pool.query("DELETE FROM booking_requests WHERE memberId = ?", [id]);

  // 4️⃣ Finally delete member
  await pool.query("DELETE FROM member WHERE id = ?", [id]);

  // 5️⃣ Delete user account
  await pool.query("DELETE FROM user WHERE id = ?", [userId]);

  return { message: "Member deleted permanently" };
};

// member.service.js

// ===== GET MEMBERS BY ADMIN ID =====
export const getMembersByAdminIdService = async (adminId) => {
  const [rows] = await pool.query(
    `SELECT 
        id,
        adminId,
        fullName,
        email,
        phone,
        gender,
        address,
        joinDate,
        branchId,
        planId,
        membershipFrom,
        membershipTo,
        paymentMode,
        interestedIn,
        amountPaid,
        dateOfBirth,
        status
     FROM member
     WHERE adminId = ?`,
    [adminId]
  );

  return rows;
};

export const getRenewalPreviewService = async (memberId) => {
  // 1) Fetch member with required fields
  const [memberRows] = await pool.query(
    `SELECT 
        id, userId, fullName, email, phone, planId, membershipFrom, membershipTo, 
        paymentMode, amountPaid, branchId, status, adminId
     FROM member
     WHERE id = ?`,
    [memberId]
  );

  if (!memberRows.length) {
    throw { status: 404, message: "Member not found" };
  }

  const member = memberRows[0];

  // Convert to ISO-safe return
  const safeMember = {
    ...member,
    membershipFrom: member.membershipFrom
      ? new Date(member.membershipFrom).toISOString()
      : null,
    membershipTo: member.membershipTo
      ? new Date(member.membershipTo).toISOString()
      : null,
  };

  // 2) Fetch plans
  const [plansRaw] = await pool.query(
    `SELECT id, name, sessions, validityDays, price, type, adminId, branchId,
            createdAt, updatedAt
     FROM memberplan
     ORDER BY id ASC`
  );

  // 3) Preview Calculation
  const basePreviewStart = member.membershipTo
    ? new Date(member.membershipTo)
    : new Date();
  basePreviewStart.setDate(basePreviewStart.getDate() + 1);

  const plans = plansRaw.map((p) => {
    const days = p.validityDays ?? 30;

    const previewStart = new Date(basePreviewStart);
    const previewEnd = new Date(previewStart);
    previewEnd.setDate(previewEnd.getDate() + days);

    return {
      ...p,
      previewDurationDays: days,
      previewMembershipFrom: previewStart.toISOString(),
      previewMembershipTo: previewEnd.toISOString(),
    };
  });

  return { member: safeMember, plans };
};

export const listPTBookingsService = async (branchId) => {
  const [rows] = await pool.query(
    `
    SELECT 
      pt.id,

      -- MEMBER INFO
      m.fullName AS memberName,

      -- TRAINER INFO (Only personal trainer)
      u.fullName AS trainerName,
      u.roleId AS trainerRole,

      -- PT DETAILS (price removed, type removed)
      pt.date,
      pt.startTime,
      pt.endTime,
      pt.paymentStatus,
      pt.bookingStatus

    FROM pt_bookings pt
    LEFT JOIN member m ON pt.memberId = m.id
    LEFT JOIN user u ON pt.trainerId = u.id

    WHERE pt.branchId = ?
      AND u.roleId = 5   -- Only personal trainer

    ORDER BY pt.id DESC
    `,
    [branchId]
  );

  return rows.map((x) => ({
    ...x,
    time: `${x.startTime} - ${x.endTime}`,
  }));
};

export const getMembersByAdminAndPlan = async (adminId) => {
  try {
    // Fetch members with the given adminId, plan type 'MEMBER' or 'GROUP'
    const query = `
      SELECT m.id, m.fullName, m.email, m.phone, m.planId, m.membershipFrom, m.membershipTo, mp.type, mp.trainerType
      FROM member m
      JOIN memberplan mp ON m.planId = mp.id
      WHERE m.adminId = ? AND (mp.type = 'MEMBER' OR mp.type = 'GROUP')`;

    const [members] = await pool.query(query, [adminId]);

    // Filter out members whose trainerType is not 'general' if the type is 'MEMBER'
    const filteredMembers = members.filter((member) => {
      if (member.type === "MEMBER" && member.trainerType !== "general") {
        return false;
      }
      return true;
    });

    return filteredMembers;
  } catch (error) {
    throw { status: 500, message: "Error fetching members", error };
  }
};
