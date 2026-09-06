import React from "react";
import { Construction } from "lucide-react";
import { PageHeading, EasyXEmptyState } from "@/design/EasyX";

export default function ComingSoon({ title, note }) {
  return (
    <div data-testid={`coming-soon-${title.toLowerCase()}`}>
      <PageHeading title={title} />
      <div className="mt-6">
        <EasyXEmptyState
          icon={Construction}
          title={`${title} is coming soon`}
          note={note || "This section will be available in an upcoming update."}
        />
      </div>
    </div>
  );
}
