

import { Router } from "express";
import {
  createMember,
  listMembers,
  memberDetail,
  updateMember,
  deleteMember,
  getMembersByAdminId,
  renewMembershipPlan,
  getRenewalPreview,
  listPTBookings,
  getMembersByAdminAndPlanController
  
} from "./member.controller.js";
// import { verifyToken } from "../../middlewares/auth.js";

const router = Router();

/** Create Member — Superadmin, Admin, Staff */
router.post(
  "/create",
  // verifyToken(["Superadmin", "Admin", "Staff"]),
  createMember
);

router.put("/renew/:memberId", renewMembershipPlan);


/** List Members by Branch */
router.get(
  "/branch/:branchId",
  // verifyToken(["Superadmin", "Admin", "Staff"]),
  listMembers
);

router.get("/renew/:memberId", getRenewalPreview);
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
router.get("/admin/:adminId/plan", getMembersByAdminAndPlanController);

router.get("/pt-bookings/:branchId", listPTBookings);

export default router;


