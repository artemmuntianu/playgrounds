export default function ClimateControls({ 
  sunAngle, 
  onSunAngleChange 
}: { 
  sunAngle: number, 
  onSunAngleChange: (angle: number) => void 
}) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
      <h2 className="text-lg font-bold mb-4">Climate Simulation</h2>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Sun Position: {sunAngle}°
      </label>
      <input
        type="range"
        min="0"
        max="360"
        value={sunAngle}
        onChange={(e) => onSunAngleChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        <span>Sunrise</span>
        <span>Noon</span>
        <span>Sunset</span>
      </div>
    </div>
  );
}
