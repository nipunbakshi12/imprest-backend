const Imprest = require("../models/imprest.Model.js");
const User = require("../models/user.Model.js");

// latest and correct api
const getAllImprestForEmployees = async (req, res) => {
  try {
    const employeeDepartment = req.user.department;

    const imprestRecords = await Imprest.find({
      department: employeeDepartment,
    });
    res.status(200).json(imprestRecords);
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

// old apis
const getManagerData = async (req, res) => {
  const employeeDepartment = req.user.department;

  const response = await Imprest.find({ department: employeeDepartment });

  res.json(200).message({
    success: true,
    data: response,
  });
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
};
