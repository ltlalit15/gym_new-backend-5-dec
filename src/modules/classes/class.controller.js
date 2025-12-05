import {
  createClassTypeService,
  listClassTypesService,
  createScheduleService,
  listSchedulesService,
  bookClassService,
  cancelBookingService,
  memberBookingsService,
  getAllScheduledClassesService,
  getScheduleByIdService,
  updateScheduleService,
  deleteScheduleService,
   getTrainersService
} from "./class.service.js";

export const createClassType = async (req, res, next) => {
  try {
    const r = await createClassTypeService(req.body.name); // ← yaha se sirf name ja raha hai
    res.json({ success: true, classType: r });
  } catch (err) {
    next(err);
  }
};

export const getTrainers = async (req, res, next) => {
  try {
    const trainers = await getTrainersService();
    res.json({ success: true, trainers });
  } catch (err) {
    next(err);
  }
};


export const listClassTypes = async (req, res, next) => {
  try {
    const r = await listClassTypesService();
    res.json({ success: true, classTypes: r });
  } catch (err) {
    next(err);
  }
};

// export const createSchedule = async (req, res, next) => {
//   try {
//     const r = await createScheduleService(req.body);
//     res.json({ success: true, schedule: r });
//   } catch (err) {
//     next(err);
//   }
// };



export const createSchedule = async (req, res) => {
  try {
    const schedule = await createScheduleService(req.body);

    return res.status(201).json({
      success: true,
      message: "Class schedule created successfully!",
      data: schedule,
    });

  } catch (error) {
    console.error("Create Schedule Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};


export const listSchedules = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const r = await listSchedulesService(branchId);
    res.json({ success: true, schedules: r });
  } catch (err) {
    next(err);
  }
};

export const bookClass = async (req, res, next) => {
  try {
    const { memberId, scheduleId } = req.body;
    const r = await bookClassService(memberId, scheduleId);
    res.json({ success: true, booking: r });
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const { memberId, scheduleId } = req.body;
    const r = await cancelBookingService(memberId, scheduleId);
    res.json({ success: true, message: "Booking cancelled" });
  } catch (err) {
    next(err);
  }
};

export const memberBookings = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const r = await memberBookingsService(memberId);
    res.json({ success: true, bookings: r });
  } catch (err) {
    next(err);
  }
};



// export const getAllScheduledClasses = async (req, res) => {
//   try {
//     const schedules = await getAllScheduledClassesService();

//     return res.status(200).json({
//       success: true,
//       message: "All scheduled classes fetched successfully",
//       data: schedules,
//     });

//   } catch (error) {
//     console.error("Get All Scheduled Classes Error:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message || "Something went wrong",
//     });
//   }
// };


export const getAllScheduledClasses = async (req, res) => {
  try {
    const schedules = await getAllScheduledClassesService();

    return res.status(200).json({
      success: true,
      message: "Scheduled classes fetched successfully",
      data: schedules,
    });

  } catch (error) {
    console.error("Get All Scheduled Classes Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};




export const getScheduleById = async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await getScheduleByIdService(id);

    return res.status(200).json({
      success: true,
      message: "Class schedule fetched successfully",
      data: schedule,
    });

  } catch (error) {
    console.error("Get Schedule By ID Error:", error);

    return res.status(404).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};



export const updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedSchedule = await updateScheduleService(id, req.body);

    return res.status(200).json({
      success: true,
      message: "Class schedule updated successfully",
      data: updatedSchedule,
    });

  } catch (error) {
    console.error("Update Schedule Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};



export const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    await deleteScheduleService(id);

    return res.status(200).json({
      success: true,
      message: "Scheduled class deleted successfully!",
    });

  } catch (error) {
    console.error("Delete Schedule Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};
