/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * same-origin BE 프록시 (KAN-271). 브라우저가 `localhost:8080`을 직접 때리면
   * cross-origin이라 CORS에 막힌다. BE에 CORS를 여는 대신 Next가 `/be/*`를
   * 그대로 넘겨주게 해서 브라우저는 상대경로만 부르게 한다.
   * 서버 컴포넌트 fetch는 서버→서버라 이 경로를 타지 않고 절대 URL을 그대로 쓴다.
   */
  async rewrites() {
    const base = process.env.API_BASE_URL ?? "http://localhost:8080";
    return [{ source: "/be/:path*", destination: `${base}/:path*` }];
  },
};

export default nextConfig;
