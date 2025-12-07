/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "zagvvpwvbuzqseclsucm.supabase.co",
            },
        ],
    },
};

export default nextConfig;
