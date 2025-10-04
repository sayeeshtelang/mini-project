// frontend/src/components/UploadForm.js (FINAL FIXED VERSION)

import React, { useState, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import api from '../api';

const MODEL_IMAGE_SIZE = 224;

function UploadForm() { 
  const [file, setFile] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [loadingModel, setLoadingModel] = useState(true);
  const [modelType, setModelType] = useState('none');
  const [customModel, setCustomModel] = useState(null);
  const [mobilenetModel, setMobilenetModel] = useState(null);
  const [classNames, setClassNames] = useState(null);
  const [result, setResult] = useState(null);
  const imgRef = useRef();

  useEffect(() => {
    (async () => {
      setLoadingModel(true);
      
      // 1) Try to load custom model
      try {
        const resp = await fetch('/model/model.json', { method: 'HEAD' });
        if (resp.ok) {
          const model = await tf.loadLayersModel('/model/model.json');
          setCustomModel(model);
          try {
            const cn = await (await fetch('/model/class_names.json')).json();
            setClassNames(cn);
          } catch (e) {
            console.warn('No class_names.json found for custom model');
          }
          setModelType('custom');
          setLoadingModel(false);
          return;
        }
      } catch (err) {
        // Fall through
      }

      // 2) Fallback to mobilenet
      try {
        const m = await mobilenet.load();
        setMobilenetModel(m);
        setModelType('mobilenet');
      } catch (err) {
        console.error('Error loading mobilenet:', err);
        setModelType('none');
      }
      setLoadingModel(false);
    })();
  }, []);

  function onFileChange(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setImgUrl(URL.createObjectURL(f));
    setResult(null); 
  }

  async function handlePredict(e) {
    e.preventDefault();
    if (!file) return alert('Please choose an image first');
    if (loadingModel || modelType === 'none') return alert('Model is not yet loaded.');

    setResult({ stage: 'processing' });
    const imgEl = imgRef.current;
    // Set a safe default label before prediction
    let predictedLabel = 'Unknown Food'; 

    try {
      if (modelType === 'custom' && customModel) {
        const tensor = tf.browser.fromPixels(imgEl)
          .resizeNearestNeighbor([MODEL_IMAGE_SIZE, MODEL_IMAGE_SIZE])
          .toFloat()
          .expandDims(0)
          .div(255.0); 

        const preds = customModel.predict(tensor);
        const scores = Array.isArray(preds.arraySync()[0]) ? preds.arraySync()[0] : preds.dataSync(); 
        
        const maxIdx = scores.indexOf(Math.max(...scores));
        predictedLabel = (classNames && classNames[maxIdx]) ? classNames[maxIdx] : `class_${maxIdx}`;
        
        tensor.dispose();
        preds.dispose();
      } else if (modelType === 'mobilenet' && mobilenetModel) {
        const predictions = await mobilenetModel.classify(imgEl);
        predictedLabel = predictions && predictions.length ? predictions[0].className.split(',')[0].trim() : 'unknown';
      }

      // Update state to show the predicted label
      setResult({ stage: 'predicted', label: predictedLabel });

      // Call backend (POST to /api/nutrition)
      const res = await api.post('/nutrition', { food: predictedLabel });
      
      // Handle the different return types from the backend
      if (res.data.error) {
          setResult({ stage: 'error', error: `Nutrition Error: ${res.data.error}` });
      } 
      // Check for 'No matches found' message
      else if (res.data.nutrition?.message) { 
          setResult({ stage: 'done', label: predictedLabel, nutritionResponse: { message: res.data.nutrition.message } });
      } 
      // Successful data retrieval
      else if (res.data.nutrition) {
          setResult({ stage: 'done', label: predictedLabel, nutritionResponse: res.data.nutrition });
      } else {
          setResult({ stage: 'error', error: 'Received empty or malformed nutrition response.' });
      }

    } catch (err) {
      console.error(err);
      setResult({ stage: 'error', error: err.response?.data?.error || err.message || 'Failed to fetch nutrition' });
    }
  }

  const statusStyle = { padding: '8px', borderRadius: '4px', marginTop: '10px' };

  return (
    <div style={{ maxWidth: 720, margin: '20px 0', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
      <h3>1. Load Model Status</h3>
      <p style={{ 
          ...statusStyle, 
          backgroundColor: loadingModel ? '#ffffcc' : (modelType === 'none' ? '#ffcccc' : '#ccffcc') 
      }}>
        Model: {loadingModel ? '⏳ Loading...' : (modelType === 'none' ? '❌ No Model Found/Loaded' : `✅ ${modelType.toUpperCase()} Model Ready`)}
      </p>

      <form onSubmit={handlePredict}>
        <h3>2. Choose Image & Predict</h3>
        <input accept="image/*" type="file" onChange={onFileChange} style={{ marginBottom: '10px' }}/>
        
        {imgUrl && (
          <div style={{ margin: '12px 0' }}>
            <img
              ref={imgRef}
              src={imgUrl}
              alt="preview"
              style={{ maxWidth: '100%', maxHeight: 400, border: '1px solid #ddd', borderRadius: '4px' }}
              crossOrigin="anonymous" 
            />
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={loadingModel || !file}
          style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: (loadingModel || !file) ? 'not-allowed' : 'pointer' }}
        >
          {result?.stage === 'processing' || result?.stage === 'predicted' ? 'Processing...' : 'Predict & Get Nutrition'}
        </button>
      </form>

      {/* Results Display */}
      <div style={{ marginTop: 20 }}>
        {result?.stage === 'processing' && <p>🔍 Analyzing image...</p>}
        
        {(result?.stage === 'predicted' || result?.stage === 'done') && (
          <div>
            <h3>3. Results for: {result.label}</h3>
          </div>
        )}

        {/* Display the 'Not Found' message if present */}
        {result?.stage === 'done' && result.nutritionResponse?.message && (
             <p style={{ color: 'orange', fontWeight: 'bold' }}>{result.nutritionResponse.message}</p>
        )}

        {/* Display the table ONLY if fdcId (actual data) is present */}
        {result?.stage === 'done' && result.nutritionResponse?.fdcId && (
          <div>
            <h4>FoodData Central Details</h4>
            <p><strong>Description:</strong> {result.nutritionResponse?.description ?? 'N/A'}</p>

            <table border="1" cellPadding="6" style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f2f2f2' }}><th>Nutrient</th><th>Value</th><th>Unit</th></tr>
              </thead>
              <tbody>
                {(result.nutritionResponse?.nutrients || []).map((n, index) => (
                  <tr key={n.nutrientId || n.nutrientName || index}>
                    <td>{n.nutrientName}</td>
                    <td>{Math.round(n.value * 100) / 100}</td> 
                    <td>{n.unitName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result?.stage === 'error' && <div style={{ color: 'red', fontWeight: 'bold' }}>❌ Error: {result.error}</div>}
      </div>
    </div>
  );
}

export default UploadForm;