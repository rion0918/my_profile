import { createWorldMapData } from "../../lib/world-map-data.ts";

export const prerender = true;

export function GET() {
  return Response.json(createWorldMapData());
}
