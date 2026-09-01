import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import path from "node:path";
import fs from "node:fs/promises";
//#region src/pages/api/scene.ts
var scene_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST,
	prerender: () => false
});
var SCENES_DIR = path.join(process.cwd(), "data", "scenes");
/**
* POST /api/scene
* Accepts a SceneAnnotation JSON body, validates scene_id, and saves to data/scenes/<scene_id>.json
*/
var POST = async ({ request }) => {
	try {
		const scene = await request.json();
		if (!scene || !scene.scene_metadata || !scene.scene_metadata.scene_id) return new Response(JSON.stringify({ error: "Invalid scene data. scene_id is required." }), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
		const sceneId = scene.scene_metadata.scene_id;
		if (!/^[a-z0-9_]+$/.test(sceneId)) return new Response(JSON.stringify({ error: "Invalid scene_id format. Must contain only lowercase letters, numbers, and underscores." }), {
			status: 400,
			headers: { "Content-Type": "application/json" }
		});
		await fs.mkdir(SCENES_DIR, { recursive: true });
		const filePath = path.join(SCENES_DIR, `${sceneId}.json`);
		await fs.writeFile(filePath, JSON.stringify(scene, null, 2), "utf-8");
		return new Response(JSON.stringify({
			success: true,
			scene_id: sceneId,
			path: `data/scenes/${sceneId}.json`
		}), {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		console.error("Error saving scene:", err);
		return new Response(JSON.stringify({ error: err.message || "Failed to save scene file." }), {
			status: 500,
			headers: { "Content-Type": "application/json" }
		});
	}
};
/**
* GET /api/scene?scene_id=...
* Returns the requested scene JSON file or 404 if not found.
*/
var GET = async ({ url }) => {
	const sceneId = url.searchParams.get("scene_id");
	if (!sceneId || !/^[a-z0-9_]+$/.test(sceneId)) return new Response(JSON.stringify({ error: "Valid scene_id query parameter is required." }), {
		status: 400,
		headers: { "Content-Type": "application/json" }
	});
	const filePath = path.join(SCENES_DIR, `${sceneId}.json`);
	try {
		const content = await fs.readFile(filePath, "utf-8");
		return new Response(content, {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch (err) {
		return new Response(JSON.stringify({ error: `Scene file '${sceneId}' not found.` }), {
			status: 404,
			headers: { "Content-Type": "application/json" }
		});
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/scene@_@ts
var page = () => scene_exports;
//#endregion
export { page };
