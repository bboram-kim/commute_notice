import { isValidKey } from "@/lib/access";

// Keyed manifest so the iPhone home-screen app opens the settings page with the key attached.
export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get("key");
  if (!isValidKey(key)) return new Response("Unauthorized", { status: 401 });

  const manifest = {
    name: "출퇴근 알림",
    short_name: "출퇴근 알림",
    start_url: `/?key=${encodeURIComponent(key)}`,
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [{ src: "/apple-icon", sizes: "180x180", type: "image/png" }],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" },
  });
}
