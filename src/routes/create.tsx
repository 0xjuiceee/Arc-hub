import { createFileRoute } from "@tanstack/react-router";
import CreateToken from "@/pages/CreateToken";

export const Route = createFileRoute("/create")({
  component: CreateToken,
});
