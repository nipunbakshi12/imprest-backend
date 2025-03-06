const Imprest = require("../models/employee.Model.js");
const userModel = require("../models/user.Model.js");

// const loginUser = async (req, res) => {
//   try {
//     const { role, department } = req.body;

//     // Validate role and department
//     if (!role) {
//       return res.status(400).json({ message: "Role is required" });
//     }

//     // Get data based on role and department
//     const data = await getManagerData(role, department);

//     res.json({
//       success: true,
//       data: data,
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

const getImprest = async (req, res) => {
    try {
        const imprestRecords = await Imprest.find();
        res.status(200).json(imprestRecords);
    } catch (error) {
        res.status(500).json({ message: "Server Error", error });
    }
};

const createImprestBasedOnRoles = async (req, res) => {
    try {
        const { role } = req.user;
        const {
            department,
            description,
            amount,
            urgencyLevel,
            refillAmount,
            vendorName
        } = req.body;

        // Validate required fields
        if (!description || !amount || !urgencyLevel || !vendorName) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Create new imprest object
        const newImprest = new Imprest({
            description,
            amount,
            department: role === 'Manager' ? department : req.body.department,
            urgencyLevel,
            refillAmount,
            vendorName
        });

        // Save to database
        await newImprest.save();

        res.status(201).json({
            success: true,
            message: 'Imprest entry created successfully',
            data: newImprest
        });

    } catch (error) {
        console.error('Create Imprest Error:', error);
        res.status(500).json({ message: 'Error creating imprest entry' });
    }
};

async function getManagerData(role, department) {
    let query = { department };

    // Add role-based filtering
    switch (role) {
        case "Manager":
            return await Imprest.find(query);

        case "Admin":
            return await Imprest.find({});

        default:
            return [];
    }
}

const getImprestBasedOnRole = async (req, res) => {
    try {
        let query = {};
        const { role, department } = req.user;
        console.log("roles", role);

        switch (role) {
            case "Admin":
                break;

            case "Manager":
                query.department = department;
                break;

            case "Employee":
                break;

            default:
                return res.status(403).json({ message: "Invalid role" });
        }

        const imprestData = await Imprest.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: imprestData,
        });
    } catch (error) {
        res.status(500).json({ message: `Error fetching data ${error} ` });
    }
};

module.exports = {
    getImprest,
    createImprestBasedOnRoles,
    getManagerData,
    getImprestBasedOnRole,
};