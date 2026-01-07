import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Icosahedron, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

// --- CẤU HÌNH MÀU SẮC ---
const THEME = {
    dark: {
        color: "#FFD166",
        roughness: 0.1,
        metalness: 0.8,
        env: "city"
    },
    light: {
        color: "#f1f5f9",
        roughness: 0.05,
        metalness: 0.3,
        env: "studio"
    }
};

const Crystal = ({ position, scale, rotation, speed, isDark }: any) => {
    const meshRef = useRef<THREE.Mesh>(null!);
    const theme = isDark ? THEME.dark : THEME.light;
    const [rotDir] = useState(() => (Math.random() > 0.5 ? 1 : -1));

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.x = rotation[0] + t * 0.2 * speed * rotDir;
        meshRef.current.rotation.y = rotation[1] + t * 0.3 * speed * rotDir;

        // Giảm hiệu ứng nghiêng theo chuột trên mobile để tránh chóng mặt
        const interactionScale = window.innerWidth < 768 ? 0.1 : 0.5;

        meshRef.current.rotation.z = THREE.MathUtils.lerp(
            meshRef.current.rotation.z,
            state.mouse.x * interactionScale,
            0.05
        );
    });

    return (
        <Float
            speed={2 * speed}
            rotationIntensity={0.5}
            floatIntensity={0.8}
            floatingRange={[-0.5, 0.5]}
        >
            <Icosahedron
                ref={meshRef}
                args={[1, 0]}
                position={position}
                scale={scale}
            >
                <meshStandardMaterial
                    color={theme.color}
                    roughness={theme.roughness}
                    metalness={theme.metalness}
                    envMapIntensity={1.5}
                />
            </Icosahedron>
        </Float>
    );
};

// Component quản lý cụm tinh thể có logic Responsive
const CrystalCluster = ({ isDark, isMobile }: { isDark: boolean, isMobile: boolean }) => {
    // LOGIC VỊ TRÍ RESPONSIVE
    // Desktop: Dịch sang phải (4, 0, 0)
    // Mobile: Đưa về giữa và đẩy lên trên một chút (0, 1, 0) để nằm sau/trên text
    const groupPosition: [number, number, number] = isMobile ? [0, 0.5, 0] : [4, 0, 0];

    // LOGIC TỶ LỆ RESPONSIVE
    // Mobile: Thu nhỏ còn 60% kích thước
    const groupScale = isMobile ? 0.6 : 1;

    return (
        <group position={groupPosition} scale={groupScale} rotation={[0, 0, 0.2]}>
            <Crystal position={[0, 0, 0]} scale={2.2} rotation={[0, 0, 0]} speed={1} isDark={isDark} />
            <Crystal position={[-2.5, 2, -1]} scale={0.8} rotation={[1, 1, 0]} speed={1.5} isDark={isDark} />
            <Crystal position={[2.5, -1.5, 1]} scale={1.0} rotation={[2, 0, 2]} speed={1.2} isDark={isDark} />
            <Crystal position={[-1.5, -2.5, 2]} scale={0.6} rotation={[0, 2, 1]} speed={0.8} isDark={isDark} />
            <Crystal position={[1, 3, -2]} scale={0.5} rotation={[1, 0, 1]} speed={1.8} isDark={isDark} />
        </group>
    );
};

export const TechScene = ({ isDark }: { isDark: boolean }) => {
    const theme = isDark ? THEME.dark : THEME.light;

    // State để kiểm tra màn hình Mobile
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // Hàm kiểm tra kích thước
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768); // 768px là chuẩn iPad/Tablet dọc
        };

        // Chạy ngay khi load
        checkMobile();

        // Lắng nghe sự kiện resize
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="fixed inset-0 z-0 pointer-events-none transition-opacity duration-1000">
            <div className={`w-full h-full opacity-100`}>
                <Canvas
                    // Camera lùi xa hơn một chút trên mobile để bao quát được hết
                    camera={{ position: [0, 0, isMobile ? 12 : 10], fov: 45 }}
                    dpr={[1, 2]}
                    gl={{ alpha: true, antialias: true }}
                >
                    <ambientLight intensity={isDark ? 0.3 : 0.6} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} castShadow />
                    <pointLight position={[-10, -10, -10]} intensity={1} color={isDark ? "#FB8500" : "#3b82f6"} />

                    {/* Truyền biến isMobile vào để xử lý vị trí */}
                    <CrystalCluster isDark={isDark} isMobile={isMobile} />

                    {/* Điều chỉnh bóng đổ cho Mobile (cho nhỏ lại và mờ đi) */}
                    <group position={isMobile ? [0, -3, 0] : [4, -4, 0]}>
                        <ContactShadows
                            opacity={isMobile ? 0.4 : 0.6}
                            scale={20}
                            blur={2.5}
                            far={5}
                            color={isDark ? "#000000" : "#94a3b8"}
                        />
                    </group>

                    <Environment preset={theme.env as any} />
                </Canvas>
            </div>
        </div>
    );
};