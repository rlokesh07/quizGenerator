import type { ReactNode } from "react";

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>;
}
