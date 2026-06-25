"use client";

import { USE_MOCK_DATA } from "@/lib/utils/config";
import { Badge } from "@/components/ui/badge";

export function MockDataIndicator() {
  if (!USE_MOCK_DATA) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">

    </div>
  );
}




