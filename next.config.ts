import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 예상 시험은 뺐다. 예전 링크는 문제 목록으로
  async redirects() {
    return [
      { source: "/mock", destination: "/problems", permanent: false },
      { source: "/mock/:path*", destination: "/problems", permanent: false },
    ];
  },
};

export default nextConfig;
