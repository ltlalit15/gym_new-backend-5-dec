/* --------------------------------------------------------

   CREATE BOOKING REQUEST (MEMBER)
-------------------------------------------------------- */
import { pool } from "../../config/db.js";


export const createBookingRequest = async (req, res) => {
  const connection = await pool.getConnection();

  try {
    const {
      fullName,
      email,
      phone,
      gender,          // ✅ NEW
      adminId,
      branchId = null
    } = req.body;

    // ✅ validation
    if (!fullName || !phone || !adminId || !gender) {
      return res.status(400).json({
        success: false,
        message: "fullName, phone, gender and adminId are required"
      });
    }

    await connection.beginTransaction();

    /* -------------------------
       1️⃣ USER TABLE (Inactive)
    ------------------------- */
    const [userResult] = await connection.query(
      `
      INSERT INTO user
        (adminId, fullName, email, phone, gender, roleId, branchId, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Inactive')
      `,
      [
        adminId,
        fullName,
        email || null,
        phone,
        gender,
        4,          // MEMBER roleId
        branchId
      ]
    );

    const userId = userResult.insertId;

    /* -------------------------
       2️⃣ BOOKING REQUEST
       (memberId = NULL)
    ------------------------- */
    await connection.query(
      `
      INSERT INTO booking_requests
        (memberId, branchId, status)
      VALUES (NULL, ?, 'pending')
      `,
      [branchId]
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Request submitted. Waiting for admin approval.",
      data: {
        userId,
        adminId,
        userStatus: "Inactive",
        bookingStatus: "pending"
      }
    });

  } catch (err) {
    await connection.rollback();
    console.error("Create Booking Error:", err);

    res.status(500).json({
      success: false,
      message: err.sqlMessage || "Failed to create booking request"
    });
  } finally {
    connection.release();
  }
};



export const getBookingRequestsForAdmin = async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required"
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        br.id                    AS bookingRequestId,
        br.status                AS bookingStatus,
        br.createdAt,

        -- MEMBER (NULL if pending)
        m.id                     AS memberId,
        m.fullName               AS memberName,
        m.phone                  AS memberPhone,
        m.gender                 AS memberGender,
        m.status                 AS memberStatus,

        -- USER (always available)
        u.id                     AS userId,
        u.fullName               AS userName,
        u.phone                  AS userPhone,
        u.gender                 AS userGender,
        u.status                 AS userStatus,

        -- BRANCH
        b.id                     AS branchId,
        b.name                   AS branchName

      FROM booking_requests br

      /* member only exists after approval */
      LEFT JOIN member m 
        ON br.memberId = m.id

      /* user comes either via member OR directly */
      LEFT JOIN user u 
        ON u.id = m.userId
        OR (m.id IS NULL AND u.branchId = br.branchId)

      LEFT JOIN branch b 
        ON b.id = br.branchId

      WHERE u.adminId = ?
      ORDER BY br.createdAt DESC
      `,
      [adminId]
    );

    res.json({
      success: true,
      message: "Booking requests fetched successfully",
      total: rows.length,
      data: rows
    });

  } catch (err) {
    console.error("Get Booking Requests Error:", err);
    res.status(500).json({
      success: false,
      message: err.sqlMessage || "Failed to fetch booking requests"
    });
  }
};





/* --------------------------------------------------------
   GET ALL BOOKING REQUESTS (ADMIN)
-------------------------------------------------------- */
// export const getAllBookingRequests = async (req, res) => {
//   try {
//    const [rows] = await pool.query(`
//   SELECT 
//     br.*,
//     m.fullName AS memberName,
//     c.className,
//     IFNULL(a.fullName, 'Pending') AS adminName
//   FROM booking_requests br
//   LEFT JOIN member m ON m.id = br.memberId
//   LEFT JOIN classschedule c ON c.id = br.classId
//   LEFT JOIN user a ON a.id = br.adminId
//   LEFT JOIN branch b ON b.id = br.branchId
//   ORDER BY br.createdAt DESC
// `);


//     res.json({ success: true, requests: rows });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


