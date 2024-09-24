"use client";

import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getLoggedInUser } from "@/lib/actions/user.actions";

// Define the full User type if not already available in a global types file
declare type User = {
  $id: string;
  email: string;
  userId: string;
  dwollaCustomerUrl: string;
  dwollaCustomerId: string;
  firstName: string;
  lastName: string;
  name: string;
  address1: string;
  city: string;
  state: string;
  postalCode: string;
  dateOfBirth: string;
  ssn: string;
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [loggedIn, setLoggedIn] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    if (!isLoading && !loggedIn) {
      router.push("/sign-in");
    }
  }, [loggedIn, isLoading, router]);

  // Define fallback user object that conforms to the User type
  const fallbackUser: User = {
    $id: "fallback-id",
    email: "hi@fallback.xyz",
    userId: "fallback-user-id",
    dwollaCustomerUrl: "https://fallback.dwolla.url",
    dwollaCustomerId: "fallback-customer-id",
    firstName: "User",
    lastName: "Fallback",
    name: "User Fallback",
    address1: "123 Fallback St",
    city: "Fallback City",
    state: "FB",
    postalCode: "12345",
    dateOfBirth: "1990-01-01",
    ssn: "1234",
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <main className="flex h-screen w-full font-inter">
      {/* Pass dynamic user data to Sidebar */}
      <Sidebar user={loggedIn || fallbackUser} />

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
            <MobileNav user={loggedIn || fallbackUser} />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
