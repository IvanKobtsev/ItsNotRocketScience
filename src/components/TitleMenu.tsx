import styles from "../styles/TitleMenu.module.scss";
import React, { useState } from "react";

interface TitleMenuProps {
  handleStart: (event: React.MouseEvent<HTMLDivElement>) => void;
}

export default function TitleMenu({ handleStart }: TitleMenuProps) {
  const [visible, setVisible] = useState(true);

  return (
    <div className={`${styles.TitleMenu} ${visible ? "" : styles.hidden}`}>
      <div className={styles.title}>
        <div className={styles.its}>It's</div>
        <div className={styles.not}>n o t</div>
        <div className={styles.rocketScience}>R o cket Science</div>
      </div>
      <div
        className={`${styles.play} ${visible ? "" : styles.pressedPlay}`}
        onClick={(e) => {
          setVisible(false);
          handleStart(e);
        }}
      >
        {"> Play <"}
      </div>
    </div>
  );
}
