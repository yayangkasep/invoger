"use client";

import * as React from "react";
import BaseDialog from "@/components/base-dialog";
import { Button } from "@/components/ui/button";
import { DialogClose } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle } from "lucide-react";
import { IconFilePlus } from "@tabler/icons-react";
import { fetchWithAuthClient } from "@/lib/auth/client";

export default function AddOutletDialog({
  onAdd,
  open,
  onOpenChange,
  onOutletAdded,
}: {
  onAdd?: (payload: Record<string, unknown> & { __tempId?: string }) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onOutletAdded?: (outlet: Record<string, unknown> & { id: string }) => void;
}) {
  const [name, setName] = React.useState("");
  const [code, setCode] = React.useState("");
  const [cashier, setCashier] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [showAlert, setShowAlert] = React.useState(false);
  const [alertType, setAlertType] = React.useState<"success" | "error" | null>(
    null,
  );
  const [errors, setErrors] = React.useState<{
    Name?: string;
    Code?: string;
    Phone?: string;
    Cashier?: string;
    Address?: string;
  }>({});
  const [touched, setTouched] = React.useState<{
    Name?: boolean;
    Code?: boolean;
    Phone?: boolean;
    Cashier?: boolean;
    Address?: boolean;
  }>({});
  const closeTimerRef = React.useRef<number | null>(null);
  const hideTimerRef = React.useRef<number | null>(null);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const formInvalid = React.useMemo(() => {
    return (
      !name.trim() ||
      !code.trim() ||
      !cashier.trim() ||
      !address.trim() ||
      !phone.trim()
    );
  }, [name, code, cashier, address, phone]);

  React.useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // validation: required fields
    const newErrors: {
      Name?: string;
      Code?: string;
      Phone?: string;
      Cashier?: string;
      Address?: string;
    } = {};
    if (!name.trim()) newErrors.Name = "Required";
    if (!code.trim()) newErrors.Code = "Required";
    if (!cashier.trim()) newErrors.Cashier = "Required";
    if (!address.trim()) newErrors.Address = "Required";
    if (!phone.trim()) newErrors.Phone = "Required";
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      setTouched({
        Name: true,
        Code: true,
        Phone: true,
        Cashier: true,
        Address: true,
      });
      return;
    }
    const tempId = `temp-${Date.now()}`;
    const payload = {
      id: tempId,
      code: code || "",
      name: name || "",
      cashier: cashier || "",
      address: address || "",
      phone: phone || "",
      __tempId: tempId,
    };
    onAdd?.(payload);

    console.log("[AddOutletDialog] submitting payload (tempId=", tempId, ")");
    (async () => {
      try {
        setLoading(true);
        const payload = { name, code, cashier, address, phone };
        const res = await fetchWithAuthClient("/api/outlets/addOutlets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          console.error("failed to create outlet", body);
          setAlertType("error");
          setShowAlert(true);
          return;
        }
        const body = await res.json().catch(() => ({}));
        const id = body?.id ?? `o-${Date.now()}`;
        setAlertType("success");
        setShowAlert(true);
        onOutletAdded?.({
          id: String(id),
          code,
          name,
          cashier,
          address,
          phone,
        });

        if (closeTimerRef.current) window.clearTimeout(closeTimerRef.current);
        if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
        closeTimerRef.current = window.setTimeout(() => {
          onOpenChange?.(false);
          setName("");
          setCode("");
          setCashier("");
          setAddress("");
          setPhone("");
        }, 2000);
        hideTimerRef.current = window.setTimeout(() => {
          setShowAlert(false);
          setAlertType(null);
        }, 2500);
      } catch (err) {
        console.error(err);
        setAlertType("error");
        setShowAlert(true);
      } finally {
        setLoading(false);
      }
    })();
  }

  return (
    <BaseDialog
      title="Add New Outlet"
      description="Insert new outlet information"
      trigger={
        <Button>
          <IconFilePlus className="size-4" />
          Add Outlets
        </Button>
      }
      open={open}
      onOpenChange={onOpenChange}
      footer={
        <>
          <DialogClose asChild>
            <Button variant="outline">Cancle</Button>
          </DialogClose>
          <Button
            onClick={() => {
              formRef.current?.requestSubmit();
            }}
            disabled={loading || formInvalid}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </>
      }
    >
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
        <div
          className={`mb-2 transition-opacity duration-300 ${showAlert ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          {alertType === "success" && (
            <Alert className="border-green-200 bg-green-50 text-green-700">
              <CheckCircle className="size-4 text-green-700" />
              <div>
                <AlertTitle>Success!</AlertTitle>
                <AlertDescription>
                  Your outlets has been saved.
                </AlertDescription>
              </div>
            </Alert>
          )}
          {alertType === "error" && (
            <Alert variant="destructive">
              <XCircle className="size-4 text-destructive" />
              <div>
                <AlertTitle>Failed!</AlertTitle>
                <AlertDescription>
                  Your outlets failed to save, please try again.
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>

        <div>
          <Label
            className={`block mb-1 ${errors.Name && touched.Name ? "text-destructive" : ""}`}
          >
            Name
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              setTouched((s) => ({ ...s, Name: true }));
              if (!name.trim()) setErrors((s) => ({ ...s, Name: "Required" }));
              else setErrors((s) => ({ ...s, Name: undefined }));
            }}
            className="w-full"
            aria-invalid={Boolean(errors.Name && touched.Name)}
          />
          {errors.Name && touched.Name ? (
            <p className="mt-1 text-sm text-destructive">
              This field is required.
            </p>
          ) : null}
        </div>
        <div>
          <Label
            className={`block mb-1 ${errors.Code && touched.Code ? "text-destructive" : ""}`}
          >
            Code
          </Label>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={() => {
              setTouched((s) => ({ ...s, Code: true }));
              if (!code.trim()) setErrors((s) => ({ ...s, Code: "Required" }));
              else setErrors((s) => ({ ...s, Code: undefined }));
            }}
            className="w-full"
            aria-invalid={Boolean(errors.Code && touched.Code)}
          />
          {errors.Code && touched.Code ? (
            <p className="mt-1 text-sm text-destructive">
              This field is required.
            </p>
          ) : null}
        </div>
        <div>
          <Label
            className={`block mb-1 ${errors.Cashier && touched.Cashier ? "text-destructive" : ""}`}
          >
            Cashier
          </Label>
          <Input
            value={cashier}
            onChange={(e) => setCashier(e.target.value)}
            onBlur={() => {
              setTouched((s) => ({ ...s, Cashier: true }));
              if (!cashier.trim())
                setErrors((s) => ({ ...s, Cashier: "Required" }));
              else setErrors((s) => ({ ...s, Cashier: undefined }));
            }}
            className="w-full"
            aria-invalid={Boolean(errors.Cashier && touched.Cashier)}
          />
          {errors.Cashier && touched.Cashier ? (
            <p className="mt-1 text-sm text-destructive">
              This field is required.
            </p>
          ) : null}
        </div>
        <div>
          <Label
            className={`block mb-1 ${errors.Address && touched.Address ? "text-destructive" : ""}`}
          >
            Address
          </Label>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onBlur={() => {
              setTouched((s) => ({ ...s, Address: true }));
              if (!address.trim())
                setErrors((s) => ({ ...s, Address: "Required" }));
              else setErrors((s) => ({ ...s, Address: undefined }));
            }}
            className="w-full"
            aria-invalid={Boolean(errors.Address && touched.Address)}
          />
          {errors.Address && touched.Address ? (
            <p className="mt-1 text-sm text-destructive">
              This field is required.
            </p>
          ) : null}
        </div>
        <div>
          <Label
            className={`block mb-1 ${errors.Phone && touched.Phone ? "text-destructive" : ""}`}
          >
            Phone
          </Label>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={() => {
              setTouched((s) => ({ ...s, Phone: true }));
              if (!phone.trim())
                setErrors((s) => ({ ...s, Phone: "Required" }));
              else setErrors((s) => ({ ...s, Phone: undefined }));
            }}
            className="w-full"
            aria-invalid={Boolean(errors.Phone && touched.Phone)}
          />
          {errors.Phone && touched.Phone ? (
            <p className="mt-1 text-sm text-destructive">
              This field is required.
            </p>
          ) : null}
        </div>
      </form>
      {/* footer Save button triggers form submission via requestSubmit */}
    </BaseDialog>
  );
}
