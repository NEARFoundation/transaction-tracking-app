import Head from 'next/head';
import { useState } from 'react';
import Commit from '../components/Commit';
import styles from '../styles/Home.module.css';

const ACCOUNT_ID = process.env.ACCOUNT_ID;

const defaultStartDate = new Date();
defaultStartDate.setDate(defaultStartDate.getDate() - 30); // 30 days ago
const defaultStartDateString = defaultStartDate.toISOString().slice(0, 10);
const defaultEndDate = new Date();
defaultEndDate.setDate(defaultEndDate.getDate() + 1); // tomorrow
const defaultEndDateString = defaultEndDate.toISOString().slice(0, 10);

interface FetchPayload {
  startDate: string;
  endDate: string;
  accountIds: string;
}

export default function Home() {
  const [loading, setLoading] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>(defaultStartDateString);
  const [endDate, setEndDate] = useState<string>(defaultEndDateString);
  const [accountIds, setAccountIds] = useState<string>(ACCOUNT_ID || '');

  const handleDownloadClick = async () => {
    setLoading(true);
    try {
      const payload: FetchPayload = { startDate, endDate, accountIds };

      const response = await fetch('/api/csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'report.csv';
        if (contentDisposition) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          let matches = filenameRegex.exec(contentDisposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>The TTA</title>
        <meta name="description" content="" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1>Transaction Tracking App</h1>
        <p>This app creates a report of all debits and credits for specified accounts and their associated lockups.</p>

        <div style={{ marginTop: '2rem' }}>
          <input type="date" name="startDate" placeholder="YYYY-MM-DD" required defaultValue={startDate} onChange={(e) => setStartDate(e.target.value)} /> to{' '}
          <input type="date" name="endDate" placeholder="YYYY-MM-DD" required defaultValue={endDate} onChange={(e) => setEndDate(e.target.value)} /> (up until, and excluding)
          <textarea
            name="accountIds"
            placeholder="account IDs separated by linebreaks"
            style={{ width: '100%', height: '20rem' }}
            defaultValue={accountIds}
            required
            onChange={(e) => setAccountIds(e.target.value)}
          ></textarea>
          <button disabled={loading} onClick={handleDownloadClick}>
            {loading ? 'Loading, time to grab a coffee...' : 'Download report as CSV'}
          </button>
        </div>

        <span style={{ marginTop: '5rem' }}>
          Version: <Commit />
        </span>
      </main>
    </div>
  );
}
