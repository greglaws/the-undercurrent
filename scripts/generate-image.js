require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const fs = require('fs');
const path = require('path');

const BASE_PROMPT = `Generate a single digital artwork inspired by surrealism. The image should be a symbolic, dreamlike interpretation of the collective mood and themes present in recent American news. Use iconography, visual metaphors, and symbolic forms to represent the underlying themes — scales, eyes, bridges, flames, roots, mirrors, doors, or any symbols that emerge naturally from the content. Do not render text, newspaper logos, or literal depictions of specific people or events. Create an abstract visual narrative through impossible landscapes, unexpected juxtapositions, and archetypal imagery. The work should feel native to its digital medium — clean, luminous, with no simulated brushwork or physical texture. Render it as a high-resolution, widescreen composition suitable for display on a screen.

The following headlines from the past week represent the themes to interpret:

`;

// Models to try in order of preference
const GEMINI_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
  'gemini-3-pro-image-preview',
];

const IMAGEN_MODELS = [
  'imagen-4.0-fast-generate-001',
  'imagen-4.0-generate-001',
];

async function generateWithGemini(apiKey, modelName, fullPrompt) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseModalities: ['image', 'text'] },
  });

  console.log(`  Trying ${modelName}...`);
  const response = await model.generateContent(fullPrompt);
  const result = response.response;
  const parts = result.candidates[0].content.parts;

  for (const part of parts) {
    if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
      console.log(`  ✓ Success with ${modelName}`);
      return part.inlineData;
    }
  }
  throw new Error('No image in response');
}

async function generateWithImagen(apiKey, modelName, fullPrompt) {
  console.log(`  Trying ${modelName}...`);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict?key=${apiKey}`;
  const body = {
    instances: [{ prompt: fullPrompt }],
    parameters: { sampleCount: 1, aspectRatio: '16:9' },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  if (data.predictions && data.predictions[0]) {
    console.log(`  ✓ Success with ${modelName}`);
    return {
      data: data.predictions[0].bytesBase64Encoded,
      mimeType: data.predictions[0].mimeType || 'image/png',
    };
  }
  throw new Error('No predictions in response');
}

async function generateImage(headlinesText, outputPath) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not found in .env');
  }

  const fullPrompt = BASE_PROMPT + headlinesText;
  console.log(`Prompt length: ${fullPrompt.length} chars\n`);

  let imageData = null;
  let lastError = null;

  // Try Gemini image models
  for (const modelName of GEMINI_MODELS) {
    try {
      imageData = await generateWithGemini(apiKey, modelName, fullPrompt);
      break;
    } catch (err) {
      const msg = err.message.slice(0, 150);
      console.warn(`    ✗ ${msg}\n`);
      lastError = err;
    }
  }

  // Try Imagen models as fallback
  if (!imageData) {
    for (const modelName of IMAGEN_MODELS) {
      try {
        imageData = await generateWithImagen(apiKey, modelName, fullPrompt);
        break;
      } catch (err) {
        const msg = err.message.slice(0, 150);
        console.warn(`    ✗ ${msg}\n`);
        lastError = err;
      }
    }
  }

  if (!imageData) {
    throw new Error('All models failed. Last error: ' + lastError.message);
  }

  // Write image file
  const buffer = Buffer.from(imageData.data, 'base64');
  const ext = imageData.mimeType === 'image/png' ? 'png' : 'jpg';
  const filePath = outputPath || path.join(__dirname, '..', 'archive', `output.${ext}`);

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, buffer);
  console.log(`\nImage saved: ${filePath} (${(buffer.length / 1024).toFixed(0)} KB)`);

  return { filePath, mimeType: imageData.mimeType, ext };
}

module.exports = { generateImage, BASE_PROMPT };
