const mongoose = require("mongoose");

const refillAmountSchema = new mongoose.Schema(
  {
    department: {
      type: String,
      enum: ["IT", "Finance", "Marketing", "HR"],
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    imprest: { type: mongoose.Schema.Types.ObjectId, ref: "imprest" },
    refillAmount: {
      type: Number,
      required: true,
    },
    refillAmountHistory: [
      {
        amount: {
          type: Number,
          required: false,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Create Model
const RefillAmount = mongoose.model("refillAmount", refillAmountSchema);

// Export the Model
module.exports = RefillAmount;
