import { POST as mainPOST } from "../route";

export async function POST(req: Request) {
  return mainPOST(req);
}
