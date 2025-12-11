import { pool } from "../../config/db.js";

/**************************************
 * CLASS TYPES
 **************************************/
export const createClassTypeService = async (name) => {
  const [result] = await pool.query(
    "INSERT INTO classtype (name) VALUES (?)",
    [name]
  );
};

export const getTrainersService = async () => {
  const [rows] = await pool.query(
    `SELECT 
        u.id,
        u.fullName,
        u.email,
        u.phone,
        u.branchId,
        u.roleId
     FROM user u
     JOIN role r ON u.roleId = r.id
     WHERE r.name = 'Trainer'`
  );

  return rows;
};

export const listClassTypesService = async () => {
  const [rows] = await pool.query(
    "SELECT * FROM classtype ORDER BY id DESC"
  );
  return rows;
};

/**************************************
 * CLASS SCHEDULE
 **************************************/
export const createScheduleService = async (data) => {
  const {
    branchId,
    className,
    trainerId,
    date,
    day,
    startTime,
    endTime,
    capacity,
    status = "Active",
    members = [],
    price = 0,
  } = data;

  // validations same...

  const [result] = await pool.query(
    `INSERT INTO classschedule
      (branchId, className, trainerId, date, day, startTime, endTime, capacity, status, members, price)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      branchId,
      className,
      trainerId,
      date,
      day,
      startTime,
      endTime,
      capacity,
      status,
      JSON.stringify(members),
      price,                  // 👈 yaha finally DB me save ho raha hai
    ]
  );

  return { id: result.insertId, ...data };
};




/**************************************
 * SCHEDULE LIST
 **************************************/
export const listSchedulesService = async (branchId) => {
  const [rows] = await pool.query(
    `SELECT cs.*, u.fullName AS trainerName
     FROM classschedule cs
     LEFT JOIN user u ON cs.trainerId = u.id
     WHERE cs.branchId = ?
     ORDER BY cs.date ASC`,
    [branchId]
  );
  return rows;
};

/**************************************
 * BOOKING
 **************************************/
export const bookClassService = async (memberId, scheduleId) => {
  // Check if already booked
  const [existingRows] = await pool.query(
    "SELECT * FROM booking WHERE memberId = ? AND scheduleId = ?",
    [memberId, scheduleId]
  );

  if (existingRows.length > 0) {
    throw { status: 400, message: "Already booked for this class" };
  }

  // Check schedule exists
  const [scheduleRows] = await pool.query(
    "SELECT * FROM classschedule WHERE id = ?",
    [scheduleId]
  );

  const schedule = scheduleRows[0];
  if (!schedule) throw { status: 404, message: "Schedule not found" };

  // Check capacity
  const [bookings] = await pool.query(
    "SELECT COUNT(*) AS count FROM booking WHERE scheduleId = ?",
    [scheduleId]
  );

  const count = bookings[0]?.count ?? 0;

  if (count >= schedule.capacity) {
    throw { status: 400, message: "Class is full" };
  }

  // Insert booking
  const [result] = await pool.query(
    "INSERT INTO booking (memberId, scheduleId) VALUES (?, ?)",
    [memberId, scheduleId]
  );

  return {
    id: result.insertId,
    memberId,
    scheduleId,
  };
};


export const cancelBookingService = async (memberId, scheduleId) => {
  const [existingRows] = await pool.query(
    "SELECT * FROM booking WHERE memberId = ? AND scheduleId = ?",
    [memberId, scheduleId]
  );
  const existing = existingRows[0];
  if (!existing) throw { status: 400, message: "No booking found" };

  await pool.query(
    "DELETE FROM booking WHERE id = ?",
    [existing.id]
  );

  return true;
};

export const memberBookingsService = async (memberId) => {
  const [rows] = await pool.query(
    `SELECT b.*, cs.date, cs.startTime, cs.endTime, cs.day, cs.className AS className, u.fullName AS trainerName
     FROM booking b
     LEFT JOIN classschedule cs ON b.scheduleId = cs.id
     LEFT JOIN user u ON cs.trainerId = u.id
     WHERE b.memberId = ?
     ORDER BY b.id DESC`,
    [memberId]
  );
  return rows;
};

/**************************************
 * SCHEDULE CRUD
 **************************************/
export const getAllScheduledClassesService = async () => {
  const [rows] = await pool.query(
    `SELECT cs.*, u.fullName AS trainerName, b.name AS branchName,
            (SELECT COUNT(*) FROM booking bk WHERE bk.scheduleId = cs.id) AS membersCount
     FROM classschedule cs
     LEFT JOIN user u ON cs.trainerId = u.id
     LEFT JOIN branch b ON cs.branchId = b.id
     ORDER BY cs.id DESC`
  );

  return rows.map((item) => ({
    id: item.id,
    className: item.className,
    trainer: item.trainerName,
    branch: item.branchName,
    date: item.date,
    time: `${item.startTime} - ${item.endTime}`,
    day: item.day,
    status: item.status,
    membersCount: item.membersCount,
  }));
};

export const getScheduleByIdService = async (id) => {
  const [rows] = await pool.query(
    `SELECT cs.*, u.fullName AS trainerName, b.name AS branchName
     FROM classschedule cs
     LEFT JOIN user u ON cs.trainerId = u.id
     LEFT JOIN branch b ON cs.branchId = b.id
     WHERE cs.id = ?`,
    [id]
  );

  const schedule = rows[0];
  if (!schedule) throw { status: 404, message: "Class schedule not found" };
  return schedule;
};

// export const updateScheduleService = async (id, data) => {
//   const [existsRows] = await pool.query(
//     "SELECT * FROM classschedule WHERE id = ?",
//     [id]
//   );
//   const exists = existsRows[0];
//   if (!exists) throw { status: 404, message: "Class schedule not found" };

//   const fields = [];
//   const values = [];

//   // Note: use 'className' instead of 'classTypeId'
//   for (const key of [
//     "branchId", "className", "trainerId", "date", "day",
//     "startTime", "endTime", "capacity", "status", "members"
//   ]) {
//     if (data[key] !== undefined) {
//       fields.push(`${key} = ?`);
//       values.push(key === "members" ? JSON.stringify(data[key]) : data[key]);
//     }
//   }

//   if (fields.length === 0) return { ...exists, ...data };

//   values.push(id);
//   await pool.query(
//     `UPDATE classschedule SET ${fields.join(", ")} WHERE id = ?`,
//     values
//   );

//   return { ...exists, ...data };
// };

export const updateScheduleService = async (id, data) => {
  const [existsRows] = await pool.query(
    "SELECT * FROM classschedule WHERE id = ?",
    [id]
  );

  const exists = existsRows[0];
  if (!exists) throw { status: 404, message: "Class schedule not found" };

  const fields = [];
  const values = [];

  for (const key of [
    "branchId",
    "className",
    "trainerId",
    "date",
    "day",
    "startTime",
    "endTime",
    "capacity",
    "status",
    "members",
    "price" 
  ]) {
    if (data[key] !== undefined && data[key] !== null) {

      let value = data[key];

      // Convert members JSON
      if (key === "members") {
        value = JSON.stringify(value);
      }

      // Convert JS ISO date → MySQL datetime(3)
      if (key === "date") {
        value = new Date(value)
          .toISOString()
          .slice(0, 23)        // keep milliseconds for datetime(3)
          .replace("T", " ");  // replace T with space
      }

      fields.push(`${key} = ?`);
      values.push(value);
    }
  }

  if (fields.length === 0) return { ...exists, ...data };

  values.push(id);

  await pool.query(
    `UPDATE classschedule SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  return { ...exists, ...data };
};

// service: getPersonalAndGeneralTrainersService
export const getPersonalAndGeneralTrainersService = async () => {
  const [rows] = await pool.query(
    `SELECT 
       u.id,
       u.fullName,
       u.email,
       u.phone,
       u.branchId,
       u.roleId
     FROM user u
     WHERE u.roleId IN (5, 6)
     ORDER BY u.id DESC`
  );

  return rows;
};



export const deleteScheduleService = async (id) => {
  const [existingRows] = await pool.query(
    "SELECT * FROM classschedule WHERE id = ?",
    [id]
  );
  const existing = existingRows[0];
  if (!existing) throw { status: 404, message: "Class schedule not found" };

  // Delete bookings first
  await pool.query(
    "DELETE FROM booking WHERE scheduleId = ?",
    [id]
  );

  // Delete schedule
  await pool.query(
    "DELETE FROM classschedule WHERE id = ?",
    [id]
  );

  return true;
};


