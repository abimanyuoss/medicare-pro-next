import LoginForm from "./LoginForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: {
    error?: string;
  };
}) {
  return <LoginForm hasError={searchParams.error === "1"} />;
}
