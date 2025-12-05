import express from "express";
import {
  createShift,
  getAllShifts,
  getShiftById,
  updateShift,
  deleteShift,
  updateShiftStatus
} from "./shift.controller.js";

const router = express.Router();

router.post("/create", createShift);
router.get("/all", getAllShifts);
router.get("/:id", getShiftById);
router.put("/:id", updateShift);
router.put("/status/:id", updateShiftStatus);
router.delete("/:id", deleteShift);

export default router;