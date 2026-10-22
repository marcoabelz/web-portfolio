import type { ComponentPropsWithoutRef } from "react";

type ContainerProps = ComponentPropsWithoutRef<"div">;

export function Container({ className, ...props }: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full max-w-[var(--page-max)] px-[var(--gutter)]${className ? ` ${className}` : ""}`}
      {...props}
    />
  );
}
