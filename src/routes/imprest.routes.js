const express = require("express");
const {
  getImprest,
  createImprest,
  getManagerData,
  postManagerDepartment,
  loginUser,
  getImprestBasedOnRole,
  createImprestBasedOnRoles,
  getAllImprestForEmployees,
  updateRequestStatus,
  getAdminData,
  refillAmount,
} = require("../controllers/index.js");
const { login } = require("../controllers/auth.controller.js");
const Imprest = require("../models/imprest.Model.js");
const authMiddleware = require("../middleware/auth.middleware.js");

const router = express.Router();

// login route
router.post("/login", login);

// employee data apis
router.get(
  "/getAllImprestForEmployees",
  authMiddleware,
  getAllImprestForEmployees
);
router.post("/createImprest", authMiddleware, createImprestBasedOnRoles);
router.get("/getManagerData", authMiddleware, getManagerData);
router.get("/getAdminData", getAdminData);
router.post("/refillAmount" ,refillAmount);
router.put("/updateRequestStatus/:id", authMiddleware, updateRequestStatus);

// Get imprest data based on role and department
router.get("/get-imprest-based-on-role", getImprestBasedOnRole);

module.exports = router;
