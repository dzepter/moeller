import { redirect } from "next/navigation";
import { getAcademySession } from "@/lib/academy-session";

export default async function AcademyLanding() {
  const session = await getAcademySession();
  if (session) redirect("/academy/kurs");

  return (
    <div className="border border-line bg-white p-6 md:p-10">
      <p className="eyebrow">Möller Academy</p>
      <h1 className="mt-4 text-3xl">Deine Online-Schulung bei Möller</h1>
      <p className="mt-4">
        Der Zugang zur Academy funktioniert über Deinen persönlichen Einladungslink, den Du per
        E-Mail von uns bekommen hast. Öffne einfach den Link aus der E-Mail – dann geht es hier
        direkt weiter.
      </p>
      <div className="mt-6 border-l-2 border-brand bg-brand-wash p-4 text-[0.95rem]">
        <p className="font-semibold text-ink">Link nicht gefunden oder abgelaufen?</p>
        <p className="mt-1">
          Kein Problem: Melde Dich kurz bei unserem Innendienst unter{" "}
          <a href="tel:+496725919350" className="prose-link">
            06725 / 919350
          </a>{" "}
          (Mo–Fr) – wir schicken Dir sofort einen neuen Link.
        </p>
      </div>
    </div>
  );
}
