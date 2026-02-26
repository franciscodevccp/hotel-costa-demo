import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // El proxy a veces envía Origin con punto final (sistema.hoteldelacosta.cl.)
      // y x-forwarded-host sin él; hay que permitir ambos para que las Server Actions no fallen.
      allowedOrigins: [
        "sistema.hoteldelacosta.cl",
        "sistema.hoteldelacosta.cl.",
        "localhost:3000",
      ],
    },
  },
};

export default nextConfig;
