const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json()); // CRITICAL: Body parser must be here

// Routes
const nutritionRoute = require("./routes/nutritionRoute");
app.use("/api", nutritionRoute); // Routes mounted at /api

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Backend running on port ${PORT}`));