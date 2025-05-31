import type { SVGProps } from 'react';

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 50"
      width="150"
      height="37.5"
      aria-label="SLR Dispatch Tracker Logo"
      {...props}
    >
      <rect width="200" height="50" rx="5" ry="5" fill="hsl(var(--primary))" />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans), Arial, sans-serif"
        fontSize="20"
        fontWeight="bold"
        fill="hsl(var(--primary-foreground))"
      >
        JDT
      </text>
      <text
        x="50%"
        y="80%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="var(--font-geist-sans), Arial, sans-serif"
        fontSize="8"
        fill="hsl(var(--primary-foreground))"
        opacity="0.8"
      >
        SLR Dispatch Tracker
      </text>
    </svg>
  );
}
