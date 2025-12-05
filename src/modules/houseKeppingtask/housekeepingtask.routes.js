import express from "express";
import {
  createTask,
  getAllTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTasksByCategory
} from "./housekeepingtask.controller.js";

const router = express.Router();

// ---- CREATE ----
router.post("/create", createTask);

// ---- GET ALL ----
router.get("/all", getAllTasks);

// ---- FILTER BY CATEGORY ----
router.get("/category/:category", getTasksByCategory);

// ---- GET BY ID ----
router.get("/:id", getTaskById);

// ---- UPDATE ----
router.put("/:id", updateTask);

// ---- DELETE ----
router.delete("/:id", deleteTask);

export default router;
