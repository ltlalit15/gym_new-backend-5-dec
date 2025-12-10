


import {
  createMemberService,
  listMembersService,
  memberDetailService,
  updateMemberService,
  deleteMemberService,
  getMembersByAdminIdService,
  renewMembershipService
  
} from "./member.service.js";

export const createMember = async (req, res, next) => {
  try {
    const m = await createMemberService(req.body);
    res.json({ success: true, message: "Member created successfully", member: m });
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
    const data = req.body;

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
