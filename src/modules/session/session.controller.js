import {
  createSessionService,
  listSessionsService,
  updateSessionService,
  updateSessionStatusService,
  deleteSessionService
} from "./session.service.js";

// ➤ Create
export const createSession = async (req, res, next) => {
  try {
    const r = await createSessionService(req.body);
    res.json({ success: true, message: "Session added successfully", session: r });
  } catch (err) {
    next(err);
  }
};

// ➤ List (with search)
export const listSessions = async (req, res, next) => {
  try {
    const branchId = Number(req.params.branchId);
    const search = req.query.search || "";
    const r = await listSessionsService(branchId, search);
    res.json({ success: true, sessions: r });
  } catch (err) {
    next(err);
  }
};

// ➤ Full Update (Edit Session)
export const updateSession = async (req, res, next) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const r = await updateSessionService(sessionId, req.body);
    res.json({ success: true, message: "Session updated successfully", session: r });
  } catch (err) {
    next(err);
  }
};

// ➤ Status Update Only
export const updateSessionStatus = async (req, res, next) => {
  try {
    const sessionId = Number(req.params.sessionId);
    const { status } = req.body;
    const r = await updateSessionStatusService(sessionId, status);
    res.json({ success: true, message: "Status updated", session: r });
  } catch (err) {
    next(err);
  }
};

// ➤ Delete
export const deleteSession = async (req, res, next) => {
  try {
    console.log("Delete session request received");
    const sessionId = Number(req.params.sessionId);
    await deleteSessionService(sessionId);
    res.json({ success: true, message: "Session deleted" });
  } catch (err) {
    next(err);
  }
};
