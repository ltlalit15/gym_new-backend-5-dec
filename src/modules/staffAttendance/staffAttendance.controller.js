import AttendanceService from "../staffAttendance/staffAttendance.services.js";

const StaffAttendanceController = {
  async create(req, res) {
    try {
      const adminUserId =
        req.user?.id || req.user?.userId || req.body.adminId;

      if (!adminUserId) {
        return res
          .status(401)
          .json({ message: "Unauthorized: admin id missing" });
      }

      const result = await AttendanceService.create(adminUserId, req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async list(req, res) {
    try {
      const adminUserId =
        req.user?.id || req.user?.userId || req.body.adminId;

      if (!adminUserId) {
        return res
          .status(401)
          .json({ message: "Unauthorized: admin id missing" });
      }

      const result = await AttendanceService.list(adminUserId, req.query);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async get(req, res) {
    try {
      const adminUserId =
        req.user?.id || req.user?.userId || req.body.adminId;

      if (!adminUserId) {
        return res
          .status(401)
          .json({ message: "Unauthorized: admin id missing" });
      }

      const id = Number(req.params.id);
      const result = await AttendanceService.getById(adminUserId, id);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async update(req, res) {
    try {
      const adminUserId =
        req.user?.id || req.user?.userId || req.body.adminId;

      if (!adminUserId) {
        return res
          .status(401)
          .json({ message: "Unauthorized: admin id missing" });
      }

      const id = Number(req.params.id);
      const updated = await AttendanceService.update(
        adminUserId,
        id,
        req.body
      );
      res.json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },

  async delete(req, res) {
    try {
      const adminUserId =
        req.user?.id || req.user?.userId || req.body.adminId;

      if (!adminUserId) {
        return res
          .status(401)
          .json({ message: "Unauthorized: admin id missing" });
      }

      const id = Number(req.params.id);
      await AttendanceService.delete(adminUserId, id);
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(err.status || 500).json({ message: err.message });
    }
  },
};

export default StaffAttendanceController;
