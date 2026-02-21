import styles from './pending-requests-loader.module.css';

export function PendingRequestsLoader() {
  return (
    <div className={styles.loader} aria-label="Refreshing pending requests" role="status">
      <div className={styles.text}><span>Loading</span></div>
      <div className={styles.text}><span>Loading</span></div>
      <div className={styles.text}><span>Loading</span></div>
      <div className={styles.text}><span>Loading</span></div>
      <div className={styles.text}><span>Loading</span></div>
      <div className={styles.text}><span>Loading</span></div>
      <div className={styles.text}><span>Loading</span></div>
      <div className={styles.text}><span>Loading</span></div>
      <div className={styles.text}><span>Loading</span></div>
      <div className={styles.line} />
    </div>
  );
}
