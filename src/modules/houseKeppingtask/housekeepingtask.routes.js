import express from "express";
// import auth from "../middleware/auth.js"; // login middleware

import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  deleteTask,
  getTaskByBranchID
} from "./housekeepingtask.controller.js";

const router = express.Router();

router.post("/create", createTask);
router.get("/all", getAllTasks);
router.get("/:id", getTaskById);
router.get("/branch/:branchId", getTaskByBranchID);
router.put("/:id",  updateTask);
router.put("/status/:id", updateTaskStatus);
router.delete("/:id",  deleteTask);

export default router;
