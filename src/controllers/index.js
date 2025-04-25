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
  const data = await Imprest.find().sort({ createdAt: -1 });

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
      return res.status(400).json({
        success: false,
        message: "Please Select the department !",
      });
    }

    // Find existing record for the department
    let existingImprest = await RefillAmount.findOne({
      department: department,
    }).sort({ createdAt: -1 });

    const refillAmt = Number(refillAmount); // Ensures numeric addition
    console.log("refill amt", refillAmt);

    // console.log("amount", existingImprest.refillAmountHistory);

    if (existingImprest) {
      existingImprest.refillAmount += refillAmt;
      // Add the new refill to history
      existingImprest.refillAmountHistory.push({
        amount: refillAmt,
        date: new Date(),
      });
      await existingImprest.save();
    } else {
      existingImprest = new RefillAmount({
        refillAmount: refillAmt,
        department: department,
        refillAmountHistory: [
          {
            amount: refillAmt, // This must be present and a valid number
            date: new Date(),
          },
        ],
      });
      await existingImprest.save();
    }

    await createNotification({
      userId,
      message: `New refill amount added: ${refillAmount} for department: ${department}`,
    });

    return res.status(200).json({
      success: true,
      message: "Amount refilled successfully",
      data: existingImprest,
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

const disbursedFunds = async (req, res) => {
  try {
    const data = await RefillAmount.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Disbursed Amount fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Error in refillAmount:", error);
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

const getLedgerForAdmin = async (req, res) => {
  try {
    const fundsDisbursed = await RefillAmount.find().sort({ createdAt: 1 });
    const approvedRecords = await Imprest.find({ status: "Approv" }).sort({
      createdAt: 1,
    });

    const departments = {};

    // Process disbursed funds
    for (const fund of fundsDisbursed) {
      const dept = fund.department;
      console.log("dept", fund);
      if (!departments[dept]) {
        departments[dept] = {
          department: dept,
          totalRefill: 0,
          approvedRequests: [],
          fundsDisbursed: [],
          currentBalance: 0,
          balanceHistory: [], // Initialize balance history array
        };
      }
      departments[dept].totalRefill += Number(fund.refillAmount);
      console.log("refill amount", departments[dept].totalRefill);
      departments[dept].currentBalance += Number(fund.refillAmount);
      console.log("cyrrent balance", departments[dept].currentBalance);
      const disburshed = departments[dept].fundsDisbursed.push(fund);
      console.log("funds disbursed", disburshed);

      // Add refill history entries
      if (fund.refillAmountHistory && fund.refillAmountHistory.length > 0) {
        for (const refill of fund.refillAmountHistory) {
          console.log("reill----------------",refill)
          if (refill.amount) {
            departments[dept].balanceHistory.push({
              date: refill.date,
              type: "refill",
              amount: refill.amount,
              balance: departments[dept].currentBalance, // Current balance after this refill
              description: `Refill amount added to ${dept} department`,
              refillId: fund._id,
            });
          }
        }
      } else {
        // Handle legacy records without refill history
        departments[dept].balanceHistory.push({
          date: fund.createdAt,
          type: "refill",
          amount: fund.refillAmount,
          balance: departments[dept].currentBalance,
          description: `Refill amount added to ${dept} department`,
          refillId: fund._id,
          managerId: fund.managerId || null,
        });
      }
    }

    // Process approved requests
    for (const record of approvedRecords) {
      const dept = record.department;
      console.log("record",dept)
      const amount = Number(record.amount);
      console.log("amount",amount)

      if (!departments[dept]) {
        departments[dept] = {
          department: dept,
          totalRefill: 0,
          approvedRequests: [],
          fundsDisbursed: [],
          currentBalance: 0,
          balanceHistory: [], // Initialize balance history array
        };
      }

      const fundsBeforeApproval = departments[dept].currentBalance;
      console.log("fund b4 approval",fundsBeforeApproval)

      // Add to history before deducting from balance
      departments[dept].balanceHistory.push({
        date: record.updatedAt || record.createdAt,
        type: "expense",
        amount: amount,
        balance: fundsBeforeApproval, // Balance before this expense
        balanceAfter: fundsBeforeApproval - amount, // Balance after this expense
        description: `Approved imprest for ${
          record.requestedBy?.name || "employee"
        } - ${record.purpose || "No purpose specified"}`,
        imprestId: record._id,
        approvedBy: record.approvedBy || null,
      });

      departments[dept].approvedRequests.push({
        ...record.toObject(),
        fundsBeforeApproval,
      });

      departments[dept].currentBalance -= amount;
    }

    // Sort balance history for each department by date (newest first)
    for (const dept in departments) {
      if (
        departments[dept].balanceHistory &&
        departments[dept].balanceHistory.length > 0
      ) {
        departments[dept].balanceHistory.sort(
          (a, b) => new Date(b.date) - new Date(a.date)
        );

        // Add current balance as most recent entry
        departments[dept].balanceHistory.unshift({
          date: new Date(),
          type: "current",
          balance: departments[dept].currentBalance,
          description: "Current balance",
        });
      }
    }

    const result = Object.values(departments).map((dept) => ({
      ...dept,
      currentBalance: Number(dept.currentBalance.toFixed(2)), // rounded for UI neatness
    }));

    return res.status(200).json({
      success: true,
      message: "Ledger Fetched Successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error in ledger", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching ledger",
      error: error.message,
    });
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
    // console.log("req id", requestId);
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
        message: "Notification not found",
      });
    }

    notification.read = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: null,
    });
  } catch (error) {
    console.error("Error in updating notification status", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
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

const getAllNotification = async (req, res) => {
  const noti = await Notification.find().sort({ createdAt: -1 });

  res.json({
    success: true,
    data: noti,
  });
};

const migrateRefillHistory = async (req, res) => {
  try {
    const allRefillRecords = await RefillAmount.find();
    console.log("all refill rec", allRefillRecords);

    for (const record of allRefillRecords) {
      // Check if refillAmountHistory is a   number
      if (typeof record.refillAmountHistory === "number") {
        // Convert it to the new format (array)
        const historyValue = record.refillAmountHistory;
        record.refillAmountHistory = [
          {
            amount: historyValue,
            date: record.updatedAt,
          },
        ];
        await record.save();
        return historyValue;
      }
    }

    res.json({
      success: true,
      // data: historyValue,
    });

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
  }
};

// Run this function to migrate your data
// migrateRefillHistory();

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
  disbursedFunds,
  getLedgerForAdmin,
  getAllNotification,
  migrateRefillHistory,
};
