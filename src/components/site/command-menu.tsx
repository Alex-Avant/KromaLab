"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileImageIcon, HomeIcon, BookOpenIcon, ZapIcon, LinkIcon } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useUiStore } from "@/store/ui-store";

export function CommandMenu() {
  const router = useRouter();
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!useUiStore.getState().commandOpen);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setOpen]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar operación del laboratorio…" />
      <CommandList>
        <CommandEmpty>Sin resultados. Revisa la nomenclatura.</CommandEmpty>
        <CommandGroup heading="Navegación">
          <CommandItem onSelect={() => run(() => router.push("/"))}>
            <HomeIcon className="text-muted-foreground" />
            <span>Inicio</span>
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => router.push("/herramientas/semitonos-dtf"))}
          >
            <FileImageIcon className="text-muted-foreground" />
            <span>Editor de semitonos DTF</span>
            <CommandShortcut>LAB·01</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => run(() => router.push("/guias/semitonos-para-dtf"))}
          >
            <BookOpenIcon className="text-muted-foreground" />
            <span>Guía: semitonos para DTF</span>
          </CommandItem>
          <CommandItem onSelect={() => run(() => router.push("/pro"))}>
            <ZapIcon className="text-muted-foreground" />
            <span>KromaLab Pro</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Sistema">
          <CommandItem
            onSelect={() =>
              run(() => {
                void navigator.clipboard?.writeText(window.location.href);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1200);
              })
            }
          >
            <LinkIcon className="text-muted-foreground" />
            <span>{copied ? "Enlace copiado" : "Copiar enlace actual"}</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
