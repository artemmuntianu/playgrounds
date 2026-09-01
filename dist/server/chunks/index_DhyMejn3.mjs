import { t as __exportAll } from "./rolldown-runtime_D7D4PA-g.mjs";
import { d as maybeRenderHead, f as renderHead, i as renderComponent, s as renderSlot, u as renderTemplate } from "./server_nXNkziF3.mjs";
import { t as createComponent } from "./compiler_DlIHnhj5.mjs";
import { useEffect, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/layouts/BaseLayout.astro
var $$BaseLayout = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Playground Portal</title>${renderHead($$result)}</head><body class="bg-gray-50 text-gray-900">${renderSlot($$result, $$slots["default"])}</body></html>`;
}, "D:/Work/play-model-portal/src/layouts/BaseLayout.astro", void 0);
//#endregion
//#region src/components/AnnotationTool.tsx
var AnnotationTool = ({ imageUrl, depthMapUrl, onSave, initialScene }) => {
	const [sceneId, setSceneId] = useState(initialScene?.scene_metadata.scene_id || `scene_${Date.now()}`);
	const [cameraAzimuth, setCameraAzimuth] = useState(initialScene?.scene_metadata.camera_azimuth_deg || 0);
	const [cameraFov, setCameraFov] = useState(initialScene?.scene_metadata.camera_fov_deg || 65);
	const [annotations, setAnnotations] = useState(initialScene?.annotations || []);
	const [mode, setMode] = useState("idle");
	const [activePolygon, setActivePolygon] = useState([]);
	const [activeAnchor, setActiveAnchor] = useState(null);
	const [showForm, setShowForm] = useState(false);
	const [objectId, setObjectId] = useState("");
	const [category, setCategory] = useState("tree");
	const [heightMeters, setHeightMeters] = useState(8);
	const [canopyOpacity, setCanopyOpacity] = useState(.85);
	const [isOffscreen, setIsOffscreen] = useState(false);
	const [formError, setFormError] = useState(null);
	const containerRef = useRef(null);
	const imageRef = useRef(null);
	const canvasRef = useRef(null);
	const MARGIN_PCT = .15;
	useEffect(() => {
		if (showForm && !objectId) setObjectId(`${category}_${annotations.length + 1}`);
	}, [
		showForm,
		category,
		annotations.length,
		objectId
	]);
	const canvasPxToNorm = (px, py, totalW, totalH) => {
		const imgW = totalW / 1.3;
		const imgH = totalH / 1.3;
		const marginX = imgW * MARGIN_PCT;
		const marginY = imgH * MARGIN_PCT;
		return {
			x: (px - marginX) / imgW,
			y: (py - marginY) / imgH
		};
	};
	const normToCanvasPx = (pt, totalW, totalH) => {
		const imgW = totalW / 1.3;
		const imgH = totalH / 1.3;
		const marginX = imgW * MARGIN_PCT;
		const marginY = imgH * MARGIN_PCT;
		return {
			x: marginX + pt.x * imgW,
			y: marginY + pt.y * imgH
		};
	};
	const drawOverlay = () => {
		const canvas = canvasRef.current;
		const img = imageRef.current;
		if (!canvas || !img) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const baseW = img.clientWidth;
		const baseH = img.clientHeight;
		if (baseW === 0 || baseH === 0) return;
		const totalW = baseW * 1.3;
		const totalH = baseH * 1.3;
		if (canvas.width !== totalW || canvas.height !== totalH) {
			canvas.width = totalW;
			canvas.height = totalH;
		}
		ctx.clearRect(0, 0, totalW, totalH);
		const marginX = baseW * MARGIN_PCT;
		const marginY = baseH * MARGIN_PCT;
		ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
		ctx.fillRect(0, 0, totalW, totalH);
		ctx.clearRect(marginX, marginY, baseW, baseH);
		ctx.strokeStyle = "#3b82f6";
		ctx.lineWidth = 2;
		ctx.setLineDash([6, 4]);
		ctx.strokeRect(marginX, marginY, baseW, baseH);
		ctx.setLineDash([]);
		ctx.fillStyle = "#3b82f6";
		ctx.font = "bold 11px sans-serif";
		ctx.fillText("📷 Photo Boundary (0,0 to 1,1)", marginX + 6, marginY + 16);
		annotations.forEach((ann, index) => {
			if (ann.polygon_coordinates.length > 0) {
				ctx.beginPath();
				const startPx = normToCanvasPx(ann.polygon_coordinates[0], totalW, totalH);
				ctx.moveTo(startPx.x, startPx.y);
				for (let i = 1; i < ann.polygon_coordinates.length; i++) {
					const ptPx = normToCanvasPx(ann.polygon_coordinates[i], totalW, totalH);
					ctx.lineTo(ptPx.x, ptPx.y);
				}
				ctx.closePath();
				ctx.fillStyle = ann.is_offscreen ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 200, 0, 0.35)";
				ctx.fill();
				ctx.strokeStyle = ann.is_offscreen ? "#ef4444" : "rgba(255, 200, 0, 0.9)";
				ctx.lineWidth = 2;
				if (ann.is_offscreen) ctx.setLineDash([4, 4]);
				ctx.stroke();
				ctx.setLineDash([]);
				ctx.fillStyle = "#ffffff";
				ctx.font = "12px sans-serif";
				ctx.shadowColor = "#000000";
				ctx.shadowBlur = 4;
				const labelTag = ann.is_offscreen ? " (Off-screen)" : "";
				ctx.fillText(`${index + 1}. ${ann.id} (${ann.height_meters}m)${labelTag}`, startPx.x + 4, startPx.y - 4);
				ctx.shadowBlur = 0;
			}
			if (ann.ground_anchor) {
				const anchorPx = normToCanvasPx(ann.ground_anchor, totalW, totalH);
				ctx.beginPath();
				ctx.arc(anchorPx.x, anchorPx.y, 6, 0, Math.PI * 2);
				ctx.fillStyle = ann.is_offscreen ? "#f97316" : "#ef4444";
				ctx.fill();
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 1.5;
				ctx.stroke();
			}
		});
		if (activePolygon.length > 0) {
			ctx.beginPath();
			const firstPx = normToCanvasPx(activePolygon[0], totalW, totalH);
			ctx.moveTo(firstPx.x, firstPx.y);
			for (let i = 1; i < activePolygon.length; i++) {
				const ptPx = normToCanvasPx(activePolygon[i], totalW, totalH);
				ctx.lineTo(ptPx.x, ptPx.y);
			}
			ctx.strokeStyle = "#3b82f6";
			ctx.lineWidth = 2;
			ctx.stroke();
			activePolygon.forEach((pt) => {
				const handlePx = normToCanvasPx(pt, totalW, totalH);
				ctx.beginPath();
				ctx.arc(handlePx.x, handlePx.y, 4, 0, Math.PI * 2);
				ctx.fillStyle = "#3b82f6";
				ctx.fill();
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = 1;
				ctx.stroke();
			});
		}
		if (activeAnchor) {
			const anchorPx = normToCanvasPx(activeAnchor, totalW, totalH);
			ctx.beginPath();
			ctx.arc(anchorPx.x, anchorPx.y, 6, 0, Math.PI * 2);
			ctx.fillStyle = "#22c55e";
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 1.5;
			ctx.stroke();
		}
	};
	useEffect(() => {
		drawOverlay();
	}, [
		annotations,
		activePolygon,
		activeAnchor,
		mode
	]);
	const handleCanvasClick = (e) => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const rect = canvas.getBoundingClientRect();
		const px = e.clientX - rect.left;
		const py = e.clientY - rect.top;
		const normPt = canvasPxToNorm(px, py, rect.width, rect.height);
		if (mode === "drawing") setActivePolygon((prev) => [...prev, normPt]);
		else if (mode === "setting_anchor") {
			setActiveAnchor(normPt);
			setMode("idle");
		}
	};
	const handleDoubleClick = () => {
		if (mode === "drawing" && activePolygon.length >= 3) setMode("idle");
	};
	const handleFinishObject = () => {
		if (activePolygon.length < 3) {
			alert("Please draw a polygon with at least 3 points first.");
			return;
		}
		const isOut = activePolygon.some((p) => p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1);
		setIsOffscreen(isOut);
		setShowForm(true);
		setFormError(null);
	};
	const handleAddOffscreenPreset = (position) => {
		let poly = [];
		let anchor = {
			x: .5,
			y: -.05
		};
		let idPrefix = "offscreen_tree";
		if (position === "top") {
			poly = [
				{
					x: .35,
					y: -.22
				},
				{
					x: .65,
					y: -.22
				},
				{
					x: .65,
					y: -.05
				},
				{
					x: .35,
					y: -.05
				}
			];
			anchor = {
				x: .5,
				y: -.05
			};
			idPrefix = "tree_top_outside";
		} else if (position === "left") {
			poly = [
				{
					x: -.22,
					y: .2
				},
				{
					x: -.05,
					y: .2
				},
				{
					x: -.05,
					y: .6
				},
				{
					x: -.22,
					y: .6
				}
			];
			anchor = {
				x: -.05,
				y: .4
			};
			idPrefix = "tree_left_outside";
		} else if (position === "right") {
			poly = [
				{
					x: 1.05,
					y: .2
				},
				{
					x: 1.22,
					y: .2
				},
				{
					x: 1.22,
					y: .6
				},
				{
					x: 1.05,
					y: .6
				}
			];
			anchor = {
				x: 1.05,
				y: .4
			};
			idPrefix = "tree_right_outside";
		}
		const newAnn = {
			id: `${idPrefix}_${annotations.length + 1}`,
			category: "tree",
			height_meters: 10,
			canopy_opacity: .85,
			ground_anchor: anchor,
			polygon_coordinates: poly,
			is_offscreen: true
		};
		setAnnotations([...annotations, newAnn]);
	};
	const handleAddAnnotation = (e) => {
		e.preventDefault();
		const cleanId = objectId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
		if (!cleanId) {
			setFormError("Object ID is required.");
			return;
		}
		if (annotations.some((a) => a.id === cleanId)) {
			setFormError("Object ID must be unique.");
			return;
		}
		if (heightMeters <= 0) {
			setFormError("Height must be greater than 0 metres.");
			return;
		}
		const defaultAnchor = activeAnchor || activePolygon[0] || {
			x: .5,
			y: .5
		};
		const newAnnotation = {
			id: cleanId,
			category,
			height_meters: Number(heightMeters),
			canopy_opacity: Number(canopyOpacity),
			ground_anchor: defaultAnchor,
			polygon_coordinates: activePolygon,
			is_offscreen: isOffscreen
		};
		setAnnotations([...annotations, newAnnotation]);
		setActivePolygon([]);
		setActiveAnchor(null);
		setShowForm(false);
		setObjectId("");
		setFormError(null);
		setMode("idle");
	};
	const handleDeleteAnnotation = (id) => {
		setAnnotations(annotations.filter((a) => a.id !== id));
	};
	const handleExportScene = () => {
		onSave({
			scene_metadata: {
				scene_id: sceneId.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_") || "playground_scene",
				original_image_path: imageUrl,
				depth_map_path: depthMapUrl,
				camera_azimuth_deg: Number(cameraAzimuth),
				camera_fov_deg: Number(cameraFov)
			},
			annotations
		});
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "flex flex-col lg:flex-row gap-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex-1 flex flex-col items-center",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "flex flex-wrap gap-2 mb-3 w-full justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-200",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap gap-2",
						children: [
							/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => {
									setMode("drawing");
									setActivePolygon([]);
								},
								className: `px-3 py-1.5 text-xs font-semibold rounded-md transition ${mode === "drawing" ? "bg-blue-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"}`,
								children: mode === "drawing" ? "📍 Click anywhere (even outside photo)..." : "✏️ Draw Polygon"
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => setMode("setting_anchor"),
								className: `px-3 py-1.5 text-xs font-semibold rounded-md transition ${mode === "setting_anchor" ? "bg-green-600 text-white" : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"}`,
								children: "🎯 Set Ground Anchor"
							}),
							/* @__PURE__ */ jsxs("button", {
								type: "button",
								disabled: activePolygon.length < 3,
								onClick: handleFinishObject,
								className: "px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition",
								children: [
									"✅ Finish Object (",
									activePolygon.length,
									" pts)"
								]
							})
						]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-1.5 pt-1 md:pt-0",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "text-xs font-bold text-gray-500",
								children: "Off-Screen Presets:"
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => handleAddOffscreenPreset("top"),
								className: "px-2 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100",
								title: "Add 10m tree above photo frame",
								children: "🌲 Top Tree"
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => handleAddOffscreenPreset("left"),
								className: "px-2 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100",
								title: "Add 10m tree to left of photo frame",
								children: "🌲 Left Tree"
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => handleAddOffscreenPreset("right"),
								className: "px-2 py-1 text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300 rounded hover:bg-amber-100",
								title: "Add 10m tree to right of photo frame",
								children: "🌲 Right Tree"
							})
						]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					ref: containerRef,
					className: "relative inline-block border border-gray-400 rounded-lg overflow-hidden shadow-inner bg-slate-900 p-8",
					children: [/* @__PURE__ */ jsx("img", {
						ref: imageRef,
						src: imageUrl,
						alt: "Playground Base",
						className: "max-h-[550px] w-auto block select-none pointer-events-none rounded border border-blue-400/50 shadow-md",
						onLoad: drawOverlay
					}), /* @__PURE__ */ jsx("canvas", {
						ref: canvasRef,
						onClick: handleCanvasClick,
						onDoubleClick: handleDoubleClick,
						className: "absolute inset-0 w-full h-full cursor-crosshair z-10"
					})]
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "text-xs text-gray-500 mt-2 text-center",
					children: [
						"The dark padded area around the photo is the ",
						/* @__PURE__ */ jsx("strong", { children: "off-screen margin" }),
						". Draw trees or structures outside the photo border to cast shadows into the scene!"
					]
				})
			]
		}), /* @__PURE__ */ jsxs("div", {
			className: "w-full lg:w-80 flex flex-col gap-4",
			children: [
				showForm && /* @__PURE__ */ jsxs("form", {
					onSubmit: handleAddAnnotation,
					className: "p-4 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3 shadow-md",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex justify-between items-center",
							children: [/* @__PURE__ */ jsx("h3", {
								className: "font-bold text-indigo-900 text-sm",
								children: "Add Shadow-Casting Object"
							}), isOffscreen && /* @__PURE__ */ jsx("span", {
								className: "px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-800 rounded",
								children: "Off-Screen Object"
							})]
						}),
						formError && /* @__PURE__ */ jsx("p", {
							className: "text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200",
							children: formError
						}),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
							className: "block text-xs font-semibold text-gray-700",
							children: "Object ID"
						}), /* @__PURE__ */ jsx("input", {
							type: "text",
							value: objectId,
							onChange: (e) => setObjectId(e.target.value),
							className: "w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500",
							placeholder: "e.g. tree_outside_top",
							required: true
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
							className: "block text-xs font-semibold text-gray-700",
							children: "Category"
						}), /* @__PURE__ */ jsxs("select", {
							value: category,
							onChange: (e) => setCategory(e.target.value),
							className: "w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500",
							children: [
								/* @__PURE__ */ jsx("option", {
									value: "tree",
									children: "Tree"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "structure",
									children: "Structure (Slide, Climber)"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "building",
									children: "Building"
								}),
								/* @__PURE__ */ jsx("option", {
									value: "other",
									children: "Other"
								})
							]
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("label", {
							className: "block text-xs font-semibold text-gray-700",
							children: [
								"Height (metres): ",
								heightMeters,
								"m"
							]
						}), /* @__PURE__ */ jsx("input", {
							type: "number",
							step: "0.5",
							min: "0.5",
							max: "100",
							value: heightMeters,
							onChange: (e) => setHeightMeters(parseFloat(e.target.value) || 1),
							className: "w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500",
							required: true
						})] }),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("label", {
							className: "block text-xs font-semibold text-gray-700",
							children: [
								"Canopy Opacity: ",
								(canopyOpacity * 100).toFixed(0),
								"%"
							]
						}), /* @__PURE__ */ jsx("input", {
							type: "range",
							min: "0.1",
							max: "1.0",
							step: "0.05",
							value: canopyOpacity,
							onChange: (e) => setCanopyOpacity(parseFloat(e.target.value)),
							className: "w-full mt-1"
						})] }),
						/* @__PURE__ */ jsxs("div", {
							className: "flex gap-2 pt-2",
							children: [/* @__PURE__ */ jsx("button", {
								type: "submit",
								className: "flex-1 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded hover:bg-indigo-700 transition",
								children: "Add to Scene"
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => setShowForm(false),
								className: "px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-200 rounded hover:bg-gray-300",
								children: "Cancel"
							})]
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3",
					children: [
						/* @__PURE__ */ jsx("h3", {
							className: "font-bold text-gray-800 text-sm",
							children: "Camera & Scene Meta"
						}),
						/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
							className: "block text-xs font-semibold text-gray-600",
							children: "Scene ID"
						}), /* @__PURE__ */ jsx("input", {
							type: "text",
							value: sceneId,
							onChange: (e) => setSceneId(e.target.value),
							className: "w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded"
						})] }),
						/* @__PURE__ */ jsxs("div", {
							className: "grid grid-cols-2 gap-2",
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-xs font-semibold text-gray-600",
								title: "Direction photo is facing (0°=North, 90°=East, 180°=South, 270°=West)",
								children: "Camera Facing (°):"
							}), /* @__PURE__ */ jsx("input", {
								type: "number",
								min: "0",
								max: "360",
								value: cameraAzimuth,
								onChange: (e) => setCameraAzimuth(Number(e.target.value)),
								className: "w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded"
							})] }), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("label", {
								className: "block text-xs font-semibold text-gray-600",
								title: "Horizontal lens angle of view in degrees",
								children: "Lens FOV (°):"
							}), /* @__PURE__ */ jsx("input", {
								type: "number",
								min: "30",
								max: "120",
								value: cameraFov,
								onChange: (e) => setCameraFov(Number(e.target.value)),
								className: "w-full mt-1 px-2.5 py-1 text-sm border border-gray-300 rounded"
							})] })]
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex-1 p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col min-h-[200px]",
					children: [/* @__PURE__ */ jsxs("h3", {
						className: "font-bold text-gray-800 text-sm mb-2",
						children: [
							"Annotated Objects (",
							annotations.length,
							")"
						]
					}), annotations.length === 0 ? /* @__PURE__ */ jsx("p", {
						className: "text-xs text-gray-500 italic my-auto text-center",
						children: "No objects added yet. Draw inside or outside the photo frame to start."
					}) : /* @__PURE__ */ jsx("div", {
						className: "space-y-2 overflow-y-auto max-h-[250px] pr-1",
						children: annotations.map((ann, i) => /* @__PURE__ */ jsxs("div", {
							className: `flex items-center justify-between p-2 text-xs border rounded shadow-sm ${ann.is_offscreen ? "bg-amber-50/70 border-amber-200" : "bg-white border-gray-200"}`,
							children: [/* @__PURE__ */ jsxs("div", { children: [
								/* @__PURE__ */ jsxs("span", {
									className: "font-bold text-gray-800",
									children: [
										i + 1,
										". ",
										ann.id
									]
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "ml-1 text-gray-500",
									children: [
										"(",
										ann.category,
										", ",
										ann.height_meters,
										"m)"
									]
								}),
								ann.is_offscreen && /* @__PURE__ */ jsx("span", {
									className: "ml-1.5 px-1 py-0.2 text-[9px] bg-amber-200 text-amber-900 rounded font-bold",
									children: "Off-screen"
								})
							] }), /* @__PURE__ */ jsx("button", {
								type: "button",
								onClick: () => handleDeleteAnnotation(ann.id),
								className: "text-red-500 hover:text-red-700 font-bold ml-2 px-1.5 py-0.5 rounded hover:bg-red-50",
								title: "Delete Object",
								children: "✕"
							})]
						}, ann.id))
					})]
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					disabled: annotations.length === 0,
					onClick: handleExportScene,
					className: "w-full py-3 text-sm font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow transition",
					children: "Save & Proceed to Preview →"
				})
			]
		})]
	});
};
//#endregion
//#region src/lib/solar.ts
/**
* Calculates solar position (azimuth and altitude in degrees) for a given date and location
* using the NOAA Solar Calculator / Astronomical Algorithms method.
*
* Sanity Check:
* At solar noon on the summer solstice (June 21) in Lisbon (~38.74° N, -9.14° W),
* the sun altitude is approximately 74.6° and azimuth is approximately 180° (South).
*
* @param date UTC or Local Date object
* @param latitude_deg Latitude in degrees (-90 to 90)
* @param longitude_deg Longitude in degrees (-180 to 180)
* @returns SolarPosition object containing azimuth_deg (0-360 clockwise from North) and altitude_deg (degrees above horizon)
*/
function getSolarPosition(date, latitude_deg, longitude_deg) {
	const year = date.getUTCFullYear();
	let month = date.getUTCMonth() + 1;
	const day = date.getUTCDate();
	const hours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600 + date.getUTCMilliseconds() / 36e5;
	let y = year;
	let m = month;
	if (m <= 2) {
		y -= 1;
		m += 12;
	}
	const A = Math.floor(y / 100);
	const B = 2 - A + Math.floor(A / 4);
	const T = (Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5 + hours / 24 - 2451545) / 36525;
	const L0 = (280.46646 + T * (36000.76983 + T * 3032e-7)) % 360;
	const M = 357.52911 + T * (35999.05029 - 1537e-7 * T);
	const e = .016708634 - T * (42037e-9 + 1.267e-7 * T);
	const radM = M * Math.PI / 180;
	const sunTrueLong = L0 + (Math.sin(radM) * (1.914602 - T * (.004817 + 14e-6 * T)) + Math.sin(2 * radM) * (.019993 - 101e-6 * T) + Math.sin(3 * radM) * 289e-6);
	const omega = 125.04 - 1934.136 * T;
	const sunAppLong = sunTrueLong - .00569 - .00478 * Math.sin(omega * Math.PI / 180);
	const obliqCorr = 23 + (26 + (21.448 - T * (46.815 + T * (59e-5 - T * .001813))) / 60) / 60 + .00256 * Math.cos(omega * Math.PI / 180);
	const sinDeclin = Math.sin(obliqCorr * Math.PI / 180) * Math.sin(sunAppLong * Math.PI / 180);
	const sunDeclin = Math.asin(sinDeclin) * 180 / Math.PI;
	const tanObliqHalf = Math.tan(obliqCorr / 2 * Math.PI / 180);
	const varY = tanObliqHalf * tanObliqHalf;
	const radL0 = L0 * Math.PI / 180;
	const eqOfTime = 4 * ((varY * Math.sin(2 * radL0) - 2 * e * Math.sin(radM) + 4 * e * varY * Math.sin(radM) * Math.cos(2 * radL0) - .5 * varY * varY * Math.sin(4 * radL0) - 1.25 * e * e * Math.sin(2 * radM)) * 180) / Math.PI;
	let tst = (date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60 + date.getUTCMilliseconds() / 6e4 + (eqOfTime + 4 * longitude_deg)) % 1440;
	if (tst < 0) tst += 1440;
	let ha = tst / 4 - 180;
	if (ha < -180) ha += 360;
	const latRad = latitude_deg * Math.PI / 180;
	const decRad = sunDeclin * Math.PI / 180;
	const haRad = ha * Math.PI / 180;
	let cosZenith = Math.sin(latRad) * Math.sin(decRad) + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
	cosZenith = Math.max(-1, Math.min(1, cosZenith));
	const altitude_deg = 90 - Math.acos(cosZenith) * 180 / Math.PI;
	if (altitude_deg <= 0) return {
		azimuth_deg: 0,
		altitude_deg: 0
	};
	const azimuthY = -Math.sin(haRad) * Math.cos(decRad);
	const azimuthX = Math.cos(latRad) * Math.sin(decRad) - Math.sin(latRad) * Math.cos(decRad) * Math.cos(haRad);
	let azimuth_deg = Math.atan2(azimuthY, azimuthX) * 180 / Math.PI;
	azimuth_deg = (azimuth_deg + 360) % 360;
	return {
		azimuth_deg,
		altitude_deg
	};
}
//#endregion
//#region src/lib/shadowProjection.ts
var METRES_TO_NORM_SCALE = .04;
/**
* Computes the real-world shadow length L in metres for a given height and sun altitude angle.
* Formula: L = height / tan(altitude_deg)
* Returns 0 if altitude_deg <= 0 (sun is on or below horizon).
*/
function computeShadowLength(height_meters, altitude_deg) {
	if (altitude_deg <= 0 || height_meters <= 0) return 0;
	const altRad = altitude_deg * Math.PI / 180;
	return height_meters / Math.tan(altRad);
}
/**
* Projects an annotation's polygon coordinates in 2D normalized screen space based on solar position.
*
* Screen coordinate mapping:
* - Azimuth 0° (North) -> dx = 0, dy = -1 (pointing up)
* - Azimuth 90° (East) -> dx = 1, dy = 0 (pointing right)
* - Azimuth 180° (South) -> dx = 0, dy = 1 (pointing down)
* - Azimuth 270° (West) -> dx = -1, dy = 0 (pointing left)
*/
function projectShadowPolygon(annotation, solar, _imageWidth, _imageHeight, scale = METRES_TO_NORM_SCALE) {
	if (solar.altitude_deg <= 0) return annotation.polygon_coordinates.map((pt) => ({ ...pt }));
	const lengthNorm = computeShadowLength(annotation.height_meters, solar.altitude_deg) * scale;
	const azimuthRad = solar.azimuth_deg * Math.PI / 180;
	const dx = Math.sin(azimuthRad);
	const dy = -Math.cos(azimuthRad);
	return annotation.polygon_coordinates.map((pt) => ({
		x: pt.x + dx * lengthNorm,
		y: pt.y + dy * lengthNorm
	}));
}
//#endregion
//#region src/lib/depthWarp.ts
var DEFAULT_DEPTH_WARP_STRENGTH = .002;
/**
* Samples depth value (0-255) from an ImageData object at normalized 0-1 coordinates.
* Depth 255 = closest to camera (foreground), 0 = furthest (background).
*/
function sampleDepthMap(depthMapImageData, x_norm, y_norm) {
	const width = depthMapImageData.width;
	const height = depthMapImageData.height;
	if (width === 0 || height === 0) return 0;
	const px = Math.min(width - 1, Math.max(0, Math.floor(x_norm * width)));
	const idx = (Math.min(height - 1, Math.max(0, Math.floor(y_norm * height))) * width + px) * 4;
	return depthMapImageData.data[idx];
}
/**
* Applies a depth-aware displacement to each vertex of a polygon.
* Higher depth values (foreground) cause vertices to warp opposite to the shadow direction.
*/
function applyDepthWarpToPolygon(polygon, depthMapImageData, shadowDirection, warpStrength = DEFAULT_DEPTH_WARP_STRENGTH) {
	return polygon.map((vertex) => {
		const warpAmount = sampleDepthMap(depthMapImageData, vertex.x, vertex.y) / 255 * warpStrength;
		return {
			x: vertex.x - shadowDirection.dx * warpAmount,
			y: vertex.y - shadowDirection.dy * warpAmount
		};
	});
}
//#endregion
//#region src/lib/shadowRenderer.ts
/**
* Renders shadow polygons for a list of annotations onto a 2D canvas context.
* Uses "multiply" blending mode for shadows, and re-composites foreground object
* silhouettes on top so shadows appear UNDERNEATH trees, sliders, and structures.
*
* @param ctx CanvasRenderingContext2D destination context
* @param imageWidth Pixel width of canvas/image
* @param imageHeight Pixel height of canvas/image
* @param annotations Array of object annotations to render shadows for
* @param solar Solar position (azimuth & altitude)
* @param depthMapImageData ImageData from pre-loaded depth map (or null if unavailable)
* @param baseImage Optional original base image to overlay foreground objects over shadows
*/
function renderShadows(ctx, imageWidth, imageHeight, annotations, solar, depthMapImageData, baseImage) {
	if (!solar || solar.altitude_deg <= 0) return;
	const azimuthRad = solar.azimuth_deg * Math.PI / 180;
	const dx = Math.sin(azimuthRad);
	const dy = -Math.cos(azimuthRad);
	for (const annotation of annotations) {
		if (!annotation.polygon_coordinates || annotation.polygon_coordinates.length < 3) continue;
		let polygon = projectShadowPolygon(annotation, solar, imageWidth, imageHeight);
		if (depthMapImageData) polygon = applyDepthWarpToPolygon(polygon, depthMapImageData, {
			dx,
			dy
		});
		ctx.save();
		ctx.globalCompositeOperation = "multiply";
		ctx.globalAlpha = Math.min(1, Math.max(0, annotation.canopy_opacity));
		ctx.fillStyle = "rgba(0, 0, 0, 1)";
		ctx.beginPath();
		const firstPoint = polygon[0];
		ctx.moveTo(firstPoint.x * imageWidth, firstPoint.y * imageHeight);
		for (let i = 1; i < polygon.length; i++) {
			const pt = polygon[i];
			ctx.lineTo(pt.x * imageWidth, pt.y * imageHeight);
		}
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}
	if (baseImage) for (const annotation of annotations) {
		if (!annotation.polygon_coordinates || annotation.polygon_coordinates.length < 3) continue;
		ctx.save();
		ctx.globalCompositeOperation = "source-over";
		ctx.globalAlpha = 1;
		ctx.beginPath();
		const firstPoint = annotation.polygon_coordinates[0];
		ctx.moveTo(firstPoint.x * imageWidth, firstPoint.y * imageHeight);
		for (let i = 1; i < annotation.polygon_coordinates.length; i++) {
			const pt = annotation.polygon_coordinates[i];
			ctx.lineTo(pt.x * imageWidth, pt.y * imageHeight);
		}
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(baseImage, 0, 0, imageWidth, imageHeight);
		ctx.restore();
	}
	ctx.globalCompositeOperation = "source-over";
	ctx.globalAlpha = 1;
}
//#endregion
//#region src/components/ShadowPreview.tsx
var ShadowPreview = ({ imageUrl, depthMapUrl, scene, latitude, longitude }) => {
	const getInitialDateTimeString = () => {
		const now = /* @__PURE__ */ new Date();
		now.setHours(12, 0, 0, 0);
		const tzOffset = now.getTimezoneOffset() * 6e4;
		return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
	};
	const [dateTimeString, setDateTimeString] = useState(getInitialDateTimeString());
	const [solar, setSolar] = useState(null);
	const [depthMapData, setDepthMapData] = useState(null);
	const [loadingDepth, setLoadingDepth] = useState(true);
	const [isRendering, setIsRendering] = useState(false);
	const canvasRef = useRef(null);
	const baseImageRef = useRef(null);
	useEffect(() => {
		if (!depthMapUrl) {
			setDepthMapData(null);
			setLoadingDepth(false);
			return;
		}
		setLoadingDepth(true);
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = depthMapUrl;
		img.onload = () => {
			const offscreen = document.createElement("canvas");
			offscreen.width = img.naturalWidth || img.width;
			offscreen.height = img.naturalHeight || img.height;
			const ctx = offscreen.getContext("2d");
			if (ctx) {
				ctx.drawImage(img, 0, 0);
				try {
					const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
					setDepthMapData(imgData);
				} catch (err) {
					console.warn("Could not extract depth map ImageData:", err);
					setDepthMapData(null);
				}
			}
			setLoadingDepth(false);
		};
		img.onerror = () => {
			console.warn("Failed to load depth map image from:", depthMapUrl);
			setDepthMapData(null);
			setLoadingDepth(false);
		};
	}, [depthMapUrl]);
	useEffect(() => {
		const img = new Image();
		img.crossOrigin = "anonymous";
		img.src = imageUrl;
		img.onload = () => {
			baseImageRef.current = img;
			triggerRender();
		};
	}, [imageUrl]);
	useEffect(() => {
		const timer = setTimeout(() => {
			triggerRender();
		}, 200);
		return () => clearTimeout(timer);
	}, [
		dateTimeString,
		scene,
		latitude,
		longitude,
		depthMapData
	]);
	/**
	* Render Schematic Sun Overlay onto canvas
	*/
	const drawSchematicSunOverlay = (ctx, width, height, sol, cameraAzimuthDeg, cameraFovDeg = 65) => {
		if (sol.altitude_deg <= 0) return;
		let diffAzimuth = (sol.azimuth_deg - cameraAzimuthDeg + 540) % 360 - 180;
		const halfFov = cameraFovDeg / 2;
		if (Math.abs(diffAzimuth) <= halfFov + 10) {
			const xNorm = .5 + diffAzimuth / cameraFovDeg;
			const yNorm = Math.max(.04, Math.min(.85, .45 - sol.altitude_deg / 90 * .42));
			const sunPx = xNorm * width;
			const sunPy = yNorm * height;
			ctx.save();
			const outerGlow = ctx.createRadialGradient(sunPx, sunPy, 5, sunPx, sunPy, 90);
			outerGlow.addColorStop(0, "rgba(254, 240, 138, 0.85)");
			outerGlow.addColorStop(.3, "rgba(250, 204, 21, 0.4)");
			outerGlow.addColorStop(1, "rgba(250, 204, 21, 0)");
			ctx.beginPath();
			ctx.arc(sunPx, sunPy, 90, 0, Math.PI * 2);
			ctx.fillStyle = outerGlow;
			ctx.fill();
			ctx.strokeStyle = "rgba(253, 224, 71, 0.75)";
			ctx.lineWidth = 2.5;
			const numRays = 12;
			for (let i = 0; i < numRays; i++) {
				const angle = i * (360 / numRays) * Math.PI / 180;
				const x1 = sunPx + Math.cos(angle) * 18;
				const y1 = sunPy + Math.sin(angle) * 18;
				const x2 = sunPx + Math.cos(angle) * 63;
				const y2 = sunPy + Math.sin(angle) * 63;
				ctx.beginPath();
				ctx.moveTo(x1, y1);
				ctx.lineTo(x2, y2);
				ctx.stroke();
			}
			const innerDisk = ctx.createRadialGradient(sunPx, sunPy, 0, sunPx, sunPy, 16);
			innerDisk.addColorStop(0, "#ffffff");
			innerDisk.addColorStop(.7, "#fef08a");
			innerDisk.addColorStop(1, "#eab308");
			ctx.beginPath();
			ctx.arc(sunPx, sunPy, 16, 0, Math.PI * 2);
			ctx.fillStyle = innerDisk;
			ctx.fill();
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 2;
			ctx.stroke();
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 12px sans-serif";
			ctx.shadowColor = "#000000";
			ctx.shadowBlur = 6;
			ctx.fillText(`☀️ Sun (${sol.altitude_deg.toFixed(1)}° alt, ${sol.azimuth_deg.toFixed(0)}° az)`, sunPx + 22, sunPy + 4);
			ctx.restore();
		} else {
			ctx.save();
			const badgeX = width - 180;
			const badgeY = 24;
			ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
			ctx.beginPath();
			ctx.roundRect(badgeX, badgeY, 160, 48, 8);
			ctx.fill();
			ctx.strokeStyle = "#fde047";
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.fillStyle = "#fde047";
			ctx.font = "bold 12px sans-serif";
			const side = diffAzimuth > 0 ? "Right ➔" : "⬅ Left";
			const isBehind = Math.abs(diffAzimuth) > 90;
			ctx.fillText(`☀️ Sun: ${isBehind ? "Behind Camera" : side}`, badgeX + 10, 44);
			ctx.fillStyle = "#cbd5e1";
			ctx.font = "10px sans-serif";
			ctx.fillText(`Azimuth: ${sol.azimuth_deg.toFixed(0)}° | Alt: ${sol.altitude_deg.toFixed(0)}°`, badgeX + 10, 60);
			ctx.restore();
		}
	};
	const triggerRender = () => {
		const canvas = canvasRef.current;
		const baseImg = baseImageRef.current;
		if (!canvas || !baseImg) return;
		setIsRendering(true);
		const sol = getSolarPosition(new Date(dateTimeString), latitude, longitude);
		setSolar(sol);
		const w = baseImg.naturalWidth || baseImg.width;
		const h = baseImg.naturalHeight || baseImg.height;
		if (canvas.width !== w || canvas.height !== h) {
			canvas.width = w;
			canvas.height = h;
		}
		const ctx = canvas.getContext("2d");
		if (!ctx) {
			setIsRendering(false);
			return;
		}
		ctx.clearRect(0, 0, w, h);
		ctx.drawImage(baseImg, 0, 0, w, h);
		if (sol.altitude_deg > 0 && scene.annotations.length > 0) renderShadows(ctx, w, h, scene.annotations, sol, depthMapData, baseImg);
		const cameraAzimuth = scene.scene_metadata.camera_azimuth_deg || 0;
		const cameraFov = scene.scene_metadata.camera_fov_deg || 65;
		drawSchematicSunOverlay(ctx, w, h, sol, cameraAzimuth, cameraFov);
		setIsRendering(false);
	};
	const shadowScaleFactor = solar && solar.altitude_deg > 0 ? computeShadowLength(1, solar.altitude_deg) : 0;
	return /* @__PURE__ */ jsxs("div", {
		className: "flex flex-col gap-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx("label", {
						className: "text-sm font-semibold text-gray-700",
						children: "Date & Local Time:"
					}), /* @__PURE__ */ jsx("input", {
						type: "datetime-local",
						value: dateTimeString,
						onChange: (e) => setDateTimeString(e.target.value),
						className: "px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500"
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3 text-xs md:text-sm font-medium text-gray-700",
					children: [solar && /* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-2 bg-white px-3 py-1.5 rounded border border-gray-200 shadow-sm",
						children: [
							/* @__PURE__ */ jsx("span", { className: "inline-block w-2.5 h-2.5 rounded-full bg-amber-400" }),
							/* @__PURE__ */ jsxs("span", { children: [
								"Sun Azimuth: ",
								/* @__PURE__ */ jsxs("strong", { children: [solar.azimuth_deg.toFixed(1), "°"] }),
								" | Altitude:",
								" ",
								/* @__PURE__ */ jsxs("strong", { children: [solar.altitude_deg.toFixed(1), "°"] })
							] }),
							solar.altitude_deg > 0 && /* @__PURE__ */ jsxs("span", {
								className: "ml-2 text-gray-500",
								children: [
									"(Shadow Scale: ",
									/* @__PURE__ */ jsxs("strong", { children: [shadowScaleFactor.toFixed(2), "x"] }),
									")"
								]
							})
						]
					}), isRendering && /* @__PURE__ */ jsx("span", {
						className: "text-xs text-blue-600 animate-pulse font-semibold",
						children: "Rendering..."
					})]
				})]
			}),
			solar && solar.altitude_deg <= 0 && /* @__PURE__ */ jsxs("div", {
				className: "p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm font-semibold flex items-center gap-2",
				children: [/* @__PURE__ */ jsx("span", { children: "🌙" }), /* @__PURE__ */ jsxs("span", { children: [
					"Nighttime: Sun is below the horizon (",
					solar.altitude_deg.toFixed(1),
					"°). No shadows are cast."
				] })]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "relative flex justify-center items-center bg-gray-900 rounded-lg p-2 overflow-hidden shadow-inner min-h-[400px]",
				children: [loadingDepth && /* @__PURE__ */ jsx("div", {
					className: "absolute inset-0 bg-gray-900/70 z-10 flex items-center justify-center text-white text-sm",
					children: "Loading depth map..."
				}), /* @__PURE__ */ jsx("canvas", {
					ref: canvasRef,
					className: "max-w-full max-h-[700px] h-auto object-contain rounded shadow-lg"
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap justify-between text-xs text-gray-500 border-t border-gray-100 pt-3",
				children: [/* @__PURE__ */ jsxs("span", { children: [
					"Annotations rendered: ",
					/* @__PURE__ */ jsx("strong", { children: scene.annotations.length }),
					" object(s)"
				] }), /* @__PURE__ */ jsxs("span", { children: [
					"Camera facing: ",
					/* @__PURE__ */ jsxs("strong", { children: [scene.scene_metadata.camera_azimuth_deg || 0, "°"] }),
					" | Lens FOV:",
					" ",
					/* @__PURE__ */ jsxs("strong", { children: [scene.scene_metadata.camera_fov_deg || 65, "°"] })
				] })]
			})
		]
	});
};
//#endregion
//#region src/lib/sceneIO.ts
/**
* Saves a SceneAnnotation object to the server via POST /api/scene
*/
async function saveScene(scene) {
	const response = await fetch("/api/scene", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(scene)
	});
	if (!response.ok) {
		const errorData = await response.json().catch(() => ({}));
		throw new Error(errorData.error || `Failed to save scene (HTTP ${response.status})`);
	}
}
//#endregion
//#region src/components/ShadowPipelineApp.tsx
var ShadowPipelineApp = () => {
	const [currentStep, setCurrentStep] = useState(1);
	const [imageUrl, setImageUrl] = useState("/ClarkV_original.jpg");
	const [depthMapUrl, setDepthMapUrl] = useState("/ClarkV_depth_map.png");
	const [latitude, setLatitude] = useState(39.7436);
	const [longitude, setLongitude] = useState(-8.8071);
	const [scene, setScene] = useState(null);
	const [saveStatus, setSaveStatus] = useState({ type: "idle" });
	const handleImageFileChange = (e) => {
		if (e.target.files && e.target.files[0]) {
			const url = URL.createObjectURL(e.target.files[0]);
			setImageUrl(url);
		}
	};
	const handleDepthFileChange = (e) => {
		if (e.target.files && e.target.files[0]) {
			const url = URL.createObjectURL(e.target.files[0]);
			setDepthMapUrl(url);
		}
	};
	const handleAnnotationSave = (savedScene) => {
		setScene(savedScene);
		setCurrentStep(3);
	};
	const handleDownloadJSON = () => {
		if (!scene) return;
		const jsonStr = JSON.stringify(scene, null, 2);
		const blob = new Blob([jsonStr], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${scene.scene_metadata.scene_id || "scene"}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};
	const handleSaveToServer = async () => {
		if (!scene) return;
		setSaveStatus({ type: "saving" });
		try {
			await saveScene(scene);
			setSaveStatus({
				type: "success",
				message: `Successfully saved to server at data/scenes/${scene.scene_metadata.scene_id}.json`
			});
		} catch (err) {
			setSaveStatus({
				type: "error",
				message: err.message || "Failed to save to server."
			});
		}
	};
	return /* @__PURE__ */ jsxs("div", {
		className: "max-w-7xl mx-auto space-y-6",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "bg-white p-6 rounded-xl shadow-md border border-gray-200",
				children: [/* @__PURE__ */ jsx("div", {
					className: "flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6",
					children: /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h1", {
						className: "text-2xl font-extrabold text-gray-900",
						children: "2.5D Playground Shadow Projection Pipeline"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-sm text-gray-500 mt-1",
						children: "Annotate 2D playground scenes and simulate time-dependent solar shadows with depth map displacement."
					})] })
				}), /* @__PURE__ */ jsx("div", {
					className: "grid grid-cols-4 gap-2 border-t border-gray-100 pt-4",
					children: [
						{
							step: 1,
							label: "1. Load Files"
						},
						{
							step: 2,
							label: "2. Annotate"
						},
						{
							step: 3,
							label: "3. Shadow Preview"
						},
						{
							step: 4,
							label: "4. Export"
						}
					].map((item) => /* @__PURE__ */ jsx("button", {
						type: "button",
						disabled: item.step === 2 && !imageUrl || item.step >= 3 && !scene,
						onClick: () => setCurrentStep(item.step),
						className: `py-2 px-3 rounded-lg text-xs md:text-sm font-bold text-center transition ${currentStep === item.step ? "bg-blue-600 text-white shadow" : item.step < currentStep ? "bg-blue-50 text-blue-700 hover:bg-blue-100" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`,
						children: item.label
					}, item.step))
				})]
			}),
			currentStep === 1 && /* @__PURE__ */ jsxs("div", {
				className: "bg-white p-8 rounded-xl shadow-md border border-gray-200 space-y-6",
				children: [
					/* @__PURE__ */ jsx("h2", {
						className: "text-lg font-bold text-gray-900",
						children: "Step 1 — Load Scene & Depth Map"
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h3", {
							className: "font-bold text-blue-900 text-sm",
							children: "Use Clark V Playground Preset"
						}), /* @__PURE__ */ jsxs("p", {
							className: "text-xs text-blue-700 mt-0.5",
							children: [
								"Load pre-bundled ",
								/* @__PURE__ */ jsx("code", { children: "ClarkV_original.jpg" }),
								" and depth map ",
								/* @__PURE__ */ jsx("code", { children: "ClarkV_depth_map.png" }),
								"."
							]
						})] }), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => {
								setImageUrl("/ClarkV_original.jpg");
								setDepthMapUrl("/ClarkV_depth_map.png");
								setCurrentStep(2);
							},
							className: "px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow",
							children: "Use Clark V Files →"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "grid md:grid-cols-2 gap-6 pt-4 border-t border-gray-100",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "space-y-3",
							children: [
								/* @__PURE__ */ jsx("label", {
									className: "block text-sm font-semibold text-gray-700",
									children: "Base Playground Image (.jpg / .png)"
								}),
								/* @__PURE__ */ jsx("input", {
									type: "file",
									accept: "image/jpeg,image/png",
									onChange: handleImageFileChange,
									className: "block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
								}),
								imageUrl && /* @__PURE__ */ jsx("div", {
									className: "mt-2 border rounded overflow-hidden max-h-48 bg-gray-900",
									children: /* @__PURE__ */ jsx("img", {
										src: imageUrl,
										alt: "Base Preview",
										className: "h-48 w-full object-contain"
									})
								})
							]
						}), /* @__PURE__ */ jsxs("div", {
							className: "space-y-3",
							children: [
								/* @__PURE__ */ jsx("label", {
									className: "block text-sm font-semibold text-gray-700",
									children: "Monocular Depth Map (.png)"
								}),
								/* @__PURE__ */ jsx("input", {
									type: "file",
									accept: "image/png",
									onChange: handleDepthFileChange,
									className: "block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
								}),
								depthMapUrl && /* @__PURE__ */ jsx("div", {
									className: "mt-2 border rounded overflow-hidden max-h-48 bg-gray-900",
									children: /* @__PURE__ */ jsx("img", {
										src: depthMapUrl,
										alt: "Depth Map Preview",
										className: "h-48 w-full object-contain"
									})
								})
							]
						})]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "flex justify-end pt-4",
						children: /* @__PURE__ */ jsx("button", {
							type: "button",
							disabled: !imageUrl,
							onClick: () => setCurrentStep(2),
							className: "px-6 py-2.5 font-bold text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition",
							children: "Proceed to Annotations →"
						})
					})
				]
			}),
			currentStep === 2 && /* @__PURE__ */ jsxs("div", {
				className: "space-y-4",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex justify-between items-center bg-white px-6 py-3 rounded-xl border border-gray-200",
					children: [/* @__PURE__ */ jsx("h2", {
						className: "text-lg font-bold text-gray-900",
						children: "Step 2 — Object Annotation"
					}), /* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => setCurrentStep(1),
						className: "text-xs text-gray-600 hover:text-gray-900 underline font-medium",
						children: "← Back to File Selection"
					})]
				}), /* @__PURE__ */ jsx(AnnotationTool, {
					imageUrl,
					depthMapUrl,
					onSave: handleAnnotationSave,
					initialScene: scene || void 0
				})]
			}),
			currentStep === 3 && scene && /* @__PURE__ */ jsxs("div", {
				className: "space-y-4",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-gray-200",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "flex items-center gap-4",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "text-lg font-bold text-gray-900",
							children: "Step 3 — Solar Shadow Simulation"
						}), /* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 text-xs",
							children: [
								/* @__PURE__ */ jsx("label", {
									className: "font-semibold text-gray-600",
									children: "Lat:"
								}),
								/* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.0001",
									value: latitude,
									onChange: (e) => setLatitude(parseFloat(e.target.value) || 0),
									className: "w-24 px-2 py-1 border rounded text-xs"
								}),
								/* @__PURE__ */ jsx("label", {
									className: "font-semibold text-gray-600",
									children: "Lon:"
								}),
								/* @__PURE__ */ jsx("input", {
									type: "number",
									step: "0.0001",
									value: longitude,
									onChange: (e) => setLongitude(parseFloat(e.target.value) || 0),
									className: "w-24 px-2 py-1 border rounded text-xs"
								})
							]
						})]
					}), /* @__PURE__ */ jsxs("div", {
						className: "flex gap-2",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setCurrentStep(2),
							className: "px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg",
							children: "← Back to Annotate"
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setCurrentStep(4),
							className: "px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg",
							children: "Next: Export Scene →"
						})]
					})]
				}), /* @__PURE__ */ jsx(ShadowPreview, {
					imageUrl,
					depthMapUrl,
					scene,
					latitude,
					longitude
				})]
			}),
			currentStep === 4 && scene && /* @__PURE__ */ jsxs("div", {
				className: "bg-white p-8 rounded-xl shadow-md border border-gray-200 space-y-6",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex justify-between items-center border-b border-gray-100 pb-4",
						children: [/* @__PURE__ */ jsx("h2", {
							className: "text-lg font-bold text-gray-900",
							children: "Step 4 — Export Scene Annotation JSON"
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setCurrentStep(3),
							className: "text-xs text-gray-600 hover:text-gray-900 underline font-medium",
							children: "← Back to Preview"
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap gap-4",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: handleDownloadJSON,
							className: "px-5 py-2.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow transition",
							children: "📥 Download JSON File"
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							disabled: saveStatus.type === "saving",
							onClick: handleSaveToServer,
							className: "px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg shadow transition",
							children: saveStatus.type === "saving" ? "Saving..." : "☁️ Save to Server"
						})]
					}),
					saveStatus.message && /* @__PURE__ */ jsx("div", {
						className: `p-3 rounded-lg text-xs font-semibold ${saveStatus.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`,
						children: saveStatus.message
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsxs("label", {
							className: "block text-xs font-bold text-gray-700",
							children: [
								"Raw JSON Data (",
								scene.annotations.length,
								" annotations)"
							]
						}), /* @__PURE__ */ jsx("pre", {
							className: "p-4 bg-gray-900 text-green-400 rounded-lg text-xs font-mono overflow-x-auto max-h-[500px]",
							children: JSON.stringify(scene, null, 2)
						})]
					})
				]
			})
		]
	});
};
//#endregion
//#region src/pages/index.astro
var pages_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => ""
});
var $$Index = createComponent(($$result, $$props, $$slots) => {
	return renderTemplate`${renderComponent($$result, "BaseLayout", $$BaseLayout, {}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<main class="p-4 md:p-8 max-w-7xl mx-auto">${renderComponent($$result, "ShadowPipelineApp", ShadowPipelineApp, {
		"client:load": true,
		"client:component-hydration": "load",
		"client:component-path": "D:/Work/play-model-portal/src/components/ShadowPipelineApp.tsx",
		"client:component-export": "ShadowPipelineApp"
	})}</main>` })}`;
}, "D:/Work/play-model-portal/src/pages/index.astro", void 0);
var $$file = "D:/Work/play-model-portal/src/pages/index.astro";
//#endregion
//#region \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
//#endregion
export { page };
