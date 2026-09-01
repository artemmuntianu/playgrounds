import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import fs from "fs/promises";
import path from "path";
//#region src/pages/api/manifest.ts
var manifest_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST
});
var DATA_PATH = path.join(process.cwd(), "data", "playground.json");
var POST = async ({ request }) => {
	const data = await request.json();
	await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
	return new Response(JSON.stringify({ status: "success" }), { status: 200 });
};
var GET = async () => {
	try {
		const data = await fs.readFile(DATA_PATH, "utf-8");
		return new Response(data, {
			status: 200,
			headers: { "Content-Type": "application/json" }
		});
	} catch {
		return new Response(JSON.stringify({ elements: [] }), { status: 200 });
	}
};
//#endregion
//#region \0virtual:astro:page:src/pages/api/manifest@_@ts
var page = () => manifest_exports;
//#endregion
export { page };
