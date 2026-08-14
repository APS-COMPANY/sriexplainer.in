import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SRI EXPLAINER VIP STREAM",
    short_name: "Sri Explainer",
    description: "Watch remarkable story explainers and premium series",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#000000",
    theme_color: "#8B2CFF",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
