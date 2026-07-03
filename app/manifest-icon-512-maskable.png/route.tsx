import { ImageResponse } from "next/og";
import { PwaIcon } from "@/lib/pwa-icon";

export async function GET() {
  return new ImageResponse(<PwaIcon size={512} maskable />, {
    width: 512,
    height: 512,
  });
}
