"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import InvoiceTable from "@/components/tables/invoice-table";

export default function InvoicePage() {
  return (
    <div className={cn("min-h-screen bg-background text-foreground")}>
      <div className="max-w-[2000px] mx-auto">
        <InvoiceTable />
      </div>
    </div>
  );
}
