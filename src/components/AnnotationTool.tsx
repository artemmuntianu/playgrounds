import React from 'react';
import type { SceneAnnotation } from '../types/shadow';
import { useAnnotationTool } from './annotation/useAnnotationTool';
import { AnnotationToolBar } from './annotation/AnnotationToolBar';
import { AnnotationSidebar } from './annotation/AnnotationSidebar';
import { AnnotationCanvas } from './annotation/AnnotationCanvas';

interface AnnotationToolProps {
  imageUrl: string;
  depthMapUrl: string;
  onSave: (scene: SceneAnnotation) => void;
  initialScene?: SceneAnnotation;
}

export const AnnotationTool: React.FC<AnnotationToolProps> = ({
  imageUrl,
  depthMapUrl,
  onSave,
  initialScene,
}) => {
  const {
    sceneId, setSceneId,
    cameraAzimuth, setCameraAzimuth,
    cameraFov, setCameraFov,
    horizonY, setHorizonY,
    sunLightStrength, setSunLightStrength,
    sunSkyGlow, setSunSkyGlow,
    annotations, mode, setMode, activePolygon, setActivePolygon,
    selectedAnnotationId, setSelectedAnnotationId,
    activeGroundBases, setActiveGroundBases,
    showForm, setShowForm, objectId, setObjectId, category, setCategory,
    canopyOpacity, setCanopyOpacity,
    objectDepthCm, setObjectDepthCm,
    isOffscreen, formError,
    containerRef, imageRef, canvasRef,
    getImageRectMetrics, drawOverlay,
    handleCanvasClick, handleDoubleClick,
    handleFinishObject, handleAddOffscreenPreset, handleAddAnnotation,
    handleDeleteAnnotation, handleUpdateAnnotation, handleExportScene,
  } = useAnnotationTool({ imageUrl, depthMapUrl, onSave, initialScene });

  return (
    <div className="flex flex-col lg:flex-row gap-6 bg-white p-6 rounded-xl shadow-lg border border-gray-200">
      {/* Left: Image Canvas Container with Off-screen Margins */}
      <div className="flex-1 flex flex-col items-center">
        <AnnotationToolBar
          mode={mode}
          activePolygon={activePolygon}
          setMode={setMode}
          setActivePolygon={setActivePolygon}
          selectedAnnotationId={selectedAnnotationId}
          activeGroundBases={activeGroundBases}
          setActiveGroundBases={setActiveGroundBases}
          annotations={annotations}
          handleFinishObject={handleFinishObject}
          handleAddOffscreenPreset={handleAddOffscreenPreset}
        />

        <AnnotationCanvas
          imageUrl={imageUrl}
          containerRef={containerRef}
          imageRef={imageRef}
          canvasRef={canvasRef}
          mode={mode}
          setHorizonY={setHorizonY}
          drawOverlay={drawOverlay}
          getImageRectMetrics={getImageRectMetrics}
          handleCanvasClick={handleCanvasClick}
          handleDoubleClick={handleDoubleClick}
        />
        <p className="text-xs text-gray-500 mt-2 text-center">
          The dark padded area around the photo is the <strong>off-screen margin</strong>. Draw trees or structures outside the photo border to cast shadows into the scene!
        </p>
      </div>

      {/* Right Sidebar */}
      <AnnotationSidebar
        showForm={showForm}
        isOffscreen={isOffscreen}
        formError={formError}
        objectId={objectId}
        setObjectId={setObjectId}
        category={category}
        setCategory={setCategory}
        canopyOpacity={canopyOpacity}
        setCanopyOpacity={setCanopyOpacity}
        objectDepthCm={objectDepthCm}
        setObjectDepthCm={setObjectDepthCm}
        handleAddAnnotation={handleAddAnnotation}
        setShowForm={setShowForm}
        sceneId={sceneId}
        setSceneId={setSceneId}
        cameraAzimuth={cameraAzimuth}
        setCameraAzimuth={setCameraAzimuth}
        cameraFov={cameraFov}
        setCameraFov={setCameraFov}
        horizonY={horizonY}
        setHorizonY={setHorizonY}
        sunLightStrength={sunLightStrength}
        setSunLightStrength={setSunLightStrength}
        sunSkyGlow={sunSkyGlow}
        setSunSkyGlow={setSunSkyGlow}
        annotations={annotations}
        selectedAnnotationId={selectedAnnotationId}
        setSelectedAnnotationId={setSelectedAnnotationId}
        handleDeleteAnnotation={handleDeleteAnnotation}
        handleUpdateAnnotation={handleUpdateAnnotation}
        handleExportScene={handleExportScene}
      />
    </div>
  );
};
