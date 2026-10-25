import { getTranslations } from "next-intl/server";
import { BasicsView } from "@/features/eligibility";

export async function generateMetadata() {
  return { title: (await getTranslations("meta"))("basics") };
}

export default function Page() {
  return <BasicsView />;
}
