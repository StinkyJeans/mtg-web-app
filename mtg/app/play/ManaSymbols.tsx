// Mana symbols, drawn with the mana-font icon font (its stylesheet is loaded in app/layout.tsx).

const NAMES: Record<string, string> = {
  W: "White mana",
  U: "Blue mana",
  B: "Black mana",
  R: "Red mana",
  G: "Green mana",
  C: "Colorless mana",
  X: "X: any amount",
  S: "Snow mana",
};

const describe = (symbol: string) => NAMES[symbol] ?? (/^\d+$/.test(symbol) ? `${symbol} mana of any color` : `Mana: ${symbol}`);

/**
 * One mana symbol. `symbol` is what is printed inside the braces of a cost: "G", "2", "W/U", "X"...
 * (mana-font names them ms-g, ms-2, ms-wu, ms-x.)
 */
export function ManaSymbol({ symbol }: { symbol: string }) {
  const icon = symbol.replace("/", "").toLowerCase();
  return <i className={`ms ms-${icon} ms-cost ms-shadow`} role="img" aria-label={describe(symbol)} title={describe(symbol)} />;
}

/** A printed cost like "{1}{G}" drawn as symbols. */
export function ManaCostView({ cost }: { cost: string }) {
  const symbols = [...cost.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
  return (
    <span className="inline-flex flex-wrap items-center gap-0.5">
      {symbols.map((s, i) => (
        <ManaSymbol key={i} symbol={s} />
      ))}
    </span>
  );
}

/** Text that may contain costs like "{2}{G}{G}": every {...} is drawn as a mana symbol. */
export function ManaText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\{[^}]+\})/g).map((part, i) => {
        const symbol = /^\{([^}]+)\}$/.exec(part)?.[1];
        return symbol ? (
          <span key={i} className="mx-px inline-block align-middle">
            <ManaSymbol symbol={symbol} />
          </span>
        ) : (
          part
        );
      })}
    </>
  );
}

