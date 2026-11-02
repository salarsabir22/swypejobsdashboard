import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-none hover:bg-[var(--clearpath-navy-hover)] active:scale-[0.98]",
        destructive:
          "bg-destructive text-primary-foreground shadow-none hover:opacity-90",
        outline:
          "border-2 border-primary bg-transparent text-primary shadow-none hover:bg-secondary hover:text-primary",
        secondary:
          "bg-secondary text-secondary-foreground shadow-none hover:bg-secondary/90",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        gradient:
          "bg-primary text-primary-foreground shadow-none hover:bg-[var(--clearpath-navy-hover)] active:scale-[0.98] transition-all duration-300",
      },
      size: {
        default: "h-10 px-5 py-2 text-[15px]",
        sm: "h-9 px-3.5 text-xs",
        lg: "h-14 px-8 text-[18px] font-medium",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  /** Shows a spinner and disables the button while work is in progress. */
  loading?: boolean
  /** Optional label shown instead of children while loading. */
  loadingText?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button"
    const isDisabled = disabled || loading

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : loading ? (
          <>
            <Loader2 className="animate-spin" aria-hidden />
            {loadingText ?? null}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
