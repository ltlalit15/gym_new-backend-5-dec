


import { uploadToCloudinary } from "../../config/cloudinary.js";
import {
  createMemberService,
  deleteMemberService,
  getMembersByAdminAndGroupPlanService,
  getMembersByAdminAndPlan,
  getMembersByAdminIdService,
  getRenewalPreviewService,
  listMembersService,
  listPTBookingsService,
  memberDetailService,
  renewMembershipService,
  updateMemberService,
  updateMemberRenewalStatusService
  
} from "./member.service.js";

export const createMember = async (req, res, next) => {
  try {
    let payload = { ...req.body };

    // ✅ profile image upload (optional)
    if (req.files?.profileImage) {
      const imageUrl = await uploadToCloudinary(
        req.files.profileImage,
        "users/profile"
      );
      payload.profileImage = imageUrl;
    }

    const m = await createMemberService(payload);

    res.json({
      success: true,
      message: "Member created successfully",
      member: m,
    });
  } catch (err) {
    next(err);
  }
};

export const renewMembershipPlan = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId);
    const { planId, paymentMode, amountPaid } = req.body;

    if (!planId || !paymentMode || amountPaid === undefined) {
      return res.status(400).json({
        success: false,
        message: "planId, paymentMode and amountPaid required ",
      });
    }

    const data = await renewMembershipService(memberId, req.body);

    res.json({
      success: true,
      message: "Membership renewed successfully",
      data,
    });
  } catch (err) {
    next(err);
  }
};


export const listMembers = async (req, res, next) => {
  try {
    const branchId = parseInt(req.params.branchId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";

    const data = await listMembersService(branchId, page, limit, search);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

export const memberDetail = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const member = await memberDetailService(id);
    res.json({ success: true, member });
  } catch (err) {
    next(err);
  }
};

export const updateMember = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    let data = { ...req.body };

    // ✅ profile image upload (optional)
    if (req.files?.profileImage) {
      const imageUrl = await uploadToCloudinary(
        req.files.profileImage,
        "users/profile"
      );
      data.profileImage = imageUrl;
    }

    const updated = await updateMemberService(id, data);

    res.json({
      success: true,
      message: "Member updated successfully",
      member: updated,
    });
  } catch (err) {
    next(err);
  }
};

export const deleteMember = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);

    await deleteMemberService(id);
    res.json({
      success: true,
      message: "Member deactivated successfully",
    });
  } catch (err) {
    next(err);
  }
};


// member.controller.js


export const getMembersByAdminId = async (req, res, next) => {
  try {
    const { adminId } = req.params; // URL: /members/admin/:adminId
    const members = await getMembersByAdminIdService(adminId);
    res.json({ success: true, data: members });
  } catch (error) {
    next(error);
  }
};

export const getRenewalPreview = async (req, res, next) => {
  try {
    const adminId = Number(req.params.adminId);

    if (!Number.isInteger(adminId)) {
      return res.status(400).json({
        success: false,
        message: "adminId must be a valid number",
      });
    }

    const data = await getRenewalPreviewService(adminId);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};

export const updateMemberRenewalStatus = async (req, res, next) => {
  try {
    const memberId = Number(req.params.memberId);
    const { status, adminId } = req.body;

    if (!Number.isInteger(memberId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid memberId",
      });
    }

    if (!adminId) {
      return res.status(400).json({
        success: false,
        message: "adminId is required",
      });
    }

    if (!["Active", "Reject"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be either Active or Reject",
      });
    }

    const data = await updateMemberRenewalStatusService(
      memberId,
      adminId,
      status
    );

    return res.status(200).json({
      success: true,
      message: `Member renewal ${status} successfully`,
      data,
    });
  } catch (err) {
    next(err);
  }
};




export const listPTBookings = async (req, res, next) => {
  try {
    const branchId = req.params.branchId;
    const data = await listPTBookingsService(branchId);

    res.json({
      success: true,
      total: data.length,
      items: data
    });
  } catch (err) {
    next(err);
  }
};


export const getMembersByAdminAndPlanController = async (req, res, next) => {
  try {
    const { adminId } = req.params;

    if (!adminId) {
      return res.status(400).json({ success: false, message: "adminId is required" });
    }

    const members = await getMembersByAdminAndPlan(adminId);

    return res.json({ success: true, members });
  } catch (err) {
    next(err);
  }
};



export const getMembersByAdminAndGroupPlanController = async (req, res, next) => {
   try {
    // CHANGED: Extract both adminId and planId from request parameters
    const { adminId, planId } = req.params;
    
    // CHANGED: Validate that both IDs are present
    if (!adminId || !planId) {
      return res.status(400).json({
        success: false,
        message: "Admin ID and Plan ID are required"
      });
    }
    
    // CHANGED: Call the updated service with both IDs
    const result = await getMembersByAdminAndGroupPlanService(adminId, planId);
    
    res.json({
      success: true,
      message: "Members for the specified plan fetched successfully",
     data: {
        plan: result.plan,
        members: result.members,
        statistics: result.statistics,
        Total_Members: result.members.length
      }
    });
  } catch (error) {
    next(error);
  }
};