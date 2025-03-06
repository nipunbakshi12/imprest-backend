const mongoose = require("mongoose");

const imprestSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
    },
    amount: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      enum: ["IT", "Finance", "Marketing", "HR"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Approved by Manager",
        "Rejected by Manager",
        "Approved by Admin",
        "Rejected by Admin",
      ],
      default: "Pending",
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    managerRemarks: {
      type: String,
    },
    adminRemarks: {
      type: String,
    },
    urgencyLevel: {
      type: String,
      required: true,
    },
    refillAmount: {
      type: String,
      required: false,
    },
    vendorName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create Model
const Imprest = mongoose.model("imprest", imprestSchema);

// Export the Model
module.exports = Imprest;
