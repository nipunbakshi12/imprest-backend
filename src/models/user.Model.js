const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ["Manager", "Employee", "Admin"],
  },
  department: {
    type: String,
    required: false,
    enum: ["Finance", "HR", "IT", "Operations"],
    required: function () {
      return this.role === "Manager";
    },
  },
});

module.exports = mongoose.model("User", userSchema);
