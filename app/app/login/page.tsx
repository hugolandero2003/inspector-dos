import { redirect } from "next/navigation";

// Esta ruta ya no se usa — redirigir al login unificado
export default function AppLoginRedirect({
  searchParams,
}: {
  searchParams: { redirect?: string };
}) {
  const dest = searchParams.redirect
    ? `/login?redirect=${encodeURIComponent(searchParams.redirect)}`
    : "/login";
  redirect(dest);
}
