import { Suspense } from "react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat/chat-widget";
import { UtmCapture } from "@/components/site/utm-capture";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <UtmCapture />
      </Suspense>
      <a href="#inhalt" className="skip-link">
        Zum Inhalt springen
      </a>
      <SiteHeader />
      <main id="inhalt">{children}</main>
      <SiteFooter />
      <ChatWidget />
    </>
  );
}
