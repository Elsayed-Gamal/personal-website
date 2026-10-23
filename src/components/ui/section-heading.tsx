export function SectionHeading({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro?: string;
}) {
  return (
    <div className="mb-14 grid gap-6 md:grid-cols-[.52fr_1.48fr] md:items-start">
      <p className="eyebrow flex items-center gap-3 pt-2 before:block before:h-px before:w-7 before:bg-[#245bc4]">
        {eyebrow}
      </p>
      <div>
        <h2 className="max-w-4xl text-3xl leading-[1.12] font-semibold tracking-[-.05em] text-balance sm:text-5xl lg:text-[3.5rem]">
          {title}
        </h2>
        {intro ? (
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#586779]">
            {intro}
          </p>
        ) : null}
      </div>
    </div>
  );
}
