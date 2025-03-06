const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email:{
    type:String,
    required:true
  },
  password:{
    type:String,
    required:true
  },
  role: {
    type: String,
    required: true,
    enum: ["Manager", "Employee", "Admin"],
  },
  department: {
    type: String,
    required: true,
    enum: ["Finance", "HR", "IT", "Operations"],
    required: function () {
      return this.role === "Manager";
    },
  },
});

const User =  mongoose.model("User", userSchema);

module.exports = User ;