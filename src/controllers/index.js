const Imprest = require("../models/imprest.Model.js");
const User = require("../models/user.Model.js");

// latest and correct api
const getAllImprestForEmployees = async (req, res) => {
  try {
    const employeeDepartment = req.user.department;
    const employeeId = req.user._id;

    const imprestRecords = await Imprest.find({
      department: employeeDepartment,
      employeeId,
    });
    res.status(200).json({
      success: true,
      count: imprestRecords.length,
      data: imprestRecords,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
};

const createImprestBasedOnRoles = async (req, res) => {
  try {
    const { role } = req.user;
    console.log("user", req.user);

    const {
      description,
      amount,
      urgencyLevel,
      refillAmount,
      vendorName,
      status,
      paymentDetail,
    } = req.body;

    // Validate required fields
    if (!description || !amount || !urgencyLevel || !vendorName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const employeeId = req.user._id;
    console.log("employee id", employeeId);
    const employeeDepartment = req.user.department;
    console.log("employee department", employeeDepartment);

    // Find the manager for this department
    const manager = await User.findOne({
      role: "Manager",
      department: employeeDepartment,
    });

    if (!manager) {
      return res.status(404).json({
        success: false,
        message: "No manager found for this department",
      });
    }

    // Create new imprest object
    const newImprest = new Imprest({
      description,
      amount,
      department: role === "Manager" ? department : employeeDepartment,
      employeeId,
      managerId: manager._id,
      urgencyLevel,
      refillAmount,
      vendorName,
      status,
      paymentDetail,
    });

    // Save to database
    await newImprest.save();

    res.status(201).json({
      success: true,
      message: "Imprest entry created successfully",
      data: newImprest,
    });

    if (role === "Admin") {
      const { refillAmount } = req.body;
      if (!refillAmount) {
        return res.status(400).json({ message: "Refill Amount if required" });
      }

      const amount = new Imprest({
        refillAmount,
      });

      await newImprest.save();

      res.status(201).json({
        success: true,
        message: "Imprest entry created successfully",
        data: amount,
      });
    }
  } catch (error) {
    console.error("Create Imprest Error:", error);
    res.status(500).json({ message: "Error creating imprest entry" });
  }
};

const getManagerData = async (req, res) => {
  try {
    // Get manager's information from authenticated user
    const managerId = req.user._id;
    const managerDepartment = req.user.department;

    // Verify if the user is actually a manager
    if (req.user.role !== "Manager") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only managers can view department requests.",
      });
    }

    // Find all imprest requests for the manager's department
    const requests = await Imprest.find({
      department: managerDepartment,
      // status: 'Pending' // You can modify this to include other statuses if needed
    })
      .populate("employeeId", "email") // Populate employee details
      .sort({ createdAt: -1 }); // Sort by newest first

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching requests",
      error: error.message,
    });
  }
};

const updateRequestStatus = async (req, res) => {
  try {
    // const { requestId } = req.params;
    const { status, remarks, requestId } = req.body;
    console.log("req id", requestId);
    const managerId = req.user._id;

    // Check if the request exists
    const imprestRequest = await Imprest.findById(requestId);
    if (!imprestRequest) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    // Verify if the user is a manager and belongs to the same department
    if (
      req.user.role === "Manager" &&
      req.user.department !== imprestRequest.department
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only update requests from your department",
      });
    }

    // Validate status transition
    const allowedStatuses = ["Approv", "Reject"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Manager can only Approv or Reject requests",
      });
    }

    // Check if the request is in a state that can be updated
    if (imprestRequest.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Can only update pending requests",
      });
    }

    // Update the request
    const updatedRequest = await Imprest.findByIdAndUpdate(
      requestId,
      {
        status,
        managerId,
        managerRemarks: remarks,
        updatedAt: Date.now(),
      },
      { new: true }
    )
      .populate("employeeId", "email")
      .populate("managerId", "email");

    // Send response
    res.status(200).json({
      success: true,
      message: `Request ${status.toLowerCase()} successfully`,
      data: updatedRequest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating request status",
      error: error.message,
    });
  }
};

const getImprestBasedOnRole = async (req, res) => {
  try {
    let query = {};
    const { role, department } = req.user;
    console.log("roles", role);

    switch (role) {
      case "Admin":
        break;

      case "Manager":
        query.department = department;
        break;

      case "Employee":
        break;

      default:
        return res.status(403).json({ message: "Invalid role" });
    }

    const imprestData = await Imprest.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: imprestData,
    });
  } catch (error) {
    res.status(500).json({ message: `Error fetching data ${error} ` });
  }
};

module.exports = {
  getAllImprestForEmployees,
  createImprestBasedOnRoles,
  getManagerData,
  getImprestBasedOnRole,
  updateRequestStatus,
};
