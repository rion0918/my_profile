export function ModeBar({ mode }: { mode: "world" | "profile" }) {
  return (
    <header className={`modeBar ${mode === "world" ? "modeBarDark" : ""}`}>
      {mode !== "world" && <a className="wordmark" href="/" aria-label="RH Rion Hashimoto ホーム">
        RH{" "}<span>Rion Hashimoto</span>
      </a>}
      <nav className="modeSwitch" aria-label="表示モード">
        {mode !== "world" && <a href="/">
          3Dワールド
        </a>}
        <a
          href="/profile"
          aria-current={mode === "profile" ? "page" : undefined}
        >
          通常表示
        </a>
      </nav>
    </header>
  );
}
