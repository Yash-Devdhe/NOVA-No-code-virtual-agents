import type { Metadata } from "next";
// import {Outfit} from 'next/font/google';
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ClerkProvider } from '@clerk/nextjs'
import { Provider } from "@radix-ui/react-tooltip";
import { clerkPublishableKey, isClerkEnabled } from "@/lib/authMode";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "NOVA: No Code Virtual Agents",
  description: "The Website where you can create your own AI Virtual Agents without coding.",
};
// const outfit = Outfit({subsets: ['latin']});
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = (
    <ConvexClientProvider>
      <Provider>
        {children}
        <Toaster richColors position="top-right" />
      </Provider>
    </ConvexClientProvider>
  );

  return (
    <html lang="en">
      <body className={outfit.className} >
        {isClerkEnabled ? (
          <ClerkProvider
            publishableKey={clerkPublishableKey}
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
