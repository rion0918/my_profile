import { createWorldMapData } from "../../lib/world-map-data.ts";

export const dynamic = "force-static";

export function GET() {
  return Response.json(createWorldMapData());
}
