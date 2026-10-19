"use client";

import * as React from "react";
import { useInView, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

const CHARSET = "█▓▒░01<>/\\|=+*#@%&$";

type ScrambleTextProps = {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "span" | "p";
  duration?: number;
  delay?: number;
};

export function ScrambleText({
  text,
  className,
  as: Tag = "h1",
  duration = 700,
  delay = 0,
}: ScrambleTextProps) {
  const ref = React.useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = React.useState(text);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (!inView || reduced || started.current) return;
    started.current = true;

    let raf = 0;
    const start = performance.now() + delay;

    const frame = (now: number) => {
      const elapsed = now - start;
      if (elapsed < 0) {
        raf = requestAnimationFrame(frame);
        return;
      }
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const resolved = Math.floor(eased * text.length);

      let out = "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === " ") {
          out += ch;
          continue;
        }
        out +=
          i < resolved
            ? ch
            : CHARSET[Math.floor(Math.random() * CHARSET.length)];
      }
      setDisplay(out);

      if (t < 1) {
        raf = requestAnimationFrame(frame);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, text, duration, delay]);

  const Comp = Tag as React.ElementType;
  return (
    <Comp
      ref={ref as React.Ref<HTMLElement>}
      className={cn(className)}
      aria-label={text}
    >
      {reduced || !inView ? text : display}
    </Comp>
  );
}
