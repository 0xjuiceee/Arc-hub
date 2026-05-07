import { createFileRoute } from "@tanstack/react-router";
import Profile from "@/pages/Profile";

export const Route = createFileRoute("/profile")({
  component: Profile,
  validateSearch: (s: Record<string, unknown>) => ({ address: typeof s.address === 'string' ? s.address : undefined }),
});
