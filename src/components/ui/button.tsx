import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "dark" | "light";
  children: ReactNode;
};

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  const style = variant === "primary" ? "button-primary" : variant === "dark" ? "button-dark" : "button-light";
  return <button className={cn("button", style, className)} {...props}>{children}</button>;
}
