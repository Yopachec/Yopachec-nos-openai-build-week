import type { ReactNode } from "react";
import "./styles.css";

export const metadata = {
  title: "Ños · Clinical-Symbolic System",
  description: "Technical demonstration of the Ños 1.2.5 architecture"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
