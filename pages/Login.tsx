import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            // Gọi API Login
            const response = await axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
                username,
                password
            });

            // Lấy dữ liệu từ phản hồi (Response)
            const { token, role, profileId, username: resUsername, fullName } = response.data;

            // 1. Lưu Token và thông tin User vào localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('role', role);

            if (profileId) localStorage.setItem('profileId', profileId.toString());
            if (resUsername) localStorage.setItem('username', resUsername);
            if (fullName) localStorage.setItem('fullName', fullName);

            // 2. Điều hướng dựa trên Quyền (Role)
            if (role === 'ADMIN') {
                navigate('/admin'); // Chuyển đến trang Admin
            } else {
                navigate('/user');  // Chuyển đến trang User (Dashboard cá nhân)
            }

        } catch (err: any) {
            // Xử lý lỗi
            const errorMessage = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
            setError(errorMessage);
            console.error(err);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="px-8 py-6 mt-4 text-left bg-white shadow-lg rounded-lg w-full max-w-md">
                <h3 className="text-2xl font-bold text-center text-gray-800">Đăng nhập hệ thống</h3>
                <form onSubmit={handleLogin}>
                    <div className="mt-4">
                        <div>
                            <label className="block text-gray-600 font-medium" htmlFor="username">Tên đăng nhập</label>
                            <input
                                type="text"
                                placeholder="Nhập username..."
                                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="mt-4">
                            <label className="block text-gray-600 font-medium" htmlFor="password">Mật khẩu</label>
                            <input
                                type="password"
                                placeholder="Nhập mật khẩu..."
                                className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        {error && (
                            <div className="mt-3 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center justify-between mt-6">
                            <button
                                type="submit"
                                className="w-full px-6 py-2.5 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition duration-200 font-bold shadow-md"
                            >
                                Đăng nhập
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;