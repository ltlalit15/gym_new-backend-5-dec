

import { Router } from "express";
import {
  createMember,
  listMembers,
  memberDetail,
  updateMember,
  deleteMember,
  getMembersByAdminId
} from "./member.controller.js";
// import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

/** Create Member — Superadmin, Admin, Staff */
router.post(
  "/create",
  // verifyToken(["Superadmin", "Admin", "Staff"]),
  createMember
);

/** List Members by Branch */
router.get(
  "/branch/:branchId",
  // verifyToken(["Superadmin", "Admin", "Staff"]),
  listMembers
);

/** Get Member Detail */
router.get(
  "/detail/:id",
  // verifyToken(["Superadmin", "Admin", "Staff"]),
  memberDetail
);

/** Update Member */
router.put(
  "/update/:id",
  // verifyToken(["Superadmin", "Admin", "Staff"]),
  updateMember
);

/** Soft Delete / Deactivate Member */
router.delete(
  "/delete/:id",
  // verifyToken(["Superadmin", "Admin", "Staff"]),
  deleteMember
);

router.get("/admin/:adminId", getMembersByAdminId);

export default router;


