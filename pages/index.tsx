import Head from 'next/head';
import styles from '../styles/Home.module.css';

const ACCOUNT_ID = process.env.ACCOUNT_ID;

const defaultStartDate = new Date();
defaultStartDate.setDate(defaultStartDate.getDate() - 30); // 30 days ago
const defaultStartDateString = defaultStartDate.toISOString().slice(0, 10);
const defaultEndDate = new Date();
defaultEndDate.setDate(defaultEndDate.getDate() + 1); // tomorrow
const defaultEndDateString = defaultEndDate.toISOString().slice(0, 10);

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>TTA Basic</title>
        <meta name="description" content="" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1>TTA Basic</h1>
        <p>
          This is a temporary app while{' '}
          <a href="https://github.com/NEARFoundation/tx-tracking-app" target="_blank" rel="noreferrer">
            https://github.com/NEARFoundation/tx-tracking-app
          </a>{' '}
          is being improved.
        </p>
        <p>Currently it just pulls basic Send/Receive NEAR transactions.</p>
        <form method="post" action="/api/csv" style={{ marginTop: '2rem' }}>
          <input type="date" name="startDate" placeholder="YYYY-MM-DD" required defaultValue={defaultStartDateString} /> to{' '}
          <input type="date" name="endDate" placeholder="YYYY-MM-DD" required defaultValue={defaultEndDateString} /> (up until, and excluding)
          <textarea name="accountIds" placeholder="account IDs separated by linebreaks" style={{ width: '100%', height: '20rem' }} defaultValue={ACCOUNT_ID} required></textarea>
          <button>Get CSV</button>
        </form>
        <div style={{ fontSize: '80%', marginTop: '2rem' }}>
          Since there is a 30-second timeout on the serverless function, you may need to reduce the date range or number of accounts.
        </div>
      </main>
    </div>
  );
}