export const getAllBookingRequests = async (req, res, next) => {
  try {
    const adminId = Number(req.query.adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required"
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        br.*,

        u.fullName AS memberName,        -- ✅ from user table
        u.email AS memberEmail,
        u.phone AS memberPhone,

        c.className,

        IFNULL(a.fullName, 'Pending') AS adminName,
        b.name AS branchName

      FROM booking_requests br

      -- booking → member
      LEFT JOIN member m 
        ON m.id = br.memberId

      -- member → user (MAIN FIX)
      LEFT JOIN user u 
        ON u.id = m.userId

      -- class
      LEFT JOIN classschedule c 
        ON c.id = br.classId

      -- admin user
      LEFT JOIN user a 
        ON a.id = br.adminId

      -- branch
      LEFT JOIN branch b 
        ON b.id = br.branchId

      WHERE br.adminId = ?
      ORDER BY br.createdAt DESC
      `,
      [adminId]
    );

    res.json({
      success: true,
      data: rows
    });

  } catch (err) {
    next(err);
  }
};

// export const getAllBookingRequests = async (req, res) => {
//   try {
//     const adminId = Number(req.query.adminId); // recommended

//     if (!adminId) {
//       return res.status(400).json({
//         success: false,
//         message: "adminId is required"
//       });
//     }

//     const [rows] = await pool.query(
//       `
//       SELECT 
//         br.*,
//         m.fullName AS memberName,
//         c.className,
//         IFNULL(a.fullName, 'Pending') AS adminName,
//         b.name AS branchName
//       FROM booking_requests br
//       LEFT JOIN member m ON m.id = br.memberId
//       LEFT JOIN classschedule c ON c.id = br.classId
//       LEFT JOIN user a ON a.id = br.adminId
//       LEFT JOIN branch b ON b.id = br.branchId
//       WHERE br.adminId = ?
//       ORDER BY br.createdAt DESC
//       `,
//       [adminId]
//     );

//     res.json({ success: true, requests: rows });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getAllBookingRequests = async (req, res) => {
//   try {
//     const adminId = Number(req.query.adminId);

//     if (!adminId) {
//       return res.status(400).json({
//         success: false,
//         message: "adminId is required"
//       });
//     }

//     const [rows] = await pool.query(
//       `
//       SELECT 
//         br.*,
//         m.fullName AS memberName,
//         c.className,
//         IFNULL(a.fullName, 'Pending') AS adminName
//       FROM booking_requests br
//       LEFT JOIN member m ON m.id = br.memberId
//       LEFT JOIN classschedule c ON c.id = br.classId
//       LEFT JOIN user a ON a.id = br.adminId
//       WHERE br.adminId = ?
//       ORDER BY br.createdAt DESC
//       `,
//       [adminId]
//     );

//     res.json({ success: true, requests: rows });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
/* --------------------------------------------------------
   APPROVE BOOKING (ADMIN)
-------------------------------------------------------- */
/* --------------------------------------------------------
   APPROVE BOOKING (ADMIN)
-------------------------------------------------------- */
export const approveBooking = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId } = req.body;   // ⭐ adminId payload se aa raha hai

    // Validate adminId
    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required in the payload",
      });
    }

    const [result] = await pool.query(
      `
      UPDATE booking_requests
      SET status = 'approved',
          adminId = ?,
          updatedAt = NOW()
      WHERE id = ?
      `,
      [adminId, requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking request not found",
      });
    }

    res.json({
      success: true,
      message: "Booking approved successfully",
    });

  } catch (err) {
    console.error("approveBooking Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};
export const getBookingRequestsByMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        br.*,
        c.className,
        IFNULL(a.fullName, 'Pending') AS adminName
      FROM booking_requests br
      LEFT JOIN classschedule c ON c.id = br.classId
      LEFT JOIN user a ON a.id = br.adminId
      WHERE br.memberId = ?
      ORDER BY br.createdAt DESC
      `,
      [memberId]
    );

    res.json({
      success: true,
      requests: rows,
    });

  } catch (err) {
    console.error("getBookingRequestsByMember Error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};




/* --------------------------------------------------------
   REJECT BOOKING (ADMIN)
-------------------------------------------------------- */
/* --------------------------------------------------------
   REJECT BOOKING (ADMIN)
-------------------------------------------------------- */
export const rejectBooking = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required in the payload",
      });
    }

    const [result] = await pool.query(
      `
      UPDATE booking_requests
      SET status = 'rejected',
          adminId = ?,
          updatedAt = NOW()
      WHERE id = ?
      `,
      [adminId, requestId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking request not found",
      });
    }

    res.json({
      success: true,
      message: "Booking rejected successfully",
    });

  } catch (err) {
    console.error("rejectBooking Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getBookingRequestsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        br.*,
        m.fullName AS memberName,
        c.className,
        IFNULL(a.fullName, 'Pending') AS adminName
      FROM booking_requests br
      LEFT JOIN member m ON m.id = br.memberId
      LEFT JOIN classschedule c ON c.id = br.classId
      LEFT JOIN user a ON a.id = br.adminId
      WHERE br.branchId = ?
      ORDER BY br.createdAt DESC
      `,
      [branchId]
    );

    res.json({
      success: true,
      requests: rows,
    });

  } catch (err) {
    console.error("getBookingRequestsByBranch Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// export const getBookingRequestsByAdmin = async (req, res) => {
//   try {
//     const { adminId } = req.params;

//     if (!adminId) {
//       return res.status(400).json({
//         success: false,
//         message: "adminId is required",
//       });
//     }

//     const [rows] = await pool.query(
//       `
//       SELECT 
//         br.*,
//         m.fullName AS memberName,
//         c.className,
//         IFNULL(a.fullName, 'Pending') AS adminName
//       FROM booking_requests br
//       LEFT JOIN member m ON m.id = br.memberId
//       LEFT JOIN classschedule c ON c.id = br.classId
//       LEFT JOIN user a ON a.id = br.adminId
//       WHERE br.adminId = ?
//       ORDER BY br.updatedAt DESC
//       `,
//       [adminId]
//     );

    

//     res.json({
//       success: true,
//       requests: rows,
//     });

//   } catch (err) {
//     console.error("getBookingRequestsByAdmin Error:", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
export const getBookingRequestsByAdmin = async (req, res) => {
  try {
    const { adminId } = req.params;

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    /* -----------------------------------------
       1️⃣ APPROVED COUNT (THIS ADMIN ONLY)
    ------------------------------------------ */
    const [[approved]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM booking_requests
       WHERE adminId = ? AND status = 'approved'`,
      [adminId]
    );

    /* -----------------------------------------
       2️⃣ REJECTED COUNT (THIS ADMIN ONLY)
    ------------------------------------------ */
    const [[rejected]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM booking_requests
       WHERE adminId = ? AND status = 'rejected'`,
      [adminId]
    );

    /* -----------------------------------------
       3️⃣ PENDING COUNT (GLOBAL — adminId = NULL)
       👉 Pending requests kisi admin ko assign nahi hoti
    ------------------------------------------ */
    const [[pending]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM booking_requests
       WHERE status = 'pending'`
    );

    /* -----------------------------------------
       4️⃣ ALL APPROVED + REJECTED REQUESTS BY ADMIN
    ------------------------------------------ */
    const [rows] = await pool.query(
      `
      SELECT 
        br.*,
        m.fullName AS memberName,
        c.className,
        IFNULL(a.fullName, 'Pending') AS adminName
      FROM booking_requests br
      LEFT JOIN member m ON m.id = br.memberId
      LEFT JOIN classschedule c ON c.id = br.classId
      LEFT JOIN user a ON a.id = br.adminId
      WHERE br.adminId = ?
      ORDER BY br.updatedAt DESC
      `,
      [adminId]
    );

    /* -----------------------------------------
       5️⃣ FINAL RESPONSE
       👉 summary + requests BOTH return
    ------------------------------------------ */
    res.json({
      success: true,
      summary: {
        pending: pending.total,
        approved: approved.total,
        rejected: rejected.total,
      },
      requests: rows,
    });

  } catch (err) {
    console.error("getBookingRequestsByAdmin Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const createPTBooking = async (req, res) => {
  try {
    const {
      memberId,
      trainerId,
      sessionId,   // ⭐ NEW FIELD
      date,
      startTime,
      endTime,
      bookingStatus,
      paymentStatus,
      notes,
      branchId
    } = req.body;

    // VALIDATION
    if (!memberId || !trainerId || !sessionId || !date || !startTime || !endTime || !branchId) {
      return res.status(400).json({
        success: false,
        message: "memberId, trainerId, sessionId, date, time and branchId are required"
      });
    }

    await pool.query(
      `
      INSERT INTO pt_bookings 
      (memberId, trainerId, sessionId, date, startTime, endTime, bookingStatus, paymentStatus, notes, branchId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        memberId,
        trainerId,
        sessionId,        // ⭐ NEW DATA INSERT
        date,
        startTime,
        endTime,
        bookingStatus || "Booked",
        paymentStatus || "Pending",
        notes || "",
        branchId
      ]
    );

    res.json({
      success: true,
      message: "Personal training session booked successfully!"
    });

  } catch (err) {
    console.error("createPTBooking ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};




export const createGroupBooking = async (req, res) => {
  try {
    const {
      memberId,
      classId,
      date,
      startTime,
      endTime,
      bookingStatus,
      paymentStatus,
      notes,
      branchId
    } = req.body;

    if (!memberId || !classId || !date || !startTime || !endTime || !branchId) {
      return res.status(400).json({ success: false, message: "All required fields missing" });
    }

    await pool.query(
      `
      INSERT INTO group_class_bookings 
      (memberId, classId, date, startTime, endTime, bookingStatus, paymentStatus, notes, branchId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        memberId,
        classId,
        date,
        startTime,
        endTime,
        bookingStatus || "Booked",
        paymentStatus || "Pending",
        notes || "",
        branchId
      ]
    );

    res.json({
      success: true,
      message: "Group class booked successfully!"
    });

  } catch (err) {
    console.error("createGroupBooking ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getGroupBookingsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required"
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        g.*,
        m.fullName AS memberName,
        c.className
      FROM group_class_bookings g
      LEFT JOIN member m ON m.id = g.memberId
      LEFT JOIN classschedule c ON c.id = g.classId
      WHERE g.branchId = ?
      ORDER BY g.date DESC, g.startTime DESC
      `,
      [branchId]
    );

    res.json({
      success: true,
      bookings: rows,
    });

  } catch (err) {
    console.error("getGroupBookingsByBranch ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getPTBookingsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required"
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        p.*,

        -- Member details
        m.id AS memberId,
        um.fullName AS memberName,

        -- Trainer details
        t.id AS trainerId,
        ut.fullName AS trainerName,

        -- PT Session Name
        s.sessionName

      FROM pt_bookings p
      
      LEFT JOIN member m ON m.id = p.memberId
      LEFT JOIN user um ON um.id = m.userId      -- ⭐ Member full name from user table

      LEFT JOIN staff t ON t.id = p.trainerId
      LEFT JOIN user ut ON ut.id = t.userId      -- ⭐ Trainer full name from user table

      LEFT JOIN session s ON s.id = p.sessionId

      WHERE p.branchId = ?
      ORDER BY p.date DESC, p.startTime DESC
      `,
      [branchId]
    );

    res.json({
      success: true,
      bookings: rows,
    });

  } catch (err) {
    console.error("getPTBookingsByBranch ERROR:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getPTBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [[row]] = await pool.query(
      `
      SELECT 
        p.*,
        um.fullName AS memberName,
        ut.fullName AS trainerName,
        s.sessionName
      FROM pt_bookings p
      LEFT JOIN member m ON m.id = p.memberId
      LEFT JOIN user um ON um.id = m.userId
      LEFT JOIN staff t ON t.id = p.trainerId
      LEFT JOIN user ut ON ut.id = t.userId
      LEFT JOIN session s ON s.id = p.sessionId
      WHERE p.id = ?
      `,
      [bookingId]
    );

    if (!row) {
      return res.status(404).json({
        success: false,
        message: "PT Booking not found",
      });
    }

    res.json({ success: true, booking: row });

  } catch (err) {
    console.error("getPTBookingById →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getPTBookingsByMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        p.*,
        ut.fullName AS trainerName,
        s.sessionName
      FROM pt_bookings p
      LEFT JOIN staff t ON t.id = p.trainerId
      LEFT JOIN user ut ON ut.id = t.userId
      LEFT JOIN session s ON s.id = p.sessionId
      WHERE p.memberId = ?
      ORDER BY p.date DESC
      `,
      [memberId]
    );

    res.json({ success: true, bookings: rows });

  } catch (err) {
    console.error("getPTBookingsByMember →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getPTBookingsByTrainer = async (req, res) => {
  try {
    const { trainerId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        p.*,
        um.fullName AS memberName,
        s.sessionName
      FROM pt_bookings p
      LEFT JOIN member m ON m.id = p.memberId
      LEFT JOIN user um ON um.id = m.userId
      LEFT JOIN session s ON s.id = p.sessionId
      WHERE p.trainerId = ?
      ORDER BY p.date DESC
      `,
      [trainerId]
    );

    res.json({ success: true, bookings: rows });

  } catch (err) {
    console.error("getPTBookingsByTrainer →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const updatePTBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { date, startTime, endTime, bookingStatus, paymentStatus, notes } = req.body;

    const [result] = await pool.query(
      `
      UPDATE pt_bookings
      SET date = ?, startTime = ?, endTime = ?, bookingStatus = ?, paymentStatus = ?, notes = ?, updatedAt = NOW()
      WHERE id = ?
      `,
      [date, startTime, endTime, bookingStatus, paymentStatus, notes, bookingId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: "PT Booking not found" });

    res.json({ success: true, message: "PT Booking updated" });

  } catch (err) {
    console.error("updatePTBooking →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const deletePTBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [result] = await pool.query(
      `DELETE FROM pt_bookings WHERE id = ?`,
      [bookingId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: "PT Booking not found" });

    res.json({ success: true, message: "PT Booking deleted" });

  } catch (err) {
    console.error("deletePTBooking →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getGroupBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [[row]] = await pool.query(
      `
      SELECT 
        g.*,
        m.fullName AS memberName,
        c.className
      FROM group_class_bookings g
      LEFT JOIN member m ON m.id = g.memberId
      LEFT JOIN classschedule c ON c.id = g.classId
      WHERE g.id = ?
      `,
      [bookingId]
    );

    if (!row)
      return res.status(404).json({ success: false, message: "Group booking not found" });

    res.json({ success: true, booking: row });

  } catch (err) {
    console.error("getGroupBookingById →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getGroupBookingsByMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        g.*,
        c.className
      FROM group_class_bookings g
      LEFT JOIN classschedule c ON c.id = g.classId
      WHERE g.memberId = ?
      ORDER BY g.date DESC
      `,
      [memberId]
    );

    res.json({ success: true, bookings: rows });

  } catch (err) {
    console.error("getGroupBookingsByMember →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const updateGroupBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { date, startTime, endTime, bookingStatus, paymentStatus, notes } = req.body;

    const [result] = await pool.query(
      `
      UPDATE group_class_bookings
      SET date = ?, startTime = ?, endTime = ?, bookingStatus = ?, paymentStatus = ?, notes = ?, updatedAt = NOW()
      WHERE id = ?
      `,
      [date, startTime, endTime, bookingStatus, paymentStatus, notes, bookingId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: "Group booking not found" });

    res.json({ success: true, message: "Group booking updated" });

  } catch (err) {
    console.error("updateGroupBooking →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const deleteGroupBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [result] = await pool.query(
      `DELETE FROM group_class_bookings WHERE id = ?`,
      [bookingId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ success: false, message: "Group booking not found" });

    res.json({ success: true, message: "Group booking deleted" });

  } catch (err) {
    console.error("deleteGroupBooking →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// unfied 


export const createUnifiedBooking = async (req, res) => {
    console.log("Unified Booking Bodyyyy:", req.body);
  try {
    const {
      memberId,
      trainerId,
      sessionId,
      classId,
      date,
      endDate,
      startTime,
      endTime,
      bookingType,
      notes,
      branchId= null,
      bookingStatus,
      paymentStatus,
      price
    } = req.body;

    // BASIC VALIDATION
    if (!memberId || !date || !startTime || !endTime || !bookingType) {
      return res.status(400).json({
        success: false,
        message: "memberId, date, startTime, endTime, bookingType, are required"
      });
    }

    // PT Booking Validation
    // if (bookingType === "PT" && !trainerId) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "PT booking requires trainerId and sessionId"
    //   });
    // }
    if (bookingType === "PT") {
      if (!trainerId) {
        return res.status(400).json({
          success: false,
          message: "PT booking requires trainerId"
        });
      }
      if (!endDate) {
        return res.status(400).json({
          success: false,
          message: "PT booking requires endDate"
        });
      }
    }

    // Group Booking Validation
    if (bookingType === "GROUP" && !classId) {
      return res.status(400).json({
        success: false,
        message: "Group booking requires classId"
      });
    }

    await pool.query(
      `
      INSERT INTO unified_bookings 
      (memberId, trainerId, sessionId, classId, date,endDate ,startTime, endTime, bookingType, bookingStatus, paymentStatus,price ,notes, branchId)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        memberId,
        trainerId || null,
        sessionId || null,
        classId || null,
        date,
        bookingType === "PT" ? endDate : null,
        startTime,
        endTime,
        bookingType,
        bookingStatus,
        paymentStatus,
        price,
        notes || "",
        branchId
      ]
    );

    res.json({
      success: true,
      message: "Booking created successfully!"
    });

  } catch (err) {
    console.error("createUnifiedBooking ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// export const getUnifiedBookingsByBranch = async (req, res) => {
//   try {
//     const { branchId } = req.params;

//     const [rows] = await pool.query(
//       `
//       SELECT 
//         b.*,
//         um.fullName AS memberName,
//         ut.fullName AS trainerName,
//         s.sessionName,
//         c.className
//       FROM unified_bookings b
//       LEFT JOIN member m ON m.id = b.memberId
//       LEFT JOIN user um ON um.id = m.userId

//       LEFT JOIN staff t ON t.id = b.trainerId
//       LEFT JOIN user ut ON ut.id = t.userId

//       LEFT JOIN session s ON s.id = b.sessionId
//       LEFT JOIN classschedule c ON c.id = b.classId

//       WHERE b.branchId = ?
//       ORDER BY b.date DESC, b.startTime DESC
//       `,
//       [branchId]
//     );

//     res.json({ success: true, bookings: rows });

//   } catch (err) {
//     console.error("getUnifiedBookingsByBranch ERROR →", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

// export const getUnifiedBookingsByBranch = async (req, res) => {
//   try {
//     const { adminId } = req.params;

//     const [rows] = await pool.query(
//       `
//       SELECT 
//         b.*,
//         um.fullName AS memberName,
//         ut.fullName AS trainerName,
//         s.sessionName,
//         c.className
//       FROM unified_bookings b
      
//       -- Member Details Join
//       LEFT JOIN member m ON m.id = b.memberId
//       LEFT JOIN user um ON um.id = m.userId
      
//       /******************************************************
//        * TRAINER JOIN UPDATED  
//        * Pehle hum staff table join kar rahe the:
//        *   LEFT JOIN staff t ON t.id = b.trainerId
//        *   LEFT JOIN user ut ON ut.id = t.userId
//        *
//        * Lekin ab trainerId = user table ki ID hai,
//        * isliye direct user table se join kiya hai.
//        ******************************************************/
//       LEFT JOIN user ut ON ut.id = b.trainerId

//       -- Session & Class Join
//       LEFT JOIN session s ON s.id = b.sessionId
//       LEFT JOIN classschedule c ON c.id = b.classId

//       WHERE b.branchId = ?
//       ORDER BY b.date DESC, b.startTime DESC
//       `,
//       [branchId]
//     );

//     res.json({ success: true, bookings: rows });

//   } catch (err) {
//     console.error("getUnifiedBookingsByBranch ERROR →", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };
export const getUnifiedBookingsByBranch = async (req, res) => {
  try {
    const { adminId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        b.*,
        um.fullName AS memberName,
        ut.fullName AS trainerName,
        s.sessionName,
        c.className
      FROM unified_bookings b
       
      -- Join to get member details
      LEFT JOIN member m ON m.id = b.memberId
      LEFT JOIN user um ON um.id = m.userId

      -- Join to get trainer details
      LEFT JOIN user ut ON ut.id = b.trainerId

      -- Join to get session and class details
      LEFT JOIN session s ON s.id = b.sessionId
      LEFT JOIN classschedule c ON c.id = b.classId

      -- Filter by adminId from member table (adminId is now coming from member table)
      WHERE m.adminId = ?
      ORDER BY b.date DESC, b.startTime DESC
      `,
      [adminId]  // Using adminId from the URL parameter
    );

    res.json({ success: true, bookings: rows });

  } catch (err) {
    console.error("getUnifiedBookingsByBranch ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


export const getUnifiedBookingsByTrainer = async (req, res) => {
  try {
    const { trainerId } = req.params;

    const [rows] = await pool.query(
      `
      SELECT 
        b.*,
        m.fullName AS memberName,
        s.sessionName
      FROM unified_bookings b
      LEFT JOIN member m ON m.id = b.memberId
      LEFT JOIN user um ON um.id = m.userId
      LEFT JOIN session s ON s.id = b.sessionId
      WHERE b.trainerId = ? AND b.bookingType = 'PT'
      ORDER BY b.date DESC
      `,
      [trainerId]
    );

    res.json({ success: true, bookings: rows });

  } catch (err) {
    console.error("ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// export const getUnifiedPersonalAndGeneralTrainersService = async (req,res) => {
//   const aid = Number(adminId);
//   if (!aid) throw { status: 400, message: "adminId is required" };

//   const [rows] = await pool.query(
//     `SELECT 
//        u.id,
//        u.fullName,
//        u.email,
//        u.phone,
//        u.branchId,
//        u.roleId
//      FROM user u
//      WHERE u.roleId IN (5, 6)
//        AND u.adminId = ?
//      ORDER BY u.id DESC`,
//     [aid]
//   );

//   return rows;
// };
export const getUnifiedPersonalAndGeneralTrainersService = async (req, res) => {
  try {
    // adminId should come from auth middleware or params/query
    const adminId = Number(req.user?.adminId || req.params.adminId);

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required"
      });
    }

    const [rows] = await pool.query(
  `
  SELECT 
    u.id,
    u.fullName,
    u.email,
    u.phone,
    u.branchId,
    u.roleId
  FROM user u
  WHERE u.roleId IN (5, 6)
    AND u.adminId = ?
    AND NOT EXISTS (
      SELECT 1
      FROM unified_bookings b
      WHERE b.trainerId = u.id
        AND b.bookingType = 'PT'
        AND b.bookingStatus = 'Booked'
        AND b.paymentStatus = 'Paid'
    )
  ORDER BY u.id DESC
  `,
  [adminId]
);

    return res.status(200).json({
      success: true,
      trainers: rows
    });

  } catch (error) {
    console.error("getUnifiedPersonalAndGeneralTrainersService ERROR →", error);
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getUnifiedBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        b.*,
        ut.fullName AS trainerName,       -- trainer name
        s.sessionName,                    -- session name (for PT)
        cs.className                      -- class name (for GROUP)
      FROM unified_bookings b
      LEFT JOIN staff t ON t.id = b.trainerId
      LEFT JOIN user ut ON ut.id = t.userId
      LEFT JOIN session s ON s.id = b.sessionId
      LEFT JOIN classschedule cs ON cs.id = b.classId   -- class name yahi se aata hai
      WHERE b.id = ?
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.json({
      success: true,
      booking: rows[0],
    });

  } catch (err) {
    console.error("getUnifiedBookingById ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};


// export const updateUnifiedBooking = async (req, res) => {
//   try {
//     const { bookingId } = req.params;
//     const { date, startTime, endTime, bookingStatus, paymentStatus, notes } = req.body;

//     const [result] = await pool.query(
//       `
//       UPDATE unified_bookings
//       SET date=?, startTime=?, endTime=?, bookingStatus=?, paymentStatus=?, notes=?, updatedAt=NOW()
//       WHERE id=?
//       `,
//       [date, startTime, endTime, bookingStatus, paymentStatus, notes, bookingId]
//     );

//     if (!result.affectedRows)
//       return res.status(404).json({ success: false, message: "Booking not found" });

//     res.json({ success: true, message: "Booking updated!" });

//   } catch (err) {
//     console.error("ERROR →", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };


// export const updateUnifiedBooking = async (req, res) => {
//   try {
//     const { id } = req.params;

//     if (!id) {
//       return res.status(400).json({
//         success: false,
//         message: "Booking ID is required",
//       });
//     }

//     const {
//       trainerId,
//       sessionId,
//       classId,
//       date,
//       startTime,
//       endTime,
//       bookingType,
//       bookingStatus,
//       paymentStatus,
//       notes,
//     } = req.body;

//     // Build dynamic SET query
//     let fields = [];
//     let params = [];

//     if (trainerId !== undefined) {
//       fields.push("trainerId = ?");
//       params.push(trainerId);
//     }
//     if (sessionId !== undefined) {
//       fields.push("sessionId = ?");
//       params.push(sessionId);
//     }
//     if (classId !== undefined) {
//       fields.push("classId = ?");
//       params.push(classId);
//     }
//     if (date !== undefined) {
//       fields.push("date = ?");
//       params.push(date);
//     }
//     if (startTime !== undefined) {
//       fields.push("startTime = ?");
//       params.push(startTime);
//     }
//     if (endTime !== undefined) {
//       fields.push("endTime = ?");
//       params.push(endTime);
//     }
//     if (bookingType !== undefined) {
//       fields.push("bookingType = ?");
//       params.push(bookingType);
//     }
//     if (bookingStatus !== undefined) {
//       fields.push("bookingStatus = ?");
//       params.push(bookingStatus);
//     }
//     if (paymentStatus !== undefined) {
//       fields.push("paymentStatus = ?");
//       params.push(paymentStatus);
//     }
//     if (notes !== undefined) {
//       fields.push("notes = ?");
//       params.push(notes);
//     }

//     if (fields.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "At least one field is required to update",
//       });
//     }

//     params.push(id);

//     const updateQuery = `
//       UPDATE unified_bookings
//       SET ${fields.join(", ")}
//       WHERE id = ?
//     `;

//     const [result] = await pool.query(updateQuery, params);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Booking not found",
//       });
//     }

//     res.json({
//       success: true,
//       message: "Booking updated successfully",
//     });

//   } catch (err) {
//     console.error("updateUnifiedBooking ERROR →", err);
//     res.status(500).json({ success: false, message: err.message });
//   }
// };

export const updateUnifiedBooking = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Booking ID is required",
      });
    }

    const {
      trainerId,
      sessionId,
      classId,
      date,
      endDate,
      startTime,
      endTime,
      bookingType,
      bookingStatus,
      paymentStatus,
      price,
      notes,
      branchId
    } = req.body;

    // -------------------------
    // BUSINESS VALIDATION
    // -------------------------
    // if (bookingType === "PT") {
    //   if (trainerId === null) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "PT booking requires trainerId",
    //     });
    //   }
    //   if (endDate === null) {
    //     return res.status(400).json({
    //       success: false,
    //       message: "PT booking requires endDate",
    //     });
    //   }
    // }

    // if (bookingType === "GROUP" && classId === null) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Group booking requires classId",
    //   });
    // }

    // -------------------------
    // DYNAMIC UPDATE
    // -------------------------
    let fields = [];
    let params = [];

    if (trainerId !== undefined) {
      fields.push("trainerId = ?");
      params.push(trainerId);
    }
    if (sessionId !== undefined) {
      fields.push("sessionId = ?");
      params.push(sessionId);
    }
    if (classId !== undefined) {
      fields.push("classId = ?");
      params.push(classId);
    }
    if (date !== undefined) {
      fields.push("date = ?");
      params.push(date);
    }
    if (endDate !== undefined) {
      fields.push("endDate = ?");
      params.push(endDate);
    }
    if (startTime !== undefined) {
      fields.push("startTime = ?");
      params.push(startTime);
    }
    if (endTime !== undefined) {
      fields.push("endTime = ?");
      params.push(endTime);
    }
    if (bookingType !== undefined) {
      fields.push("bookingType = ?");
      params.push(bookingType);
    }
    if (bookingStatus !== undefined) {
      fields.push("bookingStatus = ?");
      params.push(bookingStatus);
    }
    if (paymentStatus !== undefined) {
      fields.push("paymentStatus = ?");
      params.push(paymentStatus);
    }
    if (price !== undefined) {
      fields.push("price = ?");
      params.push(price);
    }
    if (notes !== undefined) {
      fields.push("notes = ?");
      params.push(notes);
    }
    if (branchId !== undefined) {
      fields.push("branchId = ?");
      params.push(branchId);
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required to update",
      });
    }

    params.push(id);

    const updateQuery = `
      UPDATE unified_bookings
      SET ${fields.join(", ")}
      WHERE id = ?
    `;

    const [result] = await pool.query(updateQuery, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    return res.json({
      success: true,
      message: "Booking updated successfully",
    });

  } catch (err) {
    console.error("updateUnifiedBooking ERROR →", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const deleteUnifiedBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const [result] = await pool.query(
      `DELETE FROM unified_bookings WHERE id = ?`,
      [bookingId]
    );

    if (!result.affectedRows)
      return res.status(404).json({ success: false, message: "Booking not found" });

    res.json({ success: true, message: "Booking deleted!" });

  } catch (err) {
    console.error("ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};



export const getUnifiedBookingsByMember = async (req, res) => {
  try {
    const { memberId } = req.params;

    if (!memberId) {
      return res.status(400).json({
        success: false,
        message: "memberId is required",
      });
    }

    const [rows] = await pool.query(
      `
      SELECT 
        b.*,
        ut.fullName AS trainerName,
        s.sessionName,
        c.className
      FROM unified_bookings b
      LEFT JOIN staff t ON t.id = b.trainerId
      LEFT JOIN user ut ON ut.id = t.userId
      LEFT JOIN session s ON s.id = b.sessionId
      LEFT JOIN classschedule c ON c.id = b.classId
      WHERE b.memberId = ?
      ORDER BY b.date DESC
      `,
      [memberId]
    );

    res.json({
      success: true,
      bookings: rows,
    });

  } catch (err) {
    console.error("getUnifiedBookingsByMember ERROR →", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// export const getPTBookingsByAdminId = async (req, res) => {
//   try {
//     const { adminId } = req.params;

//     // 1️⃣ Check admin exist & get his branch
//     const [adminData] = await pool.query(
//       `SELECT branchId FROM user WHERE id = ? LIMIT 1`,
//       [adminId]
//     );

//     if (adminData.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Admin not found"
//       });
//     }

//     const branchId = adminData[0].branchId;

//     // 2️⃣ Get all bookings based on branch
//     const [bookings] = await pool.query(
//       `
//       SELECT 
//         ub.*,
//         m.fullName AS memberName,
//         t.fullName AS trainerName
//       FROM unified_bookings ub
//       LEFT JOIN user m ON m.id = ub.memberId
//       LEFT JOIN user t ON t.id = ub.trainerId
//       WHERE ub.branchId = ?
//       ORDER BY ub.date DESC
//       `,
//       [branchId]
//     );

//     return res.json({
//       success: true,
//       total: bookings.length,
//       data: bookings
//     });

//   } catch (error) {
//     console.log("Error fetching bookings:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error"
//     });
//   }
// };

// export const getPTBookingsByAdminId = async (req, res) => {
//   try {
//     const { adminId } = req.params;

//     // 1️⃣ Check admin exist & get his branch
//     const [adminData] = await pool.query(
//       `SELECT branchId FROM user WHERE id = ? LIMIT 1`,
//       [adminId]
//     );

//     if (adminData.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Admin not found"
//       });
//     }

//     const branchId = adminData[0].branchId;

//     // 2️⃣ Get ONLY PT bookings for admin's branch
//     const [bookings] = await pool.query(
//       `
//       SELECT 
//         ub.*,
//         m.fullName AS memberName,
//         t.fullName AS trainerName
//       FROM unified_bookings ub
//       LEFT JOIN member m ON m.id = ub.memberId
//       LEFT JOIN user t ON t.id = ub.trainerId
//       WHERE ub.branchId = ?
//       AND ub.bookingType = 'PT'
//       ORDER BY ub.date DESC
//       `,
//       [branchId]
//     );

//     return res.json({
//       success: true,
//       total: bookings.length,
//       data: bookings
//     });

//   } catch (error) {
//     console.log("Error fetching PT bookings:", error);
//     res.status(500).json({
//       success: false,
//       message: "Internal server error"
//     });
//   }
// };

export const getPTBookingsByAdminId = async (req, res) => {
  try {
    const { adminId } = req.params;

    // 1️⃣ Check admin exist & get his branch
    const [adminData] = await pool.query(
      `SELECT branchId FROM user WHERE id = ? LIMIT 1`,
      [adminId]
    );

    if (adminData.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Admin not found"
      });
    }

    const branchId = adminData[0].branchId;

    // 2️⃣ Get ONLY PT bookings + session name
    const [bookings] = await pool.query(
      `
      SELECT 
        ub.*,
        m.fullName AS memberName,
        t.fullName AS trainerName,
        s.sessionName
      FROM unified_bookings ub
      LEFT JOIN member m ON m.id = ub.memberId
      LEFT JOIN user t ON t.id = ub.trainerId
      LEFT JOIN session s ON s.id = ub.sessionId
      WHERE ub.branchId = ?
      AND ub.bookingType = 'PT'
      ORDER BY ub.date DESC
      `,
      [branchId]
    );

    return res.json({
      success: true,
      total: bookings.length,
      data: bookings
    });

  } catch (error) {
    console.log("Error fetching PT bookings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

