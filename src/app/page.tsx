"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/pages/login-page";

export default function Page() {
  const router = useRouter();

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <React.Suspense fallback={<div>Loading...</div>}>
          <LoginForm />
        </React.Suspense>
      </div>
    </div>
  );
}
