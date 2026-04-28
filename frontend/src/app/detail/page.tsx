import { loadAllResults } from "@/lib/data";
import DetailClient from "@/components/DetailClient";

export default function DetailPage() {
  const results = loadAllResults();
  return <DetailClient results={results} />;
}
