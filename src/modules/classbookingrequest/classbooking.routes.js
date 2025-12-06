import { Router } from "express";
import { 
  createBookingRequest,
  getAllBookingRequests,
  approveBooking,
  rejectBooking,
  getBookingRequestsByBranch,
  getBookingRequestsByAdmin
} from "./classbooking.controller.js";
// import { verifyToken } from "./classbookingrequest.js";   // adminId lene ke liye

const router = Router();

/* ----------------------------------------------------
   MEMBER → CREATE BOOKING REQUEST
---------------------------------------------------- */
router.post("/create", createBookingRequest);

/* ----------------------------------------------------
   ADMIN → GET ALL BOOKING REQUESTS
---------------------------------------------------- */
router.get("/requests", getAllBookingRequests);
router.get("/branch/:branchId", getBookingRequestsByBranch);
router.get("/admin/:adminId", getBookingRequestsByAdmin);

/* ----------------------------------------------------
   ADMIN → APPROVE BOOKING REQUEST
---------------------------------------------------- */
router.put("/approve/:requestId", approveBooking);

/* ----------------------------------------------------
   ADMIN → REJECT BOOKING REQUEST
---------------------------------------------------- */
router.put("/reject/:requestId", rejectBooking);

export default router;
