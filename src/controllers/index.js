const Imprest = require("../models/imprest.Model.js");
const RefillAmount = require("../models/refillAmount.Model.js");
const User = require("../models/user.Model.js");
const Notification = require("../models/notification.Model.js");

function extractNameFromEmail(email) {
  try {
    const namePart = email.split("@")[0]; // Split at "@" and take the first part
    // Additional cleaning/formatting if needed (e.g., remove numbers, underscores)
    const cleanedName = namePart.replace(/[^a-zA-Z\s]/g, ""); // Remove non-alphanumeric characters
    return cleanedName.trim(); // Remove leading/trailing whitespace
  } catch (error) {
    console.error("Error extracting name from email:", error);
    return null; // Or return a default value like "Unknown"
  }
}

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

    // create notification
    const empName = extractNameFromEmail(req.user.email);
    const adminUsers = await User.find({ role: "Admin" }); // Get all admin users
    await Promise.all(
      adminUsers.map(async (admin) => {
        await createNotification(
          admin._id,
          `New imprest request raised by ${empName}  `,
          newImprest._id
        );
      })
    );

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

const getAdminData = async (req, res) => {
  const data = await Imprest.find();

  res.status(200).json({
    success: true,
    data,
  });
};

const refillAmount = async (req, res) => {
  try {
    const { refillAmount, department } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!refillAmount || refillAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid refill amount",
      });
    }

    if (!department) {
      res.status(400).json({
        success: false,
        message: "Please Select the department !",
      });
    }

    const savedImprest = new RefillAmount({
      refillAmount: refillAmount,
      department: department,
    });

    await savedImprest.save();

    await createNotification({
      userId,
      message: `New refill amount added: ${refillAmount} for department: ${department}`,
    });

    return res.status(200).json({
      success: true,
      message: "Amount refilled successfully",
      data: savedImprest,
    });
  } catch (error) {
    console.error("Error in refillAmount:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

const updateRefillAmount = async (req, res) => {
  try {
    const { newAmount } = req.body;
    const department = req.user.department;

    const data = await RefillAmount.findOne({
      department: department,
    }).sort({ createdAt: -1 });

    data.refillAmount = newAmount;
    data.managerId = req.user.id;

    // Save the updated document
    await data.save();

    res.status(200).json({
      success: true,
      message: "Updated the refill amount",
      data,
    });
  } catch (error) {
    console.log("errorrrrr in update", error);
  }
};

const getRefillAmount = async (req, res) => {
  try {
    const department = req.user.department;
    const userId = req.user.id;

    const refillAmounts = await RefillAmount.find({ department })
      .sort({
        createdAt: -1,
      })
      .limit(1);

    if (!refillAmounts.length) {
      return res
        .status(404)
        .json({ success: false, message: "No refill amounts found" });
    }

    return res.status(200).json({ success: true, data: refillAmounts });
  } catch (error) {
    console.error("Error fetching refill amounts:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

// helper function to create notification
const createNotification = async (userId, message, imprestId = null) => {
  try {
    await Notification.create({ user: userId, message, imprest: imprestId });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

const getNotification = async (req, res) => {
  if (req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Only Admin can get the notifications" });
  }

  const notifications = await Notification.find({ user: req.user._id })
    .populate("imprest", "description amount")
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    message: `Notifications fetched successfully`,
    data: notifications,
  });
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

    // notification

    const adminUsers = await User.find({ role: "Admin" }); // Get all admin users

    const managerName = extractNameFromEmail(req.user.email);

    const action = req.body.status === "Approv" ? "approved" : "rejected";
    await Promise.all(
      adminUsers.map(async (admin) => {
        await createNotification(
          admin._id,
          `Imprest request ${action} by ${managerName} manager`,
          req.params.id
        );
      })
    );

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

const updateNotificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { read } = req.body;

    const notification = await Notification.findOne({ _id: id });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found"
      });
    }

    if (read) {
      // If read is true, delete the notification
      await Notification.deleteOne({ _id: id });
      return res.status(200).json({
        success: true,
        message: "Notification deleted after being read",
        data: null
      });
    } else {
      // If read is false, update the notification
      notification.read = read;
      await notification.save();
      return res.status(200).json({
        success: true,
        message: "Notification marked as unread",
        data: notification
      });
    }
  } catch (error) {
    console.error("Error in updating notification status", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const requestUrgentFundsFromAdmin = async (req, res) => {
  try {
    const { funds_required } = req.body;
    const department = req.user.department;

    console.log("funds_required", funds_required);

    if (funds_required == 1) {
      const adminUsers = await User.find({ role: "Admin" });

      await Promise.all(
        adminUsers.map(async (admin) => {
          await createNotification(
            admin._id,
            `${department} department needs urgent funds!`
          );
        })
      );
    }

    res.status(200).json({
      success: true,
      message: "Funds requested Successfully!",
    });
  } catch (error) {
    console.log("Error in asking funds : ", error);
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
  getAdminData,
  refillAmount,
  getNotification,
  createNotification,
  getRefillAmount,
  requestUrgentFundsFromAdmin,
  updateRefillAmount,
  updateNotificationStatus,
};
