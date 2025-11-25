// components/creator/CreatorStudio.tsx

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function CreateStudio() {
  return (
    <div className="space-y-4 p-6">
      <h2 className="text-2xl font-semibold">Creator Studio</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Example card */}
        <Card>
          <CardContent>
            <h3 className="mb-2 text-lg font-medium">Roof Estimate</h3>
            <p className="mb-4 text-sm">
              Build a detailed roof estimate template for your sales team.
            </p>
            <Button onClick={() => console.log("launch tool")}>
              Launch Tool
            </Button>
          </CardContent>
        </Card>
        {/* Repeat for your 5 other tools… */}
      </div>
    </div>
  )
}
