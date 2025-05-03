const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema({
  vendorName: String,
  category: String,
  rating: Number,
  payementTerms: {
    type: String,
  },
  department: String, // department this vendor belongs to
});

// Create Model
const VendorList = mongoose.model("VendorList", VendorSchema);

// Export the Model
module.exports = VendorList;
