// backend/routes/nutritionRoute.js (FINAL FIX)
const express = require("express");
const router = express.Router();
const { getNutrition } = require("../utils/fdcAPI");

router.post("/nutrition", async (req, res) => {
  try {
    const food = (req.body.food || '').trim(); // Ensure it's trimmed immediately
    
    // CRITICAL FIX: Block empty/invalid strings here
    if (!food || food.length === 0 || food.toLowerCase() === 'unknown' || food.toLowerCase() === 'unknown food') {
      return res.json({ 
          nutrition: { 
              message: "Prediction result was too vague or empty for nutrition lookup." 
          }
      });
    }

    const result = await getNutrition(food);
    
    // Always wrap the utility result in the 'nutrition' key
    res.json({ nutrition: result });
    
  } catch (error) {
    console.error("API Route Error:", error.message);
    res.status(500).json({ error: "Internal Server Error during nutrition lookup." });
  }
});

module.exports = router;