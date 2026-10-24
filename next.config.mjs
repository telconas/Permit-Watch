/** @type {import('next').NextConfig} */
const nextConfig = {
  // The scraper and its Playwright dependency run outside Next (GitHub Actions),
  // so keep them out of the server bundle.
  serverExternalPackages: ['playwright'],
};

export default nextConfig;
