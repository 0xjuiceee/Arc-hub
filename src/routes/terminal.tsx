import { createFileRoute } from "@tanstack/react-router";
import Explore from "@/pages/Explore";

export const Route = createFileRoute("/terminal")({
  component: Explore,
});
