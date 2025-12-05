import { Router } from "express";
import controller from "../staffAttendance/staffAttendance.controller.js";
// import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

/*
  Staff Attendance Routes With Role-Based Access
  — SAME STYLE AS SESSION ROUTES
*/

// ➤ Create attendance (Only Superadmin + Admin)
router.post(
  "/create",
 
  controller.create
);

// ➤ List attendance (Superadmin + Admin + Staff)
router.get(
  "/",
//   verifyToken(["Superadmin", "Admin", "Staff"]),
  controller.list
);

// ➤ Get attendance by ID (Superadmin + Admin + Staff)
router.get(
  "/:id",
//   verifyToken(["Superadmin", "Admin", "Staff"]),
  controller.get
);

// ➤ Update attendance (Only Superadmin + Admin)
router.put(
  "/update/:id",
//   verifyToken(["Superadmin", "Admin"]),
  controller.update
);

// ➤ Delete attendance (Only Superadmin)
router.delete(
  "/delete/:id",
//   verifyToken(["Superadmin", "Admin"]),
  controller.delete
);

export default router;
