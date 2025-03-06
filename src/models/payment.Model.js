// const mongoose = require("mongoose");

// const paymentHistorySchema = new mongoose.Schema(
//   {
//     imprestId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Imprest",
//       required: true,
//     },
//     amount: {
//       type: Number,
//       required: true,
//     },
//     paymentType: {
//       type: String,
//       enum: ["Installment", "Full", "Partial","Credit"],
//       required: true,
//     },
//     paymentDate: {
//       type: Date,
//       default: Date.now,
//     },
//     paymentStatus: {
//       type: String,
//       enum: ["Pending", "Completed", "Failed"],
//       default: "Pending",
//     },
//     transactionDetails: {
//       type: String,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// const PaymentHistory = mongoose.model("PaymentHistory", paymentHistorySchema);
