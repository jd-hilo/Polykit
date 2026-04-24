import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgb(255,255,255)",
        padding: 24,
      }}
    >
      <SignUp fallbackRedirectUrl="/dashboard" signInFallbackRedirectUrl="/dashboard" />
    </div>
  );
}
