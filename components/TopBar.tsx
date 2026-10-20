import SpeakerToggle from "./SpeakerToggle";

/**
 * Sticky top bar used by every screen: a title on the left and the
 * persistent speaker toggle on the right.
 */
export default function TopBar({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-[1.5rem] font-bold leading-tight text-ink">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-[1rem] leading-snug text-ink-soft">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {right}
          <SpeakerToggle />
        </div>
      </div>
    </header>
  );
}
