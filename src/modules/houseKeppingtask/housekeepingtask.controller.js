import {
  createTaskService,
  getAllTasksService,
  getTaskByIdService,
  updateTaskService,
  updateTaskStatusService,
  deleteTaskService,
  getTaskByBranchIdService,
  getTaskAsignedService
} from "./housekeepingtask.service.js";




export const createTask = async (req, res) => {
  try {
    const createdById = req.user?.id || 4; // admin id
    const { assignedTo, branchId=null, taskTitle, dueDate, priority , description} = req.body;

    if (!assignedTo || !taskTitle || !dueDate || !priority || !description) {
      return res.status(400).json({
        success: false,
        message: "Please fill all fields"
      });
    }

    const task = await createTaskService({
      assignedTo,
      branchId,
      taskTitle,
      dueDate,
      priority,
      description,
      createdById
    });

    return res.status(201).json({
      success: true,
      message: "Task created successfully!",
      data: task
    });

  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};


export const getAllTasks = async (req, res) => {
  try {
    const tasks = await getAllTasksService();
    return res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getTaskByBranchID=async(req,res)=>{
  const task=await getTaskByBranchIdService(req.params.branchId);
 try{ if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }
    return res.json({ success: true, data: task });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export const getTaskAsignedTo=async(req,res)=>{
  const task=await getTaskAsignedService(req.params.asignedtoID);
 try{ if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }
    return res.json({ success: true, data: task });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}



export const getTaskById = async (req, res) => {
  try {
    const task = await getTaskByIdService(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }
    return res.json({ success: true, data: task });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};



export const updateTask = async (req, res) => {
  try {
    const updated = await updateTaskService(req.params.id, req.body);
    return res.json({
      success: true,
      message: "Task updated successfully",
      data: updated
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;            // "Approved" | "Rejected" | "Completed"
    const id = req.params.id;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required"
      });
    }

    const updated = await updateTaskStatusService(id, status);

    return res.json({
      success: true,
      message:` Task ${status} successfully`,
      data: updated
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteTask = async (req, res) => {
  try {
    await deleteTaskService(req.params.id);
    return res.json({
      success: true,
      message: "Task deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
