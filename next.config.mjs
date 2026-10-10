/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Every workspace page reads live data (the request log, the endpoints, the
    // list of workspaces), so a client-side navigation always asks the server
    // again rather than reusing what it showed up to 30 seconds ago, which made
    // a new workspace or a cleared log look missing until a reload.
    staleTimes: { dynamic: 0 },
  },
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
