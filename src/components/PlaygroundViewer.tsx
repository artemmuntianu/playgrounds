import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { useEffect, useRef } from 'react';
import type { PlaygroundManifest, PlaygroundElement } from '../types/playground';

export default function PlaygroundViewer({ manifest, sunAngle, onUpdate }: { manifest: PlaygroundManifest, sunAngle: number, onUpdate: (m: PlaygroundManifest) => void }) {
  const mountRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const sunRef = useRef<THREE.DirectionalLight | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    
    const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(800, 600);
    mountRef.current.appendChild(renderer.domElement);

    // Light
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(10, 10, 10);
    scene.add(sun);
    sunRef.current = sun;

    const orbit = new OrbitControls(camera, renderer.domElement);
    const transform = new TransformControls(camera, renderer.domElement);
    transformRef.current = transform;
    scene.add(transform);

    // Click handler for selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    mountRef.current.addEventListener('pointerdown', (e) => {
      const rect = mountRef.current?.getBoundingClientRect();
      if (!rect) return;
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      if (intersects.length > 0 && intersects[0].object instanceof THREE.Mesh) {
         transform.attach(intersects[0].object);
      }
    });

    // Objects
    manifest.elements.forEach(el => {
      const geometry = new THREE.BoxGeometry(el.dimensions.w, el.dimensions.h, el.dimensions.d);
      const mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({ color: 0x3b82f6 }));
      mesh.position.set(el.position.x, el.dimensions.h / 2, el.position.z);
      mesh.userData = el;
      scene.add(mesh);
    });

    transform.addEventListener('dragging-changed', (event) => {
      orbit.enabled = !event.value;
      if (!event.value && transform.object) {
        const obj = transform.object as THREE.Mesh;
        const el = obj.userData as PlaygroundElement;
        const newManifest = {
          elements: manifest.elements.map(e => e.id === el.id ? {
            ...e,
            position: { x: obj.position.x, y: 0, z: obj.position.z }
          } : e)
        };
        onUpdate(newManifest);
      }
    });

    camera.position.set(5, 5, 5);
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      mountRef.current?.removeChild(renderer.domElement);
      orbit.dispose();
      transform.dispose();
    };
  }, [manifest]);

  // Handle sun angle update
  useEffect(() => {
    if (sunRef.current) {
      const rad = (sunAngle * Math.PI) / 180;
      sunRef.current.position.set(Math.sin(rad) * 10, 5, Math.cos(rad) * 10);
    }
  }, [sunAngle]);

  return <div ref={mountRef} className='rounded-lg overflow-hidden border shadow-inner' />;
}
