import { getTranslations } from "next-intl/server";
import { ResultsView } from "@/features/eligibility";

export async function generateMetadata() {
  return { title: (await getTranslations("meta"))("results") };
}

export default function Page() {
  return <ResultsView />;
}
