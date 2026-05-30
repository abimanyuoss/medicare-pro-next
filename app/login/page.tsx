import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const resolvedSearchParams = await searchParams;
  return <LoginForm hasError={resolvedSearchParams.error === "1"} />;
}
