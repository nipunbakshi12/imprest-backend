// controllers/authController.js
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
  try {
    const { role, department } = req.body;

    // Validate department if role is Manager
    if (role === "Manager") {
      if (
        !department ||
        !["IT", "Finance", "Marketing", "HR"].includes(department)
      ) {
        return res
          .status(400)
          .json({ message: "Please select a valid department" });
      }
    }

    // Generate token with role and department info
    const token = jwt.sign(
      {
        role,
        department: role === "Manager" ? department : null,
      },
      "your_jwt_secret",
      { expiresIn: "24h" }
    );

    res.json({
      success: true,
      token,
      user: {
        role,
        department: role === "Manager" ? department : null,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { login };
