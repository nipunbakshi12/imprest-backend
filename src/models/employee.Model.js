const mongoose = require("mongoose");

const imprestSchema = new mongoose.Schema(
    {
        description: {
            type: String,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        department: {
            type: String,
            required: true,
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
            required: true
        }
    },
    {
        timestamps: true,
    }
);

// Create Model
const Imprest = mongoose.model("imprest", imprestSchema);

// Export the Model
module.exports = Imprest;
