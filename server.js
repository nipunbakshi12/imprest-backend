const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./src/config/db");
const imprestRoutes = require("./src/routes/imprest.routes.js");
const userRoutes = require("./src/routes/user.routes.js");

dotenv.config();
connectDB()

const app = express();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;

// Routes
app.use("/api", userRoutes);
app.use("/api/imprest", imprestRoutes);

app.get('/', (req, res) =>
    res.send('Hello, World!')
);


app.listen(PORT, () => console.log(`Server running on port ${PORT} 🚀`));
