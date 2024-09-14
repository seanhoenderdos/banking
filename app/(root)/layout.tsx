"use client";

import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoggedInUser } from "@/lib/actions/user.actions";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loggedIn, setLoggedIn] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Added loading state
  const router = useRouter();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getLoggedInUser();
        setLoggedIn(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        setLoggedIn(null);
      } finally {
        setIsLoading(false); // Fetch is complete
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    // Only redirect if not loading and user is logged out
    if (!isLoading && !loggedIn) {
      router.push("/sign-in");
    }
  }, [loggedIn, isLoading, router]);

  // You can also return a loading state while checking the user
  if (isLoading) {
    return <div>Loading...</div>; // Or a full-screen loader
  }

  return (
    <main className="flex h-screen w-full font-inter">
      {/* Pass dynamic user data to Sidebar */}
      <Sidebar user={loggedIn || { firstName: "Sean", lastName: "Hoenderdos", email: "hi@seanhoenderdos.xyz" }} />

      <div className="flex size-full flex-col">
        <div className="root-layout">
          <Image
            src="/icons/logo.svg"
            width={30}
            height={30}
            alt="menu icon"
          />
          <div>
            {/* Pass dynamic user data to MobileNav */}
            <MobileNav user={loggedIn || { firstName: "Sean", lastName: "Hoenderdos", email: "hi@seanhoenderdos.xyz" }} />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
