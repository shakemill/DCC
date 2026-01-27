/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone', // Nécessaire pour le déploiement sur Plesk
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**",
            },
        ],
        unoptimized: true,
    },
};

export default nextConfig;
