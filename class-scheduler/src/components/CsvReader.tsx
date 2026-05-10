declare module 'papaparse';

import { useEffect } from "react";
import Papa, { ParseResult } from "papaparse";

export type CsvRow = {
  [key: string]: string;
};

type CsvReaderProps = {
  onDataLoaded: (data: CsvRow[]) => void;
};

export default function CsvReader({
  onDataLoaded,
}: CsvReaderProps) {
  useEffect(() => {
    Papa.parse<CsvRow>("/FA26 Schedule - Sheet1.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,

      complete: (results: ParseResult<CsvRow>) => {
        onDataLoaded(results.data);
      },
    });
  }, [onDataLoaded]);

  return null;
}