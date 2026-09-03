// LEGACY — this 3D box editor + sun-angle dashboard is unconnected to the 2.5D shadow pipeline.

import { useState, useEffect } from 'react';
import PlaygroundViewer from './PlaygroundViewer';
import ClimateControls from './ClimateControls';
import type { PlaygroundManifest } from '../types/playground';

export default function PortalDashboard() {
  const [manifest, setManifest] = useState<PlaygroundManifest>({ elements: [] });
  const [sunAngle, setSunAngle] = useState(180);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/manifest').then(r => r.json()).then(setManifest);
  }, []);

  const saveManifest = async (newManifest: PlaygroundManifest) => {
    await fetch('/api/manifest', {
      method: 'POST',
      body: JSON.stringify(newManifest),
      headers: {'Content-Type': 'application/json'}
    });
    setManifest(newManifest);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const response = await fetch('/api/reconstruct', { 
        method: 'POST', 
        body: formData 
      });
      const data = await response.json();
      if (data.elements) {
        await saveManifest(data);
      } else {
        alert('AI could not identify objects. Please try another image.');
      }
    } catch (e) {
      alert('Reconstruction service error.');
    }
    setLoading(false);
  };

  return (
    <div className='space-y-6'>
        <div className='bg-white p-4 rounded shadow border'>
            <label className='block text-sm font-medium mb-2'>Upload Playground Photo (AI-Powered)</label>
            <input type='file' onChange={handleFileUpload} disabled={loading} accept='image/*' />
            {loading && <p className='text-sm text-blue-600 mt-2'>AI is analyzing playground...</p>}
        </div>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6'>
            <div className='md:col-span-3'>
                <PlaygroundViewer manifest={manifest} sunAngle={sunAngle} onUpdate={saveManifest} />
            </div>
            <div className='md:col-span-1 space-y-4'>
                <ClimateControls sunAngle={sunAngle} onSunAngleChange={setSunAngle} />
            </div>
        </div>
    </div>
  );
}
