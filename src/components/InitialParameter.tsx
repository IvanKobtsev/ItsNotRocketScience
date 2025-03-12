import styles from "../styles/InitialParameter.module.scss";
import { Slider } from "antd";
import React, { useState } from "react";

interface InitialParameterProps {
  name: string;
  units: string;
  valueRef: React.RefObject<number>;
  min: number;
  max: number;
}

export default function InitialParameter({
  name,
  units,
  valueRef,
  min,
  max,
}: InitialParameterProps) {
  const [_, setFrame] = useState(0);

  return (
    <div className={styles.InitialParameter}>
      <div className={styles.parameterHeader}>
        {name} = {valueRef.current} {units}
      </div>
      <Slider
        styles={{
          track: {},
          rail: { opacity: 1, background: "#fff" },
          handle: {
            scale: "1.1",
          },
        }}
        min={min}
        max={max}
        tooltip={{ formatter: null }}
        defaultValue={valueRef.current}
        value={valueRef.current}
        onChange={(value) => {
          valueRef.current = value;
          setFrame((frame) => frame + 1);
        }}
      />
    </div>
  );
}
