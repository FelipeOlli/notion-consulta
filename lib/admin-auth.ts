import { cookies } from "next/headers";
import { validateSessionToken } from "@/lib/session";

export async function ensureAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("nc_admin_session")?.value;
  if (!token || !validateSessionToken(token)) {
    return false;
  }
  return true;
}
