import express from "express";
import { createSalary,getAllSalaries,getSalaryById,deleteSalary,
updateSalary,getSalaryByStaffId } from "./salary.controller.js";

const router = express.Router();

// CREATE SALARY
router.post("/create", createSalary);

// (Optional future routes)
 router.get("/", getAllSalaries);
 router.get("/:id", getSalaryById);
 router.get("/staff/:staffId", getSalaryByStaffId);
 router.delete("/:salaryId", deleteSalary);
 router.put("/:id", updateSalary);

export default router;
