// backend/utils/fdcAPI.js (FINAL, GUARANTEED FIX)
const axios = require('axios');
const API_KEY = process.env.FDC_API_KEY;

async function getNutrition(foodName) {
  if (!API_KEY) {
      return { error: 'FDC_API_KEY is missing in .env file.' };
  }
    
  // --- CRITICAL FIX BLOCK STARTS HERE ---
  // 1. Sanitize the input
  const query = (foodName || '').trim(); 
    
  // 2. Fail instantly if the query is empty or a default unknown label
  if (query.length === 0 || query.toLowerCase() === 'unknown food' || query.toLowerCase() === 'unknown') {
      // This immediately returns a message to the frontend, preventing the crash.
      return { message: 'Prediction result was too vague or empty for nutrition lookup. Try a clearer image.' };
  }
  // --- CRITICAL FIX BLOCK ENDS HERE ---

  try {
    // 1. Search for the food using the safe 'query' variable
    const searchRes = await axios.get('https://api.nal.usda.gov/fdc/v1/foods/search', {
      params: {
        query: query, // Guaranteed to be non-empty and trimmed
        pageSize: 1,
        dataType: ['Survey (FNDDS)', 'Foundation', 'SR Legacy'], 
        api_key: API_KEY
      }
    });

    const foods = searchRes.data?.foods || [];
    if (!foods.length) return { message: `No USDA nutrition data found for "${query}"` };

    const fdcId = foods[0].fdcId;

    // 2. Get the full details for the top match
    const detailsRes = await axios.get(
      `https://api.nal.usda.gov/fdc/v1/food/${fdcId}`,
      { params: { api_key: API_KEY } }
    );

    const food = detailsRes.data;
    
    const nutrients = (food.foodNutrients || []).map(n => ({
      nutrientId: n.nutrient?.id || null, 
      nutrientName: n.nutrient?.name || n.nutrientName || '',
      value: n.amount ?? n.value ?? 0,
      unitName: n.nutrient?.unitName || n.unitName || ''
    }));

    return {
      fdcId,
      description: food.description,
      dataType: food.dataType,
      nutrients: nutrients.filter(n => n.value > 0).slice(0, 15)
    };
    
  } catch (err) {
    console.error('Nutrition fetch error (Axios/FDC API level):', err.response?.data?.message || err.message);
    return { error: 'External Nutrition API failed to respond.' };
  }
}

module.exports = { getNutrition };