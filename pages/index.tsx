/* eslint-disable canonical/filename-match-exported */
import Head from 'next/head';
import React, { useEffect, useState } from 'react';

import { AccountId } from '../helpers/currency';
import { useLocalStorage } from '../helpers/localStorage';
import styles from '../styles/Home.module.css';

const ACCOUNT_IDS = process.env.ACCOUNT_IDS;

const defaultStartDate = new Date();
defaultStartDate.setDate(defaultStartDate.getDate() - 30); // 30 days ago
const defaultStartDateString = defaultStartDate.toISOString().slice(0, 10);
const defaultEndDate = new Date();
defaultEndDate.setDate(defaultEndDate.getDate() + 1); // tomorrow
const defaultEndDateString = defaultEndDate.toISOString().slice(0, 10);
const initialAccountIds: AccountId[] = ACCOUNT_IDS ? ACCOUNT_IDS.split(',') : [];

// eslint-disable-next-line max-lines-per-function
export default function Home() {
  /* `accountIds` is an array instead of a Set so that users can temporarily paste multiple lines of the same account ID and then edit them to be
   unique before submitting the form. If they were a Set, pasting an account ID more than once would result in confusing behavior of the form just
   showing the first paste. */
  const [accountIds, setAccountIds] = useState<AccountId[]>(initialAccountIds);
  // See comment in `onSubmit` about why not to use just `useLocalStorage`.
  const [accountIdsLocalStorage, setAccountIdsLocalStorage] = useLocalStorage<AccountId[]>('accountIds', initialAccountIds); // useLocalStorage seemed unable to save Set<AccountId>.

  function onChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const accountIdsArray = event.target.value.split('\n').map((accountId) => accountId.trim());
    // console.log('onChange', { accountIdsArray });
    setAccountIds(accountIdsArray);
  }

  function onSubmit() {
    const accountIdsSet = new Set(accountIds); // Removing duplicates.
    // console.log('onSubmit', { accountIdsSet });
    /* The app doesn't save the accountIds to localStorage until form submission because of Principle
    of Least Surprise: https://en.wikipedia.org/wiki/Principle_of_least_astonishment. */
    setAccountIdsLocalStorage(Array.from(accountIdsSet));
  }

  useEffect(() => {
    if (accountIdsLocalStorage) {
      setAccountIds(accountIdsLocalStorage);
    }
  }, [accountIdsLocalStorage]);

  return (
    <div className={styles.container}>
      <Head>
        <title>Transaction Tracking App</title>
        <meta name="description" content="This app creates a report of all debits and credits for specified accounts and their associated lockups." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1>Transaction Tracking App</h1>
        <p>This app creates a report of all debits and credits for specified accounts and their associated lockups.</p>
        <form method="post" action="/api/csv" style={{ marginTop: '2rem' }} onSubmit={onSubmit}>
          <input type="date" name="startDate" placeholder="YYYY-MM-DD" required defaultValue={defaultStartDateString} /> to{' '}
          <input type="date" name="endDate" placeholder="YYYY-MM-DD" required defaultValue={defaultEndDateString} /> (up until, and excluding)
          <textarea
            name="accountIds"
            placeholder="account IDs separated by linebreaks"
            style={{ height: '20rem', width: '100%' }}
            value={accountIds.join('\n')}
            required
            onChange={onChange}
          ></textarea>
          <button>Download report as CSV</button>
        </form>
      </main>
    </div>
  );
}
