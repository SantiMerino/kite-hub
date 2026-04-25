import { NextRequest, NextResponse } from "next/server";
import { isDevAuthBypassEnabled } from "@/lib/dev-bypass";

const DEV_SESSION = {
  user: {
    sub: "dev|bypass-admin",
    email: "admin@dev.local",
    name: "Dev Admin",
    "https://kite-hub.app/role": "admin",
  },
};

class DevAuth0Client {
  async getSession() {
    return DEV_SESSION;
  }
  async middleware(_req: NextRequest) {
    return NextResponse.next();
  }
}

// Lazily import Auth0Client only when the bypass is inactive,
// so real Auth0 env vars are never required in dev-bypass mode.
function createAuth0Client() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Auth0Client } = require("@auth0/nextjs-auth0/server");
  return new Auth0Client();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth0: any = isDevAuthBypassEnabled()
  ? new DevAuth0Client()
  : createAuth0Client();
