import { getTranslations } from "next-intl/server";
import { StateView } from "@/features/eligibility";

export async function generateMetadata() {
  return { title: (await getTranslations("meta"))("state") };
}

export default function Page() {
  return <StateView />;
}
