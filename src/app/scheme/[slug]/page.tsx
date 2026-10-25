import { Suspense } from "react";
import { Checking, Column, SchemeView, Screen } from "@/features/eligibility";

// S08 Scheme page. The scheme comes from the same downloaded snapshot as the results.

export default function Page({ params }: PageProps<"/scheme/[slug]">) {
  return (
    <Suspense
      fallback={
        <Screen>
          <Column className="pt-5">
            <Checking sources="this scheme's rules" />
          </Column>
        </Screen>
      }
    >
      <WithSlug params={params} />
    </Suspense>
  );
}

async function WithSlug({ params }: { params: PageProps<"/scheme/[slug]">["params"] }) {
  const { slug } = await params;
  return <SchemeView slug={slug} />;
}
