import { useState } from "react";
import CsvReader from "./components/CsvReader";
import type { CsvRow } from "./components/CsvReader";
import CourseScheduler from "./components/CourseSchedule";

import Nav from "./components/Nav";

export default function App() {
  const [courses, setCourses] = useState<CsvRow[]>([]);

  return (
    <div>
      <Nav />
      <CsvReader onDataLoaded={setCourses} />

      {/* <h1>Courses</h1> */}

      {/* <pre>{JSON.stringify(courses, null, 2)}</pre> */}
      <CourseScheduler courses={courses} />
    </div>
  );
}