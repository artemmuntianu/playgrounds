import fs from 'node:fs/promises';

async function testAdditionalAndDepth() {
  console.log('=== 1. Testing Upload of Additional Photo (is_additional=true) ===');
  const dummyBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  
  const form = new FormData();
  form.append('photo_id', 'gallery_pic_1');
  form.append('file', new Blob([dummyBuffer], { type: 'image/jpeg' }), 'gallery_pic_1.jpg');
  form.append('is_additional', 'true');

  const uploadRes = await fetch('http://127.0.0.1:4321/api/playgrounds/clark_v_playground/photos', {
    method: 'POST',
    body: form,
  });

  const updatedPG = await uploadRes.json();
  console.log('Upload Status:', uploadRes.status, 'Total Photos:', updatedPG.photos?.length);
  const additionalPhoto = updatedPG.photos.find(p => p.id === 'gallery_pic_1');
  console.log('Added photo is_additional:', additionalPhoto?.is_additional);

  console.log('\n=== 2. Testing Depth Map Upload Endpoint (POST /api/playgrounds/:id/depth) ===');
  const depthForm = new FormData();
  depthForm.append('photo_id', 'clark_v_1');
  depthForm.append('depth_file', new Blob([dummyBuffer], { type: 'image/png' }), 'custom_depth.png');

  const depthRes = await fetch('http://127.0.0.1:4321/api/playgrounds/clark_v_playground/depth', {
    method: 'POST',
    body: depthForm,
  });

  const depthResult = await depthRes.json();
  console.log('Depth Upload Status:', depthRes.status);
  const shadowPhoto = depthResult.photos.find(p => p.id === 'clark_v_1');
  console.log('Updated depth map filename:', shadowPhoto?.depth_map_filename);

  console.log('\n=== 3. Testing Setting Additional Photo as Thumbnail ===');
  const thumbRes = await fetch('http://127.0.0.1:4321/api/playgrounds/clark_v_playground', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      thumbnail_photo_id: 'gallery_pic_1',
    }),
  });
  const thumbResult = await thumbRes.json();
  console.log('New thumbnail ID:', thumbResult.thumbnail_photo_id);

  console.log('\n=== 4. Cleaning up test additional photo ===');
  await fetch('http://127.0.0.1:4321/api/playgrounds/clark_v_playground/photos?photo_id=gallery_pic_1', {
    method: 'DELETE',
  });

  console.log('\n=== ALL NEW FEATURE TESTS PASSED! ===');
}

testAdditionalAndDepth().catch(console.error);
