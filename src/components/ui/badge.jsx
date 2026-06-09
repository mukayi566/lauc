import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-blue-600/20 text-blue-300 border-blue-500/30",
                secondary:
                    "border-transparent bg-white/10 text-[#94a3b8]",
                destructive:
                    "border-transparent bg-red-500/20 text-red-300 border-red-500/30",
                success:
                    "border-transparent bg-green-500/20 text-green-300 border-green-500/30",
                warning:
                    "border-transparent bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
                outline:
                    "text-[#e2e8f0] border-white/20",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function Badge({ className, variant, ...props }) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
