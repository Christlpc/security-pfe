import { AuthLayout } from "@/components/layouts/AuthLayout";

export default function AuthLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthLayout>{children}</AuthLayout>;
}




