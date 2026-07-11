import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(
    new URL("/app/login", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000")
  );
  response.cookies.delete("pesv_session");
  return response;
}
