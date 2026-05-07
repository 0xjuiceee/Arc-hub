import { createFileRoute } from "@tanstack/react-router";
import TokenDetail from "@/pages/TokenDetail";

export const Route = createFileRoute("/token/$address")({
  component: TokenDetail,
});
