import { EndpointsSkeleton } from "@/components/Skeletons";

// Shown the moment a tab is clicked, while the server renders the page; the
// header and tabs stay put above it.
export default function Loading() {
  return <EndpointsSkeleton />;
}
