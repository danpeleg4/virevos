import { useEffect, useRef, useState } from "react";

export const ROW_HEIGHT = 52;

export function useCalcWindow() {
  const [itemsPerPage, setItemsPerPage] = useState(8);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const calculate = () => {
      if (!tableRef.current) return;
      const tableTop = tableRef.current.getBoundingClientRect().top;
      const reserved = 40 + 50 + 24;
      const available = window.innerHeight - tableTop - reserved;
      setItemsPerPage(Math.max(1, Math.floor(available / ROW_HEIGHT)));
    };
    calculate();
    window.addEventListener("resize", calculate);
    return () => window.removeEventListener("resize", calculate);
  }, []);

  return { itemsPerPage, tableRef };
}
