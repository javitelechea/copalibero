import { AppFrame } from "@/components/AppFrame";
import { DemoRibbon } from "@/components/DemoRibbon";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppFrame>
      <DemoRibbon />
      {children}
    </AppFrame>
  );
}
