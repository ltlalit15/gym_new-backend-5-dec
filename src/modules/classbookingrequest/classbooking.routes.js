import { Router } from "express";
import { 
  createBookingRequest,
  getAllBookingRequests,
  approveBooking,
  rejectBooking,
  getBookingRequestsByBranch,
  getBookingRequestsByAdmin,
  createGroupBooking,
  createPTBooking,
  getGroupBookingsByBranch,
getPTBookingsByBranch
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


// group class booking
router.post("/group", createGroupBooking);
router.post("/pt", createPTBooking);
router.get("/group/:branchId", getGroupBookingsByBranch);
router.get("/pt/:branchId", getPTBookingsByBranch);

export default router;
