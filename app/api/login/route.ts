import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionMaxAge,
  verifyAdminCredentials,
} from "@/lib/auth";

function required(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function setFlash(response: NextResponse, title: string, description: string) {
  response.cookies.set(
    "medicare_flash",
    encodeURIComponent(JSON.stringify({ title, description })),
    {
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 30,
    }
  );
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const username = required(formData.get("username"));
  const password = required(formData.get("password"));

  if (!username || !password || !verifyAdminCredentials(username, password)) {
    return NextResponse.redirect(new URL("/login?error=1", request.url), {
      status: 303,
    });
  }

  const sessionToken = await createSessionToken(username);
  const response = NextResponse.redirect(
    new URL(`/?flash=${Date.now()}`, request.url),
    {
      status: 303,
    }
  );

  response.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: getSessionMaxAge(),
  });

  setFlash(response, "Login berhasil", "Selamat datang kembali di MediCare Pro.");

  return response;
}
