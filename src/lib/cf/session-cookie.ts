import { SignJWT, jwtVerify } from "jose";

const COOKIE = "copalibero_session";

export function sessionCookieHeader(token: string, maxAgeSec = 864000): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

export function clearSessionCookie(): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function readSessionCookie(request: Request): string | null {
  const raw = request.headers.get("cookie") ?? "";
  const m = raw.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return m?.[1] ? decodeURIComponent(m[1]) : null;
}

export async function signSession(email: string, secret: string): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime("10d")
    .sign(key);
}

export async function verifySession(token: string, secret: string): Promise<{ email: string } | null> {
  try {
    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    const email = typeof payload.email === "string" ? payload.email : payload.sub;
    if (!email) return null;
    return { email };
  } catch {
    return null;
  }
}
