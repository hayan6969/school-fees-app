import { redirect } from "next/navigation";
import { getSessionUser, needsSetup } from "@/app/actions/auth";
import { LoginClient } from "./login-client";

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const setup = await needsSetup();
  return <LoginClient setup={setup} />;
}
