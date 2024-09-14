"use client";

import React, { useEffect, useState } from 'react';
import HeaderBox from '@/components/HeaderBox';
import RightSidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox';
import { getLoggedInUser } from '@/lib/actions/user.actions';

const Home = () => {
  const [loggedIn, setLoggedIn] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getLoggedInUser();
        setLoggedIn(user);
      } catch (error) {
        console.error("Error fetching user:", error);
        setLoggedIn(null);
      }
    };

    fetchUser();
  }, []);

  return (
    <section className='home'>
      <div className='home-content'>
        <header className='home-header'>
          <HeaderBox 
            type="greeting"
            title="Welcome"
            user={loggedIn?.name || 'Guest'}
            subtext="Access and manage your account and transactions efficiently."
          />

          <TotalBalanceBox 
            accounts={[]}
            totalBanks={1}
            totalCurrentBalance={1350}
          />
        </header>

        RECENT TRANSACTIONS
      </div>

      <RightSidebar 
        user={loggedIn || { firstName: 'Sean', lastName: 'Hoenderdos', email: 'hi@seanhoenderdos.xyz' }}
        transactions={[]}
        banks={[{ currentBalance: 123.50 }, 
          { currentBalance: 123.50 }]}
      />
    </section>
  );
}

export default Home;
