import { loadAllResults } from "@/lib/data";
import CompareClient from "@/components/CompareClient";

export default function ComparePage() {
  const results = loadAllResults();
  return <CompareClient results={results} />;
}
