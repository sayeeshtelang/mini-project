// frontend/src/api.js
import axios from 'axios';

const instance = axios.create({
  // CRITICAL FIX: Base URL must include the /api prefix
  baseURL: 'http://localhost:5000/api', 
  timeout: 20000
});

export default instance;