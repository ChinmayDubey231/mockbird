/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The mock route must never be cached — every call is logged and may inject
  // latency or failure. `force-dynamic` is set on the route itself as well.
  headers: async () => [
    {
      source: "/m/:path*",
      headers: [{ key: "cache-control", value: "no-store" }],
    },
  ],
};
export default nextConfig;
