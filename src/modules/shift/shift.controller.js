

import {
  createShiftService,
  getAllShiftsService,
  getShiftByIdService,
  updateShiftService,
  deleteShiftService
} from "./shift.service.js";

export const createShift = async (req, res) => {
  try {
    const createdById = req.user?.id || 7;

    let { staffIds, branchId, shiftDate, startTime, endTime, shiftType, description } = req.body;

    if (!staffIds || !branchId || !shiftDate || !startTime || !endTime || !shiftType) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields"
      });
    }

    if (Array.isArray(staffIds)) {
      staffIds = staffIds.join(",");
    }

    const shift = await createShiftService({
      staffIds,
      branchId,
      shiftDate,
      startTime,
      endTime,
      shiftType,
      description,
      createdById
    });

    return res.status(201).json({
      success: true,
      message: "Shift created successfully!",
      data: shift
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllShifts = async (req, res) => {
  const shifts = await getAllShiftsService();
  return res.json({ success: true, data: shifts });
};

export const getShiftById = async (req, res) => {
  const shift = await getShiftByIdService(req.params.id);
  return res.json({ success: true, data: shift });
};

export const updateShift = async (req, res) => {
  const updated = await updateShiftService(req.params.id, req.body);
  return res.json({ success: true, message: "Shift updated", data: updated });
};

export const deleteShift = async (req, res) => {
  await deleteShiftService(req.params.id);
  return res.json({ success: true, message: "Shift deleted" });
};

// approve / reject only
export const updateShiftStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const id = req.params.id;

    if (!status) {
      return res.status(400).json({ success: false, message: "Status required" });
    }

    const updated = await updateShiftService(id, { status });
    return res.json({
      success: true,
      message: `Shift ${status} successfully`,
      data: updated
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};