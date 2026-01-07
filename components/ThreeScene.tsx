import { Canvas } from '@react-three/fiber';
import { OrbitControls, MeshDistortMaterial, Sphere } from '@react-three/drei';

const ThreeScene = () => {
    return (
        <div className="absolute inset-0 -z-10 opacity-40">
            <Canvas>
                <ambientLight intensity={1} />
                <directionalLight position={[2, 5, 2]} />
                {/* Một khối cầu biến dạng 3D tạo cảm giác công nghệ tương lai */}
                <Sphere visible args={[1, 100, 200]} scale={2.5}>
                    <MeshDistortMaterial
                        color="#FB8500"
                        attach="material"
                        distort={0.4}
                        speed={2}
                        roughness={0}
                    />
                </Sphere>
                <OrbitControls enableZoom={false} />
            </Canvas>
        </div>
    );
};

export default ThreeScene;