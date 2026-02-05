import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ThreeMFLoader } from 'three/examples/jsm/loaders/3MFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface ThreeMFViewProps {
  fileUrl: string | null;
}

export default function ThreeMFViewer( { fileUrl }: ThreeMFViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const disposeObject = (object: THREE.Object3D) => {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) {
          material.forEach((m) => m.dispose());
        } else {
          material.dispose();
        }
      }
    });
  };
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    currentModel: THREE.Group | null;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);

    const camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
    camera.position.set(0, 100, 0);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.1);
    backLight.position.set(-50, -50, -50);
    scene.add(backLight);

    const spotlight = new THREE.SpotLight(0xffffff, 1.5);
    spotlight.position.set(0, 100, 50);
    spotlight.angle = Math.PI/6;
    scene.add(spotlight);

    sceneRef.current = { scene, camera, renderer, controls, currentModel: null };

    let frameId: number = 0;

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      controls.dispose();
      renderer.dispose();
      if (sceneRef.current?.currentModel) {
        disposeObject(sceneRef.current.currentModel);
        scene.remove(sceneRef.current.currentModel);
      }
      container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current || !fileUrl) return;

    const { scene, camera, currentModel } = sceneRef.current;
    if (currentModel) {
      disposeObject(currentModel);
      scene.remove(currentModel);
      sceneRef.current!.currentModel = null;
    }

    let cancelled = false;

    const loader = new ThreeMFLoader();
    loader.load(
      fileUrl,
      (object) => {
        if (cancelled) {
          disposeObject(object);
          return;
        }

        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);

        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 50 / maxDim;
        object.scale.setScalar(scale);

        scene.add(object);
        sceneRef.current!.currentModel = object;

        camera.position.set(0, 0, 100);
        camera.lookAt(0, 0, 0);
      },
      undefined,
      (error) => {
        if (cancelled) {
          console.error('Error loading 3MF:', error);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return <div ref={containerRef} className="threemf-viewer" />;
}
