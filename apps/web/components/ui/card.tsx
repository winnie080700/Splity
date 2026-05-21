type CardProps = React.HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article";
};

export function Card({ as: Component = "div", className, ...props }: CardProps) {
  return (
    <Component
      className={[
        "rounded-lg border border-zinc-200 bg-white p-5 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    />
  );
}
