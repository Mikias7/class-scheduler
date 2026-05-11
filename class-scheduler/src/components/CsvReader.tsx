import { useEffect } from "react";
import Papa from "papaparse";
import type { ParseResult } from "papaparse";

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
    Papa.parse<CsvRow>(
      `${import.meta.env.BASE_URL}FA26 Schedule - Sheet1.csv`,
      {
        download: true,
        header: true,
        skipEmptyLines: true,

        complete: (results: ParseResult<CsvRow>) => {
          onDataLoaded(results.data);
        },

        error: (error) => {
          console.error("CSV Parse Error:", error);
        },
      }
    );
  }, [onDataLoaded]);

  return null;
}