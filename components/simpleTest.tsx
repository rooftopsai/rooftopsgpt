// components/SimpleTest.tsx
"use client"

import { useState, useEffect } from 'react';

export function SimpleTest() {
  console.log("SimpleTest component rendering");
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    console.log("SimpleTest component mounted");
  }, []);
  
  return (
    <div className="fixed right-20 top-20 z-50 rounded bg-red-500 p-4 text-white">
      Simple Test Component
      <div>Count: {count}</div>
      <button 
        onClick={() => setCount(count + 1)}
        className="mt-2 rounded bg-white p-2 text-red-500"
      >
        Click Me
      </button>
    </div>
  );
}