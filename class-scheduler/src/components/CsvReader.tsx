import React, { useEffect, useState } from "react";
import Papa, { ParseResult } from "papaparse";

type CsvRow = {
  [key: string]: string;
};

export default function CsvReader() {
  const [data, setData] = useState<CsvRow[]>([]);

  useEffect(() => {
    Papa.parse<CsvRow>("/FA26 Schedule - Sheet1.csv", {
      download: true,
      header: true,
      skipEmptyLines: true,

      complete: (results: ParseResult<CsvRow>) => {
        setData(results.data);
      },
    });
  }, []);

  return (
    <div>
      <h2>CSV Data</h2>

      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}