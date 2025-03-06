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
        "APPROVED",
        "REJECTED",
        "WAITING_FOR_INVOICE",
        "WAITING_FOR_ADMIN",
        "PARTIALLY_SETTLED",
        "DUE_PAYMENT",
        "ACTIVE_INSTALLMENTS",
        "COMPLETED",
        "ESCALATED",
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
    paymentDetail: {
      type: String,
      required: false,
      enum: ["Installments", "Full Advance", "Partial Payment", "Credit"],
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
