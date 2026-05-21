import { type ReactNode } from "react";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  /** "top" (par défaut), "bottom", "left", "right" */
  placement?: "top" | "bottom" | "left" | "right";
}

/**
 * Tooltip CSS pur : apparaît au hover sur le wrapper. Pas de JS de positionnement.
 * Le contenu peut être un texte simple ou du JSX riche.
 */
export function Tooltip({ content, children, placement = "top" }: TooltipProps) {
  return (
    <span className="tooltip-wrapper">
      {children}
      <span className={`tooltip-content tooltip-${placement}`}>{content}</span>
    </span>
  );
}
