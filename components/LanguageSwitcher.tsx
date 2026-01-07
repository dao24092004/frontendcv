import React, { useEffect, useState } from 'react';

const LanguageSwitcher: React.FC = () => {
    const [lang, setLang] = useState('vi');

    useEffect(() => {
        // Lấy ngôn ngữ hiện tại khi load trang
        const currentLang = localStorage.getItem('app_lang') || 'vi';
        setLang(currentLang);
    }, []);

    const changeLanguage = (newLang: string) => {
        if (lang === newLang) return;

        // 1. Lưu ngôn ngữ mới
        localStorage.setItem('app_lang', newLang);
        setLang(newLang);

        // 2. Reload trang để gọi lại API Backend với Header mới
        window.location.reload();
    };

    return (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-md border border-gray-200">
            {/* Nút Tiếng Việt */}
            <button
                onClick={() => changeLanguage('vi')}
                className={`w-8 h-8 rounded-full overflow-hidden transition-all border-2 ${lang === 'vi' ? 'border-orange-500 scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                title="Tiếng Việt"
            >
                <img
                    src="https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg"
                    alt="VN"
                    className="w-full h-full object-cover"
                />
            </button>

            {/* Nút Tiếng Anh */}
            <button
                onClick={() => changeLanguage('en')}
                className={`w-8 h-8 rounded-full overflow-hidden transition-all border-2 ${lang === 'en' ? 'border-orange-500 scale-110 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                title="English"
            >
                <img
                    src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Flag_of_the_United_States.svg"
                    alt="EN"
                    className="w-full h-full object-cover"
                />
            </button>
        </div>
    );
};

export default LanguageSwitcher;