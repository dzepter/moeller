import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { ChatWidget } from "@/components/site/chat/chat-widget";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
