/**
 * Cấu hình toàn bộ Media (Hình ảnh, Video) cho ứng dụng NAMCUMZ.
 * Chỉnh sửa file này để cập nhật media toàn trang mà không cần sửa HTML.
 */

window.MEDIA_CONFIG = {
    hero: {
        desktopVideo: "", // Ví dụ: "/public/media/genshin/hero/hero-video-desktop.mp4"
        mobileVideo: "", // Ví dụ: "/public/media/genshin/hero/hero-video-mobile.mp4"
        poster: "" // Ví dụ: "/public/media/genshin/hero/hero-poster.webp"
    },
    services: {
        abyss: { url: "", alt: "La Hoàn Thâm Cảnh" },
        map: { url: "", alt: "Rush Map & Khám phá" },
        daily: { url: "", alt: "Daily & Xả Nhựa" },
        build: { url: "", alt: "Build Nhân Vật" },
        theater: { url: "", alt: "Nhà Hát Giả Tưởng" },
        custom: { url: "", alt: "Theo Yêu Cầu" }
    },
    tv: {
        main: { url: "", poster: "", title: "Cách tạo đơn và theo dõi tiến độ trong 60 giây", duration: "1:00" },
        sub1: { url: "", poster: "", title: "Tiến trình một đơn Rush Map 100%", duration: "2:30" },
        sub2: { url: "", poster: "", title: "Highlight La Hoàn Thâm Cảnh", duration: "0:45" }
    },
    boosters: {
        b1: { url: "", alt: "Kazuha_Main" },
        b2: { url: "", alt: "Explorer_Pro" },
        b3: { url: "", alt: "YaeMiko_Teyvat" }
    },
    decorations: {
        dashboard: { url: "", alt: "Dashboard Preview" }
    },
    mascot: {
        chibi: { url: "", alt: "Mascot Paimon/Chibi" }
    }
};
