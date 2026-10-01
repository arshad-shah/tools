/** Shared product signature. The same vector is used for the favicon. */
export default function Brand() {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5 font-sans text-xl font-bold tracking-tight text-fg">
      <img src="/brand/tools-mark.svg" width="32" height="32" alt="" />
      Tools<span className="text-accent" aria-hidden>.</span>
    </span>
  );
}
