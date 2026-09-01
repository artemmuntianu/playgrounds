import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import fs from "fs/promises";
import path from "path";
import { GoogleGenerativeAI } from "@google/generative-ai";
//#region src/pages/api/reconstruct.ts
var reconstruct_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
var POST = async ({ request }) => {
	try {
		const file = (await request.formData()).get("file");
		if (!file) return new Response(JSON.stringify({ error: "No image uploaded" }), { status: 400 });
		const buffer = await file.arrayBuffer();
		const filePath = path.join(process.cwd(), "uploads", file.name);
		await fs.writeFile(filePath, Buffer.from(buffer));
		const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
		const base64Image = (await fs.readFile(filePath)).toString("base64");
		const jsonString = (await model.generateContent([`Analyze this image of a playground. 
    Return a JSON object in this exact format:
    {
      "elements": [
        { "id": "1", "name": "slide", "position": {"x": 0, "y": 0, "z": 0}, "dimensions": {"w": 1, "h": 1, "d": 1}, "ageGroup": "3-7" }
      ]
    }
    Estimate the positions (x, z from -5 to 5) and dimensions based on the visual layout.`, { inlineData: {
			data: base64Image,
			mimeType: file.type
		} }])).response.text().replace(/```json\n?|\n?```/g, "");
		const data = JSON.parse(jsonString);
		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (error) {
		console.error("AI Reconstruction Error:", error);
		return new Response(JSON.stringify({ error: "Reconstruction failed" }), { status: 500 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/reconstruct@_@ts
var page = () => reconstruct_exports;
//#endregion
export { page };
