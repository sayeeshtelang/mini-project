// frontend/src/App.js
import React from 'react';
import UploadForm from './components/UploadForm';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Food Nutrition Predictor 🍎🥦</h1>
      <UploadForm />
    </div>
  );
}

export default App;