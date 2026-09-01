import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No image uploaded' }), { status: 400 });
    }

    // Save uploaded file to uploads directory for processing
    const buffer = await file.arrayBuffer();
    const filePath = path.join(process.cwd(), 'uploads', file.name);
    await fs.writeFile(filePath, Buffer.from(buffer));

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Read the saved file
    const imageBuffer = await fs.readFile(filePath);
    const base64Image = imageBuffer.toString("base64");

    const prompt = `Analyze this image of a playground. 
    Return a JSON object in this exact format:
    {
      "elements": [
        { "id": "1", "name": "slide", "position": {"x": 0, "y": 0, "z": 0}, "dimensions": {"w": 1, "h": 1, "d": 1}, "ageGroup": "3-7" }
      ]
    }
    Estimate the positions (x, z from -5 to 5) and dimensions based on the visual layout.`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: file.type } }
    ]);

    const text = result.response.text();
    const jsonString = text.replace(/```json\n?|\n?```/g, '');
    const data = JSON.parse(jsonString);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("AI Reconstruction Error:", error);
    return new Response(JSON.stringify({ error: 'Reconstruction failed' }), { status: 500 });
  }
};
