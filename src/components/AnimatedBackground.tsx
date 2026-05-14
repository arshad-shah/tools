import React from 'react';
import { useTheme } from '@arshad-shah/cynosure-react';
import styles from './AnimatedBackground.module.css';

const AnimatedBackground: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dashboard-dark';

  return (
    <div
      className={`${styles.background} ${isDark ? styles.dark : styles.light}`}
      aria-hidden
    >
      <div className={styles.grid} />
      <div className={`${styles.blob} ${styles.blob1}`} />
      <div className={`${styles.blob} ${styles.blob2}`} />
      <div className={`${styles.blob} ${styles.blob3}`} />
      <div className={styles.noise} />
    </div>
  );
};

export default AnimatedBackground;
