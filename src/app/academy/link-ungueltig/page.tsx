export default function LinkUngueltigPage() {
  return (
    <div className="border border-line bg-white p-6 md:p-10">
      <p className="eyebrow">Möller Academy</p>
      <h1 className="mt-4 text-3xl">Dieser Link ist leider nicht (mehr) gültig.</h1>
      <p className="mt-4">
        Dein Einladungslink ist abgelaufen, wurde ersetzt oder stimmt nicht ganz. Das lässt sich
        schnell lösen:
      </p>
      <p className="mt-4">
        Ruf unseren Innendienst an –{" "}
        <a href="tel:+496725919350" className="prose-link">
          06725 / 919350
        </a>{" "}
        (Mo–Fr) – und wir schicken Dir in wenigen Minuten einen frischen Link per E-Mail.
      </p>
    </div>
  );
}
