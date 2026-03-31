import type { Metadata } from "next";
import {Outfit} from 'next/font/google';
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ClerkProvider } from '@clerk/nextjs'
import { Provider } from "@radix-ui/react-tooltip";
import { isClerkEnabled } from "@/lib/authMode";

export const metadata: Metadata = {
  title: "NOVA: No Code Virtual Agents",
  description: "The Website where you can create your own AI Virtual Agents without coding.",
};
const outfit = Outfit({subsets: ['latin']});
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <ConvexClientProvider>
      <Provider>
        {children}
      </Provider>
    </ConvexClientProvider>
  );

  return (
    <html lang="en">
      <body className={outfit.className} >
        {isClerkEnabled ? (
          <ClerkProvider
            publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
          >
            {content}
          </ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
