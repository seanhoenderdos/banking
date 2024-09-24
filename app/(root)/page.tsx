"use client";

import React, { useEffect, useState } from 'react';
import HeaderBox from '@/components/HeaderBox';
import RightSidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';
import { getLoggedInUser } from '@/lib/actions/user.actions';
import { getAccount, getAccounts } from '@/lib/actions/bank.actions';
import RecentTransactions from '@/components/RecentTransactions';

const Home = ({ searchParams }: SearchParamProps ) => {
  const currentPage = Number(searchParams.page || '1');

  const [loggedIn, setLoggedIn] = useState<User | null>(null);
  const [accountsData, setAccountsData] = useState<any[]>([]);
  const [account, setAccount] = useState<any>(null);
  const [totalCurrentBalance, setTotalCurrentBalance] = useState<number>(0);
  const [appwriteItemId, setAppwriteItemId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch logged in user
        const user = await getLoggedInUser();
        setLoggedIn(user);

        if (user?.$id) {
          // Fetch accounts for the logged-in user
          const accountsResponse = await getAccounts({ userId: user.$id });
          const accountsData = accountsResponse.data || [];
          setAccountsData(accountsData);

          // Set total current balance
          const totalCurrentBalance = accountsResponse.totalCurrentBalance || 0;
          setTotalCurrentBalance(totalCurrentBalance);

          // Set appwriteItemId from searchParams or the first account's appwriteItemId
          const appwriteItemIdValue = searchParams.id || accountsData[0]?.appwriteItemId;
          setAppwriteItemId(appwriteItemIdValue);

          // Fetch account details if appwriteItemId is available
          if (appwriteItemIdValue) {
            const account = await getAccount({ appwriteItemId: appwriteItemIdValue });
            setAccount(account);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [searchParams, appwriteItemId]); // Ensure appwriteItemId and searchParams are part of dependencies

  // Handle cases where appwriteItemId or data is not yet available
  if (!appwriteItemId || !loggedIn || !accountsData.length) {
    return <div>Loading...</div>; // Add loading or error handling
  }

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox 
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || 'Guest'}
            subtext="Access and manage your account and transactions efficiently."
          />

          <TotalBalanceBox 
            accounts={accountsData}
            totalBanks={accountsData.length}
            totalCurrentBalance={totalCurrentBalance}
          />
        </header>

        {/* Ensure appwriteItemId and currentPage are passed correctly */}
        <RecentTransactions 
          accounts={accountsData}
          transactions={account?.transactions}
          appwriteItemId={appwriteItemId}
          page={currentPage}
        />
      </div>

      {loggedIn && (
        <RightSidebar 
          user={loggedIn}
          transactions={account?.transactions}  
          banks={accountsData?.slice(0, 2)}
        />
      )}
    </section>
  );
}

export default Home;
